package server

import (
	"fmt"
	"io"
	"log/slog"
	"math"
	"sync"
	"time"

	"telemetry-agent/internal/server/storage"
	"telemetry-agent/pkg/api"
)

// TelemetryService implements the gRPC API surface for ingesting metrics.
type TelemetryService struct {
	api.UnimplementedTelemetryServer

	store  *storage.PostgresStore
	logger *slog.Logger

	mu       sync.Mutex
	previous map[string]storage.Record
}

// NewTelemetryService wires the dependencies required by the gRPC server implementation.
func NewTelemetryService(store *storage.PostgresStore, logger *slog.Logger) *TelemetryService {
	return &TelemetryService{store: store, logger: logger, previous: make(map[string]storage.Record)}
}

// StreamMetrics consumes a bi-directional stream of metric data from agents.
func (s *TelemetryService) StreamMetrics(stream api.Telemetry_StreamMetricsServer) error {
	for {
		metric, err := stream.Recv()
		if err != nil {
			if err == io.EOF {
				return nil
			}
			s.logger.Error("receive metric", "error", err)
			return err
		}

		record, err := convertMetric(metric)
		if err != nil {
			s.logger.Warn("discarding metric", "error", err)
			continue
		}

		s.enrichWithRates(&record)

		if err := s.store.Save(stream.Context(), record); err != nil {
			s.logger.Error("save metric", "error", err)
			continue
		}
	}
}

func (s *TelemetryService) enrichWithRates(record *storage.Record) {
	s.mu.Lock()
	defer s.mu.Unlock()

	prev, ok := s.previous[record.AgentID]
	if ok {
		elapsed := record.CollectedAt.Sub(prev.CollectedAt).Seconds()
		if elapsed > 0 {
			record.NetworkTxRate = ratePerSecond(prev.NetworkTxBytes, record.NetworkTxBytes, elapsed)
			record.NetworkRxRate = ratePerSecond(prev.NetworkRxBytes, record.NetworkRxBytes, elapsed)
			record.DiskReadRate = ratePerSecond(prev.DiskReadBytes, record.DiskReadBytes, elapsed)
			record.DiskWriteRate = ratePerSecond(prev.DiskWriteBytes, record.DiskWriteBytes, elapsed)
		}
	}

	s.previous[record.AgentID] = *record
}

func ratePerSecond(oldValue, newValue uint64, seconds float64) float64 {
	if seconds <= 0 {
		return 0
	}
	if newValue < oldValue {
		return 0
	}
	rate := float64(newValue-oldValue) / seconds
	if math.IsNaN(rate) || math.IsInf(rate, 0) {
		return 0
	}
	return rate
}

func convertMetric(metric *api.Metric) (storage.Record, error) {
	if metric == nil {
		return storage.Record{}, fmt.Errorf("nil metric")
	}

	timestamp := time.Now()
	if ts := metric.GetCollectedAt(); ts != nil {
		timestamp = ts.AsTime()
	}

	record := storage.Record{
		AgentID:        metric.GetAgentId(),
		CollectedAt:    timestamp,
		CPUUsage:       metric.GetCpuUsage(),
		MemoryUsage:    metric.GetMemoryUsage(),
		MemoryPercent:  metric.GetMemoryPercent(),
		NetworkTxBytes: metric.GetNetworkTxBytes(),
		NetworkRxBytes: metric.GetNetworkRxBytes(),
		DiskReadBytes:  metric.GetDiskReadBytes(),
		DiskWriteBytes: metric.GetDiskWriteBytes(),
		LoadAvg1:       metric.GetLoadAvg_1(),
		LoadAvg5:       metric.GetLoadAvg_5(),
		LoadAvg15:      metric.GetLoadAvg_15(),
	}

	if record.AgentID == "" {
		return storage.Record{}, fmt.Errorf("missing agent id")
	}

	return record, nil
}
