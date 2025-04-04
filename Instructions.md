# Agent Instructions: Wilcox Advisors Accounting System (Comprehensive Roadmap)

## 1. Project Overview & Goal

* **Project:** Wilcox Advisors Accounting System
* **High-Level Goal:** Build a best-in-class, scalable SaaS accounting platform, inspired by Odoo's open-source backend logic where applicable.
* **Phased Approach:** Manual First -> API Automation -> AI/ML Enhancements -> Full Automation & ERP Features.
* **Target Audience:** Small, medium, and large businesses.
* **Tech Stack:** React (Vite, TypeScript, TanStack Query, Shadcn UI), Node.js (Express, TypeScript), PostgreSQL (Drizzle ORM), Python (for AI/ML).
* **Code Location:** `CodeShare/` folder.
* **Reference Docs:** (Note: Original references were to uploaded files - Business Plan.docx, Outline for Accounting System Integration.docx, etc. These are conceptual references based on past context.)

## 2. Business Model & Long-Term Vision

* **Revenue:** Tiered SaaS subscriptions (Basic/Pro/Enterprise) + Add-ons + Implementation Fees. Aggressive growth targets ($10M revenue/2k clients by Year 5).
* **Automation Goal:** Progressively automate accounting and finance processes, moving from manual input to API-driven workflows enhanced by AI/ML.
* **Data Strategy:** Implement data collection mechanisms to enable selling data and creating valuable reports for investors and economists. Ensure robust anonymization, transparent privacy policies, and explicit user consent are in place. Design the system to maximize data availability for AI/ML and forecasting.
* **ERP Evolution:** The long-term goal is to expand the feature set so the platform can be sold and used as a standalone ERP system directly by client finance teams.
* **Future-Proofing:** Considerations for Blockchain audits and IoT expense tracking are planned for later phases.

## 3. Current Development Status

* **Phase 1 (Stabilization & Migration):** COMPLETE. Database migration (junction table for consolidation groups) is finished. Backend logic updated. Code cleanup done.
* **Phase 2 (Guided Setup Flow):** COMPLETED. The 3-step "Add Client" modal flow (`SetupStepper.tsx` + Cards) accessed via `Dashboard.tsx` is now stable.
    * **Update:** All critical setup flow bugs have been fixed (Checkpoints through `f0cc5d4f`), including state management, navigation, and database persistence issues.
* **Phase 3 (Core Accounting Features):** IN PROGRESS.
    * **Current Update:** Task B.1 (Chart of Accounts) is now COMPLETE. This includes implementation of client-specific hierarchical CoA, backend/frontend management, `code` -> `accountCode` refactoring, import/export functionality (CSV/Excel) with fixes for update logic and UI improvements, resolution of display bugs, and successful verification. Schema refactoring was performed to move reporting fields (`fsliBucket`, `internalReportingBucket`, `item`) from `accounts` to `journalEntryLines`.
    * **Current Update:** Task B.2 (General Ledger / Journal Entries) backend logic and API are COMPLETE and verified via automated tests. Frontend UI (`ManualJournalEntry.tsx`) created and passed initial verification. Batch Upload backend logic is implemented and verified via tests. **Task B.2 is COMPLETE.**
    * **Storage Layer Refactoring:** COMPLETE. The monolithic storage system has been successfully refactored:
        * **Client Storage:** ✅ Successfully refactored all client-related storage logic to `server/storage/clientStorage.ts`.
        * **Entity Storage:** ✅ Created `entityStorage.ts` module with clear delegation pattern.
            * ✅ Verified no entity logic remains directly in `storage.ts`.
            * ✅ Implemented interfaces (`IEntityStorage`) with clear CRUD methods.
            * ✅ Updated `DatabaseStorage` and `MemStorage` to delegate correctly.
            * ✅ Documented `entityStorage.ts` thoroughly.
        * **Account Storage:** ✅ Refactored all account-related storage logic to `server/storage/accountStorage.ts`.
        * **Journal Entry Storage:** ✅ Refactored all journal entry logic to `server/storage/journalEntryStorage.ts`.
        * **Consolidation Storage:** ✅ Refactored consolidation group logic to `server/storage/consolidationStorage.ts`.
        * **User Storage:** ✅ Refactored user-related logic to `server/storage/userStorage.ts`.
        * **Budget Storage:** ✅ Refactored budget-related logic to `server/storage/budgetStorage.ts`.
        * **Form Storage:** ✅ Refactored form-related logic to `server/storage/formStorage.ts`.
        * **Asset Storage:** ✅ Refactored fixed asset logic to `server/storage/assetStorage.ts`.
        * **Report Storage:** ✅ Refactored reporting logic to `server/storage/reportStorage.ts`.
        * **User Activity Storage:** ✅ Refactored user activity tracking to `server/storage/userActivityStorage.ts`.

