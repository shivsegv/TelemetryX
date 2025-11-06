import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#7c3aed"
    },
    secondary: {
      main: "#0ea5e9"
    },
    background: {
      default: "transparent",
      paper: "rgba(15, 23, 42, 0.75)"
    }
  },
  typography: {
    fontFamily: [
      "Inter",
      "DM Sans",
      "Segoe UI",
      "Helvetica Neue",
      "Arial",
      "sans-serif"
    ].join(",")
  },
  shape: {
    borderRadius: 16
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          background: "rgba(15, 23, 42, 0.75)",
          border: "1px solid rgba(148, 163, 184, 0.12)",
          boxShadow: "0 24px 48px rgba(15, 23, 42, 0.45)",
          backdropFilter: "blur(28px)"
        }
      }
    }
  }
});

export default theme;
