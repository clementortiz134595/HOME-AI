package assistanthttp

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type fakeWakeDetector struct{ detected bool }

func (detector fakeWakeDetector) Detect(context.Context, []byte) (bool, error) {
	return detector.detected, nil
}

func TestWakeHandlerPublishesListeningState(t *testing.T) {
	state := NewVoiceStateHandler()
	handler := NewWakeHandler(fakeWakeDetector{detected: true}, state)
	request := httptest.NewRequest(http.MethodPost, "/v1/assistant/wake", strings.NewReader("pcm"))
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), `"detected":true`) {
		t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
	}

	stateRequest := httptest.NewRequest(http.MethodGet, "/v1/assistant/voice/state", nil)
	stateResponse := httptest.NewRecorder()
	state.ServeHTTP(stateResponse, stateRequest)
	if !strings.Contains(stateResponse.Body.String(), `"state":"listening"`) {
		t.Fatalf("state=%s", stateResponse.Body.String())
	}
}

func TestWakeHandlerFailsClosedWithoutDetector(t *testing.T) {
	handler := NewWakeHandler(nil, NewVoiceStateHandler())
	request := httptest.NewRequest(http.MethodPost, "/v1/assistant/wake", strings.NewReader("pcm"))
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusServiceUnavailable {
		t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
	}
}
