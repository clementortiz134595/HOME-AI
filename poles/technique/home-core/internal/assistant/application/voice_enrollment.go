package application

import (
	"context"
	"errors"
	"fmt"
)

var ErrVoiceEnrollmentUnavailable = errors.New("voice enrollment is unavailable")

type VoiceEnrollment struct {
	embedder VoiceEmbedder
	profiles VoiceProfileStore
}

func NewVoiceEnrollment(embedder VoiceEmbedder, profiles VoiceProfileStore) VoiceEnrollment {
	return VoiceEnrollment{embedder: embedder, profiles: profiles}
}

func (enrollment VoiceEnrollment) Enroll(ctx context.Context, profileID string, audio []byte) error {
	if profileID == "" || len(audio) == 0 || enrollment.embedder == nil || enrollment.profiles == nil {
		return ErrVoiceEnrollmentUnavailable
	}
	embedding, err := enrollment.embedder.Embed(ctx, audio)
	if err != nil {
		return fmt.Errorf("extract voice embedding: %w", err)
	}
	return enrollment.profiles.Save(ctx, VoiceProfile{ID: profileID, Embedding: embedding})
}
