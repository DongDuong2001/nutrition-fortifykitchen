// The live build's stand-in for lib/mock/courses-mock.ts (see the note in lib/mock/live/history.ts). Live mode talks to the API
// (lib/courses.ts liveApi) and never asks for the mock, so this holds none of the sample courses and says so if it is ever asked.
import type { CoursesApi, CourseViewer } from "../../courses-types";

export function mockCoursesApi(viewer: CourseViewer): CoursesApi {
  void viewer;
  throw new Error("The sample courses are not part of a live build.");
}

export function resetMockCourses(): void {}
