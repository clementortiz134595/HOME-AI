package insightshttp

import (
	"encoding/json"
	"github.com/clementortiz/home-ai/home-core/internal/insights/application"
	"log"
	"net/http"
	"strings"
)

type Handler struct {
	trains  *application.GetTrains
	history *application.GetMarketHistory
}
type etf struct {
	Symbol string  `json:"symbol"`
	Name   string  `json:"name"`
	ISIN   string  `json:"isin"`
	Change float64 `json:"change"`
	Price  float64 `json:"price"`
}

var trackedETFs = []etf{{"BNKE", "Amundi Euro Stoxx Banks UCITS ETF", "LU1829219390", 4.91, 4.6005}, {"PANX", "Amundi PEA US Tech Screened UCITS ETF", "FR0013412269", 1.43, 81.03}, {"PUST", "Amundi PEA Nasdaq-100 UCITS ETF", "FR0011871110", 0.81, 101.78}, {"PSP5", "Amundi PEA S&P 500 UCITS ETF", "FR0011871128", 1.19, 60.19}, {"PAASI", "Amundi PEA Asie Emergente (MSCI Emerging Asia) Screened UCITS ETF", "FR0013412012", 0.26, 36.985}, {"C50", "Amundi Core Euro STOXX 50 UCITS ETF EUR Acc", "LU1681047236", 2.17, 168.86}}

func NewHandler(trains *application.GetTrains, history *application.GetMarketHistory) *Handler {
	return &Handler{trains: trains, history: history}
}
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	if r.URL.Path == "/v1/insights/trains" {
		trains, err := h.trains.Execute(r.Context())
		if err != nil {
			log.Printf("train provider unavailable: %v", err)
			http.Error(w, `{"error":"train_service_unavailable"}`, http.StatusServiceUnavailable)
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"station": "La Ciotat-Ceyreste", "destination": "Marseille", "source": "SNCF / Train Nomade", "trains": trains})
		return
	}
	if r.URL.Path == "/v1/insights/markets" {
		_ = json.NewEncoder(w).Encode(map[string]any{"period": r.URL.Query().Get("period"), "etfs": trackedETFs, "news": []string{"Les marchés européens ouvrent en hausse.", "La BCE maintient ses taux directeurs.", "Les valeurs technologiques restent soutenues."}})
		return
	}
	const prefix = "/v1/insights/markets/"
	if strings.HasPrefix(r.URL.Path, prefix) {
		symbol := strings.ToUpper(strings.TrimPrefix(r.URL.Path, prefix))
		for _, item := range trackedETFs {
			if item.Symbol == symbol {
				providerSymbol := symbol + ".PA"
				marketHistory, err := h.history.Execute(r.Context(), providerSymbol, r.URL.Query().Get("period"))
				if err != nil {
					_ = json.NewEncoder(w).Encode(map[string]any{"period": r.URL.Query().Get("period"), "etf": item, "history": []any{}, "dataStatus": marketHistory.Status})
					return
				}
				points := make([]map[string]any, 0, len(marketHistory.Points))
				for _, point := range marketHistory.Points {
					points = append(points, map[string]any{"label": point.Time.Format("2006-01-02"), "value": point.Value})
				}
				_ = json.NewEncoder(w).Encode(map[string]any{"period": r.URL.Query().Get("period"), "etf": item, "history": points, "dataStatus": marketHistory.Status})
				return
			}
		}
	}
	http.NotFound(w, r)
}
