# Functional testing & performance evaluation

Per the project spec: results here are either things actually verified
during development, or explicitly marked **pending** — nothing below is
invented. Several test cases need the `schema_v2`/`schema_v3` migrations
run against a real Supabase project before they can be executed at all
(see the main [README](../README.md#setup)); those are marked accordingly.

## Functional test cases

| # | Test case | Steps | Expected result | Status |
|---|---|---|---|---|
| 1 | Greeting | Open `/chat`, send "Hello" | Friendly acknowledgement, doesn't hallucinate institutional facts for a non-question | Pending manual QA (needs `OPENAI_API_KEY` + populated knowledge base) |
| 2 | Admission enquiry | Ask "What are the admission requirements?" with a matching FAQ in the knowledge base | Reply grounded in that FAQ's answer | Pending manual QA |
| 3 | Academic enquiry | Ask about a department/programme covered by an FAQ | Reply grounded in that FAQ | Pending manual QA |
| 4 | Follow-up enquiry (context awareness) | Ask Q1 above, then ask "What about the deadline?" | Second answer is interpreted as still about admissions, not a new unrelated topic | Pending manual QA — code path verified: `app/api/chat/route.js` includes the last `HISTORY_LENGTH` (6) messages in the prompt sent to the LLM |
| 5 | No relevant knowledge | Ask something with no matching FAQ (e.g. "What's the campus wifi password?") | System states it doesn't have that information rather than inventing an answer | Pending manual QA — the system prompt in `app/api/chat/route.js` explicitly instructs "do NOT make up an answer" when the knowledge base has nothing relevant (`match_faqs` returns no rows above the similarity threshold) |
| 6 | Out-of-scope enquiry | Ask something unrelated to a university entirely (e.g. "write me a poem") | Redirected back to the system's actual purpose, not a generic AI answer | Pending manual QA |
| 7 | Prospective (anonymous) chat | Visit `/` → "Start Chat" with no account | Chat works with no login; an "you're chatting as a guest" notice shows; no History entry is created | **Verified** — `/chat` confirmed publicly reachable (not redirected to `/login`), guest notice renders, `conversations.student_id` is nullable |
| 8 | Student authentication | Log in with a student account at `/login` | Redirected to `/chat`; `/history` and `/profile` become reachable | Pending manual QA (needs a real account — see README step 5) |
| 9 | Administrator authentication | Log in with an admin account | Redirected to `/admin/dashboard` | Pending manual QA (needs first-admin bootstrap — see README step 5) |
| 10 | Analytics/dashboard display | Open `/admin/dashboard` as admin | 4 stat cards + 2 charts render from real aggregate queries, not placeholder numbers | Pending manual QA — code path verified: all four stats (`get_category_counts`, `get_active_student_count`, `faqs` count, `get_feedback_counts`) are live Supabase queries, no hard-coded values |
| 11 | Access restriction (student → admin) | While logged in as a student, navigate directly to `/admin/dashboard` | Redirected to `/login` (or bounced, since role ≠ admin) | **Verified** — `lib/supabase/middleware.js` redirects any non-admin role away from `/admin/**`; confirmed by code review + the equivalent logged-out case rendering `/login` correctly in the browser |
| 12 | Access restriction (logged-out → student pages) | While logged out, navigate directly to `/history` or `/profile` | Redirected to `/login` | **Verified** in-browser (screenshot: `/chat` behaved as expected pre-anonymous-chat change; `/history`/`/profile` still gated) |
| 13 | Invalid input (empty message) | Try to submit an empty/whitespace-only chat message | Send is blocked, no request sent | **Verified** — Send button `disabled` when `!input.trim()`; server also rejects an empty `message` with 400 (`app/api/chat/route.js`) |
| 14 | Knowledge-base management | Add a new FAQ in `/admin/knowledge-base`, then ask a matching question in chat | New answer appears in the chatbot's replies without a code change | Pending manual QA (needs `OPENAI_API_KEY` to generate the embedding) |
| 15 | Feedback with comment | Thumbs-up a bot reply, add an optional comment | Row written to `feedback` (rating + comment + user_id); dashboard's Feedback count increases | Pending manual QA (needs `schema_v3` migration run) |
| 16 | Error handling (misconfiguration) | Load the app with `OPENAI_API_KEY` unset | Chat returns a clean "something went wrong" message, not a raw stack trace | **Verified** earlier in development — confirmed a blank/broken response was fixed to return a proper JSON error (see `lib/ai/openai.js`'s lazy client construction) |

## Performance evaluation

The spec asks for accuracy, precision, recall, F1-score, and response time.
**None of these have been measured yet** — computing them honestly requires:

1. A labelled evaluation set (a list of realistic student questions, each
   with a human-judged "correct" expected answer).
2. Running each question through the deployed chatbot once the knowledge
   base is populated with real institutional FAQs.
3. A human grading each response as correct/incorrect (and, for
   precision/recall, distinguishing "answered when it should have" vs.
   "answered when it shouldn't have" vs. "declined when it should have").

| Metric | Formula | Result |
|---|---|---|
| Accuracy | Correct responses / Total queries | Not yet measured |
| Precision | TP / (TP + FP) | Not yet measured |
| Recall | TP / (TP + FN) | Not yet measured |
| F1-score | 2 × Precision × Recall / (Precision + Recall) | Not yet measured |
| Average response time | Wall-clock time from request to reply | Not yet measured |
| Context-retention success rate | % of follow-up questions answered correctly using prior context | Not yet measured |

Once the knowledge base has real content (see README step 6) and both
migrations have been run, these can be measured by manually running the 16
test cases above end-to-end and tallying the results — do that before
reporting any numbers in the project write-up.
