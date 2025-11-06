package storage

import "time"

// Record represents a telemetry data point persisted by the server.
type Record struct {
	AgentID        string    `json:"agentId"`
	CollectedAt    time.Time `json:"collectedAt"`
	CPUUsage       float64   `json:"cpuUsage"`
	MemoryUsage    uint64    `json:"memoryUsageBytes"`
	MemoryPercent  float64   `json:"memoryPercent"`
	NetworkTxBytes uint64    `json:"networkTxBytes"`
	NetworkRxBytes uint64    `json:"networkRxBytes"`
	NetworkTxRate  float64   `json:"networkTxRate"`
	NetworkRxRate  float64   `json:"networkRxRate"`
	DiskReadBytes  uint64    `json:"diskReadBytes"`
	DiskWriteBytes uint64    `json:"diskWriteBytes"`
	DiskReadRate   float64   `json:"diskReadRate"`
	DiskWriteRate  float64   `json:"diskWriteRate"`
	LoadAvg1       float64   `json:"loadAvg1"`
	LoadAvg5       float64   `json:"loadAvg5"`
	LoadAvg15      float64   `json:"loadAvg15"`
}
