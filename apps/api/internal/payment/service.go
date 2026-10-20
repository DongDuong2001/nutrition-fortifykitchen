package payment

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CreatePaymentLinkRequest struct {
	Plan      string `json:"plan"`
	ReturnURL string `json:"return_url,omitempty"`
	CancelURL string `json:"cancel_url,omitempty"`
}

type CreatePaymentLinkResponse struct {
	OrderCode   int64  `json:"orderCode"`
	Amount      int64  `json:"amount"`
	CheckoutURL string `json:"checkoutUrl"`
	Status      string `json:"status"`
}

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
	CreatePaymentLink(ctx context.Context, userID uuid.UUID, req CreatePaymentLinkRequest) (*CreatePaymentLinkResponse, error)
}

type paymentService struct {
	pool       *pgxpool.Pool
	httpClient *http.Client
}

func NewService(pool *pgxpool.Pool) Service {
	return &paymentService{
		pool:       pool,
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
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

	return hmac.Equal([]byte(strings.ToLower(payload.Signature)), []byte(strings.ToLower(expectedSig)))
}

func (s *paymentService) ProcessPaymentWebhook(ctx context.Context, payload PayOSWebhookPayload) error {
	// In Release 1, verify payload and log payment event
	if payload.Code != "00" {
		return fmt.Errorf("payment notification with non-success code: %s", payload.Code)
	}

	// Handle idempotently: in future migrations, persist payment transactions.
	return nil
}

func (s *paymentService) CreatePaymentLink(ctx context.Context, userID uuid.UUID, req CreatePaymentLinkRequest) (*CreatePaymentLinkResponse, error) {
	var amount int64 = 99000 // default pro_monthly
	if strings.EqualFold(req.Plan, "pro_yearly") {
		amount = 890000
	}

	orderCode := time.Now().UnixMilli()
	returnURL := strings.TrimSpace(req.ReturnURL)
	if returnURL == "" {
		returnURL = "https://lehongkhanh.vn/settings?payment=success"
	}
	cancelURL := strings.TrimSpace(req.CancelURL)
	if cancelURL == "" {
		cancelURL = "https://lehongkhanh.vn/paywall?payment=cancel"
	}

	desc := fmt.Sprintf("H1T Pro %d", orderCode%10000)

	clientID := os.Getenv("PAYOS_CLIENT_ID")
	apiKey := os.Getenv("PAYOS_API_KEY")
	checksumKey := os.Getenv("PAYOS_CHECKSUM_KEY")

	// If PayOS credentials are unset (local dev, or pending account creation), return mock link
	if clientID == "" || apiKey == "" || checksumKey == "" {
		mockURL := returnURL
		sep := "?"
		if strings.Contains(mockURL, "?") {
			sep = "&"
		}
		mockURL = fmt.Sprintf("%s%sorderCode=%s&mock=true", mockURL, sep, strconv.FormatInt(orderCode, 10))
		return &CreatePaymentLinkResponse{
			OrderCode:   orderCode,
			Amount:      amount,
			CheckoutURL: mockURL,
			Status:      "MOCK",
		}, nil
	}

	// Calculate HMAC-SHA256 signature for PayOS v2 payment request
	// Sorted keys: amount, cancelUrl, description, orderCode, returnUrl
	signData := fmt.Sprintf("amount=%d&cancelUrl=%s&description=%s&orderCode=%d&returnUrl=%s",
		amount, cancelURL, desc, orderCode, returnURL)
	mac := hmac.New(sha256.New, []byte(checksumKey))
	mac.Write([]byte(signData))
	signature := hex.EncodeToString(mac.Sum(nil))

	payosReqBody := map[string]any{
		"orderCode":   orderCode,
		"amount":      amount,
		"description": desc,
		"cancelUrl":   cancelURL,
		"returnUrl":   returnURL,
		"signature":   signature,
	}

	jsonBytes, err := json.Marshal(payosReqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal payos request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api-merchant.payos.vn/v2/payment-requests", bytes.NewReader(jsonBytes))
	if err != nil {
		return nil, fmt.Errorf("create payos http request: %w", err)
	}

	httpReq.Header.Set("x-client-id", clientID)
	httpReq.Header.Set("x-api-key", apiKey)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("payos http call failed: %w", err)
	}
	defer resp.Body.Close()

	var payosResp struct {
		Code string `json:"code"`
		Desc string `json:"desc"`
		Data struct {
			CheckoutURL string `json:"checkoutUrl"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&payosResp); err != nil {
		return nil, fmt.Errorf("decode payos response: %w", err)
	}

	if payosResp.Code != "00" {
		return nil, fmt.Errorf("payos error: %s - %s", payosResp.Code, payosResp.Desc)
	}

	return &CreatePaymentLinkResponse{
		OrderCode:   orderCode,
		Amount:      amount,
		CheckoutURL: payosResp.Data.CheckoutURL,
		Status:      "PENDING",
	}, nil
}
