"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCoaching } from "@/hooks/use-coaching";
import type { CourseDetail, CourseSummary } from "@/lib/course-logic";
import { CoursesError, coursesApi, onProgressSaved, type CoursesApi } from "@/lib/courses";

/** The courses API for the signed-in viewer (the mock decides access from their role and Level; the server from the session). */
export function useCoursesApi(): { api: CoursesApi; ready: boolean; canManage: boolean } {
  const { role, level, hydrated } = useCoaching();
  const api = useMemo(() => coursesApi({ role, level }), [role, level]);
  return { api, ready: hydrated, canManage: role === "coach" || role === "admin" };
}

export interface Loaded<T> {
  data: T | null;
  /** The refusal, when the load failed (a 403 `locked` says why a course is shut). */
  error: CoursesError | Error | null;
  reload: () => void;
  set: (next: T) => void;
}

/** Runs `load` when the viewer is known and whenever `reload` is called; keeps what it had while it reloads. */
function useLoaded<T>(load: ((api: CoursesApi) => Promise<T>) | null, key: string, watchProgress = true): Loaded<T> {
  const { api, ready } = useCoursesApi();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);
  const latest = useRef(load);
  latest.current = load;
  useEffect(() => {
    if (!ready || !latest.current) return;
    let live = true;
    latest.current(api).then(
      (value) => {
        if (!live) return;
        setData(value);
        setError(null);
      },
      (e: Error) => {
        if (!live) return;
        setData(null);
        setError(e);
      }
    );
    return () => {
      live = false;
    };
  }, [api, ready, key, tick]);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  // The reader saves the place as it closes, which can be after this screen read the course: ask again when a save lands
  useEffect(() => (watchProgress ? onProgressSaved(reload) : undefined), [watchProgress, reload]);
  return { data, error, reload, set: setData };
}

/** Every course with its lock and my progress (null while loading). */
export const useCourseList = (): Loaded<CourseSummary[]> => useLoaded((api) => api.list(), "list");

/** One course the viewer may open (a CoursesError 403 `locked` otherwise). The reader passes `watch` false: it saves progress, it does not show it. */
export const useCourse = (id: string, watch = true): Loaded<CourseDetail> => useLoaded((api) => api.get(id), `course:${id}`, watch);
