"use client";

import React, { useMemo, useState } from "react";
import { notFound, useParams } from "next/navigation";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { ChipGroup } from "@/components/ui/chip-group";
import { FoodRowLink } from "@/components/foods/food-row-link";
import { useDiary } from "@/lib/diary-store";
import { CatalogStatus } from "@/components/foods/catalog-status";
import { useCatalogFoods } from "@/hooks/use-catalog-foods";
import { getNutrientDefinition } from "@/lib/nutrients";
import { formatAmount } from "@/lib/format";
import { isRichNutrientId, richInFoods, richName, type RichBasis } from "@/lib/rich-in";
import { useBack } from "@/hooks/use-back";

/** Foods ranked by one nutrient, per 100 g or per usual portion, with the share of the daily target. */
export default function RichInPage() {
  const params = useParams<{ nutrient: string }>();
  const goBack = useBack();
  const { targets } = useDiary();
  const [basis, setBasis] = useState<RichBasis>("per100");

  const id = params?.nutrient ?? "";
  const valid = isRichNutrientId(id);
  const definition = valid ? getNutrientDefinition(id) : undefined;
  const min = valid ? (targets[id]?.min ?? null) : null;
  const { foods, pending, failed, retry } = useCatalogFoods();
  const rows = useMemo(() => (valid ? richInFoods(foods, id, basis, min) : []), [valid, id, basis, min, foods]);
  if (!valid || !definition) notFound();

  const name = richName(definition.nameVi);

  return (
    <AppShell>
      <AppHeader
        variant="sub"
        title={`Giàu ${name}`}
        subtitle={`${definition.unit} ${basis === "per100" ? "mỗi 100 g" : "mỗi khẩu phần"}`}
        onBack={goBack}
        layout="wide"
      />
      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pb-6 pt-4 lg:mx-0 lg:max-w-[720px] lg:px-8">
        <ChipGroup
          columns={2}
          tone="light"
          items={[
            { id: "per100", label: "Mỗi 100 g", active: basis === "per100", onClick: () => setBasis("per100") },
            { id: "portion", label: "Mỗi khẩu phần", active: basis === "portion", onClick: () => setBasis("portion") },
          ]}
        />
        <Card as="section" aria-label={`Món giàu ${name}`} className="flex flex-col">
          {rows.length === 0 && (pending || failed) ? (
            <CatalogStatus failed={failed} onRetry={retry} />
          ) : rows.length === 0 ? (
            <p className="m-0 py-3 text-[13px] leading-snug text-secondary">Chưa có món nào có dữ liệu {name}. Bạn có thể tự tạo món mới từ nhãn bao bì.</p>
          ) : (
            rows.map((row, i) => (
              <FoodRowLink
                key={row.food.id}
                href={`/foods/${row.food.id}`}
                name={row.food.nameVi}
                meta={row.pct === null ? row.basis : `${row.pct}% mục tiêu ngày · ${row.basis}`}
                value={`${formatAmount(row.amount, row.unit)} ${row.unit}`}
                withBorderTop={i > 0}
              />
            ))
          )}
        </Card>
      </main>
    </AppShell>
  );
}
