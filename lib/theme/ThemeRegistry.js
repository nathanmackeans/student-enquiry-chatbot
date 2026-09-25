"use client"; // MUI's styling engine (Emotion) needs to run in the browser,
// and the App Router cache provider below coordinates that with Next.js's
// server-rendered HTML so styles don't flash/mismatch on first load.

import { AppRouterCacheProvider } from "@mui/material-nextjs/v14-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "./theme";

export default function ThemeRegistry({ children }) {
  return (
    <AppRouterCacheProvider options={{ key: "mui" }}>
      <ThemeProvider theme={theme}>
        {/* CssBaseline applies Material Design's baseline reset (consistent
            margins, fonts, background) the same way globals.css used to. */}
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
