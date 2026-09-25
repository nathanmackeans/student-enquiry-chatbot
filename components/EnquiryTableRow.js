"use client"; // whole-row click needs the router, which only works client-side.

import { useRouter } from "next/navigation";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";

export default function EnquiryTableRow({ conversation }) {
  const router = useRouter();

  return (
    <TableRow
      hover
      onClick={() => router.push(`/admin/enquiries/${conversation.id}`)}
      sx={{ cursor: "pointer" }}
    >
      <TableCell>{conversation.student_name}</TableCell>
      <TableCell>{new Date(conversation.created_at).toLocaleString()}</TableCell>
      <TableCell align="right">{conversation.message_count}</TableCell>
    </TableRow>
  );
}
