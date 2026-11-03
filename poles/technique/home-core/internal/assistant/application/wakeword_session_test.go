package application

import (
	"context"
	"testing"
	"time"
)

type fakeWakeWord struct {
	detected bool
	calls    int
}

func (f *fakeWakeWord) Detect(context.Context, []byte) (bool, error) {
	f.calls++
	return f.detected, nil
}

type fakeSink struct {
	started, stopped int
	frames           [][]byte
}

func (f *fakeSink) Start() error              { f.started++; return nil }
func (f *fakeSink) Append(frame []byte) error { f.frames = append(f.frames, frame); return nil }
func (f *fakeSink) Stop() ([]byte, error)     { f.stopped++; return []byte("captured-audio"), nil }

func TestWakeWordSessionDoesNotRecordBeforeWakeWord(t *testing.T) {
	detector := &fakeWakeWord{}
	sink := &fakeSink{}
	session := NewWakeWordSession(detector, sink, time.Second)
	_, done, err := session.Feed(context.Background(), []byte("ambient"), time.Now(), false)
	if err != nil || done || sink.started != 0 || session.Recording() {
		t.Fatalf("done=%v started=%d recording=%v err=%v", done, sink.started, session.Recording(), err)
	}
}

func TestWakeWordSessionCapturesOnlyAfterWakeWord(t *testing.T) {
	detector := &fakeWakeWord{detected: true}
	sink := &fakeSink{}
	started := time.Now()
	session := NewWakeWordSession(detector, sink, time.Second)
	_, done, _ := session.Feed(context.Background(), []byte("dis-jarvis"), started, false)
	if done || !session.Recording() {
		t.Fatal("wake word should open recording")
	}
	audio, done, err := session.Feed(context.Background(), []byte("allume salon"), started.Add(100*time.Millisecond), true)
	if err != nil || !done || string(audio) != "captured-audio" || session.Recording() || sink.stopped != 1 {
		t.Fatalf("audio=%q done=%v recording=%v stopped=%d err=%v", audio, done, session.Recording(), sink.stopped, err)
	}
}
