package agent

import (
	"context"
	"fmt"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/load"
	"github.com/shirou/gopsutil/v3/mem"
	gnet "github.com/shirou/gopsutil/v3/net"
	"google.golang.org/protobuf/types/known/timestamppb"

	"telemetry-agent/pkg/api"
)

// Sampler gathers system metrics in a threadsafe manner.
type Sampler struct{}

// NewSampler returns a ready-to-use sampler instance.
func NewSampler() *Sampler { return &Sampler{} }

// Sample queries the host for CPU, memory, and network utilisation.
func (s *Sampler) Sample(ctx context.Context, agentID string) (*api.Metric, error) {
	vm, err := mem.VirtualMemoryWithContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("collect virtual memory metrics: %w", err)
	}

	usedBytes := vm.Used
	if usedBytes == 0 {
		if vm.Total > vm.Available {
			usedBytes = vm.Total - vm.Available
		}
	}

	memPercent := vm.UsedPercent
	if vm.Total > 0 {
		memPercent = (float64(usedBytes) / float64(vm.Total)) * 100
	}

	cpuPercent, err := cpu.PercentWithContext(ctx, 200*time.Millisecond, false)
	if err != nil {
		return nil, fmt.Errorf("collect cpu metrics: %w", err)
	}

	netCounters, err := gnet.IOCountersWithContext(ctx, false)
	if err != nil {
		return nil, fmt.Errorf("collect network metrics: %w", err)
	}

	diskCounters, _ := disk.IOCountersWithContext(ctx)
	loadAvg, _ := load.AvgWithContext(ctx)

	var totalSent, totalRecv uint64
	if len(netCounters) > 0 {
		totalSent = netCounters[0].BytesSent
		totalRecv = netCounters[0].BytesRecv
	}

	var totalDiskRead, totalDiskWrite uint64
	for _, counter := range diskCounters {
		totalDiskRead += counter.ReadBytes
		totalDiskWrite += counter.WriteBytes
	}

	metric := &api.Metric{
		CpuUsage:       firstOrZero(cpuPercent),
		MemoryUsage:    usedBytes,
		MemoryPercent:  memPercent,
		NetworkTxBytes: totalSent,
		NetworkRxBytes: totalRecv,
		DiskReadBytes:  totalDiskRead,
		DiskWriteBytes: totalDiskWrite,
		LoadAvg_1:      loadAvg.Load1,
		LoadAvg_5:      loadAvg.Load5,
		LoadAvg_15:     loadAvg.Load15,
		AgentId:        agentID,
		CollectedAt:    timestamppb.Now(),
	}

	return metric, nil
}

func firstOrZero(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}
	return values[0]
}
