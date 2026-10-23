import type { Metadata } from "next";
import { DocumentsScreen } from "@/components/documents/documents-screen";

export const metadata: Metadata = { title: "Tài liệu" };

export default function DocumentsPage() {
  return <DocumentsScreen />;
}
