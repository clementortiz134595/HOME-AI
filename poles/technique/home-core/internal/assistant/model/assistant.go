package model

// Question is the user input accepted by the assistant module.
type Question struct {
	Text string `json:"text"`
}

type VoiceInput struct {
	Audio       []byte
	ContentType string
}

type Interaction struct {
	Text   string `json:"text,omitempty"`
	Source string `json:"source"`
}

type Intent struct {
	Name       string         `json:"name"`
	Parameters map[string]any `json:"parameters,omitempty"`
	Sensitive  bool           `json:"sensitive"`
}

type ActionStatus string

const (
	ActionExecuted     ActionStatus = "executed"
	ActionConfirmation ActionStatus = "confirmation_required"
	ActionRefused      ActionStatus = "refused"
	ActionUnavailable  ActionStatus = "unavailable"
	ActionFailed       ActionStatus = "failed"
)

type ActionResult struct {
	Status  ActionStatus `json:"status"`
	Message string       `json:"message"`
	Intent  *Intent      `json:"intent,omitempty"`
}

// Answer is deliberately provider-neutral so the Home Panel does not depend
// on a vendor response format.
type Answer struct {
	Text      string `json:"text"`
	Provider  string `json:"provider"`
	Model     string `json:"model"`
	Generated bool   `json:"generated"`
}