### Verification Status (COMPLETED):
        * **Consolidation Storage:** ✅ Refactored consolidation group logic to `server/storage/consolidationStorage.ts`.
        * **User Storage:** ✅ Refactored user-related logic to `server/storage/userStorage.ts`.
        * **Budget Storage:** ✅ Refactored budget-related logic to `server/storage/budgetStorage.ts`.
        * **Form Storage:** ✅ Refactored form-related logic to `server/storage/formStorage.ts`.
        * **Asset Storage:** ✅ Refactored fixed asset logic to `server/storage/assetStorage.ts`.
        * **Report Storage:** ✅ Refactored reporting logic to `server/storage/reportStorage.ts`.
        * **User Activity Storage:** ✅ Refactored user activity tracking to `server/storage/userActivityStorage.ts`.
- [x] Verified `clientStorage.ts` delegation and documentation.
- [x] Verified `entityStorage.ts` delegation and documentation.
- [x] Verified `journalEntryStorage.ts` delegation and documentation.
- [x] Verified additional specialized modules (`formStorage.ts`, `userActivityStorage.ts`, etc.).
- [x] Confirmed no direct domain logic remains in `storage.ts`.
- [x] Confirmed interfaces (`IStorage`) accurately reflect the modular structure.
- [x] Verification script passed successfully: `node verify-storage-modules.js`.
- [x] User activity storage verification passed: `node verify-user-activity-storage.cjs`.
- [x] Confirmed all modules and methods have clear, updated documentation.

#### Next Immediate Task:
- 📝 Move to **Task B.3: Accounts Payable Backend Foundation** (Vendors, AP Bills Schema; Vendor CRUD Storage/API).

## 4. Overall Project Roadmap & Agent Tasks (Prioritized)

**Phase A: Stabilize Core Setup Flow (COMPLETED)**

* **(Task A.1)** ✅ Fix Final DB Save & Dashboard Update
* **(Task A.2)** ✅ Fix Stepper Initialization
* **(Task A.3)** ✅ Fix Industry Display
* **(Task A.4)** ✅ Fix State Loss on Back Navigation
* **(Task A.5)** ✅ Fix Step 1 Input Clearing
* **Additional Completed Tasks:**
    * ✅ Dashboard Client Actions: View Details, Edit Client, Deactivate Client.

**Phase B: Core Accounting Module (COMPLETED - Moving to B.3)**

* **(Task B.1)** Customizable Chart of Accounts (CoA): **COMPLETE**
    * ✅ Design/Finalize hierarchical schema (`shared/schema.ts`)
    * ✅ Implement backend CRUD API (`server/accountRoutes.ts`, `/accounts/tree`)
    * ✅ Basic CRUD API Testing
    * ✅ Backend Hierarchy Implementation
    * ✅ Single Header Context Selector
    * ✅ Frontend Hierarchy UI (Display & Add/Edit Forms)
    * ✅ CoA Import/Export functionality (CSV/Excel, update logic, `accountCode` refactor)
    * ✅ Fixed CoA Import Deletion Logic (inactive marking)
    * ✅ Enhanced CoA Import UI (simplified workflow)
    * ✅ CoA Automated Testing (Import/Export API verified)
    * ✅ Refactored Account storage logic to `server/storage/accountStorage.ts`.
* **(Task B.2)** General Ledger (GL) and Journal Entries (JE): **COMPLETE**
    * ✅ Design/Finalize JE schema (`shared/schema.ts`, reporting fields moved)
    * ✅ Implement backend CRUD API (`server/journalEntryRoutes.ts`, validation debit=credit)
    * ✅ Build frontend UI for manual JE creation (`ManualJournalEntry.tsx` in `components/forms/`) - Verified via test page.
    * ✅ Implement logic for processing batch JE uploads (Backend API in `batchUploadRoutes.ts`, storage logic) - Verified via test script.
    * ✅ Refactored Journal Entry storage logic to `server/storage/journalEntryStorage.ts`.
    * **(AI Link - Future):** Consider hooks for "JE learning".
* **(Task B.3)** Accounting Modules: **NEXT**
    * 📝 **Next:** Implement Accounts Payable (AP) backend foundation (Vendors, AP Bills Schema; Vendor CRUD Storage/API).
    * 📝 Implement Accounts Receivable (AR) module.
    * 📝 Implement other modules (Debt/Notes Payable, Inventory, Fixed Assets, Lease Accounting, Prepaid Expenses).
    * 📝 Ensure integration with CoA and GL.
    * 📝 Design/implement GAAP/IFRS financial statements with footnotes.

**Phase C: Reporting (Standard & Custom) & Data Collection**

* **(Task C.1)** Standard Reporting: Finalize/optimize backend logic (`consolidation-group-methods.ts`) for TB, IS, BS, CF reports. Build reliable frontend display components.
* **(Task C.2)** Custom Reporting:
    * Define backend API capabilities for fetching data with flexible filters.
    * Build a frontend UI for custom report building.
