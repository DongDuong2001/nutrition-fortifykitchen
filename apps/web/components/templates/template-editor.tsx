"use client";

import React, { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { LevelBar } from "@/components/ui/level-bar";
import { PillButton } from "@/components/ui/pill-button";
import { SectionHeader } from "@/components/ui/section-title";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { MEAL_DOT } from "@/components/home/meal-dot";
import { TagDot } from "@/components/templates/template-parts";
import { TemplateMacros, TemplateMicros } from "@/components/templates/template-micros";
import { useDiary } from "@/lib/diary-store";
import { useCoaching } from "@/hooks/use-coaching";
import { lastInAppPath, useBack } from "@/hooks/use-back";
import { useUnsavedWork } from "@/lib/unsaved-work";
import { useDayTemplateRows } from "@/hooks/use-day-templates";
import { CATALOG_FOODS, catalogFoodById, catalogVersion, subscribeCatalog, type FoodItem } from "@/lib/catalog";
import {
  DAY_TEMPLATE_TAGS,
  NEW_TEMPLATE_NAME,
  TEMPLATE_SLOT_ORDER,
  applyTemplate,
  buildDayTemplate,
  setTemplateItemPortion,
  templateItemCount,
  removeDayTemplate,
  removeTemplateItem,
  templateMealKcal,
  templateSavedMessage,
  templateTotals,
  updateDayTemplate,
  type DayTemplate,
  type DayTemplateMeal,
  type DayTemplateTag,
} from "@/lib/day-templates";
import { formatAmount, formatRange } from "@/lib/format";
import { SLOT_LABEL, pctLabel, pctOf, targetOf } from "@/lib/home";
import { columnGroups, countedForLevel, levelSummary } from "@/lib/level-nutrients";
import { templateNutrition } from "@/lib/template-micros";
import { getMealSlotNameVi, type MealSlot } from "@/lib/meal-slot";
import { markUsed } from "@/lib/onboarding-store";
import { SHEET_BACK_DELAY_MS } from "@/lib/sheet-history";
import { HOME_ROUTE } from "@/lib/home-route";
import { kcalValue } from "@/lib/kcal";
import { discardDraft, draftFor, draftOf, holdDraft, releaseDraft, startDraft, subscribeDraft, updateDraft } from "@/lib/template-draft";
import { PortionArea } from "@/components/ui/portion-area";
import { gramsServingLabel, parseGramsInput } from "@/lib/portion";

const OUTLINE_PILL = "gap-2 border-0! shadow-[inset_0_0_0_1.5px_var(--color-text)]";

/** The page frame: the grey page, the push header (Back, the name, trailing actions), and the main column. */
function Frame({ title, actions, children }: { title: string; actions?: React.ReactNode; children: React.ReactNode }) {
  const goBack = useBack();
  return (
    <AppShell>
      {/* One 560 px column on a phone and on desktop: the Lưu in the header then sits at the right edge of the form */}
      <AppHeader variant="sub" title={title} onBack={goBack} backLabel="Quay lại Ngày ăn mẫu" actions={actions} layout="narrow" />
      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pb-6 pt-4">{children}</main>
    </AppShell>
  );
}

/**
 * NMEditor: rename, tag, the foods of each meal (add with each meal's +, change a portion, take one out), the total against
 * today's target, copy into today, delete. Every change is a draft (lib/template-draft) until Lưu; a day built from scratch
 * (+ Tạo ngày ăn mẫu) is only a draft until then.
 */
export function TemplateEditor({ id }: { id: string }) {
  const { hydrated } = useDiary();
  const { templates } = useDayTemplateRows();
  const draft = useSyncExternalStore(subscribeDraft, () => draftFor(id), () => null);
  const [deleted, setDeleted] = useState(false);
  const template = templates.find((t) => t.id === id);

  if (!hydrated || deleted) {
    return (
      <Frame title="Ngày ăn mẫu">
        {!deleted && <div aria-hidden="true" className="h-[240px] rounded-card bg-level-empty motion-safe:animate-pulse" />}
      </Frame>
    );
  }
  if (!template && !draft) {
    return (
      <Frame title="Ngày ăn mẫu">
        <Card className="flex flex-col items-start gap-3">
          <p className="m-0 text-callout font-semibold">Không tìm thấy ngày ăn mẫu này.</p>
          <Link href="/explore/ngay-mau" className="flex min-h-11 items-center text-cap font-bold text-cobalt no-underline">
            Về Ngày ăn mẫu
          </Link>
        </Card>
      </Frame>
    );
  }
  return <EditorForm key={id} id={id} template={template ?? null} onDeleted={() => setDeleted(true)} />;
}

function EditorForm({ id, template, onDeleted }: { id: string; template: DayTemplate | null; onDeleted: () => void }) {
  const router = useRouter();
  const goBack = useBack();
  const { data, copyEntries, notify } = useDiary();
  const { templates, setTemplates } = useDayTemplateRows();
  const version = useSyncExternalStore(subscribeCatalog, catalogVersion, () => 0);

  // The draft: the saved template's copy, or the day built from scratch. The + sheet's template mode writes to it too, so the
  // editor reads it from the store. It goes when the editor is left, unless the editor went to the + sheet (holdDraft).
  const stored = useSyncExternalStore(subscribeDraft, () => draftFor(id), () => null);
  // A stored draft is taken back only on the way back from the + sheet it went to (or a new day, which only lives as a draft): a
  // draft left behind some other way (the + sheet, then So sánh or a tab) is dropped, so a saved template never opens on stale edits
  const [first] = useState(() =>
    stored && (stored.isNew || lastInAppPath() === "/add") ? stored : template ? draftOf(template) : stored
  );
  useEffect(() => {
    if (first && draftFor(id) !== first) startDraft(first);
    return () => {
      releaseDraft(id);
    };
  }, [id, first]);
  const current = stored ?? first;
  const name = current?.name ?? "";
  const tag: DayTemplateTag = current?.tag ?? "khac";
  const meals = useMemo(() => current?.meals ?? [], [current]);
  const isNew = current?.isNew ?? false;
  const setName = (value: string) => updateDraft(id, { name: value });
  const setTag = (value: DayTemplateTag) => updateDraft(id, { tag: value });
  const setMeals = (value: DayTemplateMeal[]) => updateDraft(id, { meals: value });
  const [picked, setPicked] = useState<{ slot: MealSlot; index: number } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const shownName = name.trim() || template?.name || NEW_TEMPLATE_NAME;

  const draft: DayTemplate = useMemo(
    () => ({ id, name: shownName, tag, meals, createdAt: current?.createdAt ?? new Date().toISOString() }),
    [id, shownName, tag, meals, current?.createdAt]
  );
  // version: a catalogue that arrives changes what the foods add up to
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const totals = useMemo(() => templateTotals(draft, CATALOG_FOODS), [draft, version]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const perMeal = useMemo(() => templateMealKcal(draft, CATALOG_FOODS), [draft, version]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const nutrition = useMemo(() => templateNutrition(draft, CATALOG_FOODS), [draft, version]);
  // Vi chất at the user's Level, against the day's targets (the same list and rule as Hôm nay)
  const { level } = useCoaching();
  const groups = useMemo(() => columnGroups(level), [level]);
  const countedIds = useMemo(() => countedForLevel(level), [level]);
  const microTargets = useMemo(() => Object.fromEntries(countedIds.map((id) => [id, targetOf(data, id)])), [countedIds, data]);
  const macroTargets = useMemo(
    () => ({ protein: targetOf(data, "protein"), carbs: targetOf(data, "carbs"), fat: targetOf(data, "fat"), fiber: targetOf(data, "fiber") }),
    [data]
  );
  const summary = useMemo(() => levelSummary(nutrition.values.nutrients, microTargets, countedIds), [nutrition, microTargets, countedIds]);
  const kcalMin = data.calories.targetMin;
  const kcalMax = data.calories.targetMax;
  const pct = pctOf(totals.kcal, kcalMin);
  const foodCount = templateItemCount(meals);
  // Only in memory until Lưu: an app update waits while there is something to lose
  const dirty = isNew || (template !== null && JSON.stringify({ name, tag, meals }) !== JSON.stringify({ name: template.name, tag: template.tag, meals: template.meals }));
  useUnsavedWork("template-editor", dirty);

  function save() {
    if (foodCount === 0) {
      notify("Mẫu cần ít nhất một món.");
      return;
    }
    if (isNew) {
      const built = buildDayTemplate({ id, name, tag, fallbackName: NEW_TEMPLATE_NAME, meals, createdAt: new Date().toISOString() });
      if (!built) return;
      setTemplates([built, ...templates]);
    } else {
      setTemplates(updateDayTemplate(templates, id, { name, tag, meals }));
    }
    discardDraft(id);
    notify(templateSavedMessage(shownName, totals.itemCount, totals.kcal));
    goBack();
  }

  // The same copy Hôm nay's picker makes: the diary's copyEntries, one toast, one Hoàn tác; the day is today
  function applyToToday() {
    const { entries, message } = applyTemplate(draft, CATALOG_FOODS, { idPrefix: `dt-${Date.now()}`, addedAt: new Date().toISOString() });
    markUsed("day-template");
    if (entries.length === 0) {
      notify(message);
      return;
    }
    copyEntries(entries, message);
    router.push(HOME_ROUTE);
  }

  // The confirm sheet has an entry in the history: it goes first (lib/sheet-history takes it back), then Back lands on the list
  function remove() {
    setConfirmDelete(false);
    window.setTimeout(() => {
      onDeleted();
      discardDraft(id);
      setTemplates(removeDayTemplate(templates, id));
      goBack();
    }, SHEET_BACK_DELAY_MS + 100);
  }


  return (
    <Frame
      title={shownName}
      actions={
        <PillButton type="button" size="md" fullWidth={false} onClick={save} className="min-w-[72px]">
          Lưu
        </PillButton>
      }
    >
      <div data-align-group="template-editor" className="flex flex-col gap-2">
        <label htmlFor="tpl-name" className="text-cap font-semibold text-text">
          Tên mẫu
        </label>
        <input
          id="tpl-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
          className="h-12 w-full rounded-xl border-0 bg-card px-4 text-base text-text shadow-field outline-none focus:shadow-[inset_0_0_0_2px_var(--color-cobalt)]"
        />
      </div>

      <div data-align-group="template-editor" className="flex flex-col gap-2">
        <span className="text-cap font-semibold text-text">Nhãn</span>
        <Segmented
          label="Nhãn"
          value={tag}
          onChange={setTag}
          items={DAY_TEMPLATE_TAGS.map((t) => ({
            key: t.key,
            label: (
              <span className="inline-flex items-center gap-1.5">
                <TagDot tag={t.key} />
                {t.label}
              </span>
            ),
          }))}
        />
      </div>

      <section aria-labelledby="tpl-meals" className="flex flex-col gap-1">
        <SectionHeader id="tpl-meals" className="flex min-h-11 items-center">
          Các bữa
        </SectionHeader>
        {/* Every meal of Hôm nay, each with the same + (44 px): it opens the add sheet for this meal of this template, and the
            foods go into the draft, never into the diary */}
        <Card padding={false} className="overflow-hidden">
          {TEMPLATE_SLOT_ORDER.map((slot) => {
            const meal = meals.find((m) => m.slot === slot);
            const items = meal?.items ?? [];
            const kcal = perMeal.find((m) => m.slot === slot)?.kcal ?? 0;
            const fullName = getMealSlotNameVi(slot);
            return (
              <section key={slot} aria-label={fullName}>
                <div data-align-group="template-meal-head" className="flex min-h-11 items-center gap-1.5 pl-3">
                  <span aria-hidden="true" className={`h-2 w-2 flex-none rounded-full ${MEAL_DOT[slot]}`} />
                  <span className="font-display text-callout font-extrabold uppercase italic leading-[1.1] tracking-[0.01em]">{SLOT_LABEL[slot]}</span>
                  {items.length > 0 && <span className="ml-0.5 font-condensed text-cap font-extrabold leading-none tabular-nums text-secondary">{kcalValue(kcal)}</span>}
                  <Link
                    href={`/add?meal=${slot}&mau=${encodeURIComponent(id)}`}
                    onClick={() => holdDraft(id)}
                    aria-label={`Thêm vào ${fullName}`}
                    className="ml-auto inline-flex h-11 w-11 shrink-0 items-center justify-center text-cobalt no-underline active:scale-[0.97] transition-press motion-reduce:active:scale-100"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </Link>
                </div>
                <div aria-hidden="true" className="mx-3 h-px bg-divider" />
                {items.length === 0 && (
                  <p data-align-group="template-meal-item" className="m-0 mx-3 flex min-h-11 items-center border-b border-divider text-cap text-secondary">
                    Chưa có món
                  </p>
                )}
                {items.map((item, index) => {
                  const food = catalogFoodById(item.foodId);
                  const foodName = food?.nameVi ?? "Món không còn";
                  return (
                    <button
                      key={`${item.foodId}-${index}`}
                      type="button"
                      aria-haspopup="dialog"
                      aria-label={`${foodName}, ${item.servingLabel}`}
                      data-align-group="template-meal-item"
                      onClick={() => setPicked({ slot, index })}
                      className="m-tint mx-3 flex min-h-11 w-[calc(100%-24px)] cursor-pointer items-center justify-between gap-2 border-0 border-b border-divider bg-transparent py-1 text-left text-text"
                    >
                      <span className={`min-w-0 break-words text-callout font-semibold leading-tight ${food ? "" : "text-secondary"}`}>{foodName}</span>
                      <span className="max-w-[40%] flex-none text-right font-condensed text-callout font-extrabold leading-none tabular-nums">{item.servingLabel}</span>
                    </button>
                  );
                })}
              </section>
            );
          })}
        </Card>
      </section>

      <section aria-labelledby="tpl-total" className="flex flex-col gap-1">
        <SectionHeader id="tpl-total" className="flex min-h-11 items-center">
          Tổng
        </SectionHeader>
        <Card className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline gap-x-1.5">
            <span className="font-display text-display font-black italic leading-none tabular-nums tracking-display">{kcalValue(totals.kcal)}</span>
            <span className="text-cap text-secondary">/ {formatRange(kcalMin, kcalMax)} kcal</span>
            <span className="ml-1 font-display text-display font-extrabold italic leading-none tabular-nums tracking-display">{pctLabel(totals.kcal, kcalMin)}</span>
          </div>
          <LevelBar label={`Kcal so với mục tiêu ngày: ${formatAmount(totals.kcal, "kcal")} trên ${formatAmount(kcalMin, "kcal")}`} pct={pct} heightClass="h-[10px]" />
          <TemplateMacros values={nutrition.values} targets={macroTargets} />
          <p className="m-0 text-xs leading-snug text-secondary">Đủ để so mục tiêu khi áp dụng</p>
        </Card>
      </section>

      <TemplateMicros values={nutrition.values} extras={nutrition.extras} groups={groups} targets={microTargets} summary={summary} empty={foodCount === 0} />

      <div className="mt-1 flex flex-col items-center gap-1">
        {/* A day built from scratch is applied once it is saved (Áp dụng would leave it unsaved) */}
        {!isNew && (
          <PillButton type="button" variant="secondary" onClick={applyToToday} className={OUTLINE_PILL}>
            Áp dụng cho hôm nay
          </PillButton>
        )}
        {/* Xóa is last, in destructive red, and asks first. A day built from scratch is not saved yet: Back drops it */}
        {!isNew && (
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="flex min-h-11 w-full cursor-pointer items-center justify-center border-0 bg-transparent px-4 text-callout font-bold text-destructive-text active:scale-[0.97] transition-press motion-reduce:active:scale-100"
        >
          Xóa mẫu
        </button>
        )}
      </div>

      <ItemSheet
        picked={picked}
        meals={meals}
        onClose={() => setPicked(null)}
        onPortion={(slot, index, portion) => {
          setMeals(setTemplateItemPortion(meals, slot, index, portion));
          setPicked(null);
        }}
        onRemove={(slot, index) => {
          setMeals(removeTemplateItem(meals, slot, index));
          setPicked(null);
        }}
      />

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title={`Xóa ${template?.name ?? shownName}?`} titleId="tpl-delete-title" desktopDialog>
        <div className="flex flex-col gap-3">
          <p className="m-0 px-1 text-sm leading-snug text-secondary">
            Ngày ăn mẫu này ({foodCount} món) sẽ bị xóa. Các món đã ghi trong nhật ký không đổi.
          </p>
          <PillButton type="button" variant="tertiary" onClick={() => setConfirmDelete(false)}>
            Hủy
          </PillButton>
          <PillButton
            type="button"
            variant="destructive"
            onClick={remove}
          >
            Xóa mẫu
          </PillButton>
        </div>
      </Sheet>
    </Frame>
  );
}

/**
 * A food of the template tapped: its portion, changed with the same portion controls as the food page, or taken out of the
 * template. Lưu khẩu phần keeps the new amount in the draft (the template itself waits for the editor's Lưu).
 */
function ItemSheet({
  picked,
  meals,
  onClose,
  onPortion,
  onRemove,
}: {
  picked: { slot: MealSlot; index: number } | null;
  meals: DayTemplateMeal[];
  onClose: () => void;
  onPortion: (slot: MealSlot, index: number, portion: { grams: number; servingLabel: string }) => void;
  onRemove: (slot: MealSlot, index: number) => void;
}) {
  const item = picked ? meals.find((m) => m.slot === picked.slot)?.items[picked.index] ?? null : null;
  const food = item ? catalogFoodById(item.foodId) ?? null : null;
  return (
    <Sheet open={picked !== null} onClose={onClose} title={food?.nameVi ?? "Món không còn"} titleId="tpl-item-title" description={item?.servingLabel} desktopDialog>
      {picked && item && <ItemBody key={`${picked.slot}-${picked.index}`} food={food} item={item} onSave={(p) => onPortion(picked.slot, picked.index, p)} onRemove={() => onRemove(picked.slot, picked.index)} />}
    </Sheet>
  );
}

function ItemBody({
  food,
  item,
  onSave,
  onRemove,
}: {
  food: FoodItem | null;
  item: DayTemplateMeal["items"][number];
  onSave: (portion: { grams: number; servingLabel: string }) => void;
  onRemove: () => void;
}) {
  const [gramsInput, setGramsInput] = useState(String(item.grams));
  const [label, setLabel] = useState(item.servingLabel);
  const grams = parseGramsInput(gramsInput);
  return (
    <div className="flex flex-col gap-3">
      {food && (
        <PortionArea
          food={food}
          gramsInput={gramsInput}
          setGramsInput={setGramsInput}
          selectedServingLabel={label}
          setSelectedServingLabel={setLabel}
          data-align-group="tpl-item"
        />
      )}
      {food && (
        <PillButton type="button" disabled={!(grams > 0)} onClick={() => onSave({ grams, servingLabel: label.trim() || gramsServingLabel(grams) })}>
          Lưu khẩu phần
        </PillButton>
      )}
      <PillButton type="button" variant="destructive" onClick={onRemove}>
        Bỏ khỏi mẫu
      </PillButton>
    </div>
  );
}
