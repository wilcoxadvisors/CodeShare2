# Agent Instructions: Wilcox Advisors Accounting System (Comprehensive Roadmap)

## 1. Project Overview & Goal

* **Project:** Wilcox Advisors Accounting System
* **High-Level Goal:** Build a best-in-class, scalable SaaS accounting platform, inspired by Odoo's open-source backend logic where applicable.
* **Phased Approach:** Manual First -> API Automation -> AI/ML Enhancements -> Full Automation & ERP Features.
* **Target Audience:** Small, medium, and large businesses.
* **Tech Stack:** React (Vite, TypeScript, TanStack Query, Shadcn UI), Node.js (Express, TypeScript), PostgreSQL (Drizzle ORM), Python (for AI/ML).
* **Code Location:** `CodeShare/` folder.
* **Reference Docs:** (Note: Original references were to uploaded files - Business Plan.docx, Outline for Accounting System Integration.docx, etc. These are conceptual references based on past context.)

## 1.1 Onboarding Flow (Explicitly Updated)

The onboarding workflow is simplified to explicitly include only:
* Client Setup
  * Collect: Name, Legal Name, Address, Tax Info, Industry, Contacts
* Default Entity Creation
  * Automatically created after successful Client creation.
  * Uses explicitly the Client's Name and Industry as defaults.

Note:
* Historical Data, Consolidation Group, and Chart of Accounts (CoA) setups are explicitly excluded from onboarding.
* Historical data will be explicitly handled through the Journal Entry batch upload module.

## 1.2 Industry Dropdown Alignment & Consistency

* Maintain industry dropdown lists explicitly from a single source of truth at: `client/src/lib/industryUtils.ts`
* Explicitly ensure ALL components (ClientSetupCard.tsx, EntityManagementCard.tsx, EntityForm.tsx, ClientOnboardingForm.tsx, etc.) import and utilize this centralized source.
* Immediately remove duplicate implementations of utility functions like ensureIndustryValue explicitly from individual components.

## 2. Business Model & Long-Term Vision

* **Revenue:** Tiered SaaS subscriptions (Basic/Pro/Enterprise) + Add-ons + Implementation Fees. Aggressive growth targets ($10M revenue/2k clients by Year 5).
* **Automation Goal:** Progressively automate accounting and finance processes, moving from manual input to API-driven workflows enhanced by AI/ML.
* **Data Strategy:** Implement data collection mechanisms to enable selling data and creating valuable reports for investors and economists. Ensure robust anonymization, transparent privacy policies, and explicit user consent are in place. Design the system to maximize data availability for AI/ML and forecasting.
* **ERP Evolution:** The long-term goal is to expand the feature set so the platform can be sold and used as a standalone ERP system directly by client finance teams.
* **Future-Proofing:** Considerations for Blockchain audits and IoT expense tracking are planned for later phases.

## 3. Current Development Status

* **Phase 1 (Stabilization & Migration):** COMPLETE. Database migration (junction table for consolidation groups) is finished. Backend logic updated. Code cleanup done.
    * **Recent Fix:** ✅ **Fixed server crash during migrations by correcting the conditional check in `add-soft-deletion-and-audit-logs.ts` that was causing premature process termination.**
* **Phase 2 (Guided Setup Flow):** COMPLETED. The 3-step "Add Client" modal flow (`SetupStepper.tsx` + Cards) accessed via `Dashboard.tsx` is now stable.
    * **Update:** All critical setup flow bugs have been fixed (Checkpoints through `f0cc5d4f`), including state management, navigation, and database persistence issues.
