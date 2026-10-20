"use client";

import { useEffect, useState } from "react";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { parseCustomAmount } from "@/lib/custom-targets";
import { formatAmount } from "@/lib/format";
import type { TargetRowData } from "./target-rows";

/**
 * cc-73b: sets a custom daily target for one vitamin or mineral, or goes back to the default (DRI) amount. Only reachable
 * while the custom-targets flag is on (lib/custom-targets).
 */
export function CustomTargetSheet({
  row,
  onSave,
  onReset,
  onClose,
}: {
  row: TargetRowData | null;
  onSave: (id: string, amount: number) => void;
  onReset: (id: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const id = row?.id;
  useEffect(() => {
    if (row) {
      setText(row.amount === undefined ? "" : String(row.amount).replace(".", ","));
      setError(null);
    }
  }, [row]);

  function save() {
    if (!id) return;
    const parsed = parseCustomAmount(text);
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }
    onSave(id, parsed.value);
  }

  const unit = row?.unit ?? "";
  return (
    <Sheet open={row !== null} onClose={onClose} title={row ? `Mục tiêu ${row.label}` : "Mục tiêu"} titleId="custom-target-title" desktopDialog>
      {row && (
        <form
          className="flex flex-col gap-3 pb-2"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <p className="m-0 text-cap text-secondary">
            {row.defaultValue !== undefined ? `Mặc định: ${formatAmount(row.defaultValue, unit)} ${unit}${row.detail ? ` (${row.detail})` : ""}.` : row.detail}
            {row.max ? ` ${row.max}.` : ""}
          </p>
          <label className="flex flex-col gap-1 text-callout font-semibold" htmlFor="custom-target-input">
            Mục tiêu mỗi ngày ({unit})
            <input
              id="custom-target-input"
              type="text"
              inputMode="decimal"
              enterKeyHint="done"
              autoComplete="off"
              value={text}
              onChange={(e) => setText(e.target.value.replace(/[^0-9.,]/g, ""))}
              aria-invalid={error !== null}
              aria-describedby={error ? "custom-target-error" : undefined}
              // 16 px at least: iOS zooms into smaller fields
              className="h-12 rounded-card border border-card-border bg-card px-4 text-base font-normal tabular-nums"
            />
          </label>
          {error && (
            <p id="custom-target-error" role="alert" className="m-0 text-cap text-destructive">
              {error}
            </p>
          )}
          <PillButton type="submit">Lưu</PillButton>
          {row.custom && (
            <PillButton type="button" variant="secondary" onClick={() => id && onReset(id)}>
              Về mặc định
            </PillButton>
          )}
        </form>
      )}
    </Sheet>
  );
}
