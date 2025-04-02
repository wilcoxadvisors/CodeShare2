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
* **Data Strategy:** Implement data collection mechanisms to enable selling data and creating valuable reports for investors and economists. Ensure robust anonymization, transparent privacy policies, and explicit user consent are in place. Design the system to maximize data availability for AI/ML and forecasting.
* **ERP Evolution:** The long-term goal is to expand the feature set so the platform can be sold and used as a standalone ERP system directly by client finance teams [cite: uploaded:gemini 3-27.docx].
* **Future-Proofing:** Considerations for Blockchain audits and IoT expense tracking are planned for later phases [cite: uploaded:Outline for Accounting System Integration.docx, uploaded:Business Plan.docx].

## 3. Current Development Status

* **Phase 1 (Stabilization & Migration):** COMPLETE. Database migration (junction table for consolidation groups) is finished. Backend logic updated. Code cleanup done.
* **Phase 2 (Guided Setup Flow):** COMPLETED. The 3-step "Add Client" modal flow (`SetupStepper.tsx` + Cards) accessed via `Dashboard.tsx` is now stable.
    * **Update:** All critical setup flow bugs have been fixed (Checkpoints through `f0cc5d4f`), including state management, navigation, and database persistence issues.
* **Phase 3 (Core Accounting Features):** IN PROGRESS.
    * **Current Update:** Task B.1 (Chart of Accounts) is now **COMPLETE**. This includes implementation of client-specific hierarchical CoA, backend/frontend management, `code` -> `accountCode` refactoring, import/export functionality (CSV/Excel) with fixes for update logic and UI improvements, resolution of display bugs, and successful verification. Schema refactoring was performed to move reporting fields (`fsliBucket`, `internalReportingBucket`, `item`) from `accounts` to `journalEntryLines`. Focus now shifts to implementing Journal Entry functionality (Task B.2).

## 4. Overall Project Roadmap & Agent Tasks (Prioritized)

**Phase A: Stabilize Core Setup Flow (COMPLETED)**

* **(Task A.1)** ✅ **Fix Final DB Save & Dashboard Update:** Successfully debugged and fixed the `handleCompleteSetup` API calls in `SetupStepper.tsx`. Data now correctly saves to the database and dashboard updates.
* **(Task A.2)** ✅ **Fix Stepper Initialization:** `SetupStepper.tsx` now reliably initializes at Step 0 and properly clears state for new setup flows.
* **(Task A.3)** ✅ **Fix Industry Display:** Fixed data capture, saving, and display of industry field throughout the setup flow.
* **(Task A.4)** ✅ **Fix State Loss on Back Navigation:** Fixed state persistence in `SetupStepper` during navigation between steps.
* **(Task A.5)** ✅ **Fix Step 1 Input Clearing:** Resolved issues with input fields in `ClientSetupCard` clearing during typing.
* **Additional Completed Tasks:**
    * ✅ **Dashboard Client Actions:** Implemented View Details, Edit Client with Entity Management, and client deactivation via Edit Form.

**Phase B: Core Accounting Module (IN PROGRESS)**

* **(Task B.1)** **Customizable Chart of Accounts (CoA): COMPLETE**
    * ✅ Design/Finalize hierarchical schema (`shared/schema.ts`) - Complete with client-specific account linking
    * ✅ Implement backend CRUD API (`server/accountRoutes.ts`) - Complete with `/accounts/tree` endpoint for hierarchy
    * ✅ Basic CRUD API Testing - Complete with client-specific tests
    * ✅ Backend Hierarchy Implementation - Complete with parent-child relationship
    * ✅ Single Header Context Selector - Complete with combined client/entity dropdown
    * ✅ Frontend Hierarchy UI - Completed parent selection form and hierarchical tree display
    * ✅ CoA Import/Export functionality - Implemented and verified CSV/Excel import/export, including fixes for update logic and `accountCode` refactoring
    * ✅ Fixed CoA Import Deletion Logic - Proper handling of parent-child relationships (inactive marking)
    * ✅ Enhanced CoA Import UI - Simplified the import workflow by removing unnecessary options and fixing the cancel functionality
    * ✅ CoA Automated Testing - Comprehensive test suite created and verified for import/export API
* **(Task B.2)** **General Ledger (GL) and Journal Entries (JE):**
    * ✅ Design/Finalize JE schema (`shared/schema.ts`, linking to CoA) - Completed during schema refactor. Includes `fsliBucket`, `internalReportingBucket`, `item` fields moved from `accounts`.
    * 📝 **Next:** Implement backend CRUD API (`server/journalEntryRoutes.ts`), including validation (debits=credits).
    * 📝 Build frontend UI for manual JE creation (`ManualJournalEntry.tsx`).
    * 📝 Implement logic for processing batch JE uploads (from parsed CSV/JSON provided by user).
    * **(AI Link - Future):** Consider hooks for "JE learning" - suggesting entries based on historical data (requires AI module).
* **(Task B.3)** **Accounting Modules:**
    * Implement core accounting modules: Accounts Receivable (AR), Accounts Payable (AP), Debt/Notes Payable, Inventory Management, Fixed Assets, Lease Accounting (including ASC 842 compliance), and Prepaid Expenses.
    * Ensure these modules integrate with the Chart of Accounts and General Ledger.
    * Design and implement GAAP/IFRS compliant financial statements with footnotes.

