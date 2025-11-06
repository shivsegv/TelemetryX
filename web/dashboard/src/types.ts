export interface TelemetryRecord {
  agentId: string;
  collectedAt: string;
  cpuUsage: number;
  memoryUsageBytes: number;
  memoryPercent: number;
  networkTxBytes: number;
  networkRxBytes: number;
  networkTxRate: number;
  networkRxRate: number;
  diskReadBytes: number;
  diskWriteBytes: number;
  diskReadRate: number;
  diskWriteRate: number;
  loadAvg1: number;
  loadAvg5: number;
  loadAvg15: number;
}

export interface AgentSummary {
  agentId: string;
  latest?: TelemetryRecord;
}
