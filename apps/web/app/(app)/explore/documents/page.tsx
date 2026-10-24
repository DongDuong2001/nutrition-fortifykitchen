import type { Metadata } from "next";
import { CoursesLibrary } from "@/components/courses/courses-library";

export const metadata: Metadata = { title: "Tài liệu" };

export default function DocumentsPage() {
  return <CoursesLibrary />;
}
