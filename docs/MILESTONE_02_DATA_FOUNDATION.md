# WONDERLAND — Milestone 02: Persistent Data Foundation

## 1. Executive Summary

Milestone 02 transforms the prototype analytics and backend foundation of WONDERLAND into a durable, relational product data foundation.

**Core Product Principle**:
> *"The interface may lie poetically. The data may not."*

---

## 2. Relational Architecture (Hybrid State + Event Model)

The database architecture employs a hybrid strategy:
- **Normalized State Tables**: Answer *"What is the current state?"* (`sessions`, `quiz_answers`, `quiz_submissions`, `leads`).
- **Append-Only Event Stream**: Answers *"What happened?"* (`campaign_events`).

### 2.1 Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    CAMPAIGNS ||--o{ SESSIONS : has
    CAMPAIGNS ||--o{ CAMPAIGN_EVENTS : records
    SESSIONS ||--o{ SESSION_EXPERIMENTS : assigns
    SESSIONS ||--o{ CAMPAIGN_EVENTS : emits
    SESSIONS ||--o{ QUIZ_ANSWERS : saves
    SESSIONS ||--o| QUIZ_SUBMISSIONS : finalizes
    SESSIONS ||--o{ LEADS : captures

    CAMPAIGNS {
        uuid id PK
        citext slug UK
        string name
        string status
        timestamp created_at
        timestamp updated_at
    }

    SESSIONS {
        uuid id PK
        uuid campaign_id FK
        uuid public_session_id UK
        string current_stage
        string selected_path
        string entry_affinity
        string final_segment
        string locale
        string device_type
        string utm_source
        string utm_medium
        string utm_campaign
        string utm_content
        string utm_term
        string referrer
        integer last_client_sequence
        timestamp started_at
        timestamp last_seen_at
        timestamp completed_at
        timestamp expires_at
        timestamp created_at
        timestamp updated_at
    }

    SESSION_EXPERIMENTS {
        uuid id PK
        uuid session_id FK
        string experiment_key
        string variant_key
        timestamp assigned_at
    }

    CAMPAIGN_EVENTS {
        uuid id PK
        uuid client_event_id UK
        uuid campaign_id FK
        uuid session_id FK
        string event_name
        string event_version
        integer client_sequence
        timestamp occurred_at_client
        timestamp received_at_server
        string page
        string surface
        string selected_path
        string final_segment
        jsonb properties
        timestamp created_at
    }

    QUIZ_ANSWERS {
        uuid id PK
        uuid session_id FK
        string question_id
        string answer_id
        timestamp answered_at
        timestamp created_at
        timestamp updated_at
    }

    QUIZ_SUBMISSIONS {
        uuid id PK
        uuid session_id FK UK
        integer curious_score
        integer chaotic_score
        integer mysterious_score
        string final_segment
        numeric confidence
        timestamp submitted_at
        string scoring_version
    }

    LEADS {
        uuid id PK
        uuid session_id FK
        citext email
        string name
        boolean consent_marketing
        boolean consent_privacy
        timestamp consented_at
        timestamp created_at
        timestamp updated_at
    }
```

---

## 3. Session Lifecycle & Invariants

### 3.1 Canonical Stages
- `landing`: User on landing hero.
- `rabbit_hole`: Active traversal in the Rabbit Hole.
- `crossroads`: Crossroads path selection.
- `quiz`: Engaging with the Cheshire quiz questions.
- `result`: Completed quiz, viewing authoritative result.
- `converted`: Lead captured with explicit consent.

### 3.2 Critical Invariant: `entry_affinity` vs `final_segment`
- **`entry_affinity`**: Derived from initial Crossroads selection (`rabbit` -> `curious`, `hatter` -> `chaotic`, `cheshire` -> `mysterious`).
- **`final_segment`**: Authoritatively computed from completed Cheshire quiz.
- **Rule**: `entry_affinity` is NEVER overwritten when `final_segment` is calculated. This enables comparative attribution analytics (e.g. *Path choice vs. Quiz personality*).

---

## 4. Analytics Ingestion & Persistent Idempotency

- **Primary Identity**: `client_event_id` (UUID) has a database-level `UNIQUE` constraint.
- **Durable Idempotency**: Resending an existing `client_event_id` returns the existing event with HTTP 202 without creating duplicate rows.
- **Concurrency Protection**: Even under simultaneous concurrent delivery across worker processes, the database uniqueness constraint ensures exactly 1 durable record is persisted.
- **Ordering Metadata**: `client_sequence` tracks local client sequence order.

---

## 5. Authoritative Quiz Scoring & Deterministic Tie-Breaking

Scoring is strictly calculated and finalized server-side in FastAPI.

### 5.1 Question Weights
- **Q1**: `q1_a` -> Curious +3, `q1_b` -> Chaotic +3, `q1_c` -> Mysterious +3
- **Q2**: `q2_a` -> Curious +2, `q2_b` -> Chaotic +2, `q2_c` -> Mysterious +2
- **Q3**: `q3_a` -> Curious +2, `q3_b` -> Chaotic +2, `q3_c` -> Mysterious +2
- **Q4**: `q4_a` -> Curious +4, `q4_b` -> Chaotic +4, `q4_c` -> Mysterious +4 (Maximum total = 11)

### 5.2 Deterministic Tie-Breaker Order
Hierarchy: **Q4 -> Q1 -> Q2 -> Q3**.
1. In the event of a tie between top scores, the user's choice in **Q4** takes precedence.
2. If unresolved, evaluate **Q1**, then **Q2**, then **Q3**.
3. Random selection and database order are strictly forbidden.

### 5.3 Confidence Margin
$$\text{confidence} = \frac{\text{top\_score} - \text{second\_score}}{11.0}$$
Normalized score margin rounded to 4 decimal places. Tied top scores yield a margin of `0.0000`.

### 5.4 Partial Progress Recovery
Answers are upserted into `quiz_answers` with `UNIQUE(session_id, question_id)`. Refreshing the page or returning to the session retrieves all previously answered questions without data loss.

---

## 6. Lead Capture & Data Privacy Boundaries

- **PII Boundary**: Personal data (`email`, `name`) is stored exclusively in the normalized `leads` table.
- **Analytics Sanitization**: Generic analytics events (`campaign_events.properties`) NEVER contain raw lead PII.
- **Explicit Consent**: Consent flags (`consent_marketing`, `consent_privacy`) must be explicitly submitted and timestamped (`consented_at`).

---

## 7. Migrations & Local Environment

### 7.1 Docker Compose for PostgreSQL 16
```bash
docker compose up -d postgres
```

### 7.2 Database Migrations (Alembic)
```bash
cd apps/api
alembic upgrade head
```

### 7.3 Testing Commands
```bash
# Backend pytest suite (scoring, idempotency, sessions, quiz, concurrency)
.\.venv\Scripts\pytest.exe apps/api/tests

# End-to-end API smoke test
node scripts/test-api.mjs

# Full project check
npm run test
npm run lint
npm run typecheck
npm run build
```

---

## 8. Out of Scope (Reserved for Future Milestones)
- Analytics Dashboard / BI visualization layer
- Marketing automation / automated emails
- Machine Learning recommendation models
- Full user authentication / accounts
