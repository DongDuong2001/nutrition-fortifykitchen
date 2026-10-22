"use client";

import React, { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { FormRow } from "@/components/ui/form-row";
import { PillButton } from "@/components/ui/pill-button";

export interface SavedMealManageSheetProps {
  open: boolean;
  onClose: () => void;
  name: string;
  itemCount: number;
  onRename: (name: string) => void;
  onDelete: () => void;
}

/** Rename or delete one Bữa ăn của tôi. Delete asks for a confirm step first. Sheet on a phone, dialog on desktop. */
export function SavedMealManageSheet({ open, onClose, name, itemCount, onRename, onDelete }: SavedMealManageSheetProps) {
  const [draft, setDraft] = useState(name);
  const [confirming, setConfirming] = useState(false);

  // Every opening starts at the rename form with the current name
  useEffect(() => {
    if (open) {
      setDraft(name);
      setConfirming(false);
    }
  }, [open, name]);

  return (
    <Sheet open={open} onClose={onClose} title={confirming ? `Xóa ${name}?` : name} titleId="saved-meal-title" desktopDialog>
      {confirming ? (
        <div className="flex flex-col gap-3">
          <p className="m-0 px-1 text-sm leading-snug text-secondary">
            Bữa ăn của tôi này ({itemCount} món) sẽ bị xóa. Các món đã ghi trong Nhật ký không đổi.
          </p>
          <PillButton type="button" variant="tertiary" onClick={() => setConfirming(false)}>
            Hủy
          </PillButton>
          <PillButton
            type="button"
            variant="destructive"
            onClick={() => {
              onDelete();
              onClose();
            }}
          >
            Xóa Bữa ăn của tôi
          </PillButton>
        </div>
      ) : (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            onRename(draft);
            onClose();
          }}
          className="flex flex-col gap-3"
        >
          <FormRow label="Đổi tên" htmlFor="saved-meal-name">
            <input
              id="saved-meal-name"
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoComplete="off"
              className="h-12 w-full rounded-xl border-2 border-transparent bg-surface px-3 text-base text-text outline-none transition-colors focus:border-cobalt"
            />
          </FormRow>
          <PillButton type="submit" variant="primary" disabled={!draft.trim()}>
            Lưu tên
          </PillButton>
          {/* Xóa is always the last item, in destructive red; the sheet's own Close is the leading circle in its header */}
          <PillButton type="button" variant="danger" onClick={() => setConfirming(true)}>
            Xóa
          </PillButton>
        </form>
      )}
    </Sheet>
  );
}
