// The public landing page. No login required to view this -- it's just a
// hero + two entry points ("Start Chat" and "Login"), both of which land on
// /login if the visitor isn't signed in yet (chat now requires an account,
// so History/Profile can work -- see proxy.js).

import Box from "@mui/material/Box";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import DelsuMonogram from "@/components/DelsuMonogram";
import ChatIcon from "@mui/icons-material/Chat";
import LoginIcon from "@mui/icons-material/Login";

export default function LandingPage() {
  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Box sx={{ mr: 1, display: "flex" }}>
            <DelsuMonogram size={32} />
          </Box>
          <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1 }}>
            DELSU
            <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              Student Enquiry System
            </Typography>
          </Typography>
          <Button href="/login">Login</Button>
        </Toolbar>
      </AppBar>

      {/* A plain gradient hero (no external photo) -- keeps the page fast
          and avoids depending on/republishing the university's own imagery. */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #0c2149 0%, #14336b 60%, #2f5fc7 100%)",
          color: "#fff",
          py: { xs: 8, md: 12 },
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h3" fontWeight={800} gutterBottom sx={{ fontSize: { xs: "2rem", md: "2.75rem" } }}>
            DELSU Student Enquiry Chatbot
          </Typography>
          <Typography variant="h6" fontWeight={400} sx={{ opacity: 0.85, mb: 4, maxWidth: 560 }}>
            Get quick answers to your academic, admission, and general
            enquiries -- any time, day or night.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Button
              href="/chat"
              variant="contained"
              color="secondary"
              size="large"
              startIcon={<ChatIcon />}
            >
              Start Chat
            </Button>
            <Button
              href="/login"
              variant="outlined"
              size="large"
              startIcon={<LoginIcon />}
              sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.6)" }}
            >
              Login
            </Button>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: 6 }}>
        <Typography variant="body1" color="text.secondary">
          The assistant answers from DELSU&apos;s official knowledge base --
          admissions, fees, deadlines, registration, and results. Log in with
          your student account to keep a history of your conversations.
        </Typography>
      </Container>
    </Box>
  );
}
