package systemhealthhttp

import (
	"context"
	"encoding/json"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"syscall"
	"time"
)

type Handler struct{ client *http.Client }

func NewHandler(client *http.Client) *Handler { return &Handler{client: client} }

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet || r.URL.Path != "/v1/system/metrics" {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not_found"})
		return
	}
	metrics := collect(r.Context(), h.client)
	writeJSON(w, http.StatusOK, metrics)
}

type metrics struct {
	Hostname      string    `json:"hostname"`
	UptimeSeconds uint64    `json:"uptimeSeconds"`
	Load1         float64   `json:"load1"`
	Memory        memory    `json:"memory"`
	Disk          disk      `json:"disk"`
	Network       network   `json:"network"`
	CollectedAt   time.Time `json:"collectedAt"`
}
type memory struct {
	TotalBytes     uint64  `json:"totalBytes"`
	UsedBytes      uint64  `json:"usedBytes"`
	AvailableBytes uint64  `json:"availableBytes"`
	UsedPercent    float64 `json:"usedPercent"`
}
type disk struct {
	TotalBytes     uint64  `json:"totalBytes"`
	UsedBytes      uint64  `json:"usedBytes"`
	AvailableBytes uint64  `json:"availableBytes"`
	UsedPercent    float64 `json:"usedPercent"`
}
type network struct {
	Interfaces []string `json:"interfaces"`
	Internet   bool     `json:"internet"`
}

func collect(ctx context.Context, client *http.Client) metrics {
	result := metrics{CollectedAt: time.Now().UTC()}
	result.Hostname, _ = os.Hostname()
	if raw, err := os.ReadFile("/proc/uptime"); err == nil {
		fields := strings.Fields(string(raw))
		if len(fields) > 0 {
			result.UptimeSeconds = uint64(parseFloat(fields[0]))
		}
	}
	if raw, err := os.ReadFile("/proc/loadavg"); err == nil {
		fields := strings.Fields(string(raw))
		if len(fields) > 0 {
			result.Load1 = parseFloat(fields[0])
		}
	}
	result.Memory = readMemory()
	result.Disk = readDisk("/")
	if interfaces, err := net.Interfaces(); err == nil {
		for _, iface := range interfaces {
			if iface.Flags&net.FlagUp != 0 && iface.Flags&net.FlagLoopback == 0 {
				result.Network.Interfaces = append(result.Network.Interfaces, iface.Name)
			}
		}
	}
	if client != nil {
		request, err := http.NewRequestWithContext(ctx, http.MethodHead, "https://connectivitycheck.gstatic.com/generate_204", nil)
		if err == nil {
			response, err := client.Do(request)
			result.Network.Internet = err == nil && response.StatusCode >= 200 && response.StatusCode < 400
			if response != nil {
				response.Body.Close()
			}
		}
	}
	return result
}

func readMemory() memory {
	values := map[string]uint64{}
	if raw, err := os.ReadFile("/proc/meminfo"); err == nil {
		for _, line := range strings.Split(string(raw), "\n") {
			fields := strings.Fields(line)
			if len(fields) >= 2 {
				values[strings.TrimSuffix(fields[0], ":")] = parseUint(fields[1]) * 1024
			}
		}
	}
	total, available := values["MemTotal"], values["MemAvailable"]
	used := total - available
	return memory{TotalBytes: total, UsedBytes: used, AvailableBytes: available, UsedPercent: percent(used, total)}
}

func readDisk(path string) disk {
	var stat syscall.Statfs_t
	if syscall.Statfs(path, &stat) != nil {
		return disk{}
	}
	total := stat.Blocks * uint64(stat.Bsize)
	available := stat.Bavail * uint64(stat.Bsize)
	used := total - stat.Bfree*uint64(stat.Bsize)
	return disk{TotalBytes: total, UsedBytes: used, AvailableBytes: available, UsedPercent: percent(used, total)}
}
func percent(value, total uint64) float64 {
	if total == 0 {
		return 0
	}
	return float64(value) * 100 / float64(total)
}
func parseUint(value string) uint64   { result, _ := strconv.ParseUint(value, 10, 64); return result }
func parseFloat(value string) float64 { result, _ := strconv.ParseFloat(value, 64); return result }
func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
