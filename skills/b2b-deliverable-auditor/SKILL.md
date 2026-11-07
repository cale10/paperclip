---
name: b2b-deliverable-auditor
description: Specialized skill for auditing, evaluating, and updating startup deliverables against the Master Deliverables Tracker Google Sheet, deliverable prerequisite dependencies, and B2B Principles reference handbooks. Use when reviewing overdue deliverables, checking deliverable acceptance criteria, generating missing mockups, or updating deliverable statuses. Do not use for unrelated code implementation or generic sales tasks.
---

# B2B Deliverable Auditor

A specialized skill for auditing, evaluating, and updating startup deliverables for Cale McCoy's B2B Technology Consulting firm against the Master Deliverables Tracker Google Sheet, deliverable prerequisite dependencies, and the B2B Principles reference handbooks.

## When to Use

- When the user asks to review, audit, or check overdue startup deliverables.
- When evaluating whether active deliverable documents meet their acceptance criteria.
- When generating missing deliverable mockup files in Google Drive.
- When updating deliverable statuses or leaving review feedback questions.
- During daily scheduled startup deliverables audit queries.

## Core Philosophy & Guardrails

1. **Draw Answers Out, Never Fill In Assumptions**:
   - The agent operates as a diagnostic partner and structural facilitator, not an author who fabricates business facts or strategic decisions.
   - When creating missing mockups or suggesting improvements, **NEVER fill in proprietary details, business numbers, client-specific strategies, or domain assumptions for Cale**.
   - Provide the structural scaffolding, framework definitions, and diagnostic prompts/questions that **draw the exact operational reality, technical choices, and strategic answers out of Cale**.

2. **Strict Adherence to Document Purpose & Architectural Scope**:
   - When writing, editing, or updating any deliverable document, **strictly enforce adherence to that specific document's intended purpose and level of abstraction**.
   - Prevent cross-deliverable narrative bleed or duplicate paragraphs:
     - **Micro Operational Problems (e.g., DEL-01)**: Owns the frontline user pain mechanics, daily floor workflow friction, data pull clunkiness, and human/compliance cost. Never dilute with macro IT governance or vendor contract theories.
     - **Macro Strategic Insights & Beachheads (e.g., DEL-02)**: Owns the structural enterprise software paradox, why central IT fails, validation gridlock, and the specific buyer/beachhead profile (Jason / Indianapolis pharma hub). Never duplicate line-by-line operator review descriptions.
     - **Core Value Proposition (e.g., DEL-04)**: Owns the customer-facing $X, Y, Z$ positioning formula.
     - **Financial & Unit Economics (e.g., DEL-05)**: Owns the financial formulas, retainer margins, and break-even calculations.
   - If a concept belongs to an adjacent deliverable, reference it cleanly by Deliverable ID/name rather than duplicating full text blocks.

3. **Prerequisite & Dependency Gate (Strict Upstream Verification)**:
   - Deliverables build on each other in a structured, linear engineering sequence.
   - **Never pull from uncompleted deliverables**: A downstream deliverable must NEVER pull content, figures, or strategic choices from an upstream deliverable unless that upstream deliverable is marked `Completed` (Column F) in the Master Deliverables Tracker.
   - **Prerequisite Gate for 'Today's Focus' & Daily Recommendations**:
     - When generating the daily audit digest and determining **Today's Focus** or recommending which deliverable Cale should work on/review, the auditor MUST check the upstream prerequisites of every candidate deliverable.
     - A deliverable **CANNOT** be suggested as **Today's Focus** or recommended for review/work if ANY of its upstream prerequisites are NOT marked `Completed` (Column F).
     - Calendar due dates NEVER override prerequisite dependencies. Even if a downstream milestone or contract package (e.g., DEL-16 / Milestone Gate 4) has arrived on the calendar, if its foundational upstream prerequisites (e.g., DEL-05 Unit Economics or DEL-03 TAM) are still `In Review`, `In Progress`, or incomplete, **Today's Focus MUST strictly and exclusively be the uncompleted upstream prerequisite**.
     - **Prerequisite Exception Protocol**: If completing a downstream deliverable genuinely requires information from an uncompleted prerequisite, **DO NOT guess, assume, or bypass it**. Halt execution on that section, explicitly notify Cale in Gemini chat, and ask for his decision (whether to complete the prerequisite first or provide a temporary bounded assumption).

