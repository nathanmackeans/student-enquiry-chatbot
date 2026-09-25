"use client"; // manages form state and re-fetches data on demand.

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
import MenuItem from "@mui/material/MenuItem";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

const EMPTY_FORM = {
  email: "",
  fullName: "",
  role: "student",
  department: "",
  programme: "",
  level: "",
  matricNumber: "",
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  // Shown once right after creating an account, so the admin can copy it.
  const [createdAccount, setCreatedAccount] = useState(null);

  async function loadUsers() {
    const response = await fetch("/api/admin/users");
    const data = await response.json();
    setUsers(data.users || []);
  }

  useEffect(() => {
    let ignore = false;
    async function loadOnMount() {
      const response = await fetch("/api/admin/users");
      const data = await response.json();
      if (!ignore) {
        setUsers(data.users || []);
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
    setCreatedAccount(null);
    setIsSaving(true);

    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    setIsSaving(false);

    if (!response.ok) {
      setError(data.error || "Failed to create account.");
      return;
    }

    setCreatedAccount({ ...data.user, tempPassword: data.tempPassword });
    setForm(EMPTY_FORM);
    await loadUsers();
  }

  async function handleDelete(id) {
    if (!confirm("Remove this account? This cannot be undone.")) return;
    await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await loadUsers();
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Users
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Create student and admin accounts. There&apos;s no public sign-up page --
        this is the only way new accounts get created.
      </Typography>

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Stack component="form" onSubmit={handleSubmit} spacing={2}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Full name"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              fullWidth
            />
            <TextField
              select
              label="Role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="student">Student</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </TextField>
          </Stack>

          {form.role === "student" && (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Department"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                fullWidth
              />
              <TextField
                label="Programme"
                value={form.programme}
                onChange={(e) => setForm({ ...form, programme: e.target.value })}
                fullWidth
              />
              <TextField
                label="Level"
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
                placeholder="e.g. 200"
                sx={{ minWidth: 120 }}
              />
              <TextField
                label="Matric number"
                value={form.matricNumber}
                onChange={(e) => setForm({ ...form, matricNumber: e.target.value })}
                fullWidth
              />
            </Stack>
          )}

          {error && <Alert severity="error">{error}</Alert>}

          {createdAccount && (
            <Alert
              severity="success"
              icon={false}
              action={
                <IconButton
                  size="small"
                  aria-label="Copy password"
                  onClick={() =>
                    navigator.clipboard?.writeText(createdAccount.tempPassword)
                  }
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              }
            >
              Account created for {createdAccount.email}. Temporary password
              (share this with them, it won&apos;t be shown again):{" "}
              <strong>{createdAccount.tempPassword}</strong>
            </Alert>
          )}

          <Button type="submit" variant="contained" disabled={isSaving} sx={{ alignSelf: "flex-start" }}>
            {isSaving ? "Creating…" : "Add user"}
          </Button>
        </Stack>
      </Paper>

      {isLoading ? (
        <CircularProgress size={24} />
      ) : (
        <Paper variant="outlined" sx={{ overflowX: "auto" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.fullName || "—"}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.role}
                      size="small"
                      color={user.role === "admin" ? "primary" : "default"}
                      variant="outlined"
                      sx={{ textTransform: "capitalize" }}
                    />
                  </TableCell>
                  <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <IconButton aria-label="Delete" color="error" onClick={() => handleDelete(user.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Container>
  );
}
