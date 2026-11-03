package applecaldav

import (
	"encoding/json"
	"fmt"
	"os"
)

const AccountsEnvironmentVariable = "APPLE_CALDAV_ACCOUNTS_JSON"

type AccountConfig struct {
	ID          string `json:"id"`
	Username    string `json:"username"`
	AppPassword string `json:"appPassword"`
	Endpoint    string `json:"endpoint,omitempty"`
}

func AccountsFromEnvironment() ([]AccountConfig, error) {
	raw := os.Getenv(AccountsEnvironmentVariable)
	if raw == "" {
		return nil, nil
	}
	var accounts []AccountConfig
	if err := json.Unmarshal([]byte(raw), &accounts); err != nil {
		return nil, fmt.Errorf("decode %s: %w", AccountsEnvironmentVariable, err)
	}
	seen := make(map[string]bool, len(accounts))
	for _, account := range accounts {
		if account.ID == "" || account.Username == "" || account.AppPassword == "" {
			return nil, fmt.Errorf("%s contains an incomplete account", AccountsEnvironmentVariable)
		}
		if seen[account.ID] {
			return nil, fmt.Errorf("%s contains duplicate account %q", AccountsEnvironmentVariable, account.ID)
		}
		seen[account.ID] = true
	}
	return accounts, nil
}
