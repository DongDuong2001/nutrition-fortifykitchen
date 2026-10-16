package auth

import (
	"context"
	"crypto"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"sync"
	"time"
)

type JWK struct {
	Kty string `json:"kty"`
	Crv string `json:"crv"`
	X   string `json:"x"`
	Y   string `json:"y"`
	N   string `json:"n"`
	E   string `json:"e"`
	Kid string `json:"kid"`
	Alg string `json:"alg"`
	Use string `json:"use"`
}

type JWKSResponse struct {
	Keys []JWK `json:"keys"`
}

type JWKSCache struct {
	jwksURL     string
	client      *http.Client
	mu          sync.RWMutex
	keys        map[string]crypto.PublicKey
	lastFetched time.Time
	cacheTTL    time.Duration
}

func NewJWKSCache(jwksURL string) *JWKSCache {
	return &JWKSCache{
		jwksURL:  jwksURL,
		client:   &http.Client{Timeout: 5 * time.Second},
		keys:     make(map[string]crypto.PublicKey),
		cacheTTL: 1 * time.Hour,
	}
}

func (c *JWKSCache) SetKey(kid string, key crypto.PublicKey) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.keys[kid] = key
}

func (c *JWKSCache) GetKey(ctx context.Context, kid string) (crypto.PublicKey, error) {
	if c == nil || c.jwksURL == "" {
		return nil, errors.New("jwks url is not configured")
	}

	c.mu.RLock()
	key, found := c.keys[kid]
	fresh := time.Since(c.lastFetched) < c.cacheTTL
	c.mu.RUnlock()

	if found && fresh {
		return key, nil
	}

	// Refresh cache from JWKS endpoint
	if err := c.refresh(ctx); err != nil {
		// If refresh failed but key is present (even if stale), return it as fallback
		if found {
			return key, nil
		}
		return nil, err
	}

	c.mu.RLock()
	defer c.mu.RUnlock()
	if k, ok := c.keys[kid]; ok {
		return k, nil
	}

	// If no kid provided and only 1 key exists, return that key
	if kid == "" && len(c.keys) == 1 {
		for _, k := range c.keys {
			return k, nil
		}
	}

	return nil, fmt.Errorf("public key not found in jwks for kid: %q", kid)
}

func (c *JWKSCache) refresh(ctx context.Context) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	minInterval := 5 * time.Second
	if len(c.keys) > 0 {
		minInterval = 10 * time.Second
	}
	if time.Since(c.lastFetched) < minInterval {
		return nil
	}
	c.lastFetched = time.Now()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.jwksURL, nil)
	if err != nil {
		return err
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to fetch jwks: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("jwks endpoint returned status: %d", resp.StatusCode)
	}

	var jwks JWKSResponse
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return fmt.Errorf("failed to decode jwks response: %w", err)
	}

	newKeys := make(map[string]crypto.PublicKey)
	for _, jwk := range jwks.Keys {
		pubKey, err := parseJWK(jwk)
		if err == nil && pubKey != nil {
			newKeys[jwk.Kid] = pubKey
		}
	}

	c.keys = newKeys
	c.lastFetched = time.Now()
	return nil
}

func decodeBase64URL(s string) ([]byte, error) {
	b, err := base64.RawURLEncoding.DecodeString(s)
	if err == nil {
		return b, nil
	}
	return base64.URLEncoding.DecodeString(s)
}

func parseJWK(jwk JWK) (crypto.PublicKey, error) {
	switch jwk.Kty {
	case "EC":
		if jwk.Crv != "P-256" {
			return nil, fmt.Errorf("unsupported elliptic curve: %s", jwk.Crv)
		}
		xBytes, err := decodeBase64URL(jwk.X)
		if err != nil {
			return nil, fmt.Errorf("failed to decode EC X coordinate: %w", err)
		}
		yBytes, err := decodeBase64URL(jwk.Y)
		if err != nil {
			return nil, fmt.Errorf("failed to decode EC Y coordinate: %w", err)
		}
		return &ecdsa.PublicKey{
			Curve: elliptic.P256(),
			X:     new(big.Int).SetBytes(xBytes),
			Y:     new(big.Int).SetBytes(yBytes),
		}, nil

	case "RSA":
		nBytes, err := decodeBase64URL(jwk.N)
		if err != nil {
			return nil, fmt.Errorf("failed to decode RSA modulus: %w", err)
		}
		eBytes, err := decodeBase64URL(jwk.E)
		if err != nil {
			return nil, fmt.Errorf("failed to decode RSA exponent: %w", err)
		}
		var eInt int
		for _, b := range eBytes {
			eInt = (eInt << 8) | int(b)
		}
		return &rsa.PublicKey{
			N: new(big.Int).SetBytes(nBytes),
			E: eInt,
		}, nil

	default:
		return nil, fmt.Errorf("unsupported key type: %s", jwk.Kty)
	}
}
