---
name: b2b-handbook-evaluator
description: Acceptance criteria auditing and literature grounding procedure for B2B startup deliverables. Cross-references the B2B Principles Reference Matrix, extracts models from designated PDF handbooks, and validates Google Doc artifacts. Use when auditing deliverable draft quality against Column N acceptance criteria, consulting B2B handbooks, or updating document review blocks. Do not use for general chit-chat or code development.
---

# B2B Principles Acceptance & Handbook Evaluator

Quality assurance and literature verification protocol for evaluating B2B startup deliverables against the Master Deliverables Tracker criteria, the B2B Principles Reference Matrix, and canonical handbook resources.

## When to Use

- When auditing an existing deliverable draft against **Column N (Key Focus & Acceptance Criteria)**.
- When scaffolding or formatting a new deliverable Google Doc in the **Business Project** folder.
- When looking up foundational frameworks in the **B2B Principles Reference Matrix** and corresponding PDF handbooks.
- When maintaining or formatting the `### Google Spark Review` section of a deliverable document.

## When Not to Use

- Do not use for conducting founder diagnostic interviews (use `b2b-founder-interview-protocol`).
- Do not use for managing the schedule, daily digest, or KPI counts (use `b2b-deliverables-pipeline`).

## Source Hierarchy Protocol

When evaluating deliverable content or formulating advisory options:

1. **Contextual Grounding (Completed Upstream DELs)**:
   - Ground review in approved, `Completed` deliverables (e.g., DEL-01 problem definition, DEL-02 market beachhead, DEL-04 value proposition).
2. **Primary Literature Source (B2B Reference PDFs)**:
   - Open the **B2B Principles Reference Matrix** tab in the master tracker.
   - Match the active `DEL-#` in **Column E (Mapped Deliverables)**.
   - Extract the **Resource ID (Column B)**, **Handbook Title (Column C)**, and **Primary Topic & Core Frameworks (Column D)**.
   - Extract models, terminology, and benchmarks directly from the matching PDF in the **B2B Business Principles** folder.
3. **Secondary Fallback Source (Web Search)**:
   - Use web search **only** if the reference PDFs and existing completed deliverables do not contain a required regulatory standard or market benchmark.

## Document Scaffolding & Review Protocol

### 1. Document Initialization & Naming
- Locate the file reference in **Drive Mockup Doc Reference (Column L)**.
- If missing, create a new Google Doc in the **Business Project** folder titled with the exact canonical format:  
  `DEL-##: [Deliverable Name]`
- Structure top-level headings directly matching the requirements in **Column N (Acceptance Criteria)**.
- Insert diagnostic markers (`[Founder Input Required: ...]`) under unfulfilled sections.

### 2. Standardized Review Block Management
Every deliverable document concludes with a standardized `### Google Spark Review` section at the very end. Always perform a clean overwrite (never append multiple blocks):

#### While in Review or Under Revision:
```markdown
### Google Spark Review

**Status:** In Review
**Assessment:** [1-2 sentences summarizing progress against Column N criteria.]
**Next Step:** [Strictly ONE 1:1 question for unfulfilled criteria, or confirmation prompt for sign-off.]
```

#### Once Confirmed Completed by Founder:
```markdown
### Google Spark Review

**Status:** Completed
**Verification:** [1-2 sentences confirming satisfaction of all Column N criteria and alignment with mapped handbook frameworks.]
```
