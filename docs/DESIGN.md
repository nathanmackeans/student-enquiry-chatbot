# Design documentation

This file covers the UML-style diagrams the project spec asks for that
weren't already in the main [README](../README.md) (which has the
[system architecture](../README.md#architecture) and
[ERD](../README.md#data-model) diagrams). Everything here reflects what's
**actually implemented** in this codebase — not an idealised version of the
spec. Where this system's design genuinely differs from the spec's suggested
shape (see the note on the class diagram), that's called out rather than
faked.

## Use-case diagram

Three actors, matching the roles the code actually enforces (see
[Roles & authentication](../README.md#roles--authentication)):

```mermaid
flowchart LR
    Prospective([Prospective Student])
    Current([Current Student])
    Admin([Administrator])

    subgraph System[Student Enquiry System]
        UC1((Submit Enquiry))
        UC2((Continue Conversation))
        UC3((Log In))
        UC4((View Own History))
        UC5((View Profile))
        UC6((Give Feedback))
        UC7((View Analytics Dashboard))
        UC8((Browse Enquiries))
        UC9((Manage Knowledge Base))
        UC10((Manage Users))
        UC11((Manage Settings))
    end

    Prospective --> UC1
    Prospective --> UC2

    Current --> UC3
    Current --> UC1
    Current --> UC2
    Current --> UC4
    Current --> UC5
    Current --> UC6

    Admin --> UC3
    Admin --> UC7
    Admin --> UC8
    Admin --> UC9
    Admin --> UC10
    Admin --> UC11
```

Internal technical steps (generate embedding, cosine similarity search,
call the LLM) are deliberately **not** use cases — they're implementation
detail behind "Submit Enquiry", not user goals.

### Use-case descriptions

| Use case | Actor(s) | Precondition | Main flow | Postcondition |
|---|---|---|---|---|
| Submit Enquiry | Prospective, Current Student | On `/chat` | Type a question, press send | Message + reply stored; reply shown |
| Continue Conversation | Prospective, Current Student | Already submitted at least one enquiry in this session | Ask a follow-up | Recent messages are included as context (see `HISTORY_LENGTH` in `app/api/chat/route.js`) |
| Log In | Current Student, Admin | Has an account (created by an admin) | Enter email + password on `/login` | Redirected to `/chat` (student) or `/admin/dashboard` (admin) |
| View Own History | Current Student | Logged in | Open `/history` | List of own past conversations; click one for the transcript |
| View Profile | Current Student | Logged in | Open `/profile` | Name, email, role, academic details shown |
| Give Feedback | Current Student | Logged in, viewing a bot reply | Click thumbs up/down, optionally add a comment | Row written to `feedback`, reflected in the admin dashboard's Feedback stat |
| View Analytics Dashboard | Admin | Logged in as admin | Open `/admin/dashboard` | Stat cards + charts computed from real `messages`/`feedback` data |
| Browse Enquiries | Admin | Logged in as admin | Open `/admin/enquiries` | Table of recent conversations; click one for the transcript |
| Manage Knowledge Base | Admin | Logged in as admin | Add/edit/delete an FAQ on `/admin/knowledge-base` | Entry (re-)embedded and immediately usable by RAG |
| Manage Users | Admin | Logged in as admin | Create/delete an account on `/admin/users` | New account (student or admin) created with a one-time temp password |
| Manage Settings | Admin | Logged in as admin | Edit institution name / welcome message on `/admin/settings` | Both take effect immediately in `/chat` and the AI system prompt |

## Activity diagram

Swimlanes matching the actual code path in `app/api/chat/route.js`:

```mermaid
flowchart TD
    subgraph Student
        A1([Start]) --> A2[Open /chat]
        A2 --> A3[Type enquiry, press send]
    end

    subgraph "Chatbot System (app/api/chat)"
        B1[Receive enquiry] --> B2{Existing conversationId?}
        B2 -->|Yes| B3[Use existing conversation]
        B2 -->|No| B4[Create conversation\ntied to student_id, or null if a guest]
        B3 --> B5[Categorise enquiry\nlib/ai/classify.js]
        B4 --> B5
        B5 --> B6[Save student message]
        B6 --> B7[Fetch last 6 messages\nas conversation context]
    end

    subgraph "RAG / Knowledge Base"
        C1[Embed the enquiry\ntext-embedding-3-small] --> C2[pgvector cosine similarity\nmatch_faqs SQL function]
        C2 --> C3{Similarity above threshold?}
        C3 -->|Yes| C4[Return matching FAQ text]
        C3 -->|No| C5[Return empty context]
    end

    subgraph "Database (Supabase Postgres)"
        D1[(conversations)]
        D2[(messages)]
        D3[(faqs + embeddings)]
        D4[(settings)]
    end

    A3 --> B1
    B7 --> C1
    C4 --> E1[Build system prompt:\ninstitution name + retrieved FAQs]
    C5 --> E1
    E1 --> E2[Call LLM with prompt + recent history]
    E2 --> E3[Save bot reply]
    E3 --> E4([Display reply, return to Student])
    B4 -.-> D1
    B6 -.-> D2
    C2 -.-> D3
    E1 -.-> D4
    E3 -.-> D2
```

## Sequence diagram

```mermaid
sequenceDiagram
    actor Student
    participant UI as Chat Interface (ChatWidget)
    participant API as Chatbot System (/api/chat)
    participant RAG as RAG / Knowledge Base
    participant DB as Database

    Student->>UI: Submit enquiry
    UI->>API: POST /api/chat { conversationId?, message }

    alt No conversationId yet
        API->>DB: INSERT conversations (student_id or null)
        DB-->>API: conversation id
    else conversationId provided
        API->>DB: (reuse existing id)
    end

    API->>DB: INSERT messages (student's question)
    API->>RAG: Embed question, search faqs by cosine similarity

    alt Relevant knowledge found
        RAG-->>API: Matching FAQ text
    else No relevant knowledge found
        RAG-->>API: Empty context
    end

    API->>DB: SELECT last 6 messages (context)
    DB-->>API: Recent history

    API->>API: Build prompt (institution name + retrieved knowledge + history)
    API->>API: Call LLM, generate response
    API->>DB: INSERT messages (bot reply)
    API-->>UI: { conversationId, reply, replyMessageId }
    UI-->>Student: Display response
```

## Class diagram

> **Deviation from the spec's suggested shape, and why:** the spec's
> `KnowledgeDocument` → `DocumentChunk` split assumes long documents get
> split into multiple chunks. This system's actual knowledge base is
> FAQ-entry based (`faqs` table) — each entry is short enough to embed as a
> single vector directly, with no chunking step. Modelling a `DocumentChunk`
> class that doesn't exist in the code would misrepresent the
> implementation, so `KnowledgeEntry` below maps onto the real `faqs` table
> instead.

```mermaid
classDiagram
    class User {
        +UUID id
        +String fullName
        +String email
        +String role
        +login()
        +logout()
    }

    class Conversation {
        +UUID id
        +UUID studentId
        +DateTime createdAt
        +startConversation()
        +addMessage()
    }

    class Message {
        +UUID id
        +String senderType
        +String content
        +String category
        +DateTime createdAt
        +sendMessage()
    }

    class KnowledgeEntry {
        +UUID id
        +String question
        +String answer
        +String category
        +Vector embedding
        +addEntry()
        +updateEntry()
    }

    class Feedback {
        +UUID id
        +String rating
        +String comment
        +DateTime createdAt
        +recordFeedback()
    }

    class AnalyticsQuery {
        +getCategoryCounts()
        +getDailyEnquiryCounts()
        +getActiveStudentCount()
        +getFeedbackCounts()
    }

    User "1" --> "0..*" Conversation
    Conversation "1" --> "1..*" Message
    Message "1" --> "0..1" Feedback
    User "1" --> "0..*" Feedback
```

`AnalyticsQuery` isn't a persisted entity -- it represents the SQL functions
in `supabase/schema.sql` / `schema_v2_student_accounts.sql` that the admin
dashboard calls; included here because it's a real, named part of the
implementation, not to pad the diagram.
