package vault_test

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"os"
	"testing"

	"nutrition-api/internal/vault"
)

func TestGitHubWebhookSignature(t *testing.T) {
	secret := "my-github-webhook-secret"
	os.Setenv("GITHUB_VAULT_WEBHOOK_SECRET", secret)
	defer os.Unsetenv("GITHUB_VAULT_WEBHOOK_SECRET")

	service := vault.NewService(nil)
	body := []byte(`{"ref":"refs/heads/main","after":"abc1234"}`)

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	sig := "sha256=" + hex.EncodeToString(mac.Sum(nil))

	if !service.VerifyGitHubSignature(sig, body) {
		t.Errorf("Expected valid GitHub signature to pass")
	}

	invalidSig := "sha256=invalid-signature"
	if service.VerifyGitHubSignature(invalidSig, body) {
		t.Errorf("Expected invalid GitHub signature to fail")
	}
}
