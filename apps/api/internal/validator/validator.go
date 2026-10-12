package validator

import (
	"fmt"
	"net/http"
	"regexp"
	"strings"

	"nutrition-api/pkg/response"
)

var dateRegex = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)

type Errors map[string]string

func New() Errors {
	return make(Errors)
}

func (e Errors) Add(field, message string) {
	if _, exists := e[field]; !exists {
		e[field] = message
	}
}

func (e Errors) Required(field, val string) {
	if strings.TrimSpace(val) == "" {
		e.Add(field, fmt.Sprintf("%s is required", field))
	}
}

func (e Errors) In(field, val string, allowed ...string) {
	for _, a := range allowed {
		if val == a {
			return
		}
	}
	e.Add(field, fmt.Sprintf("%s must be one of: %s", field, strings.Join(allowed, ", ")))
}

func (e Errors) Date(field, val string) {
	if !dateRegex.MatchString(val) {
		e.Add(field, fmt.Sprintf("%s must be in YYYY-MM-DD format", field))
	}
}

func (e Errors) NumberRange(field string, val, min, max float64) {
	if val < min || val > max {
		e.Add(field, fmt.Sprintf("%s must be between %v and %v", field, min, max))
	}
}

func (e Errors) IntRange(field string, val, min, max int) {
	if val < min || val > max {
		e.Add(field, fmt.Sprintf("%s must be between %d and %d", field, min, max))
	}
}

func (e Errors) HasErrors() bool {
	return len(e) > 0
}

func (e Errors) Respond(w http.ResponseWriter) bool {
	if e.HasErrors() {
		response.ValidationError(w, e)
		return true
	}
	return false
}
