import React from "react";
import { PillButton } from "@/components/ui/pill-button";

/**
 * "Tạo món mới": one centred, full-width secondary button (outline pill, icon + label, 48 px or more) with a
 * short helper line centred under it. Used under the add sheet's list and in the empty states of Khám phá.
 */
export function CreateFoodButton({ href, helper = "Không thấy món? Tự nhập dinh dưỡng" }: { href: string; helper?: string | null }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <PillButton variant="secondary" href={href} className="gap-2">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Tạo món mới
      </PillButton>
      {helper && <p className="m-0 text-cap leading-snug text-secondary">{helper}</p>}
    </div>
  );
}