* **(Task C.3)** Data Collection and Analysis:
    * Implement data collection mechanisms.
    * Ensure anonymization, privacy policies, and user consent.
    * Design for AI/ML and forecasting.
    * Prioritize state-of-the-art, innovative, customer-focused, easy-to-use solutions.
    * Create a great design (trustworthy, trendy, fun).

**Phase D: API Integrations & Automation**

* **(Task D.1)** Implement Integrations: Connect to Plaid, Stripe, Gusto, Ramp/Concur etc.
* **(Task D.2)** Automate JE Creation: From fetched API data (AI assistance).
    * **(AI Assistance):** Explore Plaid, document analysis. Odoo/Sage Intacct inspiration.

**Phase E: AI/ML & Predictive Forecasting**

* **(Task E.1)** Verify Python Service Integration: Check DB access for `python_service/ml_service.py`.
* **(Task E.2)** Implement AI/ML and Predictive Forecasting: Models for forecasting, auto-categorization, anomaly detection, NLP queries. Advanced analytics features. Prioritize state-of-the-art, innovative design.
* **(Task E.3)** Implement Other AI Features: Auto-categorization, anomaly detection, NLP from plans.

**Phase F: Deferred Features & Final Polish**

* **(Task F.1)** ✅ Implement Client Edit/Deactivate (Done).
* **(Task F.2)** Fix "Use Client Data" Button (Bug 6).
* **(Task F.3)** Comprehensive Testing: Expand unit, integration, E2E tests.
* **(Task F.4)** Documentation: Update all technical and user documentation.
* **(Task F.5)** Deployment Prep: Finalize cloud configuration, CI/CD, monitoring.

**Phase G: Future-Proofing (Long Term)**

* **(Task G.1)** Explore Blockchain & IoT integrations.

## 5. General Guidelines for Agent

* **Prioritize:** Focus on **Task B.3: Accounts Payable Backend Foundation**.
* **Maintain Structure:** Keep the client-specific accounting design consistent. Follow established patterns (e.g., modular storage).
* **Test Thoroughly:** Ensure functionality works. Write/run automated tests (unit, integration, API).
* **Log When Needed:** Use `console.log("DEBUG Component: Action:", value)` for tracing complex logic.
* **Verify Incrementally:** Test each specific feature/fix thoroughly before moving on.
* **Simplify:** Avoid unnecessary complexity. Focus on clean state management.
* **Ask for Clarification:** If unsure, ask before proceeding.
* **Design Considerations:** Prioritize state-of-the-art, innovative, customer-focused, easy-to-use design. Aim for trust, trendiness, and fun.
* **Data Strategy:** Keep data collection/strategy goals in mind during design.
* **Code Quality:** Write clean, well-organized, documented code. Follow linting/formatting rules.
* **Efficiency:** Prioritize efficient algorithms and data structures.
* **Error Handling:** Implement robust error catching and user-friendly messages.
* **Documentation:** Maintain clear documentation and code comments.

## 6. Code Quality & Cleanup Strategy

* **Automated Linting and Formatting:**
    * **Tools:** Use ESLint and Prettier via project configurations (`.eslintrc.js`, `.prettierrc.json`).
    * **Agent Action:** Run linting/formatting commands periodically (e.g., `npx eslint . --fix`, `npx prettier . --write`) to fix issues automatically.
* **Automated Unused Code/Dependency Detection:**
    * **Tools:** Consider using tools like `ts-prune` or Knip to find unused exports, files, types, and dependencies.
    * **Agent Action:** Run these tools periodically. Based on reports, remove identified unused items after review.
* **TypeScript Static Analysis:**
    * **Tools:** Use the TypeScript compiler (`tsc`) with strict settings (`tsconfig.json`).
    * **Agent Action:** Run `npx tsc --noEmit` regularly to check for type errors and potential dead code.
* **Targeted Refactoring (Manual via Agent):**
    * **Strategy:** Address large files (like the ongoing `storage.ts` refactor) or duplicate code by breaking them down logically by domain/feature.
    * **Agent Action:** Follow specific, step-by-step refactoring instructions, creating new modules, moving code, updating imports, and verifying with tests. Emphasize single responsibility, avoiding side effects, good abstractions.
* **Leveraging Automated Tests:**
    * **Strategy:** Maintain comprehensive automated tests (unit, integration, API via scripts in `/test`) to ensure refactoring and cleanup don't introduce regressions.
    * **Agent Action:** Write missing tests for critical modules. Run relevant test suites after changes.
* **Recommended Approach:**
    * **Incremental Cleanup:** Apply cleanup practices alongside feature development and refactoring.
    * **Continue Refactoring `storage.ts`:** Systematically move logic out of the monolithic `storage.ts` into domain-specific modules (e.g., `clientStorage.ts`, `entityStorage.ts`, `accountStorage.ts` etc.) after the current task.
