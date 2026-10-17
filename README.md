# Mentora — Diagnostic Math Tutor
> **"Find the missing piece behind a mistake."**
> Prepared for the **NYLP AI Hackathon 2026**

Mentora is an AI-powered diagnostic learning assistant designed for secondary-school and early-university students. When a student makes a mistake, typical AI tools act like answer engines—immediately revealing the solution without checking underlying comprehension. Mentora inverts this model: it investigates why the learner is stuck, tests likely knowledge gaps with targeted follow-up questions, teaches the missing prerequisite concept, and verifies understanding with a fresh problem and no hints.

---

## 1. Problem
Students frequently practice math problems for hours without making real progress because the barrier isn't the current topic—it is a hidden gap in a prerequisite concept. When students turn to traditional AI chatbots or equation solvers, they receive worked answers and explanations that encourage passive reading and false feelings of mastery, rather than building independent problem-solving skills.

---

## 2. Solution
Mentora acts as an evidence-based diagnostic investigator:
1. **Investigate**: Examines student attempts and reasoning to form hypotheses about missing prerequisites, testing them with targeted diagnostic probes rather than presenting guesses as fact.
2. **Connect**: Visualizes a live Knowledge Map showing how foundational prerequisites link to advanced topics, highlighting affected downstream paths when gaps are detected.
3. **Teach**: Provides a tailored micro-lesson focused specifically on the missing concept, pairing the rule with an intuitive analogy.
4. **Verify**: Challenges the student with a fresh, comparable problem with no hints to verify independent transfer.

---

## 3. Key Features
- **Structured Diagnostic State Machine**: The deterministic rule engine stays authoritatively in charge of question progression, correctness scoring, and concept mastery tracking.
- **Dual Problem Modes**:
  - **Curated Pathway**: Curated 10-concept curriculum spanning Difference of Squares $\rightarrow$ Simplifying Rational Expressions $\rightarrow$ Introductory Limits.
  - **Universal Math Diagnosis**: Students can bring any algebra or calculus problem they are stuck on to diagnose prerequisite misconceptions instead of simply receiving an answer.
- **Interactive Knowledge Map**: Hand-placed 10-node custom SVG DAG with dynamic gap path highlighting, detailed concept audit side-panels, and a responsive grouped list view.
- **Live KaTeX & Monospace Composer**: Math typesetting for all questions, formulas, and user inputs with live preview.
- **Persistent Learning History**: Cloud persistence with Cloud Firestore organized under `sessions/{uid}/{sessionId}` with anonymous Firebase Auth and offline `localStorage` fallback.
- **Strict Privacy & Anti-Shame Tone**: No student names, emails, or PII collected. Microcopy uses gentle, diagnostic phrasing (*"Let's test one step of your reasoning"* rather than *"Wrong"*).

---

## 4. How the Diagnostic Loop Works
```
[Student Attempt on Problem]
           │
           ▼
[Deterministic Answer Evaluation (mathjs)]
           │
     ┌─────┴──────────────────────┐
     ▼                            ▼
[Answer Correct]            [Answer Incorrect / Explanation Provided]
     │                            │
     │                      [Gemini 3.8 Flash Interpretation]
     │                            │ (Identifies candidate misconception & evidence)
     │                            ▼
     │                      [Targeted Diagnostic Probe Question]
     │                            │
     │                      ┌─────┴────────────────────────┐
     │                      ▼                              ▼
     │              [Probe Correct]                [Probe Incorrect]
     │                      │                              │
     │              (Prereq Ruled Out)             (Prereq Marked Likely Gap)
     │                      │                              │
     │                      │                      [Tailored Micro-Lesson]
     │                      │                              │
     │                      │                      [Guided Practice (PR-01/02/03)]
     │                      │                              │
     └──────────────────────┴──────────────┬───────────────┘
                                           ▼
                            [Independent Verification (VER-01/02/03)]
                                           │
                                    [Update Mastery]
                                (Developing vs Demonstrated)
```

---

## 5. AI Methodology & Model / API Usage
- **Model**: `gemini-3.8-flash` via the official `@google/genai` TypeScript SDK on a server-side Express backend.
- **Parameters**: `temperature: 0.2`, `ThinkingLevel.LOW`, and native JSON schema mode (`responseSchema`).
- **Prompt Isolation**: Student input is treated as untrusted data, enclosed in `<student_text>` tags, and safeguarded with strict system prompts that forbid answer revelation.
- **Two Server Routes**:
  - `POST /api/interpret`: Analyzes student attempts and open explanations to categorize reasoning (`sound`, `partial`, `misconception`, `unclear`), identify candidate misconceptions, and extract student-phrased evidence snippets.
  - `POST /api/teach`: Generates gentle slip notes (`"It looks like..."`), concise LaTeX-typeset explanations, and grounding analogies consistent with trusted curriculum records.
  - `POST /api/diagnose-custom`: Diagnoses custom user-submitted problems without revealing full solutions.