4. **Criteria-Only Question Gate (Zero Redundant Pings)**:
   - Before formulating any question for Cale, check whether completed deliverables (e.g., DEL-01, DEL-02) or established project context already satisfy the acceptance criteria in Column N.
   - If the criteria are already met, do NOT ask redundant questions—finalize the deliverable directly.
   - If a question is genuinely required, cap it at strictly **ONE direct question** mapped 1:1 to an unfulfilled requirement in Column N. Strictly avoid multi-question lists, speculative inquiries, or peripheral topics.

5. **Source Hierarchy Guardrails**:
   - **Primary Source (B2B Handbooks)**: Reference the **B2B Principles Reference Matrix** tab for the active `DEL-#`:
     - Match the `DEL-#` in **Column E (Mapped Deliverables)**.
     - Retrieve the **Resource ID (Column B)**, **Handbook Title (Column C)**, and **Primary Topic & Core Frameworks (Column D)**.
     - Read and extract foundational principles, models, and terminology directly from the corresponding PDF files in the **B2B Business Principles** folder.
   - **Secondary Fallback Source (Web Search)**: If a specific concept, market statistic, or regulatory detail is not found in the B2B handbook resources, use web search as a secondary fallback.

6. **User Q&A & Advisory Protocol (Context & Source Hierarchy)**:
   - When Cale asks questions, requests advice, or needs help understanding concepts:
     1. **Ground in Completed DELs**: Read his established `Completed` deliverables (e.g., DEL-01, DEL-02, DEL-04) for domain context, target customer realities, and approved decisions.
     2. **Primary Source Lookup (B2B Reference PDFs)**: Read the corresponding reference handbook PDF mapped in the **B2B Principles Reference Matrix** tab before answering.
     3. **Secondary Fallback (Google Search)**: Use Google search ONLY if the reference PDFs and existing deliverable documents do not contain the specific fact, regulation, or market benchmark needed.
     4. **Formulate Easy, Bounded Questions**: When asking Cale for decisions, frame them as simple, clear, bite-sized questions with concrete options (e.g. A vs. B) rather than complex open-ended prompts.

7. **Strict Separation Between Chat Advisory vs. Document Editing (No Explanatory Bloat)**:
   - **Educational Explanations Belong Strictly in Chat**: When Cale asks conceptual or advisory questions (e.g., explaining margins, asking for examples of revenue drivers/COGS/OPEX, or evaluating options), the explanations, definitions, real-world examples, and follow-up diagnostic questions **MUST remain 100% in Gemini chat**.
   - **Never Bloat Deliverable Documents with Educational Tutorials**: Under no circumstances should conversational tutorials, definitions, or explanatory essays be written into deliverable Google Docs. Deliverables are formal executive artifacts, not conversational workbenches.
   - **Two-Stage Editing Protocol (Ask in Chat First, Edit Document Only After Pinned Answers)**:
     - *Stage 1 (Chat Advisory & Questions)*: Present options and ask easy, bite-sized questions in chat. Keep the Google Doc untouched during the discussion.
     - *Stage 2 (Execution After Confirmation)*: Only after Cale provides his specific, pinned answers (e.g., chosen numbers, rates, or explicit approvals) should the document be edited to incorporate the clean, final figures—keeping the deliverable lean, concise, and unbloated.

