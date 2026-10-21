package diary_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"nutrition-api/internal/diary"
)

type mockBatchRow struct {
	err error
}

func (r *mockBatchRow) Scan(dest ...any) error {
	if r.err != nil {
		return r.err
	}
	if len(dest) > 0 {
		if t, ok := dest[0].(*time.Time); ok {
			*t = time.Now()
		}
	}
	return nil
}

type mockBatchTx struct {
	pgx.Tx
	committed   bool
	rolledBack  bool
	badFoodID   uuid.UUID
	insertCount int
}

func (m *mockBatchTx) Commit(ctx context.Context) error {
	m.committed = true
	return nil
}

func (m *mockBatchTx) Rollback(ctx context.Context) error {
	m.rolledBack = true
	return nil
}

func (m *mockBatchTx) QueryRow(ctx context.Context, sql string, args ...any) pgx.Row {
	for _, arg := range args {
		if fID, ok := arg.(*uuid.UUID); ok && fID != nil && *fID == m.badFoodID {
			return &mockBatchRow{err: errors.New("foreign key violation: food_id not found")}
		}
	}
	m.insertCount++
	return &mockBatchRow{}
}

type mockBatchDB struct {
	tx *mockBatchTx
}

func (d *mockBatchDB) Begin(ctx context.Context) (pgx.Tx, error) {
	return d.tx, nil
}

func (d *mockBatchDB) Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error) {
	return nil, nil
}

func (d *mockBatchDB) QueryRow(ctx context.Context, sql string, args ...any) pgx.Row {
	return &mockBatchRow{}
}

func (d *mockBatchDB) Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error) {
	return pgconn.NewCommandTag(""), nil
}

func TestRepository_CreateEntriesBatch_RollbackOnBadFoodID(t *testing.T) {
	badFoodID := uuid.New()
	validFoodID := uuid.New()
	userID := uuid.New()

	tx := &mockBatchTx{badFoodID: badFoodID}
	db := &mockBatchDB{tx: tx}
	repo := diary.NewRepositoryWithDB(db)

	entries := []*diary.DiaryEntryItem{
		{
			ID:           uuid.New(),
			FoodID:       &validFoodID,
			Kind:         "food",
			MealSlot:     "lunch",
			ServingLabel: "100 g",
			Grams:        100,
			FoodName:     "Món hợp lệ",
		},
		{
			ID:           uuid.New(),
			FoodID:       &badFoodID,
			Kind:         "food",
			MealSlot:     "lunch",
			ServingLabel: "100 g",
			Grams:        100,
			FoodName:     "Món có food_id lỗi",
		},
	}

	result, err := repo.CreateEntriesBatch(context.Background(), userID, "2026-10-21", entries)
	if err == nil {
		t.Fatal("expected batch insert to fail due to bad food_id, got nil error")
	}
	if len(result) != 0 {
		t.Fatalf("expected 0 entries returned on failure, got %d", len(result))
	}

	// Verify atomic transaction rollback:
	if !tx.rolledBack {
		t.Error("expected transaction Rollback to be called")
	}
	if tx.committed {
		t.Error("expected transaction Commit NOT to be called")
	}
}
