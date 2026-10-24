package courses

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/google/uuid"
)

// Review 24/10: the page uploads must not fill the VPS disk (it is near its limit), and a PDF lesson whose coach's tab died halfway
// must not keep its pages for ever.

// fakeStore is a Store whose free space the test chooses, and that remembers what was written and removed.
type fakeStore struct {
	free    uint64
	freeErr error
	puts    int
	removed []uuid.UUID
}

func (f *fakeStore) Put(course, lesson uuid.UUID, page int, data []byte) error {
	f.puts++
	return nil
}
func (f *fakeStore) Open(course, lesson uuid.UUID, page int) (io.ReadSeekCloser, int64, error) {
	return nil, 0, os.ErrNotExist
}
func (f *fakeStore) RemoveLesson(course, lesson uuid.UUID) error {
	f.removed = append(f.removed, lesson)
	return nil
}
func (f *fakeStore) RemoveCourse(course uuid.UUID) error { return nil }
func (f *fakeStore) FreeBytes() (uint64, error)          { return f.free, f.freeErr }

// pageRepo is a Repository that answers only what an upload and a new PDF lesson ask, and counts the writes.
type pageRepo struct {
	Repository
	added     int
	created   int
	deleted   []uuid.UUID
	unready   []uuid.UUID
	cutoff    time.Time
	sweepErr  error
	deleteErr error
}

func (r *pageRepo) AddPage(ctx context.Context, course, lesson uuid.UUID, page, bytes int) error {
	r.added++
	return nil
}
func (r *pageRepo) Course(ctx context.Context, id uuid.UUID) (*Course, error) {
	return &Course{ID: id}, nil
}
func (r *pageRepo) CreateLesson(ctx context.Context, course uuid.UUID, in LessonInput, minutes int) (*Lesson, error) {
	r.created++
	return &Lesson{ID: uuid.New()}, nil
}
func (r *pageRepo) UnreadyBefore(ctx context.Context, course uuid.UUID, cutoff time.Time) ([]uuid.UUID, error) {
	r.cutoff = cutoff
	return r.unready, r.sweepErr
}
func (r *pageRepo) DeleteLesson(ctx context.Context, course, lesson uuid.UUID) error {
	r.deleted = append(r.deleted, lesson)
	return r.deleteErr
}

func page() PageInput {
	// RIFF, a size, WEBP and some bytes: what the API checks of a page
	data := append([]byte("RIFF\x20\x00\x00\x00WEBPVP8 "), make([]byte, 24)...)
	return PageInput{Data: base64.StdEncoding.EncodeToString(data)}
}

func TestUploadPageRefusesBelowTwoGiBFreeAndWritesNothing(t *testing.T) {
	for _, free := range []uint64{0, 1 << 20, MinFreeBytes - 1} {
		store, repo := &fakeStore{free: free}, &pageRepo{}
		err := NewService(repo, store).UploadPage(context.Background(), uuid.New(), uuid.New(), 1, page())
		if !errors.Is(err, ErrStorageFull) {
			t.Errorf("%d bytes free: %v, want ErrStorageFull", free, err)
		}
		if repo.added != 0 || store.puts != 0 {
			t.Errorf("%d bytes free: a row (%d) or a file (%d) was written", free, repo.added, store.puts)
		}
	}
}

func TestUploadPageGoesThroughFromTwoGiBFree(t *testing.T) {
	for _, free := range []uint64{MinFreeBytes, MinFreeBytes + 1, 50 << 30} {
		store, repo := &fakeStore{free: free}, &pageRepo{}
		if err := NewService(repo, store).UploadPage(context.Background(), uuid.New(), uuid.New(), 1, page()); err != nil {
			t.Fatalf("%d bytes free: %v", free, err)
		}
		if repo.added != 1 || store.puts != 1 {
			t.Errorf("%d bytes free: row %d, file %d, want one of each", free, repo.added, store.puts)
		}
	}
}

func TestUploadPageDoesNotGuessWhenTheFreeSpaceCannotBeRead(t *testing.T) {
	store, repo := &fakeStore{freeErr: errors.New("statfs: input/output error")}, &pageRepo{}
	err := NewService(repo, store).UploadPage(context.Background(), uuid.New(), uuid.New(), 1, page())
	if err == nil || errors.Is(err, ErrStorageFull) {
		t.Fatalf("an unreadable disk is an error of its own, not a full one: %v", err)
	}
	if repo.added != 0 || store.puts != 0 {
		t.Error("nothing is written on a disk that cannot be read")
	}
}

