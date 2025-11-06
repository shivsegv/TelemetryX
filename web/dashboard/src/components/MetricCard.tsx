import { Box, Stack, Typography } from "@mui/material";
import { ReactNode } from "react";

interface MetricCardProps {
  title: string;
  value: string;
  delta?: string;
  icon?: ReactNode;
  accent?: string;
  subtitle?: string;
}

function MetricCard({
  title,
  value,
  subtitle,
  delta,
  icon,
  accent = "#6366f1"
}: MetricCardProps) {
  return (
    <Box
      sx={{
        position: "relative",
        p: 2.5,
        borderRadius: 3,
        border: "1px solid #1a1a1a",
        background: "#111111",
        overflow: "hidden",
        height: "130px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between"
      }}
    >
      <Stack spacing={1}>
        {/* Title & Icon */}
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Typography variant="caption" sx={{ color: "#6b7280", fontWeight: 600, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {title}
          </Typography>
          <Box sx={{ opacity: 0.3 }}>
            {icon}
          </Box>
        </Stack>

        {/* Value */}
        <Typography variant="h3" fontWeight={700} sx={{ color: "#ffffff", lineHeight: 1, fontSize: "2rem" }}>
          {value}
        </Typography>
      </Stack>

      {/* Subtitle or Delta */}
      {(subtitle || delta) && (
        <Typography variant="caption" sx={{ color: "#6b7280", fontSize: "0.65rem" }}>
          {subtitle || delta}
        </Typography>
      )}
    </Box>
  );
}

export default MetricCard;
