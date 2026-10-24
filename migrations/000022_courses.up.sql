-- 000022_courses.up.sql
-- Tài liệu becomes courses (Skool-style, 24/10): Khoá (course) -> Phần (part) -> Bài (lesson). A lesson is a PDF (its pages are images
-- the coach's browser made; the files live on the API's disk, under courses/<course>/<lesson>/<page>.webp, and only their rows are here)
-- or text written in the app (markdown). Who may open a course is the coach's choice per course:
--   open  : every signed-in user
--   code  : one code per course (SHA-256 only, 30 days, revocable); a code opens every lesson of that course (course_unlocks remembers
--           who used one, and stops counting when that code is revoked or has lapsed)
--   level : the user's profiles.level (migration 000021) is at least min_level
-- A coach or an admin sees everything. The list of courses never needs access; opening does. Progress is per user and lesson.
-- The old nutrition.documents tables (000017) are left as they are: nothing here reads or drops them.
-- Only the API (which connects past RLS) reads or writes these: RLS on, no policy, as 000017.

CREATE TABLE IF NOT EXISTS nutrition.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  subtitle TEXT NOT NULL DEFAULT '' CHECK (char_length(subtitle) <= 200),
  -- which gradient pair of the design (web lib/courses TONES) the course tile and its parts use
  tone SMALLINT NOT NULL DEFAULT 0 CHECK (tone BETWEEN 0 AND 7),
  access TEXT NOT NULL DEFAULT 'code' CHECK (access IN ('open', 'code', 'level')),
  min_level SMALLINT CHECK (min_level BETWEEN 1 AND 5),
  sort INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT courses_level_access CHECK ((access = 'level') = (min_level IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS nutrition.course_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES nutrition.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  sort INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_course_parts_course ON nutrition.course_parts (course_id, sort);

CREATE TABLE IF NOT EXISTS nutrition.course_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES nutrition.courses(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES nutrition.course_parts(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  kind TEXT NOT NULL CHECK (kind IN ('pdf', 'text')),
  -- markdown of a text lesson (at most 1,000,000 bytes, as 000017's documents); null for a PDF
  content TEXT CHECK (octet_length(content) <= 1000000),
  -- a PDF: how many page images it will have (at most 60); a text lesson: 0
  page_count SMALLINT NOT NULL DEFAULT 0 CHECK (page_count BETWEEN 0 AND 60),
  -- a text lesson: minutes to read (worked out on save); a PDF: 0
  minutes SMALLINT NOT NULL DEFAULT 0 CHECK (minutes BETWEEN 0 AND 600),
  -- false while a PDF's pages are still being uploaded: learners never see it; true once every page is there
  ready BOOLEAN NOT NULL DEFAULT true,
  sort INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT course_lessons_kind_shape CHECK ((kind = 'text' AND page_count = 0) OR (kind = 'pdf' AND content IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_course_lessons_course ON nutrition.course_lessons (course_id);
CREATE INDEX IF NOT EXISTS idx_course_lessons_part ON nutrition.course_lessons (part_id, sort);

-- The page images that are on disk, one row per page (1-based): the API streams a page only when its row is here
CREATE TABLE IF NOT EXISTS nutrition.course_lesson_pages (
  lesson_id UUID NOT NULL REFERENCES nutrition.course_lessons(id) ON DELETE CASCADE,
  page SMALLINT NOT NULL CHECK (page BETWEEN 1 AND 60),
  bytes INT NOT NULL CHECK (bytes BETWEEN 1 AND 1048576),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (lesson_id, page)
);

CREATE TABLE IF NOT EXISTS nutrition.course_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES nutrition.courses(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL UNIQUE CHECK (code_hash ~ '^[0-9a-f]{64}$'),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);
-- A course's live codes, newest first (GET /courses/{id}/codes)
CREATE INDEX IF NOT EXISTS idx_course_codes_course ON nutrition.course_codes (course_id, created_at DESC) WHERE revoked_at IS NULL;

-- Who opened a code course with which code. The access check joins the code, so revoking it (or its 30 days ending) closes the course again
CREATE TABLE IF NOT EXISTS nutrition.course_unlocks (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES nutrition.courses(id) ON DELETE CASCADE,
  code_id UUID NOT NULL REFERENCES nutrition.course_codes(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS nutrition.course_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES nutrition.course_lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ,
  last_page SMALLINT NOT NULL DEFAULT 1 CHECK (last_page BETWEEN 1 AND 60),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);

DROP TRIGGER IF EXISTS trg_courses_touch_updated_at ON nutrition.courses;
CREATE TRIGGER trg_courses_touch_updated_at BEFORE UPDATE ON nutrition.courses FOR EACH ROW EXECUTE FUNCTION nutrition.touch_updated_at();
DROP TRIGGER IF EXISTS trg_course_parts_touch_updated_at ON nutrition.course_parts;
CREATE TRIGGER trg_course_parts_touch_updated_at BEFORE UPDATE ON nutrition.course_parts FOR EACH ROW EXECUTE FUNCTION nutrition.touch_updated_at();
DROP TRIGGER IF EXISTS trg_course_lessons_touch_updated_at ON nutrition.course_lessons;
CREATE TRIGGER trg_course_lessons_touch_updated_at BEFORE UPDATE ON nutrition.course_lessons FOR EACH ROW EXECUTE FUNCTION nutrition.touch_updated_at();
DROP TRIGGER IF EXISTS trg_course_progress_touch_updated_at ON nutrition.course_progress;
CREATE TRIGGER trg_course_progress_touch_updated_at BEFORE UPDATE ON nutrition.course_progress FOR EACH ROW EXECUTE FUNCTION nutrition.touch_updated_at();

ALTER TABLE nutrition.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition.course_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition.course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition.course_lesson_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition.course_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition.course_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition.course_progress ENABLE ROW LEVEL SECURITY;
