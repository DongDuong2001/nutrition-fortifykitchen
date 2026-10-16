"use client";

import Link from "next/link";
import { Sheet } from "@/components/ui/sheet";
import { PillButton } from "@/components/ui/pill-button";
import { MATCH_LABEL, MATCH_ORDER, PROXY_NOTICE, UNVERIFIED_TEXT, coverageText, isProxy, matchOf } from "@/lib/food-source";
import { foodSourceLabel } from "@/lib/food-meta";
import type { FoodItem } from "@/lib/mock/foods";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div data-align-group="source-row" className="flex flex-col gap-1 border-t border-divider py-3">
      <dt className="text-[13px] font-semibold text-secondary">{label}</dt>
      <dd className="m-0 break-words text-[15px] leading-snug text-text">{children}</dd>
    </div>
  );
}

/**
 * Nguồn dữ liệu: where a food's numbers come from, how much of the 22 micros they cover and how close the match
 * is. A proxy food (a similar food stands in for it) says so in an amber notice.
 */
export function SourceSheet({ food, open, onClose }: { food: FoodItem; open: boolean; onClose: () => void }) {
  const match = matchOf(food);
  const ref = food.sourceRef;
  return (
    <Sheet open={open} onClose={onClose} title="Nguồn dữ liệu" titleId="source-sheet-title" desktopDialog>
      {isProxy(food) && (
        <p role="note" className="m-0 rounded-xl bg-warning-bg px-3 py-2 text-[13px] leading-snug text-warning-text">
          {PROXY_NOTICE}
        </p>
      )}
      <dl className="m-0 flex flex-col">
        <Row label="Nguồn">
          {ref ? `${foodSourceLabel(food.source)} · ${ref.db}` : foodSourceLabel(food.source)}
        </Row>
        <Row label="Mã món gốc">
          {ref ? (
            ref.url ? (
              <span className="flex flex-wrap items-center gap-x-2">
                <a href={ref.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center font-semibold text-blue">
                  {ref.id}
                </a>
                {!ref.verified && <span className="text-[13px] text-secondary">({UNVERIFIED_TEXT})</span>}
              </span>
            ) : (
              ref.id
            )
          ) : (
            "—"
          )}
        </Row>
        <Row label="Có dữ liệu">{coverageText(food)}</Row>
        <Row label="Độ khớp">
          <span className="font-semibold">
            {MATCH_LABEL[match].name} · {MATCH_LABEL[match].detail}
          </span>
          <span className="mt-1 block text-[13px] text-secondary">
            {MATCH_ORDER.map((m) => `${MATCH_LABEL[m].name} ${MATCH_LABEL[m].detail}`).join(" · ")}
          </span>
        </Row>
      </dl>
      <Link href="/settings/data-sources" className="inline-flex min-h-[44px] items-center px-1 text-[15px] font-bold text-blue no-underline">
        Xem tất cả nguồn dữ liệu
      </Link>
      <PillButton type="button" variant="secondary" onClick={onClose}>
        Đóng
      </PillButton>
    </Sheet>
  );
}
