"use client";

import React, { useDeferredValue, useMemo, useState } from "react";
import { notFound, useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/ui/app-header";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { SwitchGlide } from "@/components/ui/switch-glide";
import { FoodRowLink } from "@/components/foods/food-row-link";
import { useDiary } from "@/lib/diary-store";
import { CatalogStatus } from "@/components/foods/catalog-status";
import { useCatalogFoods } from "@/hooks/use-catalog-foods";
import { getNutrientDefinition } from "@/lib/nutrients";
import { nutrientDot, nutrientFill } from "@/lib/nutrient-colors";
import { formatAmount } from "@/lib/format";
import { isRichNutrientId, richInFoods, richName, richUpperLimitLine, type RichBasis, type RichKind } from "@/lib/rich-in";
import { ageOf, upperLimits } from "@/lib/rda";
import { defaultPortionOf } from "@/lib/portion";
import { useBack } from "@/hooks/use-back";
import { dedupeTwins, rowName } from "@/lib/food-rows";

/** The 4 × 28 px accent bar before a title. */
function AccentBar({ color }: { color: string }) {
  return <span aria-hidden="true" className="h-7 w-1 shrink-0 rounded-sm" style={{ background: color }} />;
}

/**
 * Foods ranked by one nutrient, per 100 g or per usual portion, with the share of the daily target. Two tabs: Thực phẩm
 * (every food but the supplements) and Thực phẩm bổ sung (per usual serving), kept in the URL (?loai=bo-sung) so back
 * from a food returns to the same tab.
 */
export default function RichInPage() {
  const params = useParams<{ nutrient: string }>();
  const goBack = useBack();
  const { targets, profile } = useDiary();
  const [basis, setBasis] = useState<RichBasis>("per100");
  const router = useRouter();
  const pathname = usePathname();
  const kind: RichKind = useSearchParams()?.get("loai") === "bo-sung" ? "supplement" : "food";
  const setKind = (next: RichKind) => router.replace(next === "supplement" ? `${pathname}?loai=bo-sung` : pathname, { scroll: false });
  const supplement = kind === "supplement";
  // A supplement is counted per usual serving (1 viên, 1 gói, 1 muỗng), never per 100 g
  const shownBasis: RichBasis = supplement ? "portion" : basis;

  const id = params?.nutrient ?? "";
  const valid = isRichNutrientId(id);
  const definition = valid ? getNutrientDefinition(id) : undefined;
  const min = valid ? (targets[id]?.min ?? null) : null;
  const { foods, pending, failed, retry } = useCatalogFoods();
  // The list (every food with the nutrient, ranked) is worked out in a second render after the screen is up: the tap on a
  // "Giàu …" tile answers with the header and the chips at once, and the rows follow
  const listed = useDeferredValue(true, false);
  const rows = useMemo(() => (valid && listed ? dedupeTwins(richInFoods(foods, id, shownBasis, min, kind), (r) => r.food) : []), [valid, listed, id, shownBasis, min, kind, foods]);
  // A3 (23/10): a row whose one portion is above this nutrient's UL says so (selenium in Brazil nuts)
  const ul = useMemo(() => (valid ? upperLimits(ageOf(profile.birthYear))[id] : undefined), [valid, id, profile.birthYear]);
  if (!valid || !definition) notFound();

  const name = richName(definition);

  return (
    <AppShell>
      <AppHeader
        variant="sub"
        layout="wide"
        title={`Giàu ${name}`}
        subtitle={`${definition.unit} ${supplement ? "mỗi lần dùng" : basis === "per100" ? "mỗi 100 g" : "mỗi khẩu phần"}`}
        onBack={goBack}
        lead={<AccentBar color={nutrientFill(id)} />}
      />
      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 pb-6 pt-4 lg:mx-0 lg:max-w-[1240px] lg:px-8">
        <Segmented
          as="tabs"
          label="Loại"
          alignGroup="rich-controls"
          value={kind}
          onChange={setKind}
          items={[
            { key: "food", label: "Thực phẩm" },
            { key: "supplement", label: "Thực phẩm bổ sung" },
          ]}
        />
        {!supplement && (
          <Segmented
            label="Tính theo"
            alignGroup="rich-controls"
            value={basis}
            onChange={setBasis}
            items={[
              { key: "per100", label: "Mỗi 100 g" },
              { key: "portion", label: "Mỗi khẩu phần" },
            ]}
          />
        )}
        <SwitchGlide id={`${kind}:${shownBasis}`} order={(supplement ? 2 : 0) + (shownBasis === "per100" ? 0 : 1)}>
          <Card as="section" aria-label={`${supplement ? "Thực phẩm bổ sung" : "Món"} giàu ${name}`} className="flex flex-col">
            {!listed ? (
              <div aria-hidden="true" className="flex flex-col gap-3 py-3">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-5 rounded bg-level-empty" />
                ))}
              </div>
            ) : rows.length === 0 && (pending || failed) ? (
              <CatalogStatus failed={failed} onRetry={retry} />
            ) : rows.length === 0 ? (
              <p className="m-0 py-3 text-cap leading-snug text-secondary">
                {supplement ? `Chưa có thực phẩm bổ sung nào có dữ liệu ${name}.` : `Chưa có thực phẩm nào có dữ liệu ${name}. Bạn có thể tự tạo món mới từ nhãn bao bì.`}
              </p>
            ) : (
              rows.map((row, i) => {
                // A supplement's serving as it is called ("2 viên"), never its grams
                const per = supplement ? defaultPortionOf(row.food).label : row.basis;
                return (
                  <FoodRowLink
                    key={row.food.id}
                    href={`/foods/${row.food.id}`}
                    name={rowName(row.food)}
                    meta={row.pct === null ? per : `${row.pct}% mục tiêu ngày · ${per}`}
                    value={`${formatAmount(row.amount, row.unit)} ${row.unit}`}
                    withBorderTop={i > 0}
                    valueColor={nutrientDot(id)}
                    category={row.food.category}
                    note={richUpperLimitLine(row.food, id, ul)}
                  />
                );
              })
            )}
          </Card>
        </SwitchGlide>
      </main>
    </AppShell>
  );
}
