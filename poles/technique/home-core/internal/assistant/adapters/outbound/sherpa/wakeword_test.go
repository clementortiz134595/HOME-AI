package sherpa

import (
	"encoding/binary"
	"math"
	"testing"
)

func TestDecodeFloat32(t *testing.T) {
	frame := make([]byte, 8)
	binary.LittleEndian.PutUint32(frame[0:4], math.Float32bits(-0.5))
	binary.LittleEndian.PutUint32(frame[4:8], math.Float32bits(0.25))
	samples, err := decodeFloat32(frame)
	if err != nil || len(samples) != 2 || samples[0] != -0.5 || samples[1] != 0.25 {
		t.Fatalf("samples=%v err=%v", samples, err)
	}
}

func TestDecodeFloat32RejectsPartialSample(t *testing.T) {
	if _, err := decodeFloat32([]byte{1, 2, 3}); err == nil {
		t.Fatal("expected a malformed PCM error")
	}
}
