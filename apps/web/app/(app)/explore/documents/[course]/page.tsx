import type { Metadata } from "next";
import { CourseScreen } from "@/components/courses/course-screen";

export const metadata: Metadata = { title: "Khóa học" };

export default async function CoursePage({ params }: { params: Promise<{ course: string }> }) {
  return <CourseScreen id={(await params).course} />;
}
