package config

import (
	"testing"
)

func TestConfig_Validate(t *testing.T) {
	tests := []struct {
		name    string
		cfg     Config
		wantErr bool
	}{
		{
			name: "development environment allows defaults",
			cfg: Config{
				Environment: "development",
				DatabaseURL: "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable",
			},
			wantErr: false,
		},
		{
			name: "production rejects default credentials",
			cfg: Config{
				Environment:       "production",
				DatabaseURL:       "postgresql://postgres:postgres@db.production.internal:5432/nutrition?sslmode=require",
				SupabaseJWTSecret: "super-secret-key-12345",
			},
			wantErr: true,
		},
		{
			name: "production rejects disabled ssl",
			cfg: Config{
				Environment:       "production",
				DatabaseURL:       "postgresql://app_user:strongpassword@db.production.internal:5432/nutrition?sslmode=disable",
				SupabaseJWTSecret: "super-secret-key-12345",
			},
			wantErr: true,
		},
		{
			name: "production rejects missing supabase auth secrets",
			cfg: Config{
				Environment: "production",
				DatabaseURL: "postgresql://app_user:strongpassword@db.production.internal:5432/nutrition?sslmode=require",
			},
			wantErr: true,
		},
		{
			name: "production accepts valid secured configuration",
			cfg: Config{
				Environment:       "production",
				DatabaseURL:       "postgresql://app_user:strongpassword@db.production.internal:5432/nutrition?sslmode=require",
				SupabaseJWTSecret: "super-secret-key-12345",
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.cfg.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Config.Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestLoad_CoursesMinFreeBytes(t *testing.T) {
	for _, tt := range []struct {
		env  string
		want uint64
	}{
		{"", 0}, // 0: the courses package keeps its own default, 2 GiB
		{"5368709120", 5368709120},
		{"lots", 0}, // not a number: the default, never a crash at startup
		{"-1", 0},
	} {
		t.Setenv("COURSES_MIN_FREE_BYTES", tt.env)
		if got := Load().CoursesMinFreeBytes; got != tt.want {
			t.Errorf("COURSES_MIN_FREE_BYTES=%q: %d, want %d", tt.env, got, tt.want)
		}
	}
}
