package model

// Question is the user input accepted by the assistant module.
type Question struct {
	Text            string `json:"text"`
	ConfirmationID  string `json:"confirmationId,omitempty"`
	RememberSession bool   `json:"rememberSession,omitempty"`
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
	Answer  *Answer      `json:"answer,omitempty"`
	Status  ActionStatus `json:"status"`
	Message string       `json:"message"`
	Intent  *Intent      `json:"intent,omitempty"`
}

// Answer is deliberately provider-neutral so the Home Panel does not depend
// on a vendor response format.
type Answer struct {
	Text                 string       `json:"text"`
	Provider             string       `json:"provider"`
	Model                string       `json:"model"`
	Generated            bool         `json:"generated"`
	Status               ActionStatus `json:"status,omitempty"`
	ConfirmationID       string       `json:"confirmationId,omitempty"`
	ContinueConversation bool         `json:"continueConversation,omitempty"`
	GmailQuery           string       `json:"gmailQuery,omitempty"`
}

// Tool messages preserve the provider conversation, including opaque signatures.
type ToolDefinition struct {
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Parameters  map[string]any `json:"parameters"`
}
type ToolCall struct {
	Name string         `json:"name"`
	Args map[string]any `json:"args"`
}
type ToolResponse struct {
	Name     string         `json:"name"`
	Response map[string]any `json:"response"`
}
type Part struct {
	Text             string        `json:"text,omitempty"`
	FunctionCall     *ToolCall     `json:"functionCall,omitempty"`
	FunctionResponse *ToolResponse `json:"functionResponse,omitempty"`
	ThoughtSignature string        `json:"thoughtSignature,omitempty"`
	Thought          bool          `json:"thought,omitempty"`
}
type Content struct {
	Role  string `json:"role,omitempty"`
	Parts []Part `json:"parts"`
}
