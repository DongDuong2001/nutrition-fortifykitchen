package courses

import (
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"syscall"

	"github.com/google/uuid"
)

// Store keeps the page images. They are never served as static files: the API reads one only after the lesson's access check.
// Layout under the root: <course id>/<lesson id>/<page>.webp (the ids are UUIDs and the page a number, so no name from a request is a path).
type Store interface {
	Put(course, lesson uuid.UUID, page int, data []byte) error
	// Open returns the page's file and its size; os.ErrNotExist when it is not there.
	Open(course, lesson uuid.UUID, page int) (io.ReadSeekCloser, int64, error)
	RemoveLesson(course, lesson uuid.UUID) error
	RemoveCourse(course uuid.UUID) error
	// FreeBytes is the room left on the disk that holds the pages (what a process that is not root may still write).
	FreeBytes() (uint64, error)
}

// DiskStore is the Store on a directory (a docker volume in production: COURSES_DIR).
type DiskStore struct{ root string }

func NewDiskStore(root string) *DiskStore { return &DiskStore{root: root} }

func (s *DiskStore) lessonDir(course, lesson uuid.UUID) string {
	return filepath.Join(s.root, course.String(), lesson.String())
}

func (s *DiskStore) pagePath(course, lesson uuid.UUID, page int) string {
	return filepath.Join(s.lessonDir(course, lesson), strconv.Itoa(page)+".webp")
}

// Put writes the page through a temporary file and a rename, so a page is whole or not there.
func (s *DiskStore) Put(course, lesson uuid.UUID, page int, data []byte) error {
	if page < 1 || page > MaxPages {
		return ErrPageNumber
	}
	dir := s.lessonDir(course, lesson)
	if err := os.MkdirAll(dir, 0o750); err != nil {
		return fmt.Errorf("make lesson folder: %w", err)
	}
	tmp, err := os.CreateTemp(dir, ".page-*")
	if err != nil {
		return fmt.Errorf("create page file: %w", err)
	}
	name := tmp.Name()
	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		os.Remove(name)
		return fmt.Errorf("write page: %w", err)
	}
	if err := tmp.Close(); err != nil {
		os.Remove(name)
		return fmt.Errorf("close page: %w", err)
	}
	if err := os.Rename(name, s.pagePath(course, lesson, page)); err != nil {
		os.Remove(name)
		return fmt.Errorf("place page: %w", err)
	}
	return nil
}

func (s *DiskStore) Open(course, lesson uuid.UUID, page int) (io.ReadSeekCloser, int64, error) {
	if page < 1 || page > MaxPages {
		return nil, 0, os.ErrNotExist
	}
	f, err := os.Open(s.pagePath(course, lesson, page))
	if err != nil {
		return nil, 0, err
	}
	info, err := f.Stat()
	if err != nil {
		f.Close()
		return nil, 0, err
	}
	return f, info.Size(), nil
}

func (s *DiskStore) RemoveLesson(course, lesson uuid.UUID) error {
	if err := os.RemoveAll(s.lessonDir(course, lesson)); err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	return nil
}

func (s *DiskStore) RemoveCourse(course uuid.UUID) error {
	if err := os.RemoveAll(filepath.Join(s.root, course.String())); err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	return nil
}

// FreeBytes is the free space of the volume under the root. The root is made when it is not there yet (a first upload), so the
// answer is the volume the pages will go to, not an error.
func (s *DiskStore) FreeBytes() (uint64, error) {
	if err := os.MkdirAll(s.root, 0o750); err != nil {
		return 0, fmt.Errorf("make pages folder: %w", err)
	}
	var st syscall.Statfs_t
	if err := syscall.Statfs(s.root, &st); err != nil {
		return 0, fmt.Errorf("free space: %w", err)
	}
	return uint64(st.Bavail) * uint64(st.Bsize), nil
}
