"use client"; // this page manages form state and re-fetches data on demand.

import { useEffect, useState } from "react";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

const EMPTY_FORM = { id: null, question: "", answer: "", category: "" };

export default function KnowledgeBasePage() {
  const [faqs, setFaqs] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  async function loadFaqs() {
    const response = await fetch("/api/faqs");
    const data = await response.json();
    setFaqs(data.faqs || []);
  }

  useEffect(() => {
    // Fetch once on mount. The `ignore` flag stops us from updating state
    // after the component has unmounted (or a newer fetch has started) --
    // the pattern React's own docs recommend for effects that fetch data.
    let ignore = false;

    async function loadOnMount() {
      const response = await fetch("/api/faqs");
      const data = await response.json();
      if (!ignore) {
        setFaqs(data.faqs || []);
        setIsLoading(false);
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
    setIsSaving(true);

    const isEditing = Boolean(form.id);
    const response = await fetch("/api/faqs", {
      method: isEditing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json();

    setIsSaving(false);

    if (!response.ok) {
      setError(data.error || "Failed to save.");
      return;
    }

    setForm(EMPTY_FORM);
    await loadFaqs();
  }

  async function handleDelete(id) {
    if (!confirm("Delete this FAQ entry?")) return;
    await fetch("/api/faqs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await loadFaqs();
  }

  function startEditing(faq) {
    setForm({ id: faq.id, question: faq.question, answer: faq.answer, category: faq.category || "" });
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Knowledge Base
      </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Everything here is what the chatbot is allowed to answer with. Add
          the questions students actually ask, phrased the way they&apos;d ask them.
        </Typography>

        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Stack component="form" onSubmit={handleSubmit} spacing={2}>
            <TextField
              label="Question"
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              placeholder="e.g. What are the admission requirements?"
              required
              fullWidth
            />
            <TextField
              label="Answer"
              value={form.answer}
              onChange={(e) => setForm({ ...form, answer: e.target.value })}
              multiline
              minRows={3}
              required
              fullWidth
            />
            <TextField
              label="Category (optional)"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="e.g. admissions"
              fullWidth
            />

            {error && <Alert severity="error">{error}</Alert>}

            <Stack direction="row" spacing={1}>
              <Button type="submit" variant="contained" disabled={isSaving}>
                {isSaving ? "Saving…" : form.id ? "Update FAQ" : "Add FAQ"}
              </Button>
              {form.id && (
                <Button variant="outlined" onClick={() => setForm(EMPTY_FORM)}>
                  Cancel edit
                </Button>
              )}
            </Stack>
          </Stack>
        </Paper>

        {isLoading ? (
          <CircularProgress size={24} />
        ) : faqs.length === 0 ? (
          <Typography color="text.secondary">No FAQs yet -- add the first one above.</Typography>
        ) : (
          <Stack spacing={2}>
            {faqs.map((faq) => (
              <Paper key={faq.id} variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                  <Stack spacing={0.5} sx={{ flex: 1 }}>
                    <Typography fontWeight={600}>{faq.question}</Typography>
                    <Typography color="text.secondary">{faq.answer}</Typography>
                    {faq.category && (
                      <Chip label={faq.category} size="small" color="primary" variant="outlined" sx={{ width: "fit-content", mt: 0.5 }} />
                    )}
                  </Stack>
                  <Stack direction="row">
                    <IconButton aria-label="Edit" onClick={() => startEditing(faq)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton aria-label="Delete" color="error" onClick={() => handleDelete(faq.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
      )}
    </Container>
  );
}
