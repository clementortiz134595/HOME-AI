package application

import (
	"context"
	"testing"
)

func TestVoiceEnrollmentStoresEmbeddingWithoutAudio(t *testing.T) {
	store := NewMemoryVoiceProfileStore()
	err := NewVoiceEnrollment(fakeEmbedder{embedding: []float32{1, 0}}, store).Enroll(context.Background(), "clement", []byte("audio"))
	if err != nil {
		t.Fatal(err)
	}
	profiles, err := store.List(context.Background())
	if err != nil || len(profiles) != 1 || profiles[0].ID != "clement" {
		t.Fatalf("profiles=%#v err=%v", profiles, err)
	}
}
