package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	agendahttp "github.com/clementortiz/home-ai/home-core/internal/agenda/adapters/inbound/http"
	"github.com/clementortiz/home-ai/home-core/internal/agenda/adapters/outbound/applecaldav"
	agendaapp "github.com/clementortiz/home-ai/home-core/internal/agenda/application"
	assistanthttp "github.com/clementortiz/home-ai/home-core/internal/assistant/adapters/inbound/http"
	"github.com/clementortiz/home-ai/home-core/internal/assistant/adapters/outbound/gemini"
	"github.com/clementortiz/home-ai/home-core/internal/assistant/adapters/outbound/google"
	assistantapp "github.com/clementortiz/home-ai/home-core/internal/assistant/application"
	homecontrolhttp "github.com/clementortiz/home-ai/home-core/internal/homecontrol/adapters/inbound/http"
	"github.com/clementortiz/home-ai/home-core/internal/homecontrol/adapters/outbound/simulated"
	"github.com/clementortiz/home-ai/home-core/internal/homecontrol/adapters/outbound/zigbee"
	homecontrolapp "github.com/clementortiz/home-ai/home-core/internal/homecontrol/application"
	weatherhttp "github.com/clementortiz/home-ai/home-core/internal/weather/adapters/inbound/http"
	"github.com/clementortiz/home-ai/home-core/internal/weather/adapters/outbound/openmeteo"
	weatherapp "github.com/clementortiz/home-ai/home-core/internal/weather/application"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)
	provider := openmeteo.NewClient(&http.Client{Timeout: 10 * time.Second})
	weatherService := weatherapp.NewGetWeather(provider)
	calendarRegistry, err := calendarRegistryFromEnvironment()
	if err != nil {
		logger.Error("invalid Apple calendar configuration", "error", err)
		os.Exit(1)
	}
	weatherHandler := weatherhttp.NewHandler(weatherService)
	mux := http.NewServeMux()
	mux.Handle("/healthz", weatherHandler)
	mux.Handle("/v1/weather/", weatherHandler)
	mux.Handle("/v1/calendars/apple/", agendahttp.NewHandler(calendarRegistry))
	fixturePath := os.Getenv("HOME_CORE_ZIGBEE_FIXTURE")
	if fixturePath == "" {
		fixturePath = "../zigbee-simulator/code/fixtures/maison-demo.json"
	}
	zigbeeTransport, err := simulated.NewTransportFromFile(fixturePath)
	if err != nil {
		logger.Error("invalid Zigbee fixture", "error", err)
		os.Exit(1)
	}
	zigbeeService := homecontrolapp.NewService(zigbee.NewAdapter(zigbeeTransport))
	mux.Handle("/v1/home-control/", homecontrolhttp.NewHandler(zigbeeService))
	aiProvider := gemini.NewClient(&http.Client{Timeout: 30 * time.Second}, os.Getenv("HOME_CORE_AI_BASE_URL"), os.Getenv("HOME_CORE_AI_API_KEY"), os.Getenv("HOME_CORE_AI_MODEL"))
	assistantService := assistantapp.NewAskQuestion(aiProvider)
	sttProvider := google.NewTranscriber(&http.Client{Timeout: 30 * time.Second}, os.Getenv("HOME_CORE_STT_BASE_URL"), os.Getenv("HOME_CORE_STT_API_KEY"), os.Getenv("HOME_CORE_STT_LANGUAGE"), os.Getenv("HOME_CORE_STT_PROJECT"), os.Getenv("HOME_CORE_STT_LOCATION"))
	mux.Handle("/v1/assistant/", assistanthttp.NewHandler(assistantService))
	voiceStatus := assistanthttp.NewVoiceStatusStore()
	mux.Handle("/v1/assistant/voice/state", voiceStatus.Handler())
	mux.Handle("/v1/assistant/voice", assistanthttp.NewVoiceHandler(assistantapp.NewAskTranscribedQuestion(sttProvider, aiProvider)))
	// Fails closed until a local VoiceEmbedder is configured.
	voiceProfiles := assistantapp.NewMemoryVoiceProfileStore()
	mux.Handle("/v1/assistant/voice-profiles/", assistanthttp.NewVoiceProfileHandler(assistantapp.NewVoiceEnrollment(nil, voiceProfiles)))
	mux.Handle("/", weatherHandler)

	server := &http.Server{
		Addr:              listenAddress(),
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		logger.Info("home-core started", "address", server.Addr)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("home-core stopped unexpectedly", "error", err)
			os.Exit(1)
		}
	}()

	signals := make(chan os.Signal, 1)
	signal.Notify(signals, syscall.SIGINT, syscall.SIGTERM)
	<-signals

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		logger.Error("graceful shutdown failed", "error", err)
		os.Exit(1)
	}
	logger.Info("home-core stopped")
}

func calendarRegistryFromEnvironment() (agendaapp.Registry, error) {
	accounts, err := applecaldav.AccountsFromEnvironment()
	if err != nil {
		return agendaapp.Registry{}, err
	}
	providers := make(map[string]agendaapp.CalendarProvider, len(accounts))
	for _, account := range accounts {
		provider, err := applecaldav.NewClient(account, &http.Client{Timeout: 15 * time.Second})
		if err != nil {
			return agendaapp.Registry{}, err
		}
		providers[account.ID] = provider
	}
	return agendaapp.NewRegistry(providers), nil
}

func listenAddress() string {
	if port := os.Getenv("HOME_CORE_PORT"); port != "" {
		return ":" + port
	}
	return ":8080"
}
