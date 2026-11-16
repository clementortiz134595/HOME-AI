# Module system-health

Home Core exposes `GET /v1/system/metrics` for the Home Panel. The module reads
local Raspberry Pi telemetry from `/proc`, `statfs` and network interfaces, then
performs a short HTTPS connectivity probe. No process list, secrets or payloads
from the probe are returned.

The endpoint is intentionally read-only and returns a snapshot: hostname,
uptime, one-minute load, RAM, root filesystem, active interfaces and internet
reachability. The Panel polls it every five seconds and clearly displays an
unavailable state when Home Core cannot answer.
