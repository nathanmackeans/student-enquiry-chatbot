"use client"; // manages form state and re-fetches data on demand.

import { useEffect, useState } from "react";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";

export default function SettingsPage() {
  const [form, setForm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function loadOnMount() {
      const response = await fetch("/api/admin/settings");
      const data = await response.json();
      if (!ignore && data.settings) {
        setForm({
          institutionName: data.settings.institution_name,
          welcomeMessage: data.settings.welcome_message,
        });
      }
    }
    loadOnMount();
    return () => {
      ignore = true;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setIsSaving(true);

    const response = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    setIsSaving(false);

    if (!response.ok) {
      setError(data.error || "Failed to save.");
      return;
    }
    setSaved(true);
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Basic app-wide settings.
      </Typography>

      {!form ? (
        <CircularProgress size={24} />
      ) : (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Stack component="form" onSubmit={handleSubmit} spacing={2}>
            <TextField
              label="Institution name"
              value={form.institutionName}
              onChange={(e) => setForm({ ...form, institutionName: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Chatbot welcome message"
              value={form.welcomeMessage}
              onChange={(e) => setForm({ ...form, welcomeMessage: e.target.value })}
              multiline
              minRows={3}
              required
              fullWidth
            />

            {error && <Alert severity="error">{error}</Alert>}
            {saved && <Alert severity="success">Settings saved.</Alert>}

            <Button type="submit" variant="contained" disabled={isSaving} sx={{ alignSelf: "flex-start" }}>
              {isSaving ? "Saving…" : "Save settings"}
            </Button>
          </Stack>
        </Paper>
      )}
    </Container>
  );
}
