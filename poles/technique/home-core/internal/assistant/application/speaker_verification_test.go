package application

import (
	"context"
	"testing"
)

type fakeEmbedder struct{ embedding []float32 }

func (fake fakeEmbedder) Embed(context.Context, []byte) ([]float32, error) {
	return fake.embedding, nil
}

func TestSpeakerVerifierReturnsMatchingProfile(t *testing.T) {
	store := NewMemoryVoiceProfileStore()
	if err := store.Save(context.Background(), VoiceProfile{ID: "clement", Embedding: []float32{1, 0}}); err != nil {
		t.Fatal(err)
	}
	result, err := NewSpeakerVerifier(fakeEmbedder{embedding: []float32{0.99, 0.01}}, store, 0.8).Verify(context.Background(), []byte("audio"))
	if err != nil || !result.Verified || result.ProfileID != "clement" {
		t.Fatalf("result=%#v err=%v", result, err)
	}
}

func TestSpeakerVerifierFailsClosedForUnknownVoice(t *testing.T) {
	store := NewMemoryVoiceProfileStore()
	_ = store.Save(context.Background(), VoiceProfile{ID: "clement", Embedding: []float32{1, 0}})
	result, err := NewSpeakerVerifier(fakeEmbedder{embedding: []float32{0, 1}}, store, 0.8).Verify(context.Background(), []byte("audio"))
	if err != nil || result.Verified || result.ProfileID != "" {
		t.Fatalf("result=%#v err=%v", result, err)
	}
}

func TestSpeakerVerifierRejectsInvalidEmbedding(t *testing.T) {
	_, err := NewSpeakerVerifier(fakeEmbedder{embedding: []float32{0, 0}}, NewMemoryVoiceProfileStore(), 0.8).Verify(context.Background(), []byte("audio"))
	if err != ErrInvalidVoiceEmbedding {
		t.Fatalf("err=%v", err)
	}
}
