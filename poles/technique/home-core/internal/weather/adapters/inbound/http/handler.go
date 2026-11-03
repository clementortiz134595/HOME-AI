package weatherhttp

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/clementortiz/home-ai/home-core/internal/weather/adapters/outbound/openmeteo"
	weatherapp "github.com/clementortiz/home-ai/home-core/internal/weather/application"
	"github.com/clementortiz/home-ai/home-core/internal/weather/model"
)

// Handler exposes only the configured first weather capability. Authentication is
// deliberately deferred until the identity-access module is implemented.
type Handler struct {
	getWeather weatherapp.GetWeather
}

func NewHandler(getWeather weatherapp.GetWeather) *Handler {
	return &Handler{getWeather: getWeather}
}

func (handler *Handler) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	switch {
	case request.Method == http.MethodGet && request.URL.Path == "/healthz":
		writeJSON(writer, http.StatusOK, map[string]string{"status": "ok"})
	case request.Method == http.MethodGet && request.URL.Path == "/v1/weather/la-ciotat":
		report, err := handler.getWeather.Execute(request.Context(), model.LaCiotat)
		if err != nil {
			status := http.StatusBadGateway
			if !errors.Is(err, openmeteo.ErrUnavailable) {
				status = http.StatusInternalServerError
			}
			writeJSON(writer, status, map[string]string{"error": "weather_unavailable"})
			return
		}
		writeJSON(writer, http.StatusOK, report)
	default:
		writeJSON(writer, http.StatusNotFound, map[string]string{"error": "not_found"})
	}
}

func writeJSON(writer http.ResponseWriter, status int, body any) {
	writer.Header().Set("Content-Type", "application/json; charset=utf-8")
	writer.WriteHeader(status)
	_ = json.NewEncoder(writer).Encode(body)
}
