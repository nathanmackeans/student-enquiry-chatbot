// A single, shared Material Design theme, styled for DELSU (Delta State
// University). Changing colours/shape here updates every MUI component in
// the app at once -- that's the point of using a theme instead of styling
// each component individually.

import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#14336b", light: "#2f5fc7", dark: "#0c2149" }, // DELSU navy
    secondary: { main: "#f2a900" }, // warm accent for highlights
    background: { default: "#f4f6fb", paper: "#ffffff" },
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  },
  components: {
    // Flat, borderless app bar/drawer -- matches Material Design's
    // "surface" style better than a heavy drop shadow.
    MuiAppBar: {
      defaultProps: { elevation: 0, color: "inherit" },
      styleOverrides: {
        root: { borderBottom: "1px solid rgba(0,0,0,0.08)" },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { borderRight: "1px solid rgba(0,0,0,0.08)" },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600 },
      },
    },
  },
});

export default theme;
