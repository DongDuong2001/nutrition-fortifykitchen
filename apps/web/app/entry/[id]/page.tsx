"use client";

import React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useDiary } from "@/lib/diary-store";
import { EntryEditor } from "@/components/foods/entry-editor";

export default function EntryPage() {
  const params = useParams();
  const id = params?.id as string;
  const { getEntry, hydrated } = useDiary();

  // Added entries and edits load after mount, so wait for them before saying the entry is missing
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-page" aria-busy="true">
        <div aria-hidden="true" className="mx-auto mt-3 flex w-full max-w-[480px] flex-col gap-4 px-4">
          <div className="h-11 w-11 rounded-full bg-divider" />
          <div className="h-80 rounded-2xl bg-card" />
        </div>
      </div>
    );
  }

  const view = getEntry(id);
  if (!view) {
    return (
      <div className="min-h-screen bg-page text-text font-sans">
        <div className="mx-auto flex w-full max-w-[480px] flex-col items-center gap-3 px-4 pt-16 text-center">
          <p className="m-0 text-base font-bold">Không tìm thấy món này</p>
          <Link href="/today" className="min-h-[44px] content-center text-base font-bold text-blue no-underline">
            Về Hôm nay
          </Link>
        </div>
      </div>
    );
  }

  return <EntryEditor key={view.id} view={view} />;
}
