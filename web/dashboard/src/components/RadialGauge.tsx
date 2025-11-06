import { Box, Typography } from "@mui/material";
import { buildStyles, CircularProgressbarWithChildren } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

interface RadialGaugeProps {
  value: number;
  max?: number;
  label: string;
  subtitle?: string;
  gradientFrom?: string;
  gradientTo?: string;
}

const RadialGauge = ({
  value,
  max = 100,
  label,
  subtitle,
  gradientFrom = "#7c3aed",
  gradientTo = "#0ea5e9"
}: RadialGaugeProps) => {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <Box
      sx={{
        position: "relative",
        p: 3,
        borderRadius: 3,
        background: "#111111",
        border: "1px solid #1a1a1a",
        boxShadow: "none",
        overflow: "hidden",
        height: "240px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <Box sx={{ width: "100%", maxWidth: "200px" }}>
        <CircularProgressbarWithChildren
          value={percent}
          strokeWidth={7}
          styles={buildStyles({
            pathColor: gradientFrom,
            trailColor: "#1a1a1a",
            strokeLinecap: "round"
          })}
        >
          <Box textAlign="center" sx={{ color: "white" }}>
            <Typography variant="h3" fontWeight={700} sx={{ fontSize: "2.2rem" }}>
              {value.toFixed(1)}%
            </Typography>
            <Typography variant="body2" sx={{ color: "#ffffff", mt: 0.8, fontSize: "0.85rem", fontWeight: 500 }}>
              {label}
            </Typography>
            {subtitle && (
              <Typography variant="caption" sx={{ color: "#6b7280", display: "block", mt: 0.5, fontSize: "0.7rem" }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </CircularProgressbarWithChildren>
      </Box>
    </Box>
  );
};

export default RadialGauge;
