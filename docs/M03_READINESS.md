# Milestone 03: Interfaces & Destinations Readiness

With the Data Foundation (Milestone 02) now accepted and mathematically proven, the Backend provides a complete persistent lifecycle for campaigns, sessions, quiz interaction, scoring, and lead capture.

The following interfaces and integrations must now be implemented in the frontend for **Milestone 03**:

## 1. The Cheshire Quiz Interface
- **Path:** `/cheshire/quiz`
- **Current State:** A placeholder stating "Questions are much more fun."
- **M03 Implementation:**
  - Build the visual UI for the 4 quiz questions.
  - Integrate with `POST /api/v1/sessions/{session_id}/quiz/answers` on each answer to save partial progress.
  - Implement the final submission via `POST /api/v1/sessions/{session_id}/quiz/submit`.
  - Handle potential `422 Unprocessable Entity` gracefully if the user tries to submit without answering all 4 questions.

## 2. Segment Result Screens
- **Path:** `/cheshire/result`
- **M03 Implementation:**
  - Upon successful quiz submission, the frontend receives a `final_segment` (`curious`, `chaotic`, or `mysterious`).
  - Render specific narrative content, typography, and visual assets depending on this final segment.
  - Display the user's result to them.

## 3. Lead Capture & Consent
- **Path:** `/cheshire/lead` (or inline on the result page)
- **M03 Implementation:**
  - Provide a form for the user to optionally input their `name`, `email`.
  - Explicitly provide checkboxes for `consent_marketing` and `consent_privacy`.
  - Integrate with `POST /api/v1/sessions/{session_id}/lead` to persist the data.
  - Ensure this remains strictly decoupled from analytical events, preserving the established PII Boundary.

## 4. Destination Routing
- **M03 Implementation:**
  - Provide a final Call to Action based on the segment and lead capture state to route the user to their respective personalized destination.

## 5. Offline Recovery & Resilience
- **M03 Implementation:**
  - Ensure that if the user refreshes or reopens the browser at `/cheshire/quiz`, the frontend uses `GET /api/v1/sessions/{session_id}/quiz/answers` to retrieve any previously saved answers and rehydrates the UI state.
