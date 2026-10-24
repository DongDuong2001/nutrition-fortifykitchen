"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Carousel } from "@/components/ui/carousel";
import { CodeSheet } from "@/components/courses/code-sheet";
import { CourseTile } from "@/components/courses/course-tile";
import { useCourseList, useCoursesApi } from "@/hooks/use-courses";
import { useDiary } from "@/lib/diary-store";
import type { CourseSummary } from "@/lib/course-logic";

/** The newest course is "mới" for two weeks after it is made. */
const NEW_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Tài liệu on Khám phá (design/courses Explore): the three newest courses as tiles of the "Món giàu vi chất" pattern, with the lock
 * said in words ("Cần mã", "Đã mở", "Mở ở Level n"), and "Xem tất cả" to the library. Nothing is drawn while the list loads or when
 * there is no course, so a new account never sees an empty carousel.
 */
export function CoursesCarousel() {
  const router = useRouter();
  const { notify } = useDiary();
  const { api } = useCoursesApi();
  const { data } = useCourseList();
  const [asking, setAsking] = useState<CourseSummary | null>(null);
  if (!data || data.length === 0) return null;
  const newest = [...data].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3);
  return (
    <>
      <Carousel
        title="Tài liệu"
        id="explore-courses"
        action={
          <Link href="/explore/documents" className="m-tint inline-flex min-h-11 items-center text-callout font-semibold text-cobalt no-underline">
            Xem tất cả
          </Link>
        }
      >
        {newest.map((c, i) => (
          <li key={c.id} className="w-[12.5rem] shrink-0 snap-start">
            <CourseTile
              course={c}
              size="card"
              isNew={i === 0 && Date.now() - Date.parse(c.createdAt) < NEW_MS}
              onLocked={(course) => (course.lock === "level" ? notify(`Khóa này mở khi bạn lên Level ${course.minLevel ?? 1}.`) : setAsking(course))}
            />
          </li>
        ))}
      </Carousel>
      <CodeSheet
        course={asking}
        api={api}
        onClose={() => setAsking(null)}
        onOpened={(opened) => {
          setAsking(null);
          router.push(`/explore/documents/${opened.id}`);
        }}
      />
    </>
  );
}