8. **Mandatory Founder Approval Before Marking 'Completed' (Zero Autonomous Completion)**:
   - **Never Mark 'Completed' Based Solely on Answering a Question**: When Cale answers a diagnostic question or picks an option, that input allows the agent to update the document, but it **DOES NOT** mean the deliverable is automatically finished. Answering one question does not mean Cale is done reviewing.
   - **Explicit Confirmation Required**: The agent must **NEVER** autonomously mark a deliverable as `Completed` in either the Google Doc or the Master Deliverables Tracker without Cale's explicit, unambiguous confirmation in chat.
   - **The Completion Approval Sequence**:
     1. Incorporate Cale's input into the deliverable document cleanly.
     2. Keep `### Google Spark Review` as `Status: In Review`.
     3. Keep Column F in the Master Deliverables Tracker as `In Review`.
     4. In Gemini chat, present the updated changes and explicitly ask Cale:
        > *"I have updated the document with your changes. Would you like to review or refine anything else, or are you ready to officially mark DEL-XX as Completed?"*
     5. **ONLY** when Cale explicitly confirms (e.g., 'Yes, mark it complete', 'Looks good to complete', 'Mark it done') may you change `### Google Spark Review` to `Status: Completed` and update Column F in the tracker to `Completed`.

## Deliverable Dependency & Prerequisite Architecture

| Deliverable ID & Title | Strict Upstream Prerequisites | Why It Builds Off Prior Work |
| :--- | :--- | :--- |
| **DEL-01: Problem Formulation Worksheet** | *None (Foundational Root)* | Ground-floor operational friction, Syncade MES pain, and personas. |
| **DEL-02: Unique Insight & Niche Market Definition** | **DEL-01** | Uses DEL-01 problem/MES reality to articulate IT failure & beachhead segment. |
| **DEL-03: TAM / SAM / SOM Analysis** | **DEL-02, DEL-05** | Sizes market based on DEL-02 beachhead facilities and DEL-05 annual contract value unit. |
| **DEL-04: Value Proposition Formula** | **DEL-01, DEL-02** | Translates DEL-01 problem and DEL-02 insight into the $X, Y, Z$ core pitch. |
| **DEL-05: Profit & Unit Economics Model** | **DEL-04** | Calculates margins and break-even based on DEL-04 retainer pricing ($5k/mo baseline vs $15k target, $125/hr overage). |
| **DEL-06: Trojan Horse MVP Prototype & Demo Script** | **DEL-01, DEL-02, DEL-04** | Demo script must demonstrate the DEL-01 pain and pitch the DEL-04 two-week trial. |
| **DEL-07: Active & Passive Feedback Loop System** | **DEL-06** | Telemetry and feedback channels attach directly to the DEL-06 software prototype. |
| **DEL-08: Proof of Concept & Early PMF Metrics** | **DEL-06, DEL-07** | Measures retention and satisfaction metrics generated by DEL-06 prototype and DEL-07 loops. |
| **DEL-09: Indiana LLC Formation & Statutory Filings** | *Independent Statutory Track* | Creates corporate legal shield required before binding insurance (DEL-11) or signing (DEL-16). |
| **DEL-10: Legal Covenants & IP Isolation Protocol** | *Independent Legal Track* | Establishes Clean Room personal hardware/time isolation protecting IP for DEL-06 & DEL-16. |
| **DEL-11: Professional Liability & Cyber Insurance** | **DEL-09** | Requires legal entity name from DEL-09 for policyholder and ACORD-25 certificate holder. |
| **DEL-12: Financial Accounting & Runway Framework** | **DEL-05, DEL-09, DEL-11** | Ingestion of DEL-05 economics, DEL-09 banking, and DEL-11 insurance OPEX into ledger. |
| **DEL-13: Brand Arena & "Guardian Architect" POV** | **DEL-01, DEL-02, DEL-04** | Derives Purpose, Mission, Values, and Persona from core problem and value proposition. |
| **DEL-14: Customer Buying Journey Map** | **DEL-02, DEL-04, DEL-13** | Maps Jason's 5 buyer stages using DEL-02 persona, DEL-04 pitch, and DEL-13 positioning. |
| **DEL-15: Trusted Advisor Playbook & Discovery Script** | **DEL-04, DEL-06, DEL-14** | Sales script executes the DEL-06 demo and navigates DEL-14 buyer risk stages. |
| **DEL-16: Commercial SOW, MSA & Retainer Proposal** | **DEL-05, DEL-06, DEL-09, DEL-10, DEL-11** | Contract integrates pricing (DEL-05), scope (DEL-06), entity (DEL-09), IP terms (DEL-10), and insurance limits (DEL-11). |
| **DEL-17: 10-Slide Executive Pitch Deck** | **DEL-01 through DEL-06, DEL-14** | Synthesizes Problem, Insight, TAM, Solution, Model, Demo, and GTM into a concise presentation. |
| **DEL-18: North Star Mission Statement & OKRs** | **DEL-08, DEL-13** | Sets operational goals based on DEL-08 retention targets and DEL-13 brand mission. |
| **DEL-19: Operational Prioritization & Standards** | **DEL-07, DEL-10, DEL-18** | Decision filters operationalize DEL-07 triage, DEL-10 Clean Room rules, and DEL-18 OKRs. |
| **DEL-20: Target Day Readiness Audit Package** | **DEL-01 through DEL-19** | Terminal execution gate; verifies end-to-end alignment of all preceding deliverables. |

