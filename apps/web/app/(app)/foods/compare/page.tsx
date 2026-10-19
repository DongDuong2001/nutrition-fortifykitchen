"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { ChipGroup } from "@/components/ui/chip-group";
import { PillButton } from "@/components/ui/pill-button";
import { SectionTitle } from "@/components/ui/section-title";
import { ComparePicker } from "@/components/foods/compare-picker";
import { CompareTable } from "@/components/foods/compare-table";
import { useBack } from "@/hooks/use-back";
import {
  MAX_COMPARE_FOODS,
  MIN_COMPARE_FOODS,
  buildCompare,
  compareHref,
  parseCompareIds,
  type CompareBasis,
} from "@/lib/food-compare";
import { MOCK_FOODS, type FoodItem } from "@/lib/mock/foods";
import { markUsed } from "@/lib/onboarding-store";
import { useCatalogFoods } from "@/hooks/use-catalog-foods";

const isKnownFood = (id: string) => MOCK_FOODS.some((f) => f.id === id);

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function CompareInner() {
  const router = useRouter();
  // Back goes to where compare was opened from; with no history, to the first food (or the add sheet)
  const goBack = useBack();
  const raw = useSearchParams().get("ids");
  const [basis, setBasis] = useState<CompareBasis>("per100");
  const [pickerOpen, setPickerOpen] = useState(false);

  const { version, pending, failed } = useCatalogFoods();
  // The ids are checked against the catalogue: until the live one has arrived they are kept, not dropped as unknown
  const ids = useMemo(() => (pending || failed ? parseCompareIds(raw, () => true) : parseCompareIds(raw, isKnownFood)), [raw, version, pending, failed]);
  const foods = useMemo(
    () => ids.map((id) => MOCK_FOODS.find((f) => f.id === id)).filter((f): f is FoodItem => !!f),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ids, version]
  );

  // Keep the address clean: duplicates, unknown ids and a fourth id are dropped from ?ids=
  useEffect(() => {
    if (pending || failed) return;
    if ((raw ?? "") !== ids.join(",")) router.replace(compareHref(ids));
  }, [raw, ids, router, pending, failed]);

  const compare = useMemo(() => (foods.length >= MIN_COMPARE_FOODS ? buildCompare(foods, basis) : null), [foods, basis]);

  const setIds = (next: string[]) => router.replace(compareHref(next));
  const canAdd = foods.length < MAX_COMPARE_FOODS;

  return (
    <AppShell>
      <AppHeader
        variant="sub"
        title="So sánh món"
        subtitle={compare ? "Giá trị cao nhất mỗi dòng có chấm xanh." : `Chọn ${MIN_COMPARE_FOODS} hoặc ${MAX_COMPARE_FOODS} món.`}
        onBack={goBack}
        layout="wide"
      />
      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pt-4 pb-6 lg:mx-0 lg:max-w-[1040px] lg:px-8">
        {compare ? (
          <>
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold text-secondary">Tính theo</span>
              <ChipGroup
                columns={2}
                tone="light"
                items={[
                  { id: "per100", label: "100 g", active: basis === "per100", onClick: () => { markUsed("compare-basis"); setBasis("per100"); } },
                  { id: "serving", label: "Khẩu phần", active: basis === "serving", onClick: () => { markUsed("compare-basis"); setBasis("serving"); } },
                ]}
              />
            </div>
            {canAdd && (
              <PillButton variant="secondary" onClick={() => setPickerOpen(true)} className="gap-2">
                <PlusIcon />
                Thêm món
              </PillButton>
            )}
            <div data-tour="compare-table">
            <CompareTable
              columns={compare.columns}
              sections={compare.sections}
              onRemove={(id) => setIds(ids.filter((x) => x !== id))}
            />
            </div>
          </>
        ) : (
          <Card as="section" aria-labelledby="compare-empty" className="flex flex-col items-center gap-3 py-8 text-center">
            <SectionTitle id="compare-empty">Chưa đủ món để so sánh</SectionTitle>
            <p className="m-0 max-w-[320px] text-sm leading-snug text-secondary">
              {foods.length === 1
                ? `Đã chọn ${foods[0].nameVi}. Thêm ít nhất 1 món nữa, tối đa ${MAX_COMPARE_FOODS} món.`
                : `Chọn từ ${MIN_COMPARE_FOODS} đến ${MAX_COMPARE_FOODS} món để xem dinh dưỡng cạnh nhau.`}
            </p>
            <div className="w-full max-w-[320px]">
              <PillButton variant="primary" onClick={() => setPickerOpen(true)} className="gap-2">
                <PlusIcon />
                Thêm món
              </PillButton>
            </div>
          </Card>
        )}
      </main>

      <ComparePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        lockedIds={ids}
        onConfirm={(next) => {
          setPickerOpen(false);
          setIds(next);
        }}
      />
    </AppShell>
  );
}

export default function FoodComparePage() {
  return (
    <Suspense fallback={<div className="min-h-screen w-full bg-page" />}>
      <CompareInner />
    </Suspense>
  );
}
