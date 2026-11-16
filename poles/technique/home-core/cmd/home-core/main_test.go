package main

import (
	"testing"

	"github.com/clementortiz/home-ai/home-core/internal/homecontrol/adapters/outbound/simulated"
)

func TestHomeServiceFromEnvironmentRequiresCredentialsInHomeAssistantMode(t *testing.T) {
	t.Setenv("HOME_CORE_HOME_CONTROL_MODE", "home_assistant")
	t.Setenv("HOME_CORE_HOME_ASSISTANT_URL", "")
	t.Setenv("HOME_CORE_HOME_ASSISTANT_TOKEN", "")

	_, err := homeServiceFromEnvironment(&simulated.Transport{})
	if err == nil {
		t.Fatal("expected an error when Home Assistant credentials are missing")
	}
}

func TestHomeServiceFromEnvironmentAcceptsHomeAssistantCredentials(t *testing.T) {
	t.Setenv("HOME_CORE_HOME_CONTROL_MODE", "home_assistant")
	t.Setenv("HOME_CORE_HOME_ASSISTANT_URL", "http://home-assistant.local:8123")
	t.Setenv("HOME_CORE_HOME_ASSISTANT_TOKEN", "test-token")

	if _, err := homeServiceFromEnvironment(&simulated.Transport{}); err != nil {
		t.Fatalf("expected Home Assistant configuration to be accepted: %v", err)
	}
}

func TestHomeServiceFromEnvironmentRejectsUnknownMode(t *testing.T) {
	t.Setenv("HOME_CORE_HOME_CONTROL_MODE", "invalid")

	_, err := homeServiceFromEnvironment(&simulated.Transport{})
	if err == nil {
		t.Fatal("expected an error for an unknown mode")
	}
}
