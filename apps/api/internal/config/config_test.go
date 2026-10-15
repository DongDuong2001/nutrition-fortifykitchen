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
