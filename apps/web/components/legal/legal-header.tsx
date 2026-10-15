"use client";

import React from "react";
import { AppHeader } from "@/components/ui/app-header";
import { useBack } from "@/hooks/use-back";

/** The header of the legal pages (server components): back goes where the reader came from, else Cài đặt. */
export function LegalHeader({ title, alignGroup }: { title: string; alignGroup: string }) {
  const goBack = useBack();
  return <AppHeader variant="sub" title={title} onBack={goBack} layout="wide" alignGroup={alignGroup} />;
}
