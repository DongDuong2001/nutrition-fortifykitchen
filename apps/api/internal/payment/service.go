package payment

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PayOSWebhookData struct {
	OrderCode           int64  `json:"orderCode"`
	Amount              int64  `json:"amount"`
	Description         string `json:"description"`
	AccountNumber       string `json:"accountNumber"`
	Reference           string `json:"reference"`
	TransactionDateTime string `json:"transactionDateTime"`
	Currency            string `json:"currency"`
	PaymentLinkID       string `json:"paymentLinkId"`
	Code                string `json:"code"`
	Desc                string `json:"desc"`
}

type PayOSWebhookPayload struct {
	Code      string           `json:"code"`
	Desc      string           `json:"desc"`
	Data      PayOSWebhookData `json:"data"`
	Signature string           `json:"signature"`
}

type Service interface {
	VerifySignature(payload PayOSWebhookPayload) bool
	ProcessPaymentWebhook(ctx context.Context, payload PayOSWebhookPayload) error
}

type paymentService struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) Service {
	return &paymentService{pool: pool}
}

// VerifySignature verifies the PayOS HMAC-SHA256 signature against PAYOS_CHECKSUM_KEY
func (s *paymentService) VerifySignature(payload PayOSWebhookPayload) bool {
	checksumKey := os.Getenv("PAYOS_CHECKSUM_KEY")
	if checksumKey == "" {
		if strings.EqualFold(os.Getenv("ENVIRONMENT"), "production") {
			return false
		}
		return true // Allow development without checksum key
	}

	// PayOS standard signature calculation:
	// sort keys of data: amount, cancelUrl, description, orderCode, returnUrl, etc.
	// For webhook data: amount, code, desc, orderCode, reference
	pairs := []string{
		fmt.Sprintf("amount=%d", payload.Data.Amount),
		fmt.Sprintf("code=%s", payload.Data.Code),
		fmt.Sprintf("desc=%s", payload.Data.Desc),
		fmt.Sprintf("orderCode=%d", payload.Data.OrderCode),
		fmt.Sprintf("reference=%s", payload.Data.Reference),
	}
	sort.Strings(pairs)
	dataStr := strings.Join(pairs, "&")

	mac := hmac.New(sha256.New, []byte(checksumKey))
	mac.Write([]byte(dataStr))
	expectedSig := hex.EncodeToString(mac.Sum(nil))

	return strings.EqualFold(payload.Signature, expectedSig)
}

func (s *paymentService) ProcessPaymentWebhook(ctx context.Context, payload PayOSWebhookPayload) error {
	// In Release 1, verify payload and log payment event
	if payload.Code != "00" {
		return fmt.Errorf("payment notification with non-success code: %s", payload.Code)
	}

	// Handle idempotently: in future migrations, persist payment transactions.
	return nil
}
