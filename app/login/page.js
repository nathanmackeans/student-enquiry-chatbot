"use client"; // this page has a form with local state, so it runs in the browser.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import DelsuMonogram from "@/components/DelsuMonogram";
import { createClient } from "@/lib/supabase/client";

// One login page for everyone -- students AND admins. After signing in we
// read the account's role (set when the account was created) and send each
// person to the right place, instead of having two separate login forms.
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsSubmitting(false);

    if (signInError) {
      setError("Incorrect email or password.");
      return;
    }

    const role = data.user?.user_metadata?.role;
    router.push(role === "admin" ? "/admin/dashboard" : "/chat");
    router.refresh(); // makes sure the server re-checks the new session
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
      }}
    >
      <Container maxWidth="xs">
        <Stack spacing={1} sx={{ alignItems: "center", mb: 3 }}>
          <DelsuMonogram size={48} />
          <Typography variant="h5" component="h1" fontWeight={700}>
            DELSU
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Student Enquiry System
          </Typography>
        </Stack>

        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Student Login
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Access your student portal to chat with our AI assistant and get
            instant support.
          </Typography>

          <Stack component="form" onSubmit={handleSubmit} spacing={2}>
            <TextField
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
            />

            {error && <Alert severity="error">{error}</Alert>}

            <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Login"}
            </Button>
          </Stack>
        </Paper>

        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
          Don&apos;t have an account? Contact the admissions office.
        </Typography>
      </Container>
    </Box>
  );
}
