package diary

import (
	"strings"
	"testing"
)

// grams ($7) feeds the NUMERIC grams column and COALESCE($7, 100) for serving_size_g. Without one explicit type,
// Postgres deduces numeric for one use and integer for the other and rejects every insert (SQLSTATE 42P08).
func TestCreateEntrySQLCastsGramsOnce(t *testing.T) {
	sql := strings.Join(strings.Fields(createEntrySQL), " ")
	if !strings.Contains(sql, "$6, $7::numeric, $8") {
		t.Errorf("grams must be $7::numeric:\n%s", sql)
	}
	if !strings.Contains(sql, "COALESCE($7::numeric, 100)") {
		t.Errorf("serving_size_g must be COALESCE($7::numeric, 100):\n%s", sql)
	}
	if strings.Count(sql, "$7") != strings.Count(sql, "$7::numeric") {
		t.Errorf("every use of $7 must carry the cast:\n%s", sql)
	}
}
