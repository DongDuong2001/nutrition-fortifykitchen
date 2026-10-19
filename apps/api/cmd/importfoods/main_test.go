package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestEdiblePortionsJSONParsing(t *testing.T) {
	// Path relative to cmd/importfoods (4 levels up to repo root)
	path := filepath.Join("..", "..", "..", "..", "docs", "data", "edible-part-portions-2026-10-19.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		// Fallback if run from repo root or apps/api
		path = filepath.Join("..", "..", "docs", "data", "edible-part-portions-2026-10-19.json")
		raw, err = os.ReadFile(path)
	}
	if err != nil {
		t.Fatalf("edible portions file not found: %v", err)
	}

	var data EdiblePortionsData
	if err := json.Unmarshal(raw, &data); err != nil {
		t.Fatalf("failed to unmarshal edible portions JSON: %v", err)
	}

	if len(data.RemovePortions) == 0 {
		t.Errorf("expected remove_portions to have entries, got 0")
	}

	if len(data.Renames) == 0 {
		t.Errorf("expected renames to have entries, got 0")
	}

	// Verify the first item has valid structure
	first := data.RemovePortions[0]
	if first.Source == "" || first.SourceID == "" || len(first.Remove) == 0 {
		t.Errorf("first remove_portion entry has empty fields: %+v", first)
	}

	// Verify first rename has valid structure
	firstRename := data.Renames[0]
	if firstRename.Source == "" || firstRename.SourceID == "" || firstRename.From == "" || firstRename.To == "" {
		t.Errorf("first rename entry has empty fields: %+v", firstRename)
	}
}
