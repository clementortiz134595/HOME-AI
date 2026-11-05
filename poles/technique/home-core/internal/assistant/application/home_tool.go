package application

import (
	"context"
	"fmt"
	"strings"

	"github.com/clementortiz/home-ai/home-core/internal/assistant/model"
	homecontrol "github.com/clementortiz/home-ai/home-core/internal/homecontrol/application"
	homemodel "github.com/clementortiz/home-ai/home-core/internal/homecontrol/model"
)

type HomeTool struct{ service homecontrol.Service }

func NewHomeTool(service homecontrol.Service) HomeTool { return HomeTool{service: service} }

func (tool HomeTool) Execute(ctx context.Context, intent model.Intent) (model.ActionResult, error) {
	action := homemodel.ActionTurnOn
	if intent.Name == "home.turn_off" {
		action = homemodel.ActionTurnOff
	}
	target, _ := intent.Parameters["target"].(string)
	if target == "" {
		target, _ = intent.Parameters["entity_id"].(string)
	}
	if target == "" {
		return model.ActionResult{Status: model.ActionFailed, Message: "L’appareil cible est manquant."}, fmt.Errorf("home target is required")
	}
	devices, err := tool.service.ListDevices(ctx)
	if err != nil {
		return model.ActionResult{Status: model.ActionUnavailable, Message: "La maison connectée est indisponible."}, err
	}
	device, err := findDevice(devices, target)
	if err != nil {
		return model.ActionResult{Status: model.ActionFailed, Message: err.Error()}, err
	}
	result, err := tool.service.Execute(ctx, device.ID, action)
	if err != nil {
		return model.ActionResult{Status: model.ActionFailed, Message: "La commande domotique a échoué."}, err
	}
	state := "éteinte"
	if result.State.SwitchOn != nil && *result.State.SwitchOn {
		state = "allumée"
	}
	return model.ActionResult{Status: model.ActionExecuted, Message: fmt.Sprintf("%s %s.", device.Name, state)}, nil
}

func findDevice(devices []homemodel.Device, target string) (homemodel.Device, error) {
	target = strings.ToLower(strings.TrimSpace(target))
	var found *homemodel.Device
	for index := range devices {
		device := &devices[index]
		if strings.ToLower(device.ID) == target || strings.Contains(strings.ToLower(device.Name), target) || strings.Contains(strings.ToLower(device.Room), target) {
			if found != nil {
				return homemodel.Device{}, fmt.Errorf("plusieurs appareils correspondent à %q", target)
			}
			copy := *device
			found = &copy
		}
	}
	if found == nil {
		return homemodel.Device{}, fmt.Errorf("aucun appareil ne correspond à %q", target)
	}
	return *found, nil
}
