// A read-only profile page -- name, email, role, and (for students) the
// academic details captured when their account was created. Name/email/role
// come straight from the session; the academic fields live in `profiles`
// (see supabase/schema_v3_profile_fields_and_feedback_comment.sql), so
// those need one extra lookup.

import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireUser";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();
  if (!user) redirect("/login");

  const fullName = user.user_metadata?.full_name || "Student";
  const role = user.user_metadata?.role || "student";
  const initial = fullName.charAt(0).toUpperCase();

  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("department, programme, level, matric_number")
    .eq("id", user.id)
    .maybeSingle();

  const academicFields = [
    { label: "Department", value: profile?.department },
    { label: "Programme", value: profile?.programme },
    { label: "Level", value: profile?.level },
    { label: "Matriculation number", value: profile?.matric_number },
  ].filter((field) => field.value);

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Profile
      </Typography>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: "center", mb: 3 }}>
          <Avatar sx={{ width: 56, height: 56, bgcolor: "primary.main" }}>{initial}</Avatar>
          <div>
            <Typography variant="h6">{fullName}</Typography>
            <Chip label={role} size="small" color="primary" variant="outlined" sx={{ textTransform: "capitalize" }} />
          </div>
        </Stack>

        <Stack spacing={1.5}>
          <div>
            <Typography variant="body2" color="text.secondary">
              Email
            </Typography>
            <Typography>{user.email}</Typography>
          </div>
          <div>
            <Typography variant="body2" color="text.secondary">
              Member since
            </Typography>
            <Typography>{new Date(user.created_at).toLocaleDateString()}</Typography>
          </div>
          {academicFields.map((field) => (
            <div key={field.label}>
              <Typography variant="body2" color="text.secondary">
                {field.label}
              </Typography>
              <Typography>{field.value}</Typography>
            </div>
          ))}
        </Stack>
      </Paper>
    </Container>
  );
}