* **Phase 3 (Core Accounting Features):** IN PROGRESS.
    * **Current Update:** Task B.1 (Chart of Accounts) is NEARLY COMPLETE. Fixed account update logic to allow name/active/parentId changes with transactions, while correctly blocking accountCode/type changes. Fixed UI to disable restricted fields when editing accounts with transactions. Still need to finalize UI/UX and ensure consistency across multiple entities.
    * **Current Update:** Task B.2 (General Ledger / Journal Entries) is IN PROGRESS. Manual JE workflow now functional with Create, Edit, Post, Void, and Reverse operations working correctly. The current focus is on implementing/fixing the File Attachment functionality for journal entries (#7 - multi-file, drag-drop, list, download, delete). After this is complete, we will verify batch journal entry upload functionality.
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
        * **Audit Log Storage:** ✅ Implemented audit log functionality to `server/storage/auditLogStorage.ts`.
        * **Content Storage:** ✅ Implemented content storage for website content management to `server/storage/contentStorage.ts`.

* **Phase 4 (Website Content Management):** IN PROGRESS (As of 2025-04-06).
    * **✅ Completed Tasks:**
        * **Authentication Middleware:** ✅ Passport.js authentication middleware verified and fixed to correctly use req.user for authenticated user data.
        * **Homepage Content Schema:** ✅ Created and verified homepageContent schema in `shared/schema.ts`.
        * **Content Storage:** ✅ Implemented CRUD storage methods for homepage content in `server/storage/contentStorage.ts`.
        * **RESTful API Endpoints:** ✅ Created and verified API endpoints for content management in `server/routes/contentRoutes.ts`.
        * **Admin UI Component:** ✅ Developed AdminWebsiteContent.tsx component for managing website content with tabbed interface.
        * **Blog Integration:** ✅ Verified blog posts CRUD operations with authentication in `server/routes/blogRoutes.ts`.
        * **Admin Dashboard Integration:** ✅ Successfully integrated AdminWebsiteContent component into Dashboard.tsx while preserving existing blog management UI.
        * **UI/UX Enhancements:** ✅ Enhanced AdminWebsiteContent with improved responsive layouts, visual hierarchy, and better user interaction patterns.
        * **Blog Management UI:** ✅ Improved BlogContentManager with refined tabs, better filtering controls, search functionality, and enhanced subscriber management interface.
    
    * **📌 Current State:**
        * Admin Dashboard integration is complete with responsive designs across all device sizes.
        * Blog management functionality has been verified and enhanced with improved UI/UX.
        * Homepage content management is fully operational with responsive component designs.
        * Blog subscription form errors have been resolved, improving user experience.
        * Comprehensive verification documents have been created for ongoing quality assurance.
    
    * **🎯 Immediate Next Steps:**
        * Begin AI integration planning for automated blog content generation.
        * Begin implementing the accounting module, focusing on batch journal entry uploads.
        * Plan for analytics dashboard to track website content performance.

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
- 📝 Review UI/UX verification document for content management components.
- 📝 Focus on debugging and completing Journal Entry File Attachment functionality (#7).
- 📝 Begin AI integration planning for blog content generation.
- 📝 After Journal Entry File Attachments are complete, move to **Task B.3: Accounts Payable Backend Foundation** (Vendors, AP Bills Schema; Vendor CRUD Storage/API).

## 4. Overall Project Roadmap & Agent Tasks (Prioritized)

**Phase A: Stabilize Core Setup Flow (COMPLETED)**

* **(Task A.1)** ✅ Fix Final DB Save & Dashboard Update
* **(Task A.2)** ✅ Fix Stepper Initialization
* **(Task A.3)** ✅ Fix Industry Display
* **(Task A.4)** ✅ Fix State Loss on Back Navigation
* **(Task A.5)** ✅ Fix Step 1 Input Clearing
* **Additional Completed Tasks:**
    * ✅ Dashboard Client Actions: View Details, Edit Client, Deactivate Client.

**Phase B: Core Accounting Module (IN PROGRESS)**

* **(Task B.1)** Customizable Chart of Accounts (CoA): **NEARLY COMPLETE**
    * ✅ Design/Finalize hierarchical schema (`shared/schema.ts`)
    * ✅ Implement backend CRUD API (`server/accountRoutes.ts`, `/accounts/tree`)
    * ✅ Basic CRUD API Testing
    * ✅ Backend Hierarchy Implementation
    * ✅ Single Header Context Selector
    * ✅ Frontend Hierarchy UI (Display & Add/Edit Forms)
    * ✅ Explicitly fixed and verified CoA Import/Export functionality (CSV/Excel, update logic, `accountCode` refactor)
        * ✅ Fixed account selection detection for new, modified, and missing accounts
        * ✅ Added case sensitivity and whitespace validation checking during import
        * ✅ Fixed parent relationship validation with inactive parent detection
        * ✅ Improved toast notifications with categorized success/error messages
    * ✅ Fixed account update logic to allow name/active/parentId changes with transactions, while correctly blocking accountCode/type changes
    * ✅ Fixed UI to disable restricted fields (accountCode/type) when editing accounts with transactions
    * 🔄 Finalize UI/UX enhancements and document edge-case validations
    * 🔄 Ensure consistency and verify hierarchical CoA across multiple entities
    * ✅ Refactored Account storage logic to `server/storage/accountStorage.ts`.
* **(Task B.2)** General Ledger (GL) and Journal Entries (JE): **IN PROGRESS**
    * ✅ Design/Finalize JE schema (`shared/schema.ts`, reporting fields moved)
    * ✅ Implement backend CRUD API (`server/journalEntryRoutes.ts`, validation debit=credit)
    * ✅ Build frontend UI for manual JE creation (`client/src/features/journal-entries/components/JournalEntryForm.tsx`) - Verified via test page.
    * ✅ Manual JE workflow functional: 
        * ✅ Create (Draft & Direct Post for Admin)
        * ✅ Edit (Draft)
        * ✅ Post (from Draft/Approved)
        * ✅ Void (Admin only, requires reason)
        * ✅ Reverse (creates Draft, copies entityCode)
        * ✅ UI updates correctly with state changes
    * ✅ JE List display fixed (Totals, Reference, ID)
    * ✅ JE Form UI fixed (Buttons, Input stability, Number formatting)
    * ✅ JE Edit route fixed (/journal-entries/edit/:id no longer 404)
    * ✅ Refactored frontend components:
        * ✅ `JournalEntryForm.tsx` - Core form component with line item management
        * ✅ `JournalEntryDetail.tsx` - Page component handling data fetching, state management
    * 🔄 Implement/Fix File Attachment functionality (#7):
        * 🔄 Previous implementation failed user testing (multi-upload, list, download, delete, persistence all broken)
        * 🔄 Requirements: multi-file, drag-drop, delete, specific file types (PDF, images, office docs, txt, csv)
        * 🔄 UI location: Journal Entry Form (shown only in Edit mode)
        * 🔄 Need systematic debugging (backend save/list, frontend fetch/render)
    * 🔄 Finalize and verify batch journal entry upload functionality and UI
    * 🔄 Expand comprehensive automated testing covering all key edge cases
    * 🔄 Implement Automatic Accrual Reversal feature (deferred new request)
    * ✅ Refactored Journal Entry storage logic to `server/storage/journalEntryStorage.ts`.
    * **(AI Link - Future):** Consider hooks for "JE learning".
    * **✅ Date & Attachment Reliability Guards (2025-04-29)**  
      Added Cypress E2E test `cypress/e2e/journalEntry.spec.cy.ts` plus Jest unit tests for
      `dateUtils.ts` and `fileUtils.ts`.  These prevent regressions in
      • timezone-safe date handling, and  
      • multi-file attachment CRUD (upload / download / delete).  
      Test run script: `./run-tests.sh`.
* **(Task B.3)** Accounting Modules: **NOT STARTED**
    * 📝 **Next explicit priority after completion of B.1 and B.2:** Implement Accounts Payable (AP) backend foundation (Vendors, AP Bills Schema; Vendor CRUD Storage/API).
    * 📝 Implement Accounts Receivable (AR) module.
    * 📝 Implement other modules (Debt/Notes Payable, Inventory, Fixed Assets, Lease Accounting, Prepaid Expenses).
    * 📝 Ensure integration with CoA and GL.
    * 📝 Design/implement GAAP/IFRS financial statements with footnotes.

🔹 **Task B.4 – Dimensions & Smart Events (BACKLOG, SPECS READY)**  
   *Objective*: replicate Sage Intacct-style multi-dimensional tagging and
   event-driven automation without expanding the CoA.

   **Scope of MVP**

   1. **Dimensions Framework**  
      • Core tables (`dimensions`, `dimension_values`, `tx_dimension_link`).  
      • System dimensions: Department, Location, Class, Customer, Vendor,
        Employee, Project, Item.  
      • User-defined dimension creation UI (admin-only).  
      • Validation rules: required vs optional, active vs inactive.  

   2. **Smart Rules (validation layer)**  
      • JSON-based rule engine to block invalid dimension/GL combos.  
      • Example rule stub:  
        ```json
        { "account": "6000", "location": ["LON", "NYC"], "allow": false }
        ```

   3. **Smart Events (event layer)**  
      • Trigger types: `onCreate`, `onUpdate` for JE, AP, AR objects.  
      • Condition builder (simple expression parser).  
      • Actions: `email`, `fieldUpdate`, `webhook`.  
      • Async dispatcher queue (BullMQ).  

   4. **AI Hooks**  
      • Every Smart Event emits an **EventBridge** message (`ai.ingest.*`) so the
        ML service can learn patterns and surface anomalies in real-time.  

   **Exit Criteria**

   - Tag ≥ 90 % of new JE records with at least one dimension.  
   - Rule engine blocks invalid department-location pairs (unit tests).  
   - Example Smart Event: send Slack alert when `amount > $10k & location=INTL`.  
   - Cypress E2E: create JE → trigger event → verify webhook fired.

**Phase C: Website Content Management (NEARLY COMPLETE)**

* **(Task C.1)** ✅ Authentication & Backend: Authentication middleware verified and fixed, with proper user access control.
* **(Task C.2)** ✅ Content Schema & Storage: Homepage content schema and storage methods created and verified.
* **(Task C.3)** ✅ Admin UI Component: AdminWebsiteContent component developed with tabbed interface for content management.
* **(Task C.4)** ✅ Dashboard Integration: AdminWebsiteContent component integrated into Dashboard while preserving existing UI.
* **(Task C.5)** Blog Management & Integration:
    * ✅ Backend CRUD operations verified
    * ✅ Fixed homepage blog previews and "View Articles" link (Issue #6)
    * ✅ Resolved subscription form submission error (Issue #7)
    * ✅ Enhanced UI/UX for content management with responsive designs
    * ✅ Improved BlogContentManager with better tabs, filters, and search
* **(Task C.6)** AI Content Generation (PARTIALLY IMPLEMENTED):
    * ✅ Implemented chat assistance for website visitors with dynamic responses
    * 🔄 Plan integration of financial news feeds
    * 🔄 Design AI content draft generation process
    * 🔄 Create admin review workflow for AI-generated content

**Phase D: Reporting (Standard & Custom) & Data Collection**

* **(Task D.1)** Standard Reporting: Finalize/optimize backend logic (`consolidation-group-methods.ts`) for TB, IS, BS, CF reports. Build reliable frontend display components.
* **(Task D.2)** Custom Reporting:
    * Define backend API capabilities for fetching data with flexible filters.
    * Build a frontend UI for custom report building.
* **(Task D.3)** Data Collection and Analysis:
    * Implement data collection mechanisms.
    * Ensure anonymization, privacy policies, and user consent.
    * Design for AI/ML and forecasting.
    * Prioritize state-of-the-art, innovative, customer-focused, easy-to-use solutions.
    * Create a great design (trustworthy, trendy, fun).

**Phase E: API Integrations & Automation**

* **(Task E.1)** Implement Integrations: Connect to Plaid, Stripe, Gusto, Ramp/Concur etc.
* **(Task E.2)** Automate JE Creation: From fetched API data (AI assistance).
    * **(AI Assistance):** Explore Plaid, document analysis. Odoo/Sage Intacct inspiration.

**Phase F: AI/ML & Predictive Forecasting (PARTIALLY IMPLEMENTED)**

* **(Task F.1) ✅ Python Service Integration:** 
    * ✅ Implemented `python_service/ml_service.py` with:
        * ✅ Prophet for time-series forecasting
        * ✅ scikit-learn for predictive analytics and regression
        * ✅ Anomaly detection for financial data
        * ✅ XAI integration with Grok models
* **(Task F.2) 🔄 Predictive Forecasting/Analytics:** 
    * ✅ Core forecasting capabilities using Prophet
    * ✅ Regression analysis using scikit-learn
    * ✅ Anomaly detection for financial data
    * 🔄 Expand models for advanced financial forecasting
    * 🔄 Develop auto-categorization for transactions
* **(Task F.3) 🔄 Additional AI Features:**
    * ✅ Chat assistance for user queries implemented
    * 🔄 Improve NLP capabilities for financial queries
    * 🔄 Develop explainable AI insights for financial data

🔹 **Task F.4 – AI-Powered Ledger & Copilot (SPEC DRAFTED)**  
   - **Anomaly Detection Service**  
     • Online IsolationForest scoring for every posted JE.  
     • Flags surfaced in `AIInsightsWidget` ✔ (streaming channel already done).  

   - **Sage-style Copilot MVP**  
     • `/api/ai/qna` endpoint (LLM via OpenAI - gpt-4o3).  
     • Natural-language query → SQL translation layer (pgvector + RAG over schema docs).  

   - **Auto Reconciliation Pilot**  
     • Bank feed stub (Plaid sandbox) → auto-match to JE lines.  
     • Success metric: ≥ 80 % auto-match on sample data set.  

🔹 **Task F.5 – AP/AR Automation Enhancements**  
   - Invoice OCR ingestion micro-service (Tesseract + AWS Textract fallback).  
   - Rules-based approval flow re-using Smart Events engine (see B.4).  
   - Dunning scheduler integrated with EventBridge.

🔹 **Task F.6 – Real-Time Dashboards & ML Streaming KPIs**  
   - Pre-built widgets (cash burn, AR aging, anomaly counts).  
   - Drill-down to dimension-filtered transaction lists.

(All F.4-F.6 tasks rely on the Dimensions framework from Task B.4.)

**Phase G: Future Enhancements**

* **(Task G.1)** ✅ Implement Client Edit/Deactivate (Done).
* **(Task G.2)** Comprehensive Testing: Expand unit, integration, E2E tests.
* **(Task G.3)** Documentation: Update all technical and user documentation.
* **(Task G.4)** Deployment Prep: Finalize cloud configuration, CI/CD, monitoring.
* **(Task G.5)** AI-driven proactive website health monitoring and autonomous code updates.
* **(Task G.6)** XAI integration to enhance explainability and transparency in the accounting system.

**Phase H: Future-Proofing (Long Term)**

* **(Task H.1)** Explore Blockchain & IoT integrations.

## 5. General Guidelines for Agent

* **Prioritize:** Debug and complete JE File Attachment feature (#7), then focus on JE Batch Upload / Testing (Task B.2). After the JE module is stable, proceed with **Task B.3: Accounts Payable Backend Foundation**.
* **Dimensions-Aware Thinking**: when creating new tables, APIs, or tests,
  always ask "does this need dimension tags or Smart Event hooks?"  Add them
  early to avoid refactors.
* **Maintain Structure:** Keep the client-specific accounting design consistent. Follow established patterns (e.g., modular storage).
* **Test Thoroughly:** Ensure functionality works. Write/run automated tests (unit, integration, API).
* **Log When Needed:** Use `console.log("DEBUG Component: Action:", value)` for tracing complex logic.
* **Verify Incrementally:** Test each specific feature/fix thoroughly before moving on.
 * **Recommended verification command:** `node verify-storage-modules.js` should be run after each significant backend change.
* **Simplify:** Avoid unnecessary complexity. Focus on clean state management.
* **Ask for Clarification:** If unsure, ask before proceeding.
* **Design Considerations:** Prioritize state-of-the-art, innovative, customer-focused, easy-to-use design. Aim for trust, trendiness, and fun.
* **Data Strategy:** Keep data collection/strategy goals in mind during design.
* **Code Quality:** Write clean, well-organized, documented code. Follow linting/formatting rules.
* **Efficiency:** Prioritize efficient algorithms and data structures.
* **Error Handling:** Implement robust error catching and user-friendly messages.
* **Documentation:** Maintain clear documentation and code comments.

## 6. Code Quality & Cleanup Strategy

**Automated Linting and Formatting:**
* **Tools:** Use ESLint and Prettier via project configurations (`.eslintrc.js`, `.prettierrc.json`).
* **Agent Action:** Run linting/formatting commands periodically (e.g., `npx eslint . --fix`, `npx prettier . --write`) to fix issues automatically.

**Automated Unused Code/Dependency Detection:**
* **Tools:** Consider using tools like ts-prune or Knip to find unused exports, files, types, and dependencies.
* **Agent Action:** Run these tools periodically. Based on reports, remove identified unused items after reviewing for potential impacts.

**Manual Code Review:**
* **Agent Action:** On completion of major features or key milestones, conduct a code review focused on identifying code smells, duplicated code, and potential refactoring opportunities.

**Performance Profiling:**
* **Tools:** Use browser performance tools for frontend (especially Lighthouse); use Node.js profiling tools for backend.
* **Agent Action:** Identify and address performance bottlenecks, focusing on critical paths first.

**Documentation Quality:**
* **Agent Action:** Ensure comprehensive technical (code) and user documentation is created and maintained, with a focus on clarity and completeness.

**Regression Testing:**
* **Agent Action:** Implement a robust suite of automated tests for each critical system component, ensuring new changes don't break existing functionality.

**Specific Focus Areas:**
* **Storage Logic:** Further decompose remaining monolithic pieces.
* **API Layer:** Continue enhancing route organization and documentation.
* **Frontend State Management:** Identify and clean up redundant state.
* **TypeScript Type Safety:** Enhance type coverage, especially for API boundary interfaces.

## 7. Continuous Refactoring & Code Quality Requirements

Throughout every task explicitly:
* Refactor continuously from monolithic to modular/microservice architecture:
  * Clearly ensure each module handles single, explicit responsibilities.
  * Immediately extract logic from large files/functions into smaller, maintainable, explicitly named modules and services.
* Proactively search for and remove explicitly:
  * Duplicate implementations, particularly resulting from refactoring.
  * Outdated or unused code, especially from old testing, agent mistakes, or deprecated implementations.
  * Run tools like ts-prune or Knip periodically to clearly detect unused or outdated code explicitly:
    ```bash
    npx ts-prune
    npx knip
    ```
  * Explicitly review results and safely remove verified unnecessary code.

## 8. Immediate Verification Checklist (Explicitly Required)

* Onboarding explicitly matches simplified flow:
  * Client → Automatic Default Entity creation
* Industry dropdown lists explicitly aligned and consistent everywhere.
* Task B.1 import/export functionality explicitly fixed post-refactoring.
* Continuous refactoring explicitly evident in PRs/code changes.
* All new and existing modules clearly documented explicitly.
* Regular execution of unused code detection scripts (ts-prune, knip).

## 📚  Appendix – Dimensions & Smart Events Glossary

| Term | Definition |
|------|------------|
| **Dimension** | Categorical attribute (e.g., Department, Location) attached to any transaction for multi-axis reporting. |
| **Smart Rule** | Validation rule that restricts which dimension combinations are allowed on specific GL accounts. |
| **Smart Event** | No-code automation: *Trigger* + *Condition* + *Action* (email, webhook, field update). |
| **AI EventBridge** | Internal pub/sub topic (`ai.ingest.*`) that streams Smart Event payloads to the ML service for continual learning. |
| **Copilot** | Chat-style assistant that answers NL questions and triggers tasks inside the app. |
| **Anomaly Score** | 0-1 value generated by IsolationForest; > 0.8 surfaces as a high-risk flag in the UI. |

(Keep this glossary alphabetised as new terms emerge.)
