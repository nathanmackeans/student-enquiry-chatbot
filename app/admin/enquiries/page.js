// Lists every student conversation, newest first, so admins can browse what
// students have actually been asking. A server component -- fetches
// directly via the get_recent_conversations() SQL function (see
// supabase/schema_v2_student_accounts.sql), which joins in the student's
// name and message count in one query.

import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import { createAdminClient } from "@/lib/supabase/admin";
import EnquiryTableRow from "@/components/EnquiryTableRow";

const LIST_LIMIT = 50;

export const dynamic = "force-dynamic";

export default async function EnquiriesPage() {
  const supabase = createAdminClient();
  const { data: conversations, error } = await supabase.rpc("get_recent_conversations", {
    limit_count: LIST_LIMIT,
  });
  if (error) throw new Error(error.message);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Enquiries
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        The {LIST_LIMIT} most recent student conversations.
      </Typography>

      {conversations.length === 0 ? (
        <Typography color="text.secondary">No enquiries yet.</Typography>
      ) : (
        <Paper variant="outlined" sx={{ overflowX: "auto" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Student</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="right">Messages</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {conversations.map((conversation) => (
                <EnquiryTableRow key={conversation.id} conversation={conversation} />
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Container>
  );
}
