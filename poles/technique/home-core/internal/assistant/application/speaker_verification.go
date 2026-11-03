package application

import (
	"context"
	"errors"
	"fmt"
	"math"
	"sync"
)

var (
	ErrInvalidVoiceEmbedding = errors.New("voice embedding is invalid")
	ErrVoiceProfileNotFound  = errors.New("voice profile not found")
)

// VoiceEmbedder is implemented by a local or explicitly approved audio
// adapter. Home Core never stores raw audio in a voice profile.
type VoiceEmbedder interface {
	Embed(context.Context, []byte) ([]float32, error)
}

type VoiceProfile struct {
	ID        string
	Embedding []float32
}

type VoiceProfileStore interface {
	Save(context.Context, VoiceProfile) error
	List(context.Context) ([]VoiceProfile, error)
}

type VerificationResult struct {
	ProfileID  string  `json:"profileId,omitempty"`
	Confidence float32 `json:"confidence"`
	Verified   bool    `json:"verified"`
}

// SpeakerVerifier compares normalized embeddings and deliberately returns an
// unknown result below the configured threshold.
type SpeakerVerifier struct {
	embedder  VoiceEmbedder
	profiles  VoiceProfileStore
	threshold float32
}

func NewSpeakerVerifier(embedder VoiceEmbedder, profiles VoiceProfileStore, threshold float32) SpeakerVerifier {
	if threshold <= 0 || threshold > 1 {
		threshold = 0.82
	}
	return SpeakerVerifier{embedder: embedder, profiles: profiles, threshold: threshold}
}

func (verifier SpeakerVerifier) Verify(ctx context.Context, audio []byte) (VerificationResult, error) {
	if len(audio) == 0 {
		return VerificationResult{}, ErrEmptyAudio
	}
	input, err := verifier.embedder.Embed(ctx, audio)
	if err != nil {
		return VerificationResult{}, fmt.Errorf("extract voice embedding: %w", err)
	}
	if err := validateEmbedding(input); err != nil {
		return VerificationResult{}, err
	}
	profiles, err := verifier.profiles.List(ctx)
	if err != nil {
		return VerificationResult{}, fmt.Errorf("list voice profiles: %w", err)
	}
	var best VoiceProfile
	var bestScore float32
	for _, profile := range profiles {
		if len(profile.Embedding) != len(input) {
			continue
		}
		score := cosineSimilarity(input, profile.Embedding)
		if score > bestScore {
			best, bestScore = profile, score
		}
	}
	if best.ID == "" || bestScore < verifier.threshold {
		return VerificationResult{Confidence: bestScore}, nil
	}
	return VerificationResult{ProfileID: best.ID, Confidence: bestScore, Verified: true}, nil
}

func validateEmbedding(embedding []float32) error {
	if len(embedding) == 0 {
		return ErrInvalidVoiceEmbedding
	}
	var norm float32
	for _, value := range embedding {
		if math.IsNaN(float64(value)) || math.IsInf(float64(value), 0) {
			return ErrInvalidVoiceEmbedding
		}
		norm += value * value
	}
	if norm == 0 {
		return ErrInvalidVoiceEmbedding
	}
	return nil
}

func cosineSimilarity(left, right []float32) float32 {
	var dot, leftNorm, rightNorm float32
	for index := range left {
		dot += left[index] * right[index]
		leftNorm += left[index] * left[index]
		rightNorm += right[index] * right[index]
	}
	if leftNorm == 0 || rightNorm == 0 {
		return 0
	}
	return dot / float32(math.Sqrt(float64(leftNorm*rightNorm)))
}

type MemoryVoiceProfileStore struct {
	mu       sync.RWMutex
	profiles map[string]VoiceProfile
}

func NewMemoryVoiceProfileStore() *MemoryVoiceProfileStore {
	return &MemoryVoiceProfileStore{profiles: make(map[string]VoiceProfile)}
}

func (store *MemoryVoiceProfileStore) Save(_ context.Context, profile VoiceProfile) error {
	if profile.ID == "" {
		return ErrVoiceProfileNotFound
	}
	if err := validateEmbedding(profile.Embedding); err != nil {
		return err
	}
	store.mu.Lock()
	defer store.mu.Unlock()
	store.profiles[profile.ID] = VoiceProfile{ID: profile.ID, Embedding: append([]float32(nil), profile.Embedding...)}
	return nil
}

func (store *MemoryVoiceProfileStore) List(_ context.Context) ([]VoiceProfile, error) {
	store.mu.RLock()
	defer store.mu.RUnlock()
	profiles := make([]VoiceProfile, 0, len(store.profiles))
	for _, profile := range store.profiles {
		profiles = append(profiles, VoiceProfile{ID: profile.ID, Embedding: append([]float32(nil), profile.Embedding...)})
	}
	return profiles, nil
}
