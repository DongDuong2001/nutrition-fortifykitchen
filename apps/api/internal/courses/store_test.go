package courses

import (
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/google/uuid"
)

func TestDiskStoreRoundTripAndRemoval(t *testing.T) {
	root := t.TempDir()
	s := NewDiskStore(root)
	c, l := uuid.New(), uuid.New()
	if err := s.Put(c, l, 3, []byte("RIFFxxxxWEBPpage3")); err != nil {
		t.Fatal(err)
	}
	f, size, err := s.Open(c, l, 3)
	if err != nil {
		t.Fatal(err)
	}
	b, _ := io.ReadAll(f)
	f.Close()
	if string(b) != "RIFFxxxxWEBPpage3" || size != int64(len(b)) {
		t.Fatalf("read back %q (%d)", b, size)
	}
	if want := filepath.Join(root, c.String(), l.String(), "3.webp"); !fileExists(want) {
		t.Errorf("expected the file at %s", want)
	}
	// A page that is not there is os.ErrNotExist; a page number outside 1..60 never reaches the disk
	if _, _, err := s.Open(c, l, 4); !errors.Is(err, os.ErrNotExist) {
		t.Errorf("missing page: %v", err)
	}
	for _, page := range []int{0, -1, 61} {
		if err := s.Put(c, l, page, []byte("x")); !errors.Is(err, ErrPageNumber) {
			t.Errorf("Put page %d: %v", page, err)
		}
		if _, _, err := s.Open(c, l, page); !errors.Is(err, os.ErrNotExist) {
			t.Errorf("Open page %d: %v", page, err)
		}
	}
	// Writing again replaces the page; no temporary file is left behind
	if err := s.Put(c, l, 3, []byte("RIFFxxxxWEBPnewer")); err != nil {
		t.Fatal(err)
	}
	entries, _ := os.ReadDir(filepath.Join(root, c.String(), l.String()))
	if len(entries) != 1 {
		var names []string
		for _, e := range entries {
			names = append(names, e.Name())
		}
		t.Errorf("left %v", names)
	}
	if err := s.RemoveLesson(c, l); err != nil {
		t.Fatal(err)
	}
	if _, _, err := s.Open(c, l, 3); !errors.Is(err, os.ErrNotExist) {
		t.Errorf("after RemoveLesson: %v", err)
	}
	// Removing what is not there is fine
	if err := s.RemoveLesson(c, l); err != nil || s.RemoveCourse(uuid.New()) != nil {
		t.Error("removing a missing folder must not fail")
	}
}

func TestDiskStorePathsComeFromIDsOnly(t *testing.T) {
	s := NewDiskStore("/data/courses")
	c, l := uuid.New(), uuid.New()
	p := s.pagePath(c, l, 7)
	if !strings.HasPrefix(p, "/data/courses/"+c.String()+"/"+l.String()+"/") || !strings.HasSuffix(p, "/7.webp") || strings.Contains(p, "..") {
		t.Fatalf("path %s", p)
	}
}

func fileExists(p string) bool {
	_, err := os.Stat(p)
	return err == nil
}
