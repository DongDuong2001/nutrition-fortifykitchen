-- Tài liệu: the app's documents and rules, markdown text by file name (apps/api/internal/documents). Every signed-in user
-- reads them through the API; a write needs a live access code. A coach or an admin makes codes; only their SHA-256 is kept.
CREATE TABLE IF NOT EXISTS nutrition.documents (
  name TEXT PRIMARY KEY CHECK (name ~ '^[A-Za-z0-9_-][A-Za-z0-9_.-]{0,99}$' AND position('..' IN name) = 0),
  content TEXT NOT NULL CHECK (octet_length(content) <= 1000000),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_documents_touch_updated_at ON nutrition.documents;
CREATE TRIGGER trg_documents_touch_updated_at
BEFORE UPDATE ON nutrition.documents
FOR EACH ROW
EXECUTE FUNCTION nutrition.touch_updated_at();

CREATE TABLE IF NOT EXISTS nutrition.document_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash TEXT NOT NULL UNIQUE CHECK (code_hash ~ '^[0-9a-f]{64}$'),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

-- A coach's live codes, newest first (GET /document-codes)
CREATE INDEX IF NOT EXISTS idx_document_access_codes_creator
  ON nutrition.document_access_codes (created_by, created_at DESC) WHERE revoked_at IS NULL;

-- Only the API (which connects past RLS) reads or writes these: no policy, so PostgREST and the browser get nothing
ALTER TABLE nutrition.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition.document_access_codes ENABLE ROW LEVEL SECURITY;
