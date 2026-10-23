-- 000022_courses.down.sql: back to Tài liệu as documents only. Every course, part, lesson, code and progress row is lost; the page images
-- stay on the API's disk (COURSES_DIR) and are not read any more (delete the folder by hand).
DROP TABLE IF EXISTS nutrition.course_progress;
DROP TABLE IF EXISTS nutrition.course_unlocks;
DROP TABLE IF EXISTS nutrition.course_codes;
DROP TABLE IF EXISTS nutrition.course_lesson_pages;
DROP TABLE IF EXISTS nutrition.course_lessons;
DROP TABLE IF EXISTS nutrition.course_parts;
DROP TABLE IF EXISTS nutrition.courses;
