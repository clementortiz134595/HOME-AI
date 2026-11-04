package insightshttp

import (
	"encoding/json"
	"github.com/clementortiz/home-ai/home-core/internal/insights/application"
	"net/http"
)

type Handler struct{ trains *application.GetTrains }

func NewHandler(trains *application.GetTrains) *Handler { return &Handler{trains: trains} }
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	if r.URL.Path == "/v1/insights/markets" {
		_ = json.NewEncoder(w).Encode(map[string]any{"period": "day", "etfs": []map[string]any{{"symbol": "ETF Monde", "change": 0.42}, {"symbol": "ETF Europe", "change": -0.18}, {"symbol": "ETF USA", "change": 0.63}}, "news": []string{"Les marchés européens ouvrent en hausse.", "La BCE maintient ses taux directeurs.", "Les valeurs technologiques restent soutenues."}})
		return
	}
	if r.URL.Path != "/v1/insights/trains" {
		http.NotFound(w, r)
		return
	}
	trains, err := h.trains.Execute(r.Context())
	if err != nil {
		http.Error(w, `{"error":"train_service_unavailable"}`, http.StatusServiceUnavailable)
		return
	}
	_ = json.NewEncoder(w).Encode(map[string]any{"station": "La Ciotat-Ceyreste", "destination": "Marseille", "source": "SNCF / Navitia", "trains": trains})
}
