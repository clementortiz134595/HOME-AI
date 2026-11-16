package costshttp

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/clementortiz/home-ai/home-core/internal/costs/application"
	"github.com/clementortiz/home-ai/home-core/internal/costs/model"
)

type repositoryStub struct{}

func (repositoryStub) ListCostEntries(time.Time, time.Time) ([]model.Entry, error) { return nil, nil }

func TestSummary(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/v1/costs/summary", nil)
	response := httptest.NewRecorder()
	NewHandler(application.NewService(repositoryStub{})).ServeHTTP(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d", response.Code)
	}
}
