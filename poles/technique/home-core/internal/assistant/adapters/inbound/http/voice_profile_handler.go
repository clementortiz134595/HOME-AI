package assistanthttp

import (
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/clementortiz/home-ai/home-core/internal/assistant/application"
)

type VoiceProfileHandler struct{ enrollment application.VoiceEnrollment }

func NewVoiceProfileHandler(enrollment application.VoiceEnrollment) *VoiceProfileHandler {
	return &VoiceProfileHandler{enrollment: enrollment}
}

func (handler *VoiceProfileHandler) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost || !strings.HasPrefix(request.URL.Path, "/v1/assistant/voice-profiles/") {
		writeJSON(writer, http.StatusNotFound, map[string]string{"error": "not_found"})
		return
	}
	profileID := strings.TrimPrefix(request.URL.Path, "/v1/assistant/voice-profiles/")
	audio, err := io.ReadAll(http.MaxBytesReader(writer, request.Body, 10<<20))
	if err != nil || profileID == "" || len(audio) == 0 {
		writeJSON(writer, http.StatusBadRequest, map[string]string{"error": "invalid_audio"})
		return
	}
	if err := handler.enrollment.Enroll(request.Context(), profileID, audio); err != nil {
		if errors.Is(err, application.ErrVoiceEnrollmentUnavailable) {
			writeJSON(writer, http.StatusServiceUnavailable, map[string]string{"error": "voice_enrollment_unavailable"})
			return
		}
		writeJSON(writer, http.StatusBadGateway, map[string]string{"error": "voice_enrollment_failed"})
		return
	}
	writeJSON(writer, http.StatusCreated, map[string]any{"profileId": profileID, "enrolled": true})
}
