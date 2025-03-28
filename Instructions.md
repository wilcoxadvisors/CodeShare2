# Agent Instructions: Wilcox Advisors Accounting System (Comprehensive Roadmap)

## 1. Project Overview & Goal

* **Project:** Wilcox Advisors Accounting System
* **High-Level Goal:** Build a best-in-class, scalable SaaS accounting platform, inspired by Odoo's open-source backend logic where applicable.
* **Phased Approach:** Manual First -> API Automation -> AI/ML Enhancements -> Full Automation & ERP Features.
* **Target Audience:** Small, medium, and large businesses [cite: uploaded:Business Plan.docx].
* **Tech Stack:** React (Vite, TypeScript, TanStack Query, Shadcn UI), Node.js (Express, TypeScript), PostgreSQL (Drizzle ORM), Python (for AI/ML).
* **Code Location:** `CodeShare/` folder.
* **Reference Docs:** Business Plan.docx, Outline for Accounting System Integration.docx, Accounting System Implementation Plan.docx, Pricing Sheet.docx.

## 2. Business Model & Long-Term Vision

* **Revenue:** Tiered SaaS subscriptions (Basic/Pro/Enterprise) + Add-ons + Implementation Fees [cite: uploaded:Pricing Sheet.docx, uploaded:Business Plan.docx]. Aggressive growth targets ($10M revenue/2k clients by Year 5) [cite: uploaded:Business Plan.docx].
* **Automation Goal:** Progressively automate accounting and finance processes, moving from manual input to API-driven workflows enhanced by AI/ML [cite: uploaded:Outline for Accounting System Integration.docx, uploaded:gemini 3-27.docx].
* **Data Strategy:** Potential exists to leverage anonymized, aggregated user data for generating valuable small business insights/reports in the future. **CRITICAL:** This requires robust anonymization, transparent privacy policies, and explicit user consent. (Note: Selling data is not an explicitly stated revenue stream in the current Business Plan.docx).
* **ERP Evolution:** The long-term goal is to expand the feature set so the platform can be sold and used as a standalone ERP system directly by client finance teams [cite: uploaded:gemini 3-27.docx].
* **Future-Proofing:** Considerations for Blockchain audits and IoT expense tracking are planned for later phases [cite: uploaded:Outline for Accounting System Integration.docx, uploaded:Business Plan.docx].

## 3. Current Development Status & CRITICAL BUGS

* **Phase 1 (Stabilization & Migration):** COMPLETE. Database migration (junction table for consolidation groups) is finished. Backend logic updated. Code cleanup done.
* **Phase 2 (Guided Setup Flow):** **IN PROGRESS & SEVERELY BLOCKED**. The focus remains on stabilizing the 3-step "Add Client" modal flow (`SetupStepper.tsx` + Cards) accessed via `Dashboard.tsx`.
    * **Latest Update:** Agent attempted multiple fixes (Checkpoints including `a2763eac`, `dbb44cec`, `b1f302ef`) for state management and navigation, but critical bugs persist based on user testing after the latest fixes.
* **CRITICAL BLOCKERS (Must Fix NOW - Focus of Current Debugging):**
    1.  **(BUG 4 - HIGHEST PRIORITY) Final Save / Dashboard Update Failure:** Client/Entity data is NOT saved to DB on finishing Step 3; dashboard doesn't update. User gets an error on finish. Requires debugging `SetupStepper.tsx` -> `handleCompleteSetup` API calls (`Workspace` or `apiRequest` to POST `/api/admin/clients` & `/api/admin/entities`) and verifying backend routes/storage.
    2.  **(BUG 1) Stepper Initialization Failure:** Sometimes starts on Step 2 / stale data. Needs reliable reset to Step 0 in `SetupStepper.tsx` on modal open, potentially clearing `localStorage`.
    3.  **(BUG 2 & 3) Industry Display Issues:** Industry displays incorrectly ("always other" or "N/A") in Step 2 list and Step 3 summary. Requires debugging data capture/save/pass logic and `getEntityIndustryLabel` helper.
    4.  **(BUG 7) State Loss on Back Navigation:** Entity name disappears when navigating back from Step 3 to Step 2. Requires debugging state persistence in `SetupStepper` during back navigation.
    5.  **(BUG 5 - Verify) Step 1 Input Clearing:** Input fields in `ClientSetupCard` might still clear during typing (related to `useFormState` or re-renders). Needs re-verification.
    6.  **(BUG 6 - Deferred) "Use Client Data" Button:** Broken. Fix later.

## 4. Overall Project Roadmap & Agent Tasks (Prioritized)

**Phase A: Stabilize Core Setup Flow (IMMEDIATE & ESSENTIAL)**

