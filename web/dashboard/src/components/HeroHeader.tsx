import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";

interface HeroHeaderProps {
  agentCount: number;
}

function HeroHeader({ agentCount }: HeroHeaderProps) {
  return (
    <Box
      sx={{
        position: "relative",
        p: 2.5,
        borderRadius: 3,
        border: "1px solid #1a1a1a",
        background: "#111111",
        overflow: "hidden"
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
        {/* Left side - Branding */}
        <Stack direction="row" spacing={1.2} alignItems="center">
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#10b981",
              boxShadow: "0 0 10px rgba(16, 185, 129, 0.5)"
            }}
          />
          <Typography
            variant="body1"
            fontWeight={700}
            sx={{
              color: "#ffffff",
              letterSpacing: "-0.02em",
              fontSize: "0.95rem"
            }}
          >
            Telemetry Dashboard
          </Typography>
        </Stack>

        {/* Right side - Compact Stats */}
        <Stack direction="row" spacing={2.5} alignItems="center">
          <Stack spacing={0.2}>
            <Typography variant="caption" sx={{ color: "#6b7280", fontSize: "0.6rem", fontWeight: 500 }}>
              AGENTS
            </Typography>
            <Typography variant="body1" fontWeight={700} sx={{ color: "#ffffff", lineHeight: 1, fontSize: "1.1rem" }}>
              {agentCount}
            </Typography>
          </Stack>
          <Stack spacing={0.2}>
            <Typography variant="caption" sx={{ color: "#6b7280", fontSize: "0.6rem", fontWeight: 500 }}>
              STATUS
            </Typography>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box
                sx={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "#10b981"
                }}
              />
              <Typography variant="body2" fontWeight={600} sx={{ color: "#10b981", fontSize: "0.75rem" }}>
                LIVE
              </Typography>
            </Stack>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
}

export default HeroHeader;
