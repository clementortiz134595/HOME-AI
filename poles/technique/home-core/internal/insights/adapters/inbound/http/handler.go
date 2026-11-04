package insightshttp

import ("encoding/json"; "net/http")

// Handler exposes deterministic fixtures until SNCF and market data providers
// are configured. Its response contract remains stable for the Panel.
type Handler struct{}
func NewHandler() *Handler{return &Handler{}}
func (h *Handler) ServeHTTP(w http.ResponseWriter,r *http.Request){w.Header().Set("Content-Type","application/json; charset=utf-8");switch r.URL.Path{case "/v1/insights/trains":_ = json.NewEncoder(w).Encode(map[string]any{"trains":[]map[string]any{{"time":"07:42","arrival":"08:18","status":"on_time","message":"À l’heure"},{"time":"08:42","arrival":"09:18","status":"delayed","message":"Retard estimé : 10 min"},{"time":"09:42","arrival":"10:18","status":"on_time","message":"À l’heure"}}});case "/v1/insights/markets":_ = json.NewEncoder(w).Encode(map[string]any{"period":"day","etfs":[]map[string]any{{"symbol":"ETF Monde","change":0.42},{"symbol":"ETF Europe","change":-0.18},{"symbol":"ETF USA","change":0.63}},"news":[]string{"Les marchés européens ouvrent en hausse.","La BCE maintient ses taux directeurs.","Les valeurs technologiques restent soutenues."}});default:w.WriteHeader(http.StatusNotFound)}}