* **(Task A.1 - HIGHEST PRIORITY)** **Fix Final DB Save & Dashboard Update (Bug 4):** Rigorously debug the `handleCompleteSetup` API calls (client & entities) in `SetupStepper.tsx`. Verify backend routes/storage. Ensure `Dashboard.tsx` correctly invalidates `['clients']` query on success. **Verify data saves and dashboard updates.**
* **(Task A.2)** **Fix Stepper Initialization (Bug 1):** Ensure `SetupStepper.tsx` reliably initializes `activeStep=0` and clears state/`localStorage` for a *new* setup flow.
* **(Task A.3)** **Fix Industry Display (Bugs 2 & 3):** Debug the data capture, saving, propagation of the `industry` field, and the `getEntityIndustryLabel` helper function. Ensure correct display in Step 2 list & Step 3 summary.
* **(Task A.4)** **Fix State Loss on Back Navigation (Bug 7):** Debug `SetupStepper` state handling (`setupEntities`, `localStorage`) during `handleBack` to prevent data loss between Steps 3 and 2.
* **(Task A.5)** **Verify/Fix Step 1 Input Clearing (Bug 5):** Once initialization is stable, re-verify Step 1 inputs. Debug `ClientSetupCard` / `useFormState` if clearing persists.

**(ONLY proceed to Phase B after ALL bugs in Phase A are fixed and verified)**

**Phase B: Core Accounting Module (Manual First)**

* **(Task B.1)** **Customizable Chart of Accounts (CoA):**
    * Design/Finalize hierarchical schema (`shared/schema.ts`).
    * Implement backend CRUD API (`server/accountRoutes.ts`).
    * Build frontend management UI (allow add/edit/delete/reorder accounts, potentially in a dedicated section or `ChartOfAccountsCard.tsx`).
    * Implement CoA Import/Export (from parsed CSV/JSON provided by user).
* **(Task B.2)** **General Ledger (GL) and Journal Entries (JE):**
    * Design/Finalize JE schema (`shared/schema.ts`, linking to CoA).
    * Implement backend CRUD API (`server/journalEntryRoutes.ts`), including validation (debits=credits).
    * Build frontend UI for manual JE creation (`ManualJournalEntry.tsx`).
    * Implement logic for processing batch JE uploads (from parsed CSV/JSON provided by user).
    * **(AI Link - Future):** Consider hooks for "JE learning" - suggesting entries based on historical data (requires AI module).

**Phase C: Reporting (Standard & Custom)**

* **(Task C.1)** **Standard Reporting:** Finalize/optimize backend logic (`consolidation-group-methods.ts`) for TB, IS, BS, CF reports. Build reliable frontend display components.
* **(Task C.2)** **Custom Reporting:**
    * Define backend API capabilities for fetching data with flexible filters (dates, entities, accounts, custom tags).
    * Build a frontend UI allowing users to select fields, apply filters, and save custom report layouts.

**Phase D: API Integrations & Automation**

* **(Task D.1)** **Implement Integrations:** Connect to Plaid, Stripe, Gusto, Ramp/Concur etc., storing credentials securely [cite: uploaded:Outline for Accounting System Integration.docx].
* **(Task D.2)** **Automate JE Creation:** Implement logic to automatically generate Journal Entries from fetched API data (bank transactions, payroll runs, invoices, expenses), mapping them to the CoA (potentially with AI assistance for categorization).

**Phase E: AI/ML & Predictive Forecasting**

* **(Task E.1)** **Verify Python Service Integration:** Ensure `python_service/ml_service.py` has secure, reliable read/write access to relevant PostgreSQL tables (GL, JE, Budgets, Forecasts) using env variables. Document permissions.
* **(Task E.2)** **Implement Forecasting:** Integrate predictive forecasting models (`prophet` etc.) for cash flow and budget variance analysis. Connect via `server/aiRoutes.ts`, `server/mlService.ts`. Display results in frontend (`AIAnalyticsDashboard.tsx`, `ForecastGeneration.tsx`). Test accuracy.
* **(Task E.3)** **Implement Other AI Features:** Build out transaction auto-categorization, anomaly detection, and NLP query capabilities as planned [cite: uploaded:Outline for Accounting System Integration.docx, uploaded:Accounting System Implementation Plan.docx].

**Phase F: Deferred Features & Final Polish**

* **(Task F.1)** **Implement Client Edit/Deactivate:** Add UI controls and backend logic (soft delete `isActive` flag) on the main `Dashboard.tsx` client list.
* **(Task F.2)** Fix "Use Client Data" Button (Bug 6).
* **(Task F.3)** Comprehensive Testing: Expand unit, integration, and E2E tests.
* **(Task F.4)** Documentation: Update all technical and user documentation.
* **(Task F.5)** Deployment Prep: Finalize cloud configuration, CI/CD, monitoring.

**Phase G: Future-Proofing (Long Term)**

* **(Task G.1)** Explore Blockchain & IoT integrations [cite: uploaded:Outline for Accounting System Integration.docx, uploaded:Business Plan.docx].

## 5. General Guidelines for Agent

* **Prioritize:** Follow the Phase order above. Fix **ALL** bugs in Phase A before starting Phase B.
* **Log Extensively:** Use `console.log("DEBUG Component: Action:", value)` for tracing. **Report log output** for debugging.
* **Verify Incrementally:** Test each specific fix thoroughly.
* **Simplify:** Avoid unnecessary complexity. Focus on clean state management.
* **Ask for Clarification:** If unsure, ask before proceeding.