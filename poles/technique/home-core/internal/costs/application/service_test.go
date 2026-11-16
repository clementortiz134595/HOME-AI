package application

import (
	"testing"
	"time"

	"github.com/clementortiz/home-ai/home-core/internal/costs/model"
)

type repositoryStub struct{ entries []model.Entry }

func (r repositoryStub) ListCostEntries(from, to time.Time) ([]model.Entry, error) {
	return r.entries, nil
}

func TestSummarySeparatesCurrentMonthAndProjection(t *testing.T) {
	service := NewService(repositoryStub{entries: []model.Entry{
		{ID: "ai", OccurredAt: time.Date(2026, time.November, 10, 0, 0, 0, 0, time.UTC), Category: "Modèles IA", AmountCents: 300},
		{ID: "hosting", OccurredAt: time.Date(2026, time.November, 11, 0, 0, 0, 0, time.UTC), Category: "Hébergement", AmountCents: 100},
		{ID: "previous", OccurredAt: time.Date(2026, time.October, 2, 0, 0, 0, 0, time.UTC), Category: "Modèles IA", AmountCents: 500},
	}})
	service.now = func() time.Time { return time.Date(2026, time.November, 20, 12, 0, 0, 0, time.UTC) }

	summary, err := service.Summary()
	if err != nil {
		t.Fatal(err)
	}
	if summary.MonthAmountCents != 400 || summary.PreviousMonthCents != 500 {
		t.Fatalf("unexpected amounts: %#v", summary)
	}
	if summary.ProjectionCents != 600 {
		t.Fatalf("projection = %d, want 600", summary.ProjectionCents)
	}
	if summary.LargestCategory == nil || summary.LargestCategory.Category != "Modèles IA" {
		t.Fatalf("unexpected largest category: %#v", summary.LargestCategory)
	}
}

func TestSummaryIsEmptyWithoutEntries(t *testing.T) {
	service := NewService(repositoryStub{})
	summary, err := service.Summary()
	if err != nil {
		t.Fatal(err)
	}
	if summary.DataStatus != "empty" || summary.MonthAmountCents != 0 {
		t.Fatalf("unexpected empty summary: %#v", summary)
	}
}
