"use client";

import React from "react";
import { useParams } from "next/navigation";
import { TemplateEditor } from "@/components/templates/template-editor";

/** Soạn ngày mẫu: rename, tag, the foods of each meal, copy into today, or delete. A pushed screen under Ngày ăn mẫu. */
export default function DayTemplatePage() {
  const params = useParams<{ id: string }>();
  return <TemplateEditor id={params?.id ?? ""} />;
}