- **Resilience**: 12-second timeout, 1-attempt auto-retry on malformed JSON, and graceful fallback to built-in deterministic text if the network or API fails.

---

## 6. Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Motion
- **Math Engine**: KaTeX (typesetting), Math.js (deterministic expression evaluation & AST inspection)
- **Icons**: Lucide React
- **Backend**: Node.js, Express, tsx
- **AI SDK**: `@google/genai` (Gemini API)
- **Database & Auth**: Google Cloud Firestore & Firebase Anonymous Authentication
- **Local Fallback**: Browser `localStorage` with in-memory adapter

---

## 7. Environment Variables
Defined in `.env.example`:
```env
# GEMINI_API_KEY: Injected by AI Studio / hosting environment for server-side Gemini calls.
GEMINI_API_KEY="your_api_key_here"

# PORT: Server port (default 3000)
PORT=3000
```
*Note: API keys are strictly confined to the backend server and never exposed to the client bundle.*

---

## 8. Testing Matrix & Acceptance Criteria (T1–T10)
| Test ID | Input / Condition | Expected Result | Verified Status |
| :--- | :--- | :--- | :--- |
| **T1 — Correct Answer** | `ALG-01` = `x+3` | App acknowledges sound reasoning, tests domain probe `DX-03`, and advances to verification. | **PASS** |
| **T2 — Known Misconception** | `ALG-01` = `x-3` | App marks factorization for testing, selects probe `DX-01`, and hides the solution. | **PASS** |
| **T3 — Ambiguous Input** | Input is unparseable gibberish | App returns helpful formatting prompt without counting an attempt. | **PASS** |
| **T4 — Diagnosis Challenged** | `DX-01` = `(x-4)(x+4)` | Factorization is ruled out; app adapts queue to test cancellation next via `DX-02`. | **PASS** |
| **T5 — Learning Verified** | Independent verification answered | Status updates to `Demonstrated` only after multiple independent correct answers. | **PASS** |
| **T6 — API Fails / Offline** | Network disconnected or quota exceeded | Helpful error notice with Retry button; built-in lessons continue seamlessly. | **PASS** |
| **T7 — Malformed Output** | Model outputs invalid schema | Server validation catches error, retries once, and falls back safely. | **PASS** |
| **T8 — Data Persistence** | Page refresh mid-investigation | Full session (events, concept statuses, active problem) restored from storage. | **PASS** |
| **T9 — Mobile Viewport** | 390px mobile screen | Responsive layout without horizontal overflow; inputs and buttons stay accessible. | **PASS** |
| **T10 — Secret Scan** | Client bundle & repository audit | Zero exposed API keys, private credentials, or auth tokens. | **PASS** |

---

## 9. Known Limitations
- The initial curated question bank focuses on algebra (factorization, rational expressions) and introductory limits.
- Free-text student explanation interpretation can occasionally be ambiguous; when uncertain, the system marks the hypothesis as `"inconclusive"` and relies on objective probe questions.
- Mentora is an instructional diagnostic tool and does not replace the holistic role of a human teacher.

---

## 10. Judge Q&A Summary
- **Q: What makes Mentora different from ChatGPT or Photomath?**
  *A: Rather than computing answers, Mentora executes an instructional diagnostic loop: it tests candidate misconceptions, isolates missing prerequisite concepts using a curated graph, and independently verifies whether understanding transferred.*
- **Q: How do you ensure diagnoses are accurate?**
  *A: We never treat a single wrong answer as definitive proof. Mentora treats initial findings as revisable hypotheses and confirms them with follow-up probes before teaching.*
- **Q: What is the role of AI versus code?**
  *A: Gemini interprets open-ended student reasoning and authors customized explanations. Deterministic TypeScript code manages answer validation, state transitions, question selection, and concept mastery.*

---

## 11. Team Contributions & Submission Integrity
Built specifically for the NYLP AI Hackathon 2026. All third-party libraries (KaTeX, Math.js, Lucide, Tailwind, Firebase) are acknowledged and used in compliance with their open-source licenses.