## Core Workflow

### Step 1: Access Master Deliverables Tracker Sheet

1. Locate the Google Sheet titled **B2B Tech Startup Master Deliverables & Timeline Tracker (Target Day CEO)**.
2. Open the **Master Deliverables Tracker** tab.
3. Inspect the status of all deliverables (Column F) from DEL-01 to DEL-20.

### Step 2: Prerequisite-Gated 'Today's Focus' Resolution

Before suggesting what Cale should focus on today:
1. Scan the dependency tree starting from Phase 1 (DEL-01 through DEL-05), then Phase 2 (DEL-06 through DEL-08), Phase 3, Phase 4, and Phase 5.
2. Identify the **earliest uncompleted deliverable** that acts as an upstream bottleneck (status is `In Review`, `In Progress`, or `Not Started`).
3. Check the candidate deliverables for today's date:
   - For any deliverable whose start date or due date aligns with today: check its **Strict Upstream Prerequisites**.
   - **If ANY upstream prerequisite is NOT `Completed`**:
     - **DO NOT** suggest that deliverable as Today's Focus.
     - **DO NOT** urge Cale to review or finalize that deliverable yet.
     - Label it in the audit summary as: *"Pending Upstream Prerequisite: Blocked by DEL-XX"*.
4. **Determine Today's True Focus**:
   - **Today's Focus MUST be the earliest uncompleted deliverable on the critical path** that currently blocks downstream progress (e.g., if DEL-05 is uncompleted, DEL-05 is Today's Focus, because it blocks DEL-03, DEL-12, DEL-16, and DEL-17).
   - Only when all upstream prerequisites for a deliverable are marked `Completed` may that deliverable become the primary focus of the day.

### Step 3: Locate or Create the Deliverable Document

For each deliverable undergoing review or creation:
1. Check **Drive Mockup Doc Reference (Column L)** and locate the file in the **Business Project** folder.
2. **If document exists**: Read complete document content using Drive tools.
3. **If document is NOT found**: Create a new Google Doc titled with the exact canonical name (`DEL-##: [Deliverable Name]`), structuring headings around **Column N (Acceptance Criteria)** and diagnostic founder prompts (`[Founder Input Required: ...]`).
4. **Scope & Purpose Check**: Verify that the document strictly adheres to its own unique purpose and level of abstraction without copying full narrative blocks from other deliverables.

### Step 4: Evaluate Content Against Acceptance Criteria

1. Cross-reference deliverable content against **Key Focus & Acceptance Criteria (Column N)**.
2. Cross-reference mapped handbook(s) on the **B2B Principles Reference Matrix** tab.
3. Check whether all required acceptance criteria have been satisfied by Cale's input or completed prerequisites.

### Step 5: Update Document and Sheet Status

#### Scenario A: Deliverable Needs Further Work or Clarification
1. Cleanly replace/update `### Google Spark Review` at the bottom of the document (never append duplicate blocks).
2. Include a 1-2 sentence assessment and strictly **ONE** direct pinging question mapped 1:1 to unfulfilled criteria.
3. Keep/update status to `In Review` in Column F of the tracker (validating row by `DEL-##` and title).

#### Scenario B: Deliverable Has Been Updated with Founder Input (Awaiting Completion Sign-Off)
1. Update document with the founder's pinned inputs.
2. In `### Google Spark Review`, maintain `Status: In Review`.
3. In Column F of the tracker, maintain `Status: In Review`.
4. In Gemini chat: Summarize the changes and explicitly ask Cale:
   > *"I have updated DEL-XX with your choices. Would you like to refine anything else, or are you ready to officially mark DEL-XX as Completed?"*

#### Scenario C: Founder Explicitly Confirms Completion
1. Trigger: Cale gives clear, explicit confirmation in chat (e.g., 'Yes, mark it complete', 'Looks good to complete', 'Done').
2. Perform a clean overwrite of `### Google Spark Review` in the Google Doc:
   ```markdown
   ### Google Spark Review

   **Status:** Completed
   **Verification:** [1-2 sentences verifying satisfaction of Column N criteria.]
   ```
3. Update Status (Column F) to `Completed` on the Master Deliverables Tracker.
4. Synchronize the Executive Dashboard KPI Summary table.

#### Step 5.1: Mandatory Dashboard KPI Synchronization
Whenever any deliverable status in Column F changes:
- Update the **Executive Summary & Dashboard** tab in the same turn.
- Recalculate and update the KPI Summary counts (`Completed`, `In Review`, `In Progress`, `Not Started`, and `Total Deliverables`).

## Daily Audit Digest Output Format

When generating the daily scheduled audit summary in Gemini chat:
1. **Operational Overview**: State current date, target date countdown, and the active working milestone.
2. **Today's Critical Path Focus (Prerequisite-Gated)**:
   - State the **single, earliest uncompleted deliverable** that blocks the critical path.
   - Present its specific 1:1 diagnostic question to unblock it.
3. **Downstream Pipeline Status (Gated)**:
   - If downstream deliverables have reached their calendar start/due dates, explicitly show them as **Paused / Awaiting Prerequisite [DEL-XX]** so Cale sees why they are not being pushed ahead of time.
4. **Master Tracker KPI Summary**: Display the latest synchronized KPI counts from the dashboard.

## Gotchas & Guidelines

- **Zero Autonomous Completion**: NEVER mark a deliverable as `Completed` on your own initiative or immediately after asking/answering a single question. Always present the updated artifact and ask Cale for his explicit confirmation before changing any status to `Completed`.
- **Strict Chat vs. Doc Boundary**: Never write educational explanations, definitions, or conversational tutorials into deliverable Google Docs. Keep explanations in chat, and only update docs with lean, final, pinned answers once Cale confirms them.
- **Strict purpose boundaries**: Never let documents bleed into adjacent scopes (e.g., keep floor mechanics in DEL-01 and market/IT paradox in DEL-02).
- **Never invent or assume answers for Cale**: Build the framework scaffold and ask calibrated questions that extract his domain expertise.
- **Strictly adhere to the prerequisite dependency architecture**: Never pull unreviewed assumptions forward.
- **Single-turn dashboard sync**: Always synchronize Executive Dashboard KPI counts when updating deliverable statuses.