"""Expose a deterministic home fixture through Home Assistant MQTT Discovery."""
import json
import os
import signal
import sys
from pathlib import Path

import paho.mqtt.client as mqtt

ROOT = "home-ai/simulator"
fixture = json.loads(Path(os.getenv("MQTT_SIMULATOR_FIXTURE", "/app/fixtures/maison-demo.json")).read_text())
devices = {device["id"]: device for device in fixture["devices"]}
rooms = {room["id"]: room["name"] for room in fixture["rooms"]}


def name(device):
    return device["id"].replace("-", " ")


def publish(client, topic, payload, retain=True):
    client.publish(topic, payload, qos=1, retain=retain)


def state(client, device):
    topic = f"{ROOT}/{device['id']}/state"
    if device["kind"] == "light":
        value = {"state": "ON" if device["state"].get("on") else "OFF"}
        if "brightness" in device["state"]:
            value["brightness"] = device["state"]["brightness"]
        if "rgb" in device["state"]:
            r, g, b = device["state"]["rgb"]
            value.update({"color_mode": "rgb", "color": {"r": r, "g": g, "b": b}})
        publish(client, topic, json.dumps(value))
    elif device["kind"] == "plug":
        publish(client, topic, "ON" if device["state"].get("on") else "OFF")
    elif device["kind"] == "temperature_sensor":
        publish(client, topic, str(device["state"]["temperatureC"]))
    elif device["kind"] == "cover":
        publish(client, topic, "OPEN" if device["state"].get("open") else "CLOSED")
    elif device["kind"] == "opening_sensor":
        publish(client, topic, "OPEN" if device["state"].get("open") else "CLOSED")
    elif device["kind"] == "thermostat":
        publish(client, f"{ROOT}/{device['id']}/current_temperature", str(device["state"]["temperatureC"]))
        publish(client, f"{ROOT}/{device['id']}/target_temperature", str(device["state"]["targetTemperatureC"]))
        publish(client, f"{ROOT}/{device['id']}/mode", device["state"]["mode"])


def discovery(client, device):
    domain = {"light": "light", "plug": "switch", "temperature_sensor": "sensor", "cover": "cover", "opening_sensor": "binary_sensor", "thermostat": "climate"}.get(device["kind"])
    if not domain:
        return
    identity = f"home_ai_simulator_{device['id']}"
    config = {
        "name": name(device), "unique_id": identity,
        "availability_topic": f"{ROOT}/availability",
        "state_topic": f"{ROOT}/{device['id']}/state",
        "device": {"identifiers": [identity], "name": name(device),
                   "manufacturer": "HOME AI", "model": "MQTT simulator",
                   "suggested_area": rooms.get(device["roomId"], "")},
    }
    if domain == "light":
        config.update({"schema": "json", "command_topic": f"{ROOT}/{device['id']}/set",
                       "brightness": "brightness" in device["capabilities"], "brightness_scale": 255,
                       "supported_color_modes": ["rgb"] if "rgb" in device["capabilities"] else ["brightness"]})
    elif domain == "switch":
        config.update({"command_topic": f"{ROOT}/{device['id']}/set", "payload_on": "ON", "payload_off": "OFF"})
    elif domain == "cover":
        config.update({"command_topic": f"{ROOT}/{device['id']}/set", "payload_open": "OPEN", "payload_close": "CLOSE", "state_open": "OPEN", "state_closed": "CLOSED"})
    elif domain == "binary_sensor":
        config.update({"payload_on": "OPEN", "payload_off": "CLOSED", "device_class": "opening"})
    elif domain == "climate":
        config.update({"current_temperature_topic": f"{ROOT}/{device['id']}/current_temperature", "temperature_state_topic": f"{ROOT}/{device['id']}/target_temperature", "temperature_command_topic": f"{ROOT}/{device['id']}/temperature/set", "mode_state_topic": f"{ROOT}/{device['id']}/mode", "mode_command_topic": f"{ROOT}/{device['id']}/mode/set", "modes": ["off", "heat"], "temp_step": 0.5, "min_temp": 12, "max_temp": 28, "temperature_unit": "C"})
    else:
        config.update({"device_class": "temperature", "unit_of_measurement": "°C", "state_class": "measurement"})
    publish(client, f"homeassistant/{domain}/{identity}/config", json.dumps(config))


def on_connect(client, userdata, flags, reason_code, properties=None):
    if reason_code != 0:
        raise RuntimeError(f"MQTT connection refused: {reason_code}")
    publish(client, f"{ROOT}/availability", "online")
    client.subscribe(f"{ROOT}/#", qos=1)
    for device in devices.values():
        discovery(client, device)
        state(client, device)


def on_message(client, userdata, message):
    parts = message.topic.split("/")
    if len(parts) < 4 or parts[2] not in devices:
        return
    device = devices[parts[2]]
    if not device["available"] or device["kind"] in ("temperature_sensor", "opening_sensor"):
        return
    payload = message.payload.decode().strip()
    if device["kind"] == "thermostat":
        if parts[3:5] == ["temperature", "set"]:
            device["state"]["targetTemperatureC"] = float(payload)
        elif parts[3:5] == ["mode", "set"] and payload in ("off", "heat"):
            device["state"]["mode"] = payload
        else:
            return
    elif parts[3:] != ["set"]:
        # Retained state messages are received through the same subscription.
        # They are observations, never commands.
        return
    elif device["kind"] == "light":
        try:
            command = json.loads(payload)
        except json.JSONDecodeError:
            return
        if "state" in command:
            device["state"]["on"] = command["state"].upper() == "ON"
        if "brightness" in command:
            device["state"]["brightness"] = command["brightness"]
        if "color" in command and {"r", "g", "b"} <= command["color"].keys():
            device["state"]["rgb"] = [command["color"]["r"], command["color"]["g"], command["color"]["b"]]
    elif device["kind"] == "cover":
        device["state"]["open"] = payload.upper() == "OPEN"
    else:
        device["state"]["on"] = payload.upper() == "ON"
    state(client, device)


client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="home-ai-mqtt-simulator")
client.will_set(f"{ROOT}/availability", "offline", qos=1, retain=True)
client.on_connect = on_connect
client.on_message = on_message
client.connect(os.getenv("MQTT_HOST", "127.0.0.1"), int(os.getenv("MQTT_PORT", "1883")), 60)
signal.signal(signal.SIGTERM, lambda *_: (publish(client, f"{ROOT}/availability", "offline"), client.disconnect(), sys.exit(0)))
client.loop_forever()
