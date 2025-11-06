import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  IconButton,
  Stack,
  Tooltip,
  Typography
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import MemoryIcon from "@mui/icons-material/Memory";
import SpeedRoundedIcon from "@mui/icons-material/SpeedRounded";
import NetworkCheckRoundedIcon from "@mui/icons-material/NetworkCheckRounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";

import { motion } from "framer-motion";
import HeroHeader from "./components/HeroHeader";
import AgentQuickView from "./components/AgentQuickView";
import MetricCard from "./components/MetricCard";
import TrendChart from "./components/TrendChart";
import RadialGauge from "./components/RadialGauge";
import Sparkline from "./components/Sparkline";
import { HISTORY_LIMIT, useTelemetryData } from "./hooks/useTelemetryData";
import { formatBytes, formatLoad, formatPercent, formatRate, formatShortTime } from "./utils/format";
import { TelemetryRecord } from "./types";

const App = () => {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const { agents, history, latest, loading, error, refreshAgents } = useTelemetryData(selectedAgentId);

  useEffect(() => {
    if (!selectedAgentId && agents.length) {
      setSelectedAgentId(agents[0].agentId);
    }
  }, [agents, selectedAgentId]);

  const cpuSummary = formatPercent(latest?.cpuUsage ?? 0, 1);
  const memorySummary = formatBytes(latest?.memoryUsageBytes ?? 0, 2);
  const memoryPercentSummary = formatPercent(latest?.memoryPercent ?? 0, 1);
  const networkTxRate = formatRate(latest?.networkTxRate ?? 0);
  const networkRxRate = formatRate(latest?.networkRxRate ?? 0);
  const diskReadRate = formatRate(latest?.diskReadRate ?? 0);
  const diskWriteRate = formatRate(latest?.diskWriteRate ?? 0);
  const loadAvg1 = formatLoad(latest?.loadAvg1 ?? 0);
  const loadAvg5 = formatLoad(latest?.loadAvg5 ?? 0);
  const loadAvg15 = formatLoad(latest?.loadAvg15 ?? 0);
  const latestTimestamp = latest ? formatShortTime(latest.collectedAt) : "";

  const cpuDelta = useMemo(() => {
    if (!history.length) {
      return "";
    }
    const tail = history.slice(-6);
    const first = tail[0];
    const last = tail[tail.length - 1];
    const delta = last.cpuUsage - first.cpuUsage;
    const symbol = delta >= 0 ? "▲" : "▼";
    return `${symbol} ${Math.abs(delta).toFixed(1)} pts (last 5 samples)`;
  }, [history]);

  const recentHistory = useMemo<TelemetryRecord[]>(() => history.slice(-24), [history]);
  const navItems = ["Overview", "Insights", "Alerts", "Playbooks"];
  const fadeIn = {
    initial: { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0 }
  };
  const topSection = (
    <Stack spacing={4}>
      <HeroHeader agentCount={agents.length} />
      
      {/* Main Content Grid */}
      <Grid container spacing={4}>
        {/* Left Column - Main Metrics */}
        <Grid item xs={12} lg={8}>
          <Stack spacing={3}>
            {/* Top Stats Bar */}
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ px: 0.5 }}>
              <Typography variant="body1" fontWeight={600} sx={{ color: "#ffffff", fontSize: "0.95rem" }}>
                Live Telemetry
              </Typography>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Chip
                  size="small"
                  label={latest ? "Streaming" : "Standby"}
                  icon={<TimelineRoundedIcon fontSize="small" />}
                  sx={{ 
                    borderRadius: 1, 
                    fontWeight: 600,
                    fontSize: "0.65rem",
                    background: latest ? "#10b981" : "#374151",
                    color: "#ffffff",
                    height: "24px"
                  }}
                />
                <Tooltip title="Refresh agents list">
                  <IconButton onClick={refreshAgents} size="small" sx={{ color: "#9ca3af", p: 0.5 }}>
                    <RefreshRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>

            {/* Radial Gauges Row */}
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <motion.div initial={fadeIn.initial} animate={fadeIn.animate} transition={{ duration: 0.6, delay: 0.05 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <RadialGauge
                      value={latest?.cpuUsage ?? 0}
                      label="CPU Usage"
                      subtitle={latest ? cpuDelta || "steady" : "Awaiting signal"}
                      gradientFrom="#6366f1"
                      gradientTo="#6366f1"
                    />
                  </Box>
                </motion.div>
              </Grid>
              <Grid item xs={12} sm={6}>
                <motion.div initial={fadeIn.initial} animate={fadeIn.animate} transition={{ duration: 0.6, delay: 0.1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <RadialGauge
                      value={latest?.memoryPercent ?? 0}
                      label="Memory Usage"
                      subtitle={latest ? `${memorySummary}` : "Waiting for stream"}
                      gradientFrom="#8b5cf6"
                      gradientTo="#8b5cf6"
                    />
                  </Box>
                </motion.div>
              </Grid>
            </Grid>

            {/* Sparkline Cards Row */}
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <motion.div 
                  initial={fadeIn.initial} 
                  animate={fadeIn.animate} 
                  transition={{ duration: 0.6, delay: 0.15 }}
                  style={{ height: '100%' }}
                >
                  <Box
                    sx={{
                      position: "relative",
                      p: 2.5,
                      borderRadius: 3,
                      border: "1px solid #1a1a1a",
                      background: "#111111",
                      boxShadow: "none",
                      overflow: "hidden",
                      minHeight: "150px",
                      display: "flex",
                      flexDirection: "column",
                      height: "100%"
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                      <Stack spacing={0.3}>
                        <Stack direction="row" spacing={0.8} alignItems="center">
                          <NetworkCheckRoundedIcon sx={{ fontSize: 18, color: "#9ca3af" }} />
                          <Typography variant="body2" fontWeight={600} sx={{ color: "#ffffff", fontSize: "0.85rem" }}>
                            Network
                          </Typography>
                        </Stack>
                        <Typography variant="caption" sx={{ color: "#6b7280", fontSize: "0.65rem" }}>
                          TX {networkTxRate} · RX {networkRxRate}
                        </Typography>
                      </Stack>
                      <Chip 
                        size="small" 
                        label={latestTimestamp || "offline"} 
                        sx={{ 
                          background: latest ? "#10b981" : "#374151",
                          color: "#ffffff",
                          fontWeight: 500,
                          fontSize: "0.6rem",
                          height: "18px"
                        }} 
                      />
                    </Stack>
                    <Box sx={{ mt: 1 }}>
                      <Sparkline
                        data={recentHistory}
                        valueAccessor={(item: TelemetryRecord) => item.networkTxRate}
                        color="#6366f1"
                      />
                    </Box>
                  </Box>
                </motion.div>
              </Grid>
              <Grid item xs={12} sm={6}>
                <motion.div 
                  initial={fadeIn.initial} 
                  animate={fadeIn.animate} 
                  transition={{ duration: 0.6, delay: 0.2 }}
                  style={{ height: '100%' }}
                >
                  <Box
                    sx={{
                      position: "relative",
                      p: 2.5,
                      borderRadius: 3,
                      border: "1px solid #1a1a1a",
                      background: "#111111",
                      boxShadow: "none",
                      overflow: "hidden",
                      minHeight: "150px",
                      display: "flex",
                      flexDirection: "column",
                      height: "100%"
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                      <Stack spacing={0.3}>
                        <Stack direction="row" spacing={0.8} alignItems="center">
                          <StorageRoundedIcon sx={{ fontSize: 18, color: "#9ca3af" }} />
                          <Typography variant="body2" fontWeight={600} sx={{ color: "#ffffff", fontSize: "0.85rem" }}>
                            Disk I/O
                          </Typography>
                        </Stack>
                        <Typography variant="caption" sx={{ color: "#6b7280", fontSize: "0.65rem" }}>
                          Read {diskReadRate} · Write {diskWriteRate}
                        </Typography>
                      </Stack>
                      <Chip 
                        size="small" 
                        label={latest ? "Active" : "Idle"} 
                        sx={{ 
                          background: latest ? "#10b981" : "#374151",
                          color: "#ffffff",
                          fontWeight: 500,
                          fontSize: "0.6rem",
                          height: "18px"
                        }} 
                      />
                    </Stack>
                    <Box sx={{ mt: 1 }}>
                      <Sparkline
                        data={recentHistory}
                        valueAccessor={(item: TelemetryRecord) => item.diskWriteRate}
                        color="#8b5cf6"
                      />
                    </Box>
                  </Box>
                </motion.div>
              </Grid>
            </Grid>

            {/* Metric Cards Row */}
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <motion.div 
                  initial={fadeIn.initial} 
                  animate={fadeIn.animate} 
                  transition={{ duration: 0.6, delay: 0.25 }}
                  style={{ height: '100%' }}
                >
                  <MetricCard
                    title="CPU"
                    value={cpuSummary}
                    delta={cpuDelta}
                    icon={<SpeedRoundedIcon sx={{ fontSize: 32, color: "#6b7280" }} />}
                  />
                </motion.div>
              </Grid>
              <Grid item xs={12} sm={4}>
                <motion.div 
                  initial={fadeIn.initial} 
                  animate={fadeIn.animate} 
                  transition={{ duration: 0.6, delay: 0.3 }}
                  style={{ height: '100%' }}
                >
                  <MetricCard
                    title="Memory"
                    value={memoryPercentSummary}
                    subtitle={memorySummary}
                    icon={<MemoryIcon sx={{ fontSize: 32, color: "#6b7280" }} />}
                  />
                </motion.div>
              </Grid>
              <Grid item xs={12} sm={4}>
                <motion.div 
                  initial={fadeIn.initial} 
                  animate={fadeIn.animate} 
                  transition={{ duration: 0.6, delay: 0.35 }}
                  style={{ height: '100%' }}
                >
                  <MetricCard
                    title="Load Avg"
                    value={loadAvg1}
                    delta={`5m ${loadAvg5} · 15m ${loadAvg15}`}
                    icon={<BoltRoundedIcon sx={{ fontSize: 32, color: "#6b7280" }} />}
                  />
                </motion.div>
              </Grid>
            </Grid>

            {/* Performance Chart */}
            <motion.div initial={fadeIn.initial} animate={fadeIn.animate} transition={{ duration: 0.6, delay: 0.4 }}>
              <Box
                sx={{
                  position: "relative",
                  p: 2.5,
                  borderRadius: 3,
                  border: "1px solid #1a1a1a",
                  background: "#111111",
                  boxShadow: "none",
                  overflow: "hidden"
                }}
              >
                <Typography variant="body2" fontWeight={600} sx={{ mb: 2, color: "#ffffff", fontSize: "0.85rem" }}>
                  Performance Trends
                </Typography>
                <TrendChart data={history} />
              </Box>
            </motion.div>
          </Stack>
        </Grid>

        {/* Right Column - Sidebar */}
        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            {/* Agents Panel */}
            <Box
              sx={{
                position: "relative",
                p: 2.5,
                borderRadius: 3,
                border: "1px solid #1a1a1a",
                background: "#111111",
                boxShadow: "none",
                overflow: "hidden",
                minHeight: "200px"
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight={600} sx={{ color: "#ffffff", fontSize: "0.9rem" }}>
                  Agents
                </Typography>
                {loading && <CircularProgress size={14} thickness={5} sx={{ color: "#6b7280" }} />}
              </Stack>
              <Divider sx={{ borderColor: "#1a1a1a", mb: 2 }} />
              <AgentQuickView
                agents={agents}
                selectedAgentId={selectedAgentId}
                onSelect={(agentId) => setSelectedAgentId(agentId)}
              />
            </Box>

            {/* Stream Diagnostics Panel */}
            <Box
              sx={{
                position: "relative",
                p: 2.5,
                borderRadius: 3,
                border: "1px solid #1a1a1a",
                background: "#111111",
                boxShadow: "none",
                overflow: "hidden"
              }}
            >
              <Typography variant="body2" fontWeight={600} sx={{ mb: 2, color: "#ffffff", fontSize: "0.9rem" }}>
                Diagnostics
              </Typography>
              <Stack spacing={2} sx={{ color: "#6b7280" }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip 
                    size="small" 
                    label="SSE" 
                    sx={{ 
                      fontWeight: 600, 
                      fontSize: "0.65rem",
                      background: "#1a1a1a",
                      color: "#9ca3af",
                      height: "20px"
                    }} 
                  />
                  <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                    {latest ? `Synced ${formatShortTime(latest.collectedAt)}` : "Waiting"}
                  </Typography>
                </Stack>
                <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#6b7280", lineHeight: 1.6 }}>
                  Buffer: {history.length}/{HISTORY_LIMIT} samples
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );

  return (
    <Box
      sx={{
        position: "relative",
        minHeight: "100vh",
        py: 6,
        background: "#0a0a0a"
      }}
    >
      <Container maxWidth="xl" sx={{ position: "relative", zIndex: 1 }}>
        <Stack spacing={3}>
          {error && (
            <Alert severity="error" variant="filled">
              {error}
            </Alert>
          )}
          {topSection}
        </Stack>
      </Container>
    </Box>
  );
};

export default App;
