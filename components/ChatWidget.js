"use client"; // this component uses state and event handlers, so it must
// run in the browser rather than as a server component.

import { useCallback, useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import SendIcon from "@mui/icons-material/Send";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import ChatMessage from "./ChatMessage";

const DEFAULT_WELCOME_MESSAGE =
  "Hi! I'm the DELSU student enquiry assistant. Ask me about admissions, fees, deadlines, registration, or results.";

// Generating a real AI reply always needs a network call to OpenAI -- there
// is no way to answer "for real" while offline. What we CAN do is never
// lose a message the student typed while their connection was down: it
// gets queued here (status: "pending") and delivered automatically the
// moment the browser reports it's back online.
export default function ChatWidget({ welcomeMessage = DEFAULT_WELCOME_MESSAGE, isAuthenticated = false }) {
  // The full list of messages shown on screen (not necessarily the same as
  // what's stored in the database -- this is just the UI's copy). The
  // welcome message comes from the admin-editable Settings page (see
  // app/(student)/chat/page.js), so admins can change it without a
  // code change.
  const [messages, setMessages] = useState([{ sender: "bot", content: welcomeMessage }]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  // Undefined during server-side rendering (where `navigator` doesn't
  // exist) -- avoids flashing an "offline" banner before hydration.
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? undefined : navigator.onLine
  );
  // Which rating (if any) the student has given each bot message, keyed by
  // that message's database id.
  const [feedbackByMessageId, setFeedbackByMessageId] = useState({});

  // The backend creates this on the first message and we keep reusing it,
  // so every message in this browser tab belongs to the same conversation
  // -- this is what lets the bot understand follow-up questions.
  const conversationIdRef = useRef(null);
  // Messages typed while offline (or that failed to send), waiting to be
  // delivered in order once the connection is back. A ref, not state --
  // it's only ever read inside flushQueue, never rendered directly.
  const queueRef = useRef([]);
  const isFlushingRef = useRef(false);

  const messagesEndRef = useRef(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Actually deliver one message to the backend and append the bot's reply.
  // Shared by both the normal "send" path and the queue-flushing path.
  const deliverMessage = useCallback(async (localId, content) => {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: conversationIdRef.current,
        message: content,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Request failed.");

    conversationIdRef.current = data.conversationId;
    setMessages((prev) => [
      ...prev.map((m) => (m.localId === localId ? { ...m, status: "sent" } : m)),
      { sender: "bot", content: data.reply, id: data.replyMessageId },
    ]);
  }, []);

  // Sends queued messages one at a time, oldest first, stopping (and
  // leaving the rest queued) the moment one fails -- e.g. the connection
  // dropped again mid-flush.
  const flushQueue = useCallback(async () => {
    if (isFlushingRef.current) return;
    isFlushingRef.current = true;
    try {
      while (queueRef.current.length > 0) {
        const next = queueRef.current[0];
        await deliverMessage(next.localId, next.content);
        queueRef.current = queueRef.current.slice(1);
      }
    } catch {
      // Leave whatever's left in the queue -- it'll retry on the next
      // "online" event, or the next successful send.
    } finally {
      isFlushingRef.current = false;
    }
  }, [deliverMessage]);

  // Subscribe to connectivity changes, and flush the queue the instant it
  // comes back.
  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      flushQueue();
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [flushQueue]);

  async function sendMessage(event) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    setError(null);
    setInput("");
    const localId = crypto.randomUUID();

    if (isOnline === false) {
      // No point even trying -- queue it straight away.
      setMessages((prev) => [...prev, { sender: "student", content: trimmed, localId, status: "pending" }]);
      queueRef.current = [...queueRef.current, { localId, content: trimmed }];
      return;
    }

    setMessages((prev) => [...prev, { sender: "student", content: trimmed, localId }]);
    setIsSending(true);
    try {
      await deliverMessage(localId, trimmed);
    } catch (err) {
      // The fetch itself failed (not just a 4xx/5xx) -- most likely the
      // connection just dropped. Queue it instead of losing it.
      if (err instanceof TypeError) {
        setIsOnline(false);
        setMessages((prev) =>
          prev.map((m) => (m.localId === localId ? { ...m, status: "pending" } : m))
        );
        queueRef.current = [...queueRef.current, { localId, content: trimmed }];
      } else {
        setError(err.message);
      }
    } finally {
      setIsSending(false);
    }
  }

  async function submitFeedback(messageId, rating, comment) {
    // Optimistic update -- feels instant, and a failed request here isn't
    // worth blocking or alarming the student over.
    setFeedbackByMessageId((prev) => ({ ...prev, [messageId]: rating }));
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, rating, comment }),
      });
    } catch {
      // Non-critical -- leave the optimistic UI state as-is.
    }
  }

  return (
    <Paper variant="outlined" sx={{ display: "flex", flexDirection: "column", height: 560, p: 2 }}>
      {isOnline === false && (
        <Alert severity="warning" icon={<WifiOffIcon fontSize="inherit" />} sx={{ mb: 1 }}>
          You&apos;re offline. Messages you send now will be delivered as soon as your connection is back.
        </Alert>
      )}

      <Box sx={{ flex: 1, overflowY: "auto", pr: 0.5 }}>
        {messages.map((message, index) => (
          <ChatMessage
            key={message.id ?? message.localId ?? index}
            sender={message.sender}
            content={message.content}
            status={message.status}
            feedback={message.id ? feedbackByMessageId[message.id] : undefined}
            onFeedback={
              // Feedback is tied to a student account (see the `feedback`
              // table's user_id column) -- guests can't leave it.
              isAuthenticated && message.id
                ? (rating, comment) => submitFeedback(message.id, rating, comment)
                : undefined
            }
          />
        ))}
        {isSending && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}>
            <CircularProgress size={16} />
            <span>Thinking…</span>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={sendMessage} sx={{ display: "flex", gap: 1, mt: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Type your question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isSending}
        />
        <IconButton
          type="submit"
          color="primary"
          disabled={isSending || !input.trim()}
          aria-label="Send message"
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Paper>
  );
}
