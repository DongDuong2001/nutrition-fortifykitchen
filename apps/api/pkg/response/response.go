package response

import (
	"encoding/json"
	"net/http"
)

// Standard Error Codes from docs/07 §4
const (
	CodeUnauthorized        = "UNAUTHORIZED"
	CodeForbidden           = "FORBIDDEN"
	CodeNotFound            = "NOT_FOUND"
	CodeProfileMissing      = "PROFILE_MISSING"
	CodeValidationFailed    = "VALIDATION_FAILED"
	CodePastDayReadOnly     = "PAST_DAY_READ_ONLY"
	CodeConflict            = "CONFLICT"
	CodeIDConflict          = "ID_CONFLICT"
	CodeInternalServerError = "INTERNAL_SERVER_ERROR"
	CodeCSRFOrigin          = "CSRF_ORIGIN"
	CodeCSRFContentType     = "CSRF_CONTENT_TYPE"
)

type ErrorDetail struct {
	Code    string            `json:"code"`
	Message string            `json:"message"`
	Fields  map[string]string `json:"fields,omitempty"`
}

type ErrorEnvelope struct {
	Error ErrorDetail `json:"error"`
}

type SuccessEnvelope struct {
	Data    any    `json:"data,omitempty"`
	Message string `json:"message,omitempty"`
}

// JSON writes a generic data payload wrapped in standard data envelope.
func JSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(SuccessEnvelope{Data: data})
}

// Success writes a data payload with a human-readable message.
func Success(w http.ResponseWriter, status int, message string, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(SuccessEnvelope{
		Message: message,
		Data:    data,
	})
}

// RawJSON writes raw data without wrapping.
func RawJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

// Error writes a standardized error envelope matching docs/07 §4.
// If code is not provided (or for backwards compatibility), defaults appropriately based on status.
func Error(w http.ResponseWriter, status int, args ...string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	var code, message string
	if len(args) >= 2 {
		code = args[0]
		message = args[1]
	} else if len(args) == 1 {
		message = args[0]
		switch status {
		case http.StatusUnauthorized:
			code = CodeUnauthorized
		case http.StatusForbidden:
			code = CodeForbidden
		case http.StatusNotFound:
			code = CodeNotFound
		case http.StatusUnprocessableEntity:
			code = CodeValidationFailed
		case http.StatusConflict:
			code = CodeConflict
		case http.StatusBadRequest:
			code = CodeValidationFailed
		default:
			code = CodeInternalServerError
		}
	} else {
		code = CodeInternalServerError
		message = "An error occurred"
	}

	_ = json.NewEncoder(w).Encode(ErrorEnvelope{
		Error: ErrorDetail{
			Code:    code,
			Message: message,
		},
	})
}

// ValidationError writes a 422 error envelope with field-specific errors.
func ValidationError(w http.ResponseWriter, fields map[string]string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnprocessableEntity)
	_ = json.NewEncoder(w).Encode(ErrorEnvelope{
		Error: ErrorDetail{
			Code:    CodeValidationFailed,
			Message: "Validation failed for one or more fields",
			Fields:  fields,
		},
	})
}

// FieldErrors writes an error envelope with a message per field, with the given status (400 for the profile's target settings).
func FieldErrors(w http.ResponseWriter, status int, message string, fields map[string]string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(ErrorEnvelope{
		Error: ErrorDetail{
			Code:    CodeValidationFailed,
			Message: message,
			Fields:  fields,
		},
	})
}
