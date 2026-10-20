package nutrition

import (
	"strings"
	"testing"
)

func TestBuildSearchFoodsQuery_SingleWord(t *testing.T) {
	filter := FoodSearchFilter{
		Query: "chuối",
		Page:  1,
		Limit: 20,
	}

	countSQL, querySQL, countArgs, queryArgs := buildSearchFoodsQuery(filter)

	if !strings.Contains(countSQL, "SELECT COUNT(*) FROM nutrition.foods WHERE") {
		t.Errorf("unexpected countSQL: %s", countSQL)
	}

	// For "chuối", single word: $1 is "chuối"
	if len(countArgs) != 1 || countArgs[0] != "chuối" {
		t.Fatalf("expected countArgs to contain ['chuối'], got %v", countArgs)
	}

	// ORDER BY must reference $1 for the full query
	if !strings.Contains(querySQL, "CASE WHEN name_search ILIKE lower(unaccent($1::text)) || '%' THEN 1") {
		t.Errorf("expected querySQL to rank by $1, got: %s", querySQL)
	}
	if !strings.Contains(querySQL, "similarity(name_search, lower(unaccent($1::text))) DESC") {
		t.Errorf("expected similarity against $1, got: %s", querySQL)
	}

	if len(queryArgs) != 3 || queryArgs[0] != "chuối" || queryArgs[1] != 20 || queryArgs[2] != 0 {
		t.Errorf("expected queryArgs ['chuối', 20, 0], got %v", queryArgs)
	}
}

func TestBuildSearchFoodsQuery_MultiWordUsesFullPhraseForRanking(t *testing.T) {
	filter := FoodSearchFilter{
		Query: "thịt bò",
		Page:  1,
		Limit: 20,
	}

	_, querySQL, countArgs, queryArgs := buildSearchFoodsQuery(filter)

	// Args structure: $1 = "thịt", $2 = "bò", $3 = "thịt bò"
	if len(countArgs) != 3 {
		t.Fatalf("expected 3 countArgs, got %d: %v", len(countArgs), countArgs)
	}
	if countArgs[0] != "thịt" || countArgs[1] != "bò" || countArgs[2] != "thịt bò" {
		t.Fatalf("expected ['thịt', 'bò', 'thịt bò'], got %v", countArgs)
	}

	// $3 is the placeholder for full phrase "thịt bò".
	// The ORDER BY must prioritize the full phrase $3, NOT just $1 ("thịt")!
	if !strings.Contains(querySQL, "CASE WHEN name_search ILIKE lower(unaccent($3::text)) || '%' THEN 1") {
		t.Errorf("expected querySQL to rank by full phrase $3, got: %s", querySQL)
	}
	if !strings.Contains(querySQL, "similarity(name_search, lower(unaccent($3::text))) DESC") {
		t.Errorf("expected similarity against full phrase $3, got: %s", querySQL)
	}

	// Make sure $1 (subword "thịt") is NOT used in the CASE statement of ORDER BY
	if strings.Contains(querySQL, "ORDER BY CASE WHEN name_search ILIKE lower(unaccent($1::text))") {
		t.Errorf("ORDER BY must not rank solely by first subword $1: %s", querySQL)
	}

	if len(queryArgs) != 5 {
		t.Fatalf("expected 5 queryArgs (3 search + limit + offset), got %d: %v", len(queryArgs), queryArgs)
	}
}

func TestBuildSearchFoodsQuery_SynonymClassifierSwap(t *testing.T) {
	filter := FoodSearchFilter{
		Query: "trái bơ",
		Page:  1,
		Limit: 20,
	}

	_, querySQL, countArgs, _ := buildSearchFoodsQuery(filter)

	// "trái bơ" -> searchTerms = ["trái bơ", "quả bơ"]
	// $1 = "trái", $2 = "bơ", $3 = "trái bơ"
	// $4 = "quả", $5 = "bơ", $6 = "quả bơ"
	if len(countArgs) != 6 {
		t.Fatalf("expected 6 countArgs for trái/quả variants, got %d: %v", len(countArgs), countArgs)
	}
	if countArgs[2] != "trái bơ" || countArgs[5] != "quả bơ" {
		t.Fatalf("expected full phrases at $3 and $6, got %v", countArgs)
	}

	// ORDER BY must check $3 first and $6 second
	if !strings.Contains(querySQL, "WHEN name_search ILIKE lower(unaccent($3::text)) || '%' THEN 1") {
		t.Errorf("expected primary phrase $3 in ORDER BY: %s", querySQL)
	}
	if !strings.Contains(querySQL, "WHEN name_search ILIKE '%' || lower(unaccent($6::text)) || '%' THEN 3") {
		t.Errorf("expected synonym phrase $6 in ORDER BY: %s", querySQL)
	}
}
