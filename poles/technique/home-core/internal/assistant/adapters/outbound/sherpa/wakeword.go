package sherpa

import (
	"context"
	"encoding/binary"
	"fmt"
	"math"
	"path/filepath"
	"sync"

	sherpaonnx "github.com/k2-fsa/sherpa-onnx-go/sherpa_onnx"
)

const sampleRate = 16000

type Detector struct {
	mu      sync.Mutex
	spotter *sherpaonnx.KeywordSpotter
	stream  *sherpaonnx.OnlineStream
}

func NewDetector(modelDir string) (*Detector, error) {
	if modelDir == "" {
		modelDir = "/app/models/sherpa-kws"
	}
	config := sherpaonnx.KeywordSpotterConfig{
		FeatConfig: sherpaonnx.FeatureConfig{SampleRate: sampleRate, FeatureDim: 80},
		ModelConfig: sherpaonnx.OnlineModelConfig{
			Transducer: sherpaonnx.OnlineTransducerModelConfig{
				Encoder: filepath.Join(modelDir, "encoder.int8.onnx"),
				Decoder: filepath.Join(modelDir, "decoder.onnx"),
				Joiner:  filepath.Join(modelDir, "joiner.int8.onnx"),
			},
			Tokens:     filepath.Join(modelDir, "tokens.txt"),
			NumThreads: 1,
			Provider:   "cpu",
			ModelType:  "zipformer2",
		},
		MaxActivePaths:    4,
		KeywordsFile:      filepath.Join(modelDir, "keywords.txt"),
		KeywordsScore:     1.0,
		KeywordsThreshold: 0.25,
	}
	spotter := sherpaonnx.NewKeywordSpotter(&config)
	if spotter == nil {
		return nil, fmt.Errorf("initialize sherpa-onnx keyword spotter")
	}
	return &Detector{spotter: spotter, stream: sherpaonnx.NewKeywordStream(spotter)}, nil
}

func (detector *Detector) Close() {
	detector.mu.Lock()
	defer detector.mu.Unlock()
	if detector.stream != nil {
		sherpaonnx.DeleteOnlineStream(detector.stream)
		detector.stream = nil
	}
	if detector.spotter != nil {
		sherpaonnx.DeleteKeywordSpotter(detector.spotter)
		detector.spotter = nil
	}
}

// Detect consumes little-endian float32 PCM frames at 16 kHz.
func (detector *Detector) Detect(ctx context.Context, frame []byte) (bool, error) {
	if err := ctx.Err(); err != nil {
		return false, err
	}
	samples, err := decodeFloat32(frame)
	if err != nil {
		return false, err
	}
	if len(samples) == 0 {
		return false, nil
	}

	detector.mu.Lock()
	defer detector.mu.Unlock()
	if detector.spotter == nil || detector.stream == nil {
		return false, fmt.Errorf("sherpa-onnx detector is closed")
	}
	detector.stream.AcceptWaveform(sampleRate, samples)
	for detector.spotter.IsReady(detector.stream) {
		detector.spotter.Decode(detector.stream)
		if detector.spotter.GetResult(detector.stream).Keyword != "" {
			detector.spotter.Reset(detector.stream)
			return true, nil
		}
	}
	return false, nil
}

func decodeFloat32(frame []byte) ([]float32, error) {
	if len(frame)%4 != 0 {
		return nil, fmt.Errorf("PCM frame length must be a multiple of four")
	}
	samples := make([]float32, len(frame)/4)
	for index := range samples {
		bits := binary.LittleEndian.Uint32(frame[index*4 : index*4+4])
		samples[index] = math.Float32frombits(bits)
	}
	return samples, nil
}
