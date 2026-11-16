package costshttp

import (
	"encoding/json"
	"net/http"

	"github.com/clementortiz/home-ai/home-core/internal/costs/application"
)

type Handler struct{ service *application.Service }

func NewHandler(service *application.Service) *Handler { return &Handler{service: service} }

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet || r.URL.Path != "/v1/costs/summary" {
		http.NotFound(w, r)
		return
	}
	summary, err := h.service.Summary()
	if err != nil {
		http.Error(w, `{"error":"costs_unavailable"}`, http.StatusServiceUnavailable)
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(summary)
}
