package application

import "context"

type SpeechSynthesizer interface {
	Synthesize(context.Context, string) ([]byte, error)
}