func TestUploadPageThresholdCanBeChanged(t *testing.T) {
	store, repo := &fakeStore{free: 1 << 20}, &pageRepo{}
	svc := NewService(repo, store)
	svc.SetMinFree(1 << 10)
	if err := svc.UploadPage(context.Background(), uuid.New(), uuid.New(), 1, page()); err != nil {
		t.Fatalf("1 MiB free with a 1 KiB threshold: %v", err)
	}
}

func TestFullDiskIs507StorageFull(t *testing.T) {
	h := NewHandler(NewService(&pageRepo{}, &fakeStore{free: 1 << 20}))
	body, _ := json.Marshal(page())
	rec := call(h.UploadPage, "PUT", string(body), map[string]string{"id": uuid.NewString(), "lid": uuid.NewString(), "n": "1"})
	if rec.Code != http.StatusInsufficientStorage {
		t.Fatalf("status %d, want 507", rec.Code)
	}
	var env struct {
		Error struct{ Code string } `json:"error"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &env)
	if env.Error.Code != "STORAGE_FULL" {
		t.Errorf("code %q, want STORAGE_FULL", env.Error.Code)
	}
}

func TestDiskStoreFreeBytes(t *testing.T) {
	root := filepath.Join(t.TempDir(), "not", "there", "yet")
	free, err := NewDiskStore(root).FreeBytes()
	if err != nil {
		t.Fatal(err)
	}
	if free == 0 {
		t.Error("a temp folder has room")
	}
	if _, err := os.Stat(root); err != nil {
		t.Errorf("the pages folder is made, so the first upload does not fail on it: %v", err)
	}
}

func TestNewPdfLessonSweepsUnfinishedLessonsOlderThanADay(t *testing.T) {
	now := time.Date(2026, 10, 24, 12, 0, 0, 0, time.UTC)
	old1, old2 := uuid.New(), uuid.New()
	repo, store := &pageRepo{unready: []uuid.UUID{old1, old2}}, &fakeStore{}
	svc := NewService(repo, store)
	svc.now = func() time.Time { return now }
	if _, err := svc.CreateLesson(context.Background(), uuid.New(), LessonInput{PartID: uuid.New(), Title: "Bài mới", Kind: "pdf", PageCount: 3}); err != nil {
		t.Fatal(err)
	}
	if want := now.Add(-24 * time.Hour); !repo.cutoff.Equal(want) {
		t.Errorf("cutoff %v, want %v (24 h before now)", repo.cutoff, want)
	}
	if len(repo.deleted) != 2 || repo.deleted[0] != old1 || repo.deleted[1] != old2 {
		t.Errorf("rows deleted: %v", repo.deleted)
	}
	if len(store.removed) != 2 || store.removed[0] != old1 || store.removed[1] != old2 {
		t.Errorf("folders removed: %v", store.removed)
	}
	if repo.created != 1 {
		t.Errorf("the new lesson is made once: %d", repo.created)
	}
}

func TestSweepIsOnlyForANewPdfLesson(t *testing.T) {
	repo, store := &pageRepo{unready: []uuid.UUID{uuid.New()}}, &fakeStore{}
	_, err := NewService(repo, store).CreateLesson(context.Background(), uuid.New(), LessonInput{PartID: uuid.New(), Title: "Bài viết", Kind: "text", Content: "ý"})
	if err != nil {
		t.Fatal(err)
	}
	if len(repo.deleted) != 0 || len(store.removed) != 0 {
		t.Error("a written lesson does not sweep")
	}
}

func TestSweepFailureNeverStopsTheNewLesson(t *testing.T) {
	repo, store := &pageRepo{sweepErr: errors.New("db down")}, &fakeStore{}
	if _, err := NewService(repo, store).CreateLesson(context.Background(), uuid.New(), LessonInput{PartID: uuid.New(), Title: "Bài mới", Kind: "pdf", PageCount: 2}); err != nil {
		t.Fatalf("housekeeping must not block the coach: %v", err)
	}
	if repo.created != 1 {
		t.Error("the lesson was not made")
	}
	// A row that cannot be deleted keeps its folder (the next sweep tries again)
	repo, store = &pageRepo{unready: []uuid.UUID{uuid.New()}, deleteErr: errors.New("db down")}, &fakeStore{}
	if _, err := NewService(repo, store).CreateLesson(context.Background(), uuid.New(), LessonInput{PartID: uuid.New(), Title: "Bài mới", Kind: "pdf", PageCount: 2}); err != nil {
		t.Fatal(err)
	}
	if len(store.removed) != 0 {
		t.Error("a folder was removed whose row is still there")
	}
}
