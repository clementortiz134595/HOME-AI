package insightshttp

import (
	"encoding/json"
	"net/http"
	"strings"
)

type Handler struct{}
type etf struct {
	Symbol string  `json:"symbol"`
	Name   string  `json:"name"`
	ISIN   string  `json:"isin"`
	Change float64 `json:"change"`
	Price  float64 `json:"price"`
}

var trackedETFs = []etf{
	{"BNKE", "Amundi Euro Stoxx Banks UCITS ETF", "LU1829219390", 4.91, 4.6005},
	{"PANX", "Amundi PEA US Tech Screened UCITS ETF", "FR0013412269", 1.43, 81.03},
	{"PUST", "Amundi PEA Nasdaq-100 UCITS ETF", "FR0011871110", 0.81, 101.78},
	{"PSP5", "Amundi PEA S&P 500 UCITS ETF", "FR0011871128", 1.19, 60.19},
	{"PAASI", "Amundi PEA Asie Emergente (MSCI Emerging Asia) Screened UCITS ETF", "FR0013412012", 0.26, 36.985},
	{"C50", "Amundi Core Euro STOXX 50 UCITS ETF EUR Acc", "LU1681047236", 2.17, 168.86},
}

func NewHandler() *Handler { return &Handler{} }
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	if r.URL.Path == "/v1/insights/trains" {
		_ = json.NewEncoder(w).Encode(map[string]any{"trains": []map[string]any{{"time": "07:42", "arrival": "08:18", "status": "on_time", "message": "À l’heure"}, {"time": "08:42", "arrival": "09:18", "status": "delayed", "message": "Retard estimé : 10 min"}, {"time": "09:42", "arrival": "10:18", "status": "on_time", "message": "À l’heure"}}})
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
				history := make([]map[string]any, 12)
				for i := range history {
					history[i] = map[string]any{"label": i + 1, "value": item.Price * (0.86 + float64(i)*0.014 + float64(len(symbol))*0.001)}
				}
				_ = json.NewEncoder(w).Encode(map[string]any{"period": r.URL.Query().Get("period"), "etf": item, "history": history, "dataStatus": "fixture"})
				return
			}
		}
	}
	w.WriteHeader(http.StatusNotFound)
}
