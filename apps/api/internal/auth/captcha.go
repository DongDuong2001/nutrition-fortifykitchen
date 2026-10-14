package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

type CaptchaVerifier struct {
	SecretKey string
	SiteKey   string
	VerifyURL string
	Client    *http.Client
}

func NewCaptchaVerifier(secretKey, siteKey string) *CaptchaVerifier {
	if secretKey == "" {
		secretKey = os.Getenv("HCAPTCHA_SECRET_KEY")
	}
	if siteKey == "" {
		siteKey = os.Getenv("HCAPTCHA_SITE_KEY")
	}
	return &CaptchaVerifier{
		SecretKey: secretKey,
		SiteKey:   siteKey,
		VerifyURL: "https://api.hcaptcha.com/siteverify",
		Client:    &http.Client{Timeout: 10 * time.Second},
	}
}

type VerifyResult struct {
	Success    bool     `json:"success"`
	ErrorCodes []string `json:"error-codes"`
}

func (v *CaptchaVerifier) VerifyToken(ctx context.Context, token, ip string) (bool, []string, error) {
	if token == "" {
		return false, []string{"missing-input-response"}, nil
	}

	form := url.Values{
		"secret":   {v.SecretKey},
		"response": {token},
	}
	if ip != "" {
		form.Set("remoteip", ip)
	}
	if v.SiteKey != "" {
		form.Set("sitekey", v.SiteKey)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, v.VerifyURL, strings.NewReader(form.Encode()))
	if err != nil {
		return false, nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := v.Client.Do(req)
	if err != nil {
		return false, nil, err
	}
	defer resp.Body.Close()

	var out VerifyResult
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return false, nil, err
	}

	if out.Success {
		return true, []string{}, nil
	}
	return false, out.ErrorCodes, nil
}
