"use client";

import React, { useMemo, useState, useSyncExternalStore } from "react";
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
import { useDiary } from "@/lib/diary-store";
import { useBack } from "@/hooks/use-back";
import { useDayTemplateRows } from "@/hooks/use-day-templates";
import { CATALOG_FOODS, catalogFoodById, catalogVersion, subscribeCatalog } from "@/lib/catalog";
import {
  DAY_TEMPLATE_TAGS,
  applyTemplate,
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
import { SLOT_LABEL, pctLabel, pctOf } from "@/lib/home";
import { getMealSlotNameVi, type MealSlot } from "@/lib/meal-slot";
import { markUsed } from "@/lib/onboarding-store";
import { SHEET_BACK_DELAY_MS } from "@/lib/sheet-history";
import { HOME_ROUTE } from "@/lib/home-route";
import { kcalValue } from "@/lib/kcal";

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

/** NMEditor: rename, tag, the foods of each meal, the total against today's target, copy into today, delete. */
export function TemplateEditor({ id }: { id: string }) {
  const { hydrated } = useDiary();
  const { templates } = useDayTemplateRows();
  const [deleted, setDeleted] = useState(false);
  const template = templates.find((t) => t.id === id);

  if (!hydrated || deleted) {
    return (
      <Frame title="Ngày ăn mẫu">
        {!deleted && <div aria-hidden="true" className="h-[240px] rounded-card bg-level-empty motion-safe:animate-pulse" />}
      </Frame>
    );
  }
  if (!template) {
    return (
      <Frame title="Ngày ăn mẫu">
        <Card className="flex flex-col items-start gap-3">
          <p className="m-0 text-callout font-semibold">Không tìm thấy ngày mẫu này.</p>
          <Link href="/explore/ngay-mau" className="flex min-h-11 items-center text-cap font-bold text-cobalt no-underline">
            Về Ngày ăn mẫu
          </Link>
        </Card>
      </Frame>
    );
  }
  return <EditorForm key={template.id} template={template} onDeleted={() => setDeleted(true)} />;
}

function EditorForm({ template, onDeleted }: { template: DayTemplate; onDeleted: () => void }) {
  const router = useRouter();
  const goBack = useBack();
  const { data, copyEntries, notify } = useDiary();
  const { templates, setTemplates } = useDayTemplateRows();
  const version = useSyncExternalStore(subscribeCatalog, catalogVersion, () => 0);

  // The draft: nothing is kept until Lưu
  const [name, setName] = useState(template.name);
  const [tag, setTag] = useState<DayTemplateTag>(template.tag);
  const [meals, setMeals] = useState<DayTemplateMeal[]>(template.meals);
  const [picked, setPicked] = useState<{ slot: MealSlot; index: number } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const draft: DayTemplate = useMemo(() => ({ ...template, name: name.trim() || template.name, tag, meals }), [template, name, tag, meals]);
  // version: a catalogue that arrives changes what the foods add up to
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const totals = useMemo(() => templateTotals(draft, CATALOG_FOODS), [draft, version]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const perMeal = useMemo(() => templateMealKcal(draft, CATALOG_FOODS), [draft, version]);
  const kcalMin = data.calories.targetMin;
  const kcalMax = data.calories.targetMax;
  const pct = pctOf(totals.kcal, kcalMin);
  const foodCount = meals.reduce((n, m) => n + m.items.length, 0);

  function save() {
    setTemplates(updateDayTemplate(templates, template.id, { name, tag, meals }));
    notify(templateSavedMessage(draft.name, totals.itemCount, totals.kcal));
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
      setTemplates(removeDayTemplate(templates, template.id));
      goBack();
    }, SHEET_BACK_DELAY_MS + 100);
  }

  const pickedItem = picked ? meals.find((m) => m.slot === picked.slot)?.items[picked.index] ?? null : null;
  const pickedFood = pickedItem ? catalogFoodById(pickedItem.foodId) : null;

  return (
    <Frame
      title={name.trim() || template.name}
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
        <Card padding={false} className="overflow-hidden">
          {meals.map((meal) => {
            const kcal = perMeal.find((m) => m.slot === meal.slot)?.kcal ?? 0;
            return (
              <section key={meal.slot} aria-label={getMealSlotNameVi(meal.slot)}>
                <div data-align-group="template-meal-head" className="flex min-h-11 items-center gap-1.5 pl-3">
                  <span aria-hidden="true" className={`h-2 w-2 flex-none rounded-full ${MEAL_DOT[meal.slot]}`} />
                  <span className="font-display text-callout font-extrabold uppercase italic leading-[1.1] tracking-[0.01em]">{SLOT_LABEL[meal.slot]}</span>
                  <span className="ml-0.5 font-condensed text-cap font-extrabold leading-none tabular-nums text-secondary">{kcalValue(kcal)}</span>
                </div>
                <div aria-hidden="true" className="mx-3 h-px bg-divider" />
                {meal.items.map((item, index) => {
                  const food = catalogFoodById(item.foodId);
                  const foodName = food?.nameVi ?? "Món không còn";
                  return (
                    <button
                      key={`${item.foodId}-${index}`}
                      type="button"
                      aria-haspopup="dialog"
                      aria-label={`${foodName}, ${item.servingLabel}`}
                      data-align-group="template-meal-item"
                      onClick={() => setPicked({ slot: meal.slot, index })}
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
          <p className="m-0 text-xs leading-snug text-secondary">Đủ để so mục tiêu khi áp dụng</p>
        </Card>
      </section>

      <div className="mt-1 flex flex-col items-center gap-1">
        <PillButton type="button" variant="secondary" onClick={applyToToday} className={OUTLINE_PILL}>
          Áp dụng cho hôm nay
        </PillButton>
        {/* Xóa is last, in destructive red, and asks first */}
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="flex min-h-11 w-full cursor-pointer items-center justify-center border-0 bg-transparent px-4 text-callout font-bold text-destructive-text active:scale-[0.97] transition-press motion-reduce:active:scale-100"
        >
          Xóa mẫu
        </button>
      </div>

      <Sheet
        open={picked !== null}
        onClose={() => setPicked(null)}
        title={pickedFood?.nameVi ?? "Món không còn"}
        titleId="tpl-item-title"
        description={pickedItem?.servingLabel}
        desktopDialog
      >
        {foodCount > 1 ? (
          <PillButton
            type="button"
            variant="danger"
            onClick={() => {
              if (picked) setMeals(removeTemplateItem(meals, picked.slot, picked.index));
              setPicked(null);
            }}
          >
            Bỏ khỏi mẫu
          </PillButton>
        ) : (
          <p className="m-0 px-1 text-sm leading-snug text-secondary">Mẫu cần ít nhất một món.</p>
        )}
      </Sheet>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title={`Xóa ${template.name}?`} titleId="tpl-delete-title" desktopDialog>
        <div className="flex flex-col gap-3">
          <p className="m-0 px-1 text-sm leading-snug text-secondary">
            Ngày mẫu này ({foodCount} món) sẽ bị xóa. Các món đã ghi trong nhật ký không đổi.
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
