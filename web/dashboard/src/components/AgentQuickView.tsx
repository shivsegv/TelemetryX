import {
  Avatar,
  Box,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Stack,
  Typography
} from "@mui/material";
import { AgentSummary } from "../types";
import { formatPercent, formatShortTime } from "../utils/format";

interface AgentQuickViewProps {
  agents: AgentSummary[];
  selectedAgentId: string | null;
  onSelect: (agentId: string) => void;
}

const AgentQuickView = ({ agents, selectedAgentId, onSelect }: AgentQuickViewProps) => {
  if (!agents.length) {
    return (
      <Box sx={{ p: 2, textAlign: "center", color: "#6b7280" }}>
        <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
          No agents connected yet. Waiting for telemetry streams…
        </Typography>
      </Box>
    );
  }

  return (
    <List sx={{ maxHeight: 420, overflowY: "auto", py: 0 }}>
      {agents.map((agent) => {
        const isSelected = agent.agentId === selectedAgentId;
        return (
          <ListItem key={agent.agentId} disablePadding sx={{ mb: 1.5 }}>
            <ListItemButton
              onClick={() => onSelect(agent.agentId)}
              sx={{
                borderRadius: 2,
                background: isSelected ? "#1a1a1a" : "transparent",
                border: "1px solid #1a1a1a",
                py: 1.5,
                px: 1.5,
                transition: "all 0.2s ease",
                '&:hover': {
                  background: "#1a1a1a",
                  borderColor: "#2a2a2a"
                }
              }}
            >
              <ListItemAvatar>
                <Avatar
                  sx={{
                    background: isSelected ? "#6366f1" : "#1e293b",
                    color: "#ffffff",
                    width: 40,
                    height: 40,
                    fontSize: "0.9rem",
                    fontWeight: 600
                  }}
                >
                  {agent.agentId.slice(0, 2).toUpperCase()}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ color: "#ffffff", fontSize: "0.85rem" }}>
                      {agent.agentId}
                    </Typography>
                    {isSelected && (
                      <Chip 
                        size="small" 
                        label="Active" 
                        sx={{ 
                          background: "#6366f1",
                          color: "#ffffff",
                          height: "18px",
                          fontSize: "0.65rem",
                          fontWeight: 600
                        }} 
                      />
                    )}
                  </Stack>
                }
                secondary={
                  <Typography variant="caption" sx={{ color: "#6b7280", fontSize: "0.7rem", display: "block", mt: 0.3 }}>
                    {agent.latest
                      ? `CPU ${formatPercent(agent.latest.cpuUsage)} • Updated ${formatShortTime(agent.latest.collectedAt)}`
                      : "Awaiting first sample"}
                  </Typography>
                }
              />
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>
  );
};

export default AgentQuickView;