**Phase C: Reporting (Standard & Custom) & Data Collection**

* **(Task C.1)** **Standard Reporting:** Finalize/optimize backend logic (`consolidation-group-methods.ts`) for TB, IS, BS, CF reports. Build reliable frontend display components.
* **(Task C.2)** **Custom Reporting:**

    * Define backend API capabilities for fetching data with flexible filters (dates, entities, accounts, custom tags).
    * Build a frontend UI allowing users to select fields, apply filters, and save custom report layouts.
* **(Task C.3)** **Data Collection and Analysis:**

    * Implement data collection mechanisms to gather user data for analysis and potential sale.
    * Ensure robust anonymization, transparent privacy policies, and explicit user consent are in place.
    * Design the system to support AI/ML and predictive forecasting, leveraging user data and external sources for advanced analytics.
    * Prioritize state-of-the-art, innovative, customer-focused, and easy-to-use solutions.
    * Create a great design that influences emotions such as trust, and is trendy and fun.

**Phase D: API Integrations & Automation**

* **(Task D.1)** **Implement Integrations:** Connect to Plaid, Stripe, Gusto, Ramp/Concur etc., storing credentials securely [cite: uploaded:Outline for Accounting System Integration.docx].
* **(Task D.2)** **Automate JE Creation:** Implement logic to automatically generate Journal Entries from fetched API data (bank transactions, payroll runs, invoices, expenses), mapping them to the CoA (potentially with AI assistance for categorization).
    * **(AI Assistance):** Explore using Plaid for automated Journal Entry creation (with review) and document analysis to aid in coding. Draw inspiration from Odoo and Sage Intacct for efficient workflows.

**Phase E: AI/ML & Predictive Forecasting**

* **(Task E.1)** **Verify Python Service Integration:** Ensure `python_service/ml_service.py` has secure, reliable read/write access to relevant PostgreSQL tables (GL, JE, Budgets, Forecasts) using env variables. Document permissions.
* **(Task E.2)** **Implement AI/ML and Predictive Forecasting:**
    * Integrate AI/ML models and techniques for predictive forecasting, transaction auto-categorization, anomaly detection, and NLP queries.
    * Ensure AI/ML is inclusive of every aspect of the accounting system.
    * Design and implement advanced analytics features.
    * Prioritize state-of-the-art, innovative, customer-focused, and easy-to-use AI/ML solutions.
    * Strive for a great design that influences emotions such as trust, and is trendy and fun.
* **(Task E.3)** **Implement Other AI Features:** Build out transaction auto-categorization, anomaly detection, and NLP query capabilities as planned [cite: uploaded:Outline for Accounting System Integration.docx], [cite: uploaded:Accounting System Implementation Plan.docx].

**Phase F: Deferred Features & Final Polish**

* **(Task F.1)** ✅ **Implement Client Edit/Deactivate:** Added UI controls and backend logic for client management on the main `Dashboard.tsx` client list, including View Details, Edit, and Deactivate functionality.
* **(Task F.2)** Fix "Use Client Data" Button (Bug 6).
* **(Task F.3)** Comprehensive Testing: Expand unit, integration, and E2E tests.
* **(Task F.4)** Documentation: Update all technical and user documentation.
* **(Task F.5)** Deployment Prep: Finalize cloud configuration, CI/CD, monitoring.

**Phase G: Future-Proofing (Long Term)**

* **(Task G.1)** Explore Blockchain & IoT integrations [cite: uploaded:Outline for Accounting System Integration.docx], [cite: uploaded:Business Plan.docx].

## 5. General Guidelines for Agent

* **Prioritize:** Focus on implementing the Journal Entries backend API and storage logic (Task B.2), now that the Chart of Accounts implementation is complete and verified.
* **Maintain Structure:** Keep the client-specific accounting design consistent across features.
* **Test Thoroughly:** Ensure all functionality works with the new combined client-entity context selector.
* **Log When Needed:** Use `console.log("DEBUG Component: Action:", value)` for tracing complex logic.
* **Verify Incrementally:** Test each specific feature thoroughly before moving to the next.
* **Simplify:** Avoid unnecessary complexity. Focus on clean state management.
* **Ask for Clarification:** If unsure, ask before proceeding.
* **Design Considerations:** Prioritize state-of-the-art, innovative, customer-focused, and easy-to-use design in every aspect of the system. Strive for a great design that influences emotions such as trust, and is trendy and fun.
* **Data Strategy:** Implement data collection mechanisms to enable selling data and creating valuable reports for investors and economists. Ensure robust anonymization, transparent privacy policies, and explicit user consent are in place. Design the system to maximize data availability for AI/ML and forecasting.
* **Code Quality:** Write clean, well-organized, and well-documented code to avoid confusion and ensure maintainability.
* **Efficiency:** Prioritize efficient algorithms and data structures for optimal performance.
* **Testing:** Implement comprehensive automated test scripts to ensure functionality and prevent regressions.
* **Error Handling:** Implement robust error catching and user-friendly error messages for both users and administrators.
* **Documentation:** Maintain great documentation, including clear file and directory organization, so human coders and AI can easily understand the codebase and its functionality.