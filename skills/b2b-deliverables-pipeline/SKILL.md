---
name: b2b-deliverables-pipeline
description: Pipeline control and audit protocol for B2B startup deliverables. Enforces strict linear prerequisite dependencies across DEL-01 to DEL-20, identifies unblocked daily focus, generates audit summaries, and synchronizes Executive Dashboard KPIs. Use when auditing startup progress, resolving critical path blockers, generating daily digest reports, or updating deliverable tracker statuses. Do not use for writing deliverable document content or code.
---

# B2B Deliverables Pipeline & Audit Controller

Operational control procedure for tracking startup deliverables against the Master Deliverables Tracker Google Sheet, resolving prerequisite bottlenecks, producing daily audit digests, and maintaining Executive Dashboard KPI integrity.

## When to Use

- When conducting daily or scheduled audits of startup deliverables (DEL-01 to DEL-20).
- When determining **Today's Focus** or identifying active critical path blockers.
- When resolving prerequisite dependency gates before assigning work.
- When updating deliverable statuses in Column F and synchronizing Executive Dashboard KPIs.
- When generating the Daily Scheduled Audit Digest summary.

## When Not to Use

- Do not use for interactive diagnostic interviews with Cale (use `b2b-founder-interview-protocol`).
- Do not use for evaluating deliverable acceptance criteria against B2B literature (use `b2b-handbook-evaluator`).
- Do not use for software coding, MVP prototyping, or legal drafting.

## Prerequisite & Dependency Invariants

1. **Strict Upstream Verification (No Pulling from Incomplete Work)**:
   - Deliverables build in a strict linear sequence (see `references/dependency-matrix.md`).
   - A downstream deliverable must **NEVER** pull content, numbers, or assumptions from an upstream deliverable unless that upstream deliverable is marked `Completed` (Column F) in the Master Deliverables Tracker.
2. **Prerequisites Preempt Calendar Due Dates**:
   - Calendar due dates never override prerequisite dependencies.
   - If a downstream milestone (e.g., DEL-16 Commercial Contract) has arrived on the calendar, but an upstream prerequisite (e.g., DEL-05 Unit Economics) is still `In Review` or `In Progress`, **Today's Focus MUST strictly remain the uncompleted upstream prerequisite**.
3. **Prerequisite Exception Protocol**:
   - If work on a deliverable is blocked by an uncompleted prerequisite, halt execution, notify Cale, and do not make assumptions or fabricate placeholders.

## Core Workflow

### Step 1: Inspect Master Deliverables Tracker

1. Access the Google Sheet titled **B2B Tech Startup Master Deliverables & Timeline Tracker (Target Day CEO)**.
2. Open the **Master Deliverables Tracker** tab.
3. Read the status of all rows (Column F) from DEL-01 to DEL-20.

### Step 2: Prerequisite-Gated 'Today's Focus' Resolution

1. Scan the dependency sequence: Phase 1 (DEL-01 to DEL-05), Phase 2 (DEL-06 to DEL-08), Phase 3 (DEL-09 to DEL-12), Phase 4 (DEL-13 to DEL-17), Phase 5 (DEL-18 to DEL-20).
2. Identify the **earliest uncompleted deliverable** on the critical path.
3. For any deliverable scheduled for today:
   - Check its prerequisites against `references/dependency-matrix.md`.
   - If any prerequisite is NOT `Completed`, label it as: *"Paused / Awaiting Prerequisite [DEL-XX]"*.
4. **Designate Today's Focus**: Set Today's Focus exclusively to the earliest unblocked bottleneck.

### Step 3: Status & KPI Synchronization

Whenever a deliverable status in Column F changes (e.g., from `In Review` to `Completed` after explicit founder sign-off):
1. Update Column F on the **Master Deliverables Tracker** tab.
2. Immediately switch to the **Executive Summary & Dashboard** tab in the same turn.
3. Recalculate and update the KPI Summary counts:
   - `Completed`
   - `In Review`
   - `In Progress`
   - `Not Started`
   - `Total Deliverables`

## Daily Audit Digest Output Format

When generating the scheduled daily audit summary:

1. **Operational Overview**: Current date, target countdown, and active milestone.
2. **Today's Critical Path Focus (Prerequisite-Gated)**:
   - State the **single, earliest uncompleted deliverable** blocking the critical path.
   - Provide its specific 1:1 diagnostic question to unblock execution.
3. **Downstream Pipeline Status (Gated)**:
   - Explicitly list reached deliverables as **Paused / Awaiting Prerequisite [DEL-XX]** with clear reasons.
4. **Master Tracker KPI Summary**:
   - Present synchronized KPI counts directly from the Executive Dashboard.
