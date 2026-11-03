package assistanthttp

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/clementortiz/home-ai/home-core/internal/assistant/application"
	"github.com/clementortiz/home-ai/home-core/internal/assistant/model"
)

type Handler struct {
	ask application.AskQuestion
}

func NewHandler(ask application.AskQuestion) *Handler { return &Handler{ask: ask} }

func (handler *Handler) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost || request.URL.Path != "/v1/assistant/questions" {
		writeJSON(writer, http.StatusNotFound, map[string]string{"error": "not_found"})
		return
	}
	var question model.Question
	decoder := json.NewDecoder(http.MaxBytesReader(writer, request.Body, 16<<10))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&question); err != nil {
		writeJSON(writer, http.StatusBadRequest, map[string]string{"error": "invalid_request"})
		return
	}
	answer, err := handler.ask.Execute(request.Context(), question)
	if err != nil {
		if errors.Is(err, application.ErrEmptyQuestion) {
			writeJSON(writer, http.StatusBadRequest, map[string]string{"error": "empty_question"})
			return
		}
		writeJSON(writer, http.StatusBadGateway, map[string]string{"error": "assistant_unavailable"})
		return
	}
	writeJSON(writer, http.StatusOK, answer)
}

func writeJSON(writer http.ResponseWriter, status int, body any) {
	writer.Header().Set("Content-Type", "application/json; charset=utf-8")
	writer.WriteHeader(status)
	_ = json.NewEncoder(writer).Encode(body)
}
