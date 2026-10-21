# feat/glide: every switch glides in, nothing pops; one slide on "Giàu …" (Hao, 21/10)

Stacked on `feat/minh-hao-tab` (PR #41, not merged: both touch the /add chips). The diff against main includes #41's commits until that merges; after it does, nothing is left to rebase. Not merged.

## 1. The double slide (first commit)

Root cause, confirmed in Chrome on the base build with `document.startViewTransition` counted: `components/route-transition.tsx` wrapped every page in `<ViewTransition default={vt}>` and `lib/nav-direction.ts` handed it `m-vt-push` for as long as the path stayed the same, so every later transition that touched the screen replayed the slide. Khám phá → Giàu Calcium started **two** (the push, then the screen's own `useDeferredValue` list render about 335 ms later), and each Giàu tab (`router.replace("?loai=…")`) started another.

Fix: `RouteTransition` keeps the last path whose commit its layout effect saw (`settled`). A render for another path is a navigation (class from `lib/nav-direction`, as before); a render for the same path is the screen itself, class `none`. So the push and back animations run once, on the navigation commit. `tests/probes/glide_vt.py` counts the calls (390 px, demo build):

| | before | after |
|---|---|---|
| Khám phá → Giàu Calcium | 2 | **1** |
| Giàu tab Thực phẩm bổ sung / back to Thực phẩm | 1 each | **0** (they glide, they are not a screen change) |
| Mỗi 100 g / Mỗi khẩu phần | 0 (hard swap) | 0 (they glide) |
| Back from Giàu, Khám phá → a food page, Hôm nay → Vi chất | 1 | 1 |
| bottom-nav tab | 0 | 0 |

## 2. One glide for content that switches in place

`components/ui/switch-glide.tsx`: `<SwitchGlide id={activeKey} order={indexOfTheActiveChip} ready={…}>`. When `id` changes the content on screen fades out in 80 ms, then the new content enters 16 px off to the side the chip or tab grew toward (from the right for a later one, from the left for an earlier one) and fades in, 200 ms, the app's `--ease-out`. Web Animations API on one wrapper, transform and opacity only, no will-change, nothing left behind after the end (the way in fills backwards only, the way out is cancelled when the new content is in), no animation on a layout property (the held height is set, not animated). Interruptible: a second tap during the glide takes the next `id` once the fade-out is done and a fade-out starts from the opacity the content has at that moment (no queue, no jump). The wrapper holds the height of the content that left until the new one is in. No animation on first mount; reduced motion is a 120 ms cross-fade. Empty states and skeletons sit inside it, so they glide too (`glide_switch.py` checks Yêu thích's empty state).

Used by: /add category chips (including Đồ ăn của Minh Hào), the compare, ingredient and training pickers (same `useFoodBrowse` chips), Giàu (Thực phẩm | Thực phẩm bổ sung and Mỗi 100 g | Mỗi khẩu phần).

**Motion first, work after.** `useFoodBrowse` now builds the list from a deferred filter (`listFilter = useDeferredValue(filter)`), like it already did for the query: the chip lights and the fade-out starts in the tap's frame, and the tap's own render stays small (the list is not rebuilt in it). `SwitchGlide` swaps in a low-priority `startTransition`, and waits for `ready` (`listFilter === filter`) if the list is still on its way, so an old list is never drawn under the new chip. **The rows are never re-keyed or remounted:** the wrapper draws the same element type at the same place before and after (`FoodList`, `React.memo` and `listPick` of #32/#33 untouched); only the wrapper's transform and opacity move. A unit test holds that (`switch-glide.tsx` has no `key=`).

## 3. Bottom-nav tab changes glide

`EnterGlide` (`components/ui/enter-glide.tsx`, its own module, since every tab loads it and only the lists load `SwitchGlide`): keyed on the tab, so the new screen is a new element that enters with `.m-tab-in`, 12 px off to the side of the tab order (Hôm nay → Tổng quan → Khám phá → Cài đặt), 200 ms, a CSS transition from `@starting-style`, starting at half opacity, never from nothing (a first version started at 0 and the fluid-add probe counted one blank frame on Khám phá → Hôm nay; at 0.5 it is 0 again). The old screen does not slide out. No view-transition snapshot, so cc-64's low-end rule is untouched: `navKind` "tab" still starts no view transition (0 counted). Used in `TabsShell` for the four tabs and in `OverviewFrame` for the Tổng quan sub-tabs (keyed on the committed tab, not the optimistic one). The tab highlight is still the optimistic one of cc-58, which does not wait for the glide.

## 4. Tokens

`:root` of `globals.css` (`--m-switch-out/in/shift`, `--m-tab-in/shift`) mirrored for JavaScript in `lib/motion.ts`; `lib/__tests__/motion.test.ts` holds the two to each other (and 150–300 ms for UI motion, the curve, `.m-tab-in` and its reduced-motion rule, the places that use the glide, no animation library in package.json, AGENTS.md naming the tokens). Documented in AGENTS.md › Motion: sheets keep their spring (not touched), switch glide 200 ms / 16 px, tab glide 200 ms / 12 px, push and back once as before, reduced motion = 120 ms cross-fade only. No new dependency.

## 5. Measured (`_glide_measure.py`, 390 x 844 phone, 1x and 4x CPU, median of 3)

`first` = ms from the touch to the first frame where something changed; `moving` = frames in motion (glide wrapper's opacity or transform, or a view transition alive); `jank` = frames later than 25 ms / 33 ms; `pop` = frames where the content changed with nothing in motion before or after it; `vt` = view transitions started; `tap` = the longest main-thread processing of the tap event (handlers plus the render they flush, Event Timing), the "work before the first animated frame".

| switch | CPU | first (ms) | moving frames | jank 25 / 33 | pop | vt | tap (ms) |
|---|---|---|---|---|---|---|---|
| /add chip (Đạm) | 1x | 12.4 → 28.7 | 0 → 13 | 0/0 → 0/0 | **1 → 0** | 0 → 0 | 3.6 → 2.2 |
| /add chip (Đạm) | 4x | 8.8 → 26.2 | 0 → 13 | 0/0 → 0/0 | **1 → 0** | 0 → 0 | 9.4 → **6.1** |
| Giàu open | 1x | 28.7 → 29.2 | 41 → 20 | 0/0 → 0/0 | 0 → 0 | **2 → 1** | 2.3 → 2.4 |
| Giàu open | 4x | 42.3 → 43.5 | 40 → 21 | 1/1 → 1/1 | 0 → 0 | **2 → 1** | 5.3 → 5.3 |
| Giàu tab | 1x | 31.4 → 46.4 | 0 → 13 | 0/0 → 0/0 | **1 → 0** | 0 → 0 | 2.2 → 2.1 |
| Giàu tab | 4x | 27.5 → 44.0 | 0 → 13 | 0/0 → 0/0 | **1 → 0** | 0 → 0 | 5.4 → 5.4 |
| bottom-nav tab | 1x | 30.3 → 31.0 | 0 → 7 | 0/0 → 0/0 | **1 → 0** | 0 → 0 | 1.5 → 1.4 |
| bottom-nav tab | 4x | 46.1 → 45.4 | 0 → 8 | 1/1 → 1/1 | **1 → 0** | 0 → 0 | 3.6 → 4.3 |

Reading it: the glide costs no jank (the one late frame at 4x is in the before run too, it is the navigation itself). A chip's tap handler is 6 ms of main-thread work at 4x (budget 16 ms), less than before because the list is no longer rebuilt in the tap. A chip's first change comes ~17 ms later than a hard swap because the first thing that changes is now the fade-out; the new list is in the DOM 80 ms after the tap. Giàu open moves 20 frames, not 40: one slide.

Raw numbers: [before](feat-glide-probe-before.json), [after](feat-glide-probe-after.json). Filmstrips at 390 px, 1x, ms since the tap (`docs/screenshots/glide/{before,after}/`):

- /add chip: [before](../screenshots/glide/before/chip.png) (one frame, the list is replaced), [after](../screenshots/glide/after/chip.png) (fade out, the new list comes in from the right)
- Giàu open: [before](../screenshots/glide/before/giau-open.png) (the screen slides in at 49-150 ms and again at 449 ms), [after](../screenshots/glide/after/giau-open.png) (one slide)
- Giàu tab: [before](../screenshots/glide/before/giau-tab.png), [after](../screenshots/glide/after/giau-tab.png)
- bottom-nav tab: [before](../screenshots/glide/before/nav-tab.png), [after](../screenshots/glide/after/nav-tab.png)

![chip, before](../screenshots/glide/before/chip.png)
![chip, after](../screenshots/glide/after/chip.png)
![Giàu open, before: two slides](../screenshots/glide/before/giau-open.png)
![Giàu open, after: one slide](../screenshots/glide/after/giau-open.png)

## 6. Budgets (hard rules from section 6 of the brief)

**First-load JS**, gzip kB, `npm run sizes`, main 8cb8940 / #41 / this branch (stacked on #41):

| route | main | #41 | this | this vs #41 | this vs main |
|---|---|---|---|---|---|
| /app | 300.8 | 301.2 | 301.8 | **+0.6** | +1.0 |
| /add | 290.3 | 291.6 | 292.5 | **+0.9** | +2.2 |
| /explore | 281.9 | 284.1 | 284.7 | **+0.6** | +2.8 |

The glide's own cost is within +1 kB on every listed route (`SwitchGlide` loads only where a list switches, `EnterGlide` is its own ~0.4 kB module). Against main the pair is over +1 kB on /add and /explore because #41 itself adds the carousel, the chip, `lib/fortify-kitchen`, the release item and the tour step there (+1.3 and +2.2); #41 first measured +3.8 on /explore because the carousel imported `SourceTag` from `food-list.tsx` and pulled the whole food list in, which `components/foods/source-tag.tsx` fixed (that is in #41 now). Live build (`NEXT_PUBLIC_API_MODE=live`, the same 26 to 28 chunks, no sample data) main → this: /app 293.9 → 294.6, /add 283.4 → 285.4, /explore 275.0 → 277.5. If you want the stack inside +1 kB of main on /add and /explore, the carousel (lazy chunk) is the place to cut; say so.

**check:live-bundle**: green (in gate:full).

**fluid_add numbers** (`_fluid_add_measure.py`, same machine, base = #41 build, 4x unless noted), unchanged: open first sheet frame 28.0 → 28.5 ms, 2 frames → 2 frames, blank frames 0 → 0 (1x: 29.4 → 30.2 ms); close blank frames 0 → 0, no hard cut, 12 slide frames; Khám phá screen 44.3 → 43.7 ms, Hôm nay 30.3 → 29.9 ms, tab blank frames 0 → 0; Giàu screen 63.5 → 63.8 ms.

**A chip switch's main-thread work before the first animated frame** (the tap): 6.1 ms at 4x, 2.2 ms at 1x (budget 16 ms), table above.

## Probes

- `glide_vt.py`: view transitions per navigation and per switch, nothing left running.
- `glide_switch.py`: the list animates (opacity dips, at most 16 px, from the right for a later chip and from the left for an earlier one), no pop, ends in place with no held height, no animation on first mount, a second tap lands on the second chip, the empty state glides, Giàu tabs and basis chips, tabs from the right and the left (at most 12 px, half opacity at the start, 0 view transitions), Tổng quan sub-tabs, reduced motion (a cross-fade, nothing slides).
- `cc_46.py` / `releases.test.ts`: the new item "Chuyển nhóm, chuyển tab mượt hơn" in release 2026-10-21c (no control to learn, so no tour step).

## Not done, and why

- The light stagger (the first six rows 20 ms apart) is not built: the brief marks it optional and caps it at six rows; a per-row delay on top of an 80 ms fade-out and a 200 ms glide adds nothing on a 390 px list. Say if you want it.
- The Vi chất chips on /micros are jump links to a group on the same page (`scrollToGroup`), not a content switch, so they do not glide. Tổng quan's 7 | 30 days toggle is a `router.replace` of the same screen with new data; it is not wrapped either (its content is the router's page, which the wrapper cannot hold while it fades).
- A tab opened from a pushed screen (for example from a food page) is a different layout, so it still has no glide: only tab → tab does.
- `public/sw.js` VERSION is not touched; re-pick it with the release id at merge (as in #41).
