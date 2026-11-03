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

	weatherhttp "github.com/clementortiz/home-ai/home-core/internal/weather/adapters/inbound/http"
	"github.com/clementortiz/home-ai/home-core/internal/weather/adapters/outbound/openmeteo"
	weatherapp "github.com/clementortiz/home-ai/home-core/internal/weather/application"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	provider := openmeteo.NewClient(&http.Client{Timeout: 10 * time.Second})
	weatherService := weatherapp.NewGetWeather(provider)

	server := &http.Server{
		Addr:              listenAddress(),
		Handler:           weatherhttp.NewHandler(weatherService),
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

func listenAddress() string {
	if port := os.Getenv("HOME_CORE_PORT"); port != "" {
		return ":" + port
	}
	return ":8080"
}
