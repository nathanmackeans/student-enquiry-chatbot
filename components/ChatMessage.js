"use client"; // manages its own local state for the optional feedback
// comment field, and is imported from both client (ChatWidget) and server
// (read-only transcript pages) components.

import { useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import ScheduleIcon from "@mui/icons-material/Schedule";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import ThumbDownOutlinedIcon from "@mui/icons-material/ThumbDownOutlined";
import CommentOutlinedIcon from "@mui/icons-material/CommentOutlined";
import SendIcon from "@mui/icons-material/Send";

export default function ChatMessage({ sender, content, status, feedback, onFeedback }) {
  const isStudent = sender === "student";
  // Only bot replies that have been saved to the database (and so have an
  // id) can receive feedback -- the welcome message, for example, has none.
  const canReceiveFeedback = !isStudent && Boolean(onFeedback);
  const isPending = status === "pending";
  const [showCommentField, setShowCommentField] = useState(false);
  const [comment, setComment] = useState("");

  function handleRate(rating) {
    onFeedback(rating);
  }

  function handleSendComment() {
    if (!feedback) return; // a comment needs a rating to attach to
    onFeedback(feedback, comment.trim());
    setShowCommentField(false);
  }

  return (
    <Box sx={{ display: "flex", justifyContent: isStudent ? "flex-end" : "flex-start", mb: 1.5 }}>
      <Box sx={{ maxWidth: "75%" }}>
        <Paper
          elevation={isStudent ? 0 : 1}
          sx={{
            px: 2,
            py: 1,
            borderRadius: 3,
            // Give the two speakers visually distinct bubbles, the way
            // Material Design chat surfaces typically differ by role.
            bgcolor: isStudent ? "primary.main" : "background.paper",
            color: isStudent ? "primary.contrastText" : "text.primary",
            // Queued-but-not-yet-sent messages (see ChatWidget's offline
            // handling) are faded, so it's clear they haven't gone anywhere.
            opacity: isPending ? 0.6 : 1,
          }}
        >
          <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
            {content}
          </Typography>
        </Paper>

        {isPending && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25, justifyContent: "flex-end" }}>
            <ScheduleIcon fontSize="inherit" color="disabled" />
            <Typography variant="caption" color="text.secondary">
              Waiting for connection…
            </Typography>
          </Box>
        )}

        {canReceiveFeedback && (
          <Box sx={{ mt: 0.25 }}>
            <IconButton
              size="small"
              aria-label="Helpful"
              onClick={() => handleRate("up")}
              color={feedback === "up" ? "primary" : "default"}
            >
              {feedback === "up" ? <ThumbUpIcon fontSize="inherit" /> : <ThumbUpOutlinedIcon fontSize="inherit" />}
            </IconButton>
            <IconButton
              size="small"
              aria-label="Not helpful"
              onClick={() => handleRate("down")}
              color={feedback === "down" ? "primary" : "default"}
            >
              {feedback === "down" ? <ThumbDownIcon fontSize="inherit" /> : <ThumbDownOutlinedIcon fontSize="inherit" />}
            </IconButton>
            {feedback && (
              <IconButton
                size="small"
                aria-label="Add a comment"
                onClick={() => setShowCommentField((prev) => !prev)}
              >
                <CommentOutlinedIcon fontSize="inherit" />
              </IconButton>
            )}

            {feedback && showCommentField && (
              <Box sx={{ display: "flex", gap: 0.5, mt: 0.5 }}>
                <TextField
                  size="small"
                  placeholder="Optional: say more…"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  fullWidth
                />
                <IconButton size="small" aria-label="Submit comment" onClick={handleSendComment}>
                  <SendIcon fontSize="inherit" />
                </IconButton>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
