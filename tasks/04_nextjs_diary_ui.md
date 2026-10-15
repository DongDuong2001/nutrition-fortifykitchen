# Task 04: Next.js Diary UI, Optimistic Updates & Mynaui Icons

## Objectives
1. Next.js App Router UI Architecture:
   - Visual design: follow `design/` and HANDOFF.md exactly (H1T MICRO: black header/nav, #F5F5F7 page, white cards, blue #1E55F0, Be Vietnam Pro + Saira). The earlier "culinary" direction is replaced.
   - Dedicated pages:
     - `app/(dashboard)/diary/page.tsx`: Daily meal log, slot tabs (Breakfast, Lunch, Dinner, Snack), nutrition progress bars.
     - `app/(dashboard)/foods/page.tsx`: Food catalog & custom food creation.
     - `app/admin/review/page.tsx`: Coach markdown draft review interface.
2. Optimistic UI Updates:
   - Hook `hooks/use-diary-log.ts` generates client UUID via `crypto.randomUUID()`.
   - Immediately adds the food item and calculates approximate nutrients in local state before the API response completes.
   - Reverts state and displays toast error if network or server error occurs.
3. Nutrient Progress Visualizations:
   - Hook `hooks/use-nutrient-progress.ts` compares consumed nutrients against daily target goals across all 26 nutrients.
   - Visual breakdown for Calories, Macros, and key Micronutrients.
4. Icons:
   - Use `@mynaui/icons-react` (via `components/ui/icons.tsx`) for clean UI icons (meal slots, nutrient badges, status tags, action buttons).

## Verification
- Run `npm run build` with zero TypeScript errors.
- Ensure responsive mobile and desktop layouts render without hydration mismatch.
