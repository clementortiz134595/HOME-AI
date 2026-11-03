package application

import (
	"context"
	"errors"
	"time"
)

var ErrSessionNotRecording = errors.New("voice session is not recording")

// WakeWordDetector is intentionally local: implementations must not transmit
// microphone frames before Detect returns true.
type WakeWordDetector interface {
	Detect(context.Context, []byte) (bool, error)
}

type AudioSink interface {
	Start() error
	Append([]byte) error
	Stop() ([]byte, error)
}

type WakeWordSession struct {
	detector  WakeWordDetector
	sink      AudioSink
	started   time.Time
	max       time.Duration
	recording bool
}

func NewWakeWordSession(detector WakeWordDetector, sink AudioSink, maxDuration time.Duration) *WakeWordSession {
	if maxDuration <= 0 {
		maxDuration = 10 * time.Second
	}
	return &WakeWordSession{detector: detector, sink: sink, max: maxDuration}
}

// Feed receives local microphone frames. It returns audio only after the wake
// word has opened a session and the session ends.
func (session *WakeWordSession) Feed(ctx context.Context, frame []byte, now time.Time, silence bool) ([]byte, bool, error) {
	if !session.recording {
		woken, err := session.detector.Detect(ctx, frame)
		if err != nil || !woken {
			return nil, false, err
		}
		if err := session.sink.Start(); err != nil {
			return nil, false, err
		}
		session.started = now
		session.recording = true
		return nil, false, nil
	}
	if err := session.sink.Append(frame); err != nil {
		return nil, false, err
	}
	if silence || now.Sub(session.started) >= session.max {
		audio, err := session.sink.Stop()
		session.recording = false
		return audio, true, err
	}
	return nil, false, nil
}

func (session *WakeWordSession) Recording() bool { return session.recording }
