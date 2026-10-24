import type { Metadata } from "next";
import { LessonReader } from "@/components/courses/lesson-reader";

export const metadata: Metadata = { title: "Bài học" };

export default async function LessonPage({ params }: { params: Promise<{ course: string; lesson: string }> }) {
  const { course, lesson } = await params;
  return <LessonReader courseId={course} lessonId={lesson} />;
}
