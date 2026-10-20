package payment_test

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"os"
	"testing"

	"nutrition-api/internal/payment"
)

func TestPayOSSignatureVerification(t *testing.T) {
	checksumKey := "test-checksum-key-12345"
	os.Setenv("PAYOS_CHECKSUM_KEY", checksumKey)
	defer os.Unsetenv("PAYOS_CHECKSUM_KEY")

	service := payment.NewService(nil)

	payload := payment.PayOSWebhookPayload{
		Code: "00",
		Desc: "success",
		Data: payment.PayOSWebhookData{
			OrderCode: 1001,
			Amount:    50000,
			Code:      "00",
			Desc:      "success",
			Reference: "REF12345",
		},
	}

	// Compute expected signature:
	// sorted pairs: amount=50000, code=00, desc=success, orderCode=1001, reference=REF12345
	dataStr := "amount=50000&code=00&desc=success&orderCode=1001&reference=REF12345"
	mac := hmac.New(sha256.New, []byte(checksumKey))
	mac.Write([]byte(dataStr))
	expectedSig := hex.EncodeToString(mac.Sum(nil))

	payload.Signature = expectedSig

	if !service.VerifySignature(payload) {
		t.Errorf("Expected valid signature verification to succeed")
	}

	// Tampered signature
	payload.Signature = "tampered-signature"
	if service.VerifySignature(payload) {
		t.Errorf("Expected tampered signature verification to fail")
	}
}

func TestCreatePaymentLink_MockFallback(t *testing.T) {
	service := payment.NewService(nil)
	res, err := service.CreatePaymentLink(nil, [16]byte{}, payment.CreatePaymentLinkRequest{
		Plan: "pro_monthly",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res.Status != "MOCK" {
		t.Errorf("expected status MOCK, got %s", res.Status)
	}
	if res.Amount != 99000 {
		t.Errorf("expected amount 99000, got %d", res.Amount)
	}
}
