# Wilcox Advisors Accounting Platform: Official Project Blueprint & Roadmap
**Version:** 2.1
**Last Updated:** June 26, 2025
**Lead Architect:** Gemini

## 1. Executive Summary & Current Mission

### 1.1. High-Level Goal
Build a best-in-class, scalable SaaS accounting platform that combines rock-solid financial integrity with a state-of-the-art, AI-enhanced user experience, drawing inspiration from the architectural principles of platforms like Odoo and Sage Intacct.

### 1.2. CURRENT MISSION
**Phase 2, Mission 2.1: Build the Main "Smart Import" Wizard Component**
-   **Objective:** To begin the frontend development of the "Smart Import" feature by creating the main parent component that will manage the state of the multi-step workflow.
-   **File to Create:** `client/src/features/journal-entries/pages/BatchImportWizard.tsx`
-   **Status:** Awaiting detailed instructions from the Architect.

## 2. Strategic Roadmap
This roadmap outlines the major development phases.

-   **`[COMPLETED]` Phase A: Stabilize Core Setup Flow**
-   **`[COMPLETED]` Phase B: Core Accounting Features (Manual JE Workflow)**
-   **`[ACTIVE]` Phase C: Smart Import & Master Data Management**
-   **`[UP NEXT]` Phase D: Reporting & Business Intelligence**
-   **`[PLANNED]` Phase E: AI/ML Model Implementation & Integration**
-   **`[PLANNED]` Phase F: AP/AR & Expanded Modules**

## 3. Architectural Blueprint: Batch Journal Entry "Smart Import"
This section details the approved architecture for the "Smart Import" feature.

### 3.1. The User Workflow
A guided, wizard-style workflow:
1.  **Choose Mode:** User selects "Standard Batch" (single date) or "Historical GL Import" (multi-date).
2.  **Configure & Download:** User configures batch-level settings (description, common attachments, accrual status) in a UI form and downloads the corresponding "Smart Template".
3.  **Upload & Analyze:** User uploads the completed file. The backend intelligently parses and validates the data.
4.  **Review & Reconcile:** User is presented with a powerful interactive UI to review, correct errors, approve new dimension values, and reject specific entries.
5.  **Confirm & Process:** User gives final confirmation to import the validated data.

### 3.2. The "Smart Template" (Excel)
A simple template with one data entry tab and two read-only reference tabs (`ChartOfAccountsKey`, `DimensionsKey`).
-   **`JournalEntryLines` Tab:** Contains columns for `AccountCode`, `Amount` (positive/debit, negative/credit), `Description`, an optional `Date` (for historical mode), and dynamically generated columns for each of the client's Dimensions (e.g., `Department`, `Project`).

### 3.3. The Backend Engine
-   **Intelligent Parser:** Employs a **zero-balance grouping algorithm**.
-   **Validation Service:** Uses a high-performance **in-memory hashmap** strategy for validation.
-   **AI Assistance Service:** Provides a non-blocking "copilot" to analyze descriptions and amounts to suggest corrections and flag anomalies.

---

# Agent Instructions: Wilcox Advisors Accounting System (Comprehensive Roadmap)

## Recent Changelog:
- **2025-06-17**: Critical Documentation Inconsistencies Resolved. Fixed conflicting status reports for Dimensions module (corrected from "COMPLETE" to "IN PROGRESS") and File Attachment Bug #7 (moved from "RESOLVED" to "CRITICAL PRIORITY"). Added Journal Entry Editing Workflow Definitive Fix Plan with three-part mission tracking.
- **2025-06-14**: Automatic Accrual Reversal Feature Complete & Core Fixes. Implemented industry-standard immediate-posting for accrual reversals. Corrected Journal ID generation to be scalable and fixed critical data persistence and UI state bugs.
- **2025-06-11**: Accrual Reversal Feature Specified. Added plan for auto-reversing journal entries.
- **2025-06-11**: JE Module Stabilized & Dimensions Backend Complete. Backend foundation for Dimensions (Schema, Seeding, Storage, API) complete. Initial frontend UI for listing and creating Dimensions complete. Note: Critical attachment issues still require resolution.
- **2025-05-06**: Quick-cleanup complete (removed throw-away files; moved stray tests → tests/unit; moved verify-storage-modules.js → scripts)
- **2025-05-06**: Hierarchical JE attachment routes implemented (Bug #7 in progress)
- **2025-05-01**: Clarified Dimensions framework (B.2.1) must precede Batch JE Upload; added detailed Entitlements design schema
- **2025-04-29**: Added Date & Attachment Reliability Guards; documented multi-file attachment CRUD test coverage

## 5. Historical Documentation: Project Overview & Goal

- **Project:** Wilcox Advisors Accounting System
- **High-Level Goal:** Build a best-in-class, scalable SaaS accounting platform, inspired by Odoo's open-source backend logic where applicable.
- **Phased Approach:** Manual First -> API Automation -> AI/ML Enhancements -> Full Automation & ERP Features.
- **Target Audience:** Small, medium, and large businesses.
- **Infrastructure Strategy:** Infrastructure explicitly selected for scalability, affordability, and state-of-the-art AI/ML integration aligned with Wilcox Advisors' aggressive growth and forecasting-heavy data strategy.
- **Tech Stack (Explicitly Updated for Optimized Performance and Scalability):**
  - **Frontend**: React (Vite, TypeScript, TanStack Query, Shadcn UI, recharts)
  - **Backend**: Node.js (Express, TypeScript), BullMQ (Job Queue)
  - **Database**: CockroachDB Serverless
  - **Cloud Storage**: Backblaze B2
  - **Hosting**: Vercel Pro
  - **AI/ML Compute**: GCP Preemptible VMs
  - **AI/ML Frameworks**: Spark MLlib (forecasting), Dask (distributed preprocessing), XGBoost (ML models), Prophet (optional supplementary forecasting)
  - **Explainability (XAI)**: SHAP library, x.ai (Grok API) for advanced insights
  - **Compliance/Security**: JWT, MFA, TLS encryption, audit trails, future Blockchain integration
  - **Testing Framework**: Jest, Cypress
- **Code Location:** `CodeShare/` folder.
- **Reference Docs:** (Note: Original references were to uploaded files - Business Plan.docx, Outline for Accounting System Integration.docx, etc. These are conceptual references based on past context.)

## 1.1 Onboarding Flow (Explicitly Updated)

The onboarding workflow is simplified to explicitly include only:

- Client Setup
  - Collect: Name, Legal Name, Address, Tax Info, Industry, Contacts
- Default Entity Creation
  - Automatically created after successful Client creation.
  - Uses explicitly the Client's Name and Industry as defaults.

Note:

- Historical Data, Consolidation Group, and Chart of Accounts (CoA) setups are explicitly excluded from onboarding.
- Historical data will be explicitly handled through the Journal Entry batch upload module.

## 1.2 Industry Dropdown Alignment & Consistency

- Maintain industry dropdown lists explicitly from a single source of truth at: `client/src/lib/industryUtils.ts`
- Explicitly ensure ALL components (ClientSetupCard.tsx, EntityManagementCard.tsx, EntityForm.tsx, ClientOnboardingForm.tsx, etc.) import and utilize this centralized source.
- Immediately remove duplicate implementations of utility functions like ensureIndustryValue explicitly from individual components.

## 6. Historical Documentation: Business Model & Vision

- **Revenue:** Tiered SaaS subscriptions (Basic/Pro/Enterprise) + Add-ons + Implementation Fees. Aggressive growth targets ($10M revenue/2k clients by Year 5).
- **Automation Goal:** Progressively automate accounting and finance processes, moving from manual input to API-driven workflows enhanced by AI/ML.
- **Data Strategy:** Implement data collection mechanisms to enable selling data and creating valuable reports for investors and economists. Ensure robust anonymization, transparent privacy policies, and explicit user consent are in place. Design the system to maximize data availability for AI/ML and forecasting.
- **ERP Evolution:** The long-term goal is to expand the feature set so the platform can be sold and used as a standalone ERP system directly by client finance teams.
- **Future-Proofing:** Considerations for Blockchain audits and IoT expense tracking are planned for later phases.

### Entitlements-by-Plan + Role-Based Access Control (RBAC) _(Implementation Priority after Dimensions)_

| Layer                                                       | Purpose                                                                         |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Plan** (Basic / Pro / Enterprise)                         | Enables or disables big feature groups (e.g., Batch JE Upload, Custom Reports). |
| **Service Style** (Self / Assisted / Outsourced)            | Governs how much work the client vs. Wilcox staff perform.                      |
| **Role** (Client Staff, Reviewer, Wilcox Accountant, Admin) | Fine-grained permissions within a plan & service style.                         |

**Data Schema** (in `shared/schema.ts`):

```ts
export const plans = pgTable('plans', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const features = pgTable('features', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category').notNull(),
  isActive: boolean('is_active').notNull().default(true)
});

export const entitlements = pgTable('entitlements', {
  id: serial('id').primaryKey(),
  planId: integer('plan_id').references(() => plans.id).notNull(),
  featureId: integer('feature_id').references(() => features.id).notNull(),
  isEnabled: boolean('is_enabled').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  isSystem: boolean('is_system').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true)
});

export const permissions = pgTable('permissions', {
  id: serial('id').primaryKey(),
  roleId: integer('role_id').references(() => roles.id).notNull(),
  featureId: integer('feature_id').references(() => features.id).notNull(),
  accessLevel: text('access_level').notNull(), // 'none', 'read', 'write', 'admin'
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});
```

**Implementation Plan**:

1. First implement Dimensions framework (Task B.2.1)
2. Then implement Entitlements & RBAC:
   - Create seed data for plans, features, roles
   - Implement permission checks in API routes
   - Build admin UI for managing entitlements
   - Add client plan selection to onboarding
3. Future enhancement: custom role creation

**Middleware Helper**:

```ts
import { can } from "@/server/authz/entitlements";
// Example:
if (!can(user, "je:batchUpload")) return res.status(403);
```

Status: Architecture approved, development scheduled for a post-MVP phase (Phase G / H). No code required now, but new features should be designed service-style-agnostic to avoid refactors.

## 2.1 Explicit AI/ML Technology Rationale:

- Explicit choice of Spark MLlib, Dask, and XGBoost ensures scalable, efficient processing for large-scale forecasting (1TB+ datasets).
- Utilization of SHAP and x.ai Grok API explicitly selected for transparent explainability and interpretability.
- Infrastructure (CockroachDB, Backblaze, GCP Preemptible VMs) explicitly optimized for minimal operational costs without compromising performance or scalability.

## 7. Historical Documentation: Detailed Development Status

- **Phase 1 (Stabilization & Migration):** COMPLETE. Database migration (junction table for consolidation groups) is finished. Backend logic updated. Code cleanup done.
  - **Recent Fix:** ✅ **Fixed server crash during migrations by correcting the conditional check in `add-soft-deletion-and-audit-logs.ts` that was causing premature process termination.**
- **Phase 2 (Guided Setup Flow):** COMPLETED. The 3-step "Add Client" modal flow (`SetupStepper.tsx` + Cards) accessed via `Dashboard.tsx` is now stable.
  - **Update:** All critical setup flow bugs have been fixed (Checkpoints through `f0cc5d4f`), including state management, navigation, and database persistence issues.
- **Phase 3 (Core Accounting Features):** 🔄 IN PROGRESS.

  - **Current Update:** Task B.1 (Chart of Accounts): ✅ NEARLY COMPLETE. Final UI/UX review remains.
  - **Current Update:** Task B.2 (General Ledger / Journal Entries): ✅ STABLE. The manual JE workflow, including Create, Edit, Post, Void, Reverse, and Delete, is now functional. The next planned enhancement is the Auto-Reversing Accrual feature.
  - **Current Update:** Task B.2.1 (Dimensions & Smart Rules): 🔄 IN PROGRESS. Backend foundation complete, frontend UI for listing/creating dimensions complete. Next: Build UI to add/edit/deactivate dimension values and integrate tagging into Journal Entry form.
  - **Storage Layer Refactoring:** COMPLETE. The monolithic storage system has been successfully refactored:
    - **Client Storage:** ✅ Successfully refactored all client-related storage logic to `server/storage/clientStorage.ts`.
    - **Entity Storage:** ✅ Created `entityStorage.ts` module with clear delegation pattern.
      - ✅ Verified no entity logic remains directly in `storage.ts`.
      - ✅ Implemented interfaces (`IEntityStorage`) with clear CRUD methods.
      - ✅ Updated `DatabaseStorage` and `MemStorage` to delegate correctly.
      - ✅ Documented `entityStorage.ts` thoroughly.
    - **Account Storage:** ✅ Refactored all account-related storage logic to `server/storage/accountStorage.ts`.
    - **Journal Entry Storage:** ✅ Refactored all journal entry logic to `server/storage/journalEntryStorage.ts`.
    - **Consolidation Storage:** ✅ Refactored consolidation group logic to `server/storage/consolidationStorage.ts`.
    - **User Storage:** ✅ Refactored user-related logic to `server/storage/userStorage.ts`.
    - **Budget Storage:** ✅ Refactored budget-related logic to `server/storage/budgetStorage.ts`.
    - **Form Storage:** ✅ Refactored form-related logic to `server/storage/formStorage.ts`.
    - **Asset Storage:** ✅ Refactored fixed asset logic to `server/storage/assetStorage.ts`.
    - **Report Storage:** ✅ Refactored reporting logic to `server/storage/reportStorage.ts`.
    - **User Activity Storage:** ✅ Refactored user activity tracking to `server/storage/userActivityStorage.ts`.
    - **Audit Log Storage:** ✅ Implemented audit log functionality to `server/storage/auditLogStorage.ts`.
    - **Content Storage:** ✅ Implemented content storage for website content management to `server/storage/contentStorage.ts`.
    - **Dimension Storage:** ✅ Implemented comprehensive dimension and dimension value storage with client isolation and bulk management capabilities to `server/storage/dimensionStorage.ts`.

- **Phase 4 (Website Content Management):** IN PROGRESS (As of 2025-04-06).
  - **✅ Completed Tasks:**
    - **Authentication Middleware:** ✅ Passport.js authentication middleware verified and fixed to correctly use req.user for authenticated user data.
    - **Homepage Content Schema:** ✅ Created and verified homepageContent schema in `shared/schema.ts`.
    - **Content Storage:** ✅ Implemented CRUD storage methods for homepage content in `server/storage/contentStorage.ts`.
    - **RESTful API Endpoints:** ✅ Created and verified API endpoints for content management in `server/routes/contentRoutes.ts`.
    - **Admin UI Component:** ✅ Developed AdminWebsiteContent.tsx component for managing website content with tabbed interface.
    - **Blog Integration:** ✅ Verified blog posts CRUD operations with authentication in `server/routes/blogRoutes.ts`.
    - **Admin Dashboard Integration:** ✅ Successfully integrated AdminWebsiteContent component into Dashboard.tsx while preserving existing blog management UI.
    - **UI/UX Enhancements:** ✅ Enhanced AdminWebsiteContent with improved responsive layouts, visual hierarchy, and better user interaction patterns.
    - **Blog Management UI:** ✅ Improved BlogContentManager with refined tabs, better filtering controls, search functionality, and enhanced subscriber management interface.
  - **📌 Current State:**
    - Admin Dashboard integration is complete with responsive designs across all device sizes.
    - Blog management functionality has been verified and enhanced with improved UI/UX.
    - Homepage content management is fully operational with responsive component designs.
    - Blog subscription form errors have been resolved, improving user experience.
    - Comprehensive verification documents have been created for ongoing quality assurance.
  - **🎯 Immediate Next Steps:**
    - Begin AI integration planning for automated blog content generation.
    - Begin implementing the accounting module, focusing first on file attachments, then Dimensions & Smart Rules (B.2.1), and finally batch journal entry uploads.
    - Plan for analytics dashboard to track website content performance.

## Dimensions Module - Status: IN PROGRESS

The Dimensions module has solid backend foundation with partial frontend implementation.

### Completed Features:

**Backend Foundation:**
- Database schema implemented with client-level master-data tables (dimensions, dimension_values, tx_dimension_link)
- System dimensions seeded: Department, Location, Customer, etc.
- Complete backend Storage Layer and API routes for CRUD operations
- Dimension storage module with client isolation and bulk management capabilities

**Initial Frontend UI:**
- Basic UI for listing existing dimensions and creating new ones
- Foundation for dimension management interface

### Remaining Work:

**Critical Missing Features:**
- UI to add/edit/deactivate values for each dimension (e.g., add "Sales" to the "Department" dimension)
- Integration of dimension tagging into the Journal Entry form
- "Manage Values" dialog functionality
- COA-style Master Bulk Management features
- Template download and upload with preview functionality

**Data Integrity and Security:**
- A critical cross-client data contamination issue was discovered and fully resolved.
- The database has been hardened with new triggers and constraints to enforce strict client data isolation, preventing this category of bugs from occurring in the future.

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

1. Finish Journal-Entry Attachment bug #7 (hierarchical routes + Cypress spec)
2. Dimensions & Smart Rules (Task B.2.1)
3. Batch Journal-Entry Upload v2 (depends on Dimensions)

- 📝 Review UI/UX verification document for content management components.
- 📝 Begin AI integration planning for blog content generation.
- 📝 After the Journal Entry feature set is complete, move to **Task B.3: Accounts Payable Backend Foundation** (Vendors, AP Bills Schema; Vendor CRUD Storage/API).

## 8. Historical Documentation: Detailed Task List

### Phase A: Stabilize Core Setup Flow (COMPLETED)

- **(Task A.1)** ✅ Fix Final DB Save & Dashboard Update
- **(Task A.2)** ✅ Fix Stepper Initialization
- **(Task A.3)** ✅ Fix Industry Display
- **(Task A.4)** ✅ Fix State Loss on Back Navigation
- **(Task A.5)** ✅ Fix Step 1 Input Clearing
- **Additional Completed Tasks:**
  - ✅ Dashboard Client Actions: View Details, Edit Client, Deactivate Client.

### Phase B: Core Accounting Module (IN PROGRESS)

#### UI / Navigation

**Client Portal Tabs**

- Dashboard
- Journal Entries
- Reports
- **Dimensions** – global per-client master data (Admin = CRUD, Staff = read-only)
- Smart Rules _(validation builder – future)_
- Smart Events _(automation builder – future)_

* **(Task B.1)** Customizable Chart of Accounts (CoA): **NEARLY COMPLETE**
  - ✅ Design/Finalize hierarchical schema (`shared/schema.ts`)
  - ✅ Implement backend CRUD API (`server/accountRoutes.ts`, `/accounts/tree`)
  - ✅ Basic CRUD API Testing
  - ✅ Backend Hierarchy Implementation
  - ✅ Single Header Context Selector
  - ✅ Frontend Hierarchy UI (Display & Add/Edit Forms)
  - ✅ Explicitly fixed and verified CoA Import/Export functionality (CSV/Excel, update logic, `accountCode` refactor)
    - ✅ Fixed account selection detection for new, modified, and missing accounts
    - ✅ Added case sensitivity and whitespace validation checking during import
    - ✅ Fixed parent relationship validation with inactive parent detection
    - ✅ Improved toast notifications with categorized success/error messages
  - ✅ Fixed account update logic to allow name/active/parentId changes with transactions, while correctly blocking accountCode/type changes
  - ✅ Fixed UI to disable restricted fields (accountCode/type) when editing accounts with transactions
  - 🔄 Finalize UI/UX enhancements and document edge-case validations
  - 🔄 Ensure consistency and verify hierarchical CoA across multiple entities
  - ✅ Refactored Account storage logic to `server/storage/accountStorage.ts`.
* **(Task B.2)** General Ledger (GL) and Journal Entries (JE): **✅ STABLE**
  - ✅ Design/Finalize JE schema (`shared/schema.ts`, reporting fields moved)
  - ✅ Implement backend CRUD API (`server/journalEntryRoutes.ts`, validation debit=credit)
  - ✅ Build frontend UI for manual JE creation (`client/src/features/journal-entries/components/JournalEntryForm.tsx`) - Verified via test page.
  - ✅ Manual JE workflow functional:
    - ✅ Create (Draft & Direct Post for Admin)
    - ✅ Edit (Draft)
    - ✅ Post (from Draft/Approved)
    - ✅ Void (Admin only, requires reason)
  - ✅ Reverse (creates Draft, copies entityCode)
  - ✅ UI updates correctly with state changes
  - ✅ JE List display fixed (Totals, Reference, ID)
  - ✅ JE Form UI fixed (Buttons, Input stability, Number formatting)
  - ✅ JE Edit route fixed (/journal-entries/edit/:id no longer 404)
  - ✅ Refactored frontend components:
    - ✅ `JournalEntryForm.tsx` - Core form component with line item management
    - ✅ `JournalEntryDetail.tsx` - Page component handling data fetching, state management
  - **✅ COMPLETED: Fix File Attachment functionality (#7):**
    - 🔄 Previous implementation failed user testing (multi-upload, list, download, delete, persistence all broken)
    - 🔄 Requirements: multi-file, drag-drop, delete, specific file types (PDF, images, office docs, txt, csv)
    - 🔄 UI location: Journal Entry Form (shown only in Edit mode)
    - 🔄 Need systematic debugging (backend save/list, frontend fetch/render)
* **(Task B.2.1)** Dimensions & Smart Rules: **🔄 IN PROGRESS (Current Focus)**
  - ✅ Create client-level master-data tables in `shared/schema.ts` (dimensions, dimension_values, tx_dimension_link).
  - ✅ Seed system dimensions: Department, Location, Customer, etc.
  - ✅ Build backend Storage Layer and API routes for CRUD operations.
  - ✅ Build initial frontend UI to list existing dimensions and create new ones.
  - 🔄 NEXT: Build UI to add/edit/deactivate values for each dimension (e.g., add "Sales" to the "Department" dimension).
  - 🔄 Integrate Dimensions into the Journal Entry form, allowing each line to be tagged.
  - 🔄 Implement a Smart Rules MVP (JSON validation).

* **(Task B.2.2)** Automatic Accrual Reversals: **✅ COMPLETE**
  
  ✅ COMPLETE. Implemented using an industry-standard, immediate-posting method. When a user posts an entry flagged as an accrual with a future reversal date, the system instantly creates and posts the corresponding reversal entry with that future date. This approach is simpler and more robust than a background scheduler. The frontend UI includes a switch and a date picker with correct timezone and date-validation logic.

  - Build **Client Portal read-only Dimensions tab** for reference
  - Implement a **Smart Rules MVP** (JSON validation):
    - Required dimensions by account type
    - Dimension-value constraints by account
    - Validation hooks that plug into existing JE validator
  - Implementation sequence:
    1. ✅ Fix File Attachments (Bug #7) - first priority
    2. 🔄 Complete Dimensions & Smart Rules (B.2.1) - second priority
    3. 🔄 Implement Batch JE Upload - third priority (depends on Dimensions)
  - 🔄 Expand comprehensive automated testing covering all key edge cases
  - 🔄 Implement Automatic Accrual Reversal feature (deferred new request)
  - ✅ Refactored Journal Entry storage logic to `server/storage/journalEntryStorage.ts`.
  - **(AI Link - Future):** Consider hooks for "JE learning".
  - **✅ Date & Attachment Reliability Guards (2025-04-29)**  
    Added Cypress E2E test `cypress/e2e/journalEntry.spec.cy.ts` plus Jest unit tests for
    `dateUtils.ts` and `fileUtils.ts`. These prevent regressions in
    • timezone-safe date handling, and  
    • multi-file attachment CRUD (upload / download / delete).  
    Test run script: `./run-tests.sh`.

### 🚀 Post-MVP JE Enhancement Directions (Prioritized)

Once the File-Attachment bug (#7) is fixed and Dimensions framework (Task B.2.1) is ready:

1. **Batch Journal-Entry Upload**

   - Endpoint: `POST /api/journal-entries/batch`
   - **Accepts:** CSV/XLSX files
   - **Validations:**
     - Debit equals Credit per journal entry
     - Smart Rules and Dimension Tags compliance
   - **Responses:**
     - `200`: All entries processed successfully
     - `207`: Partial success, with detailed row-level error payload:
       ```json
       {
         "errors": [
           { "row": 4, "error": "Debit and Credit mismatch" },
           { "row": 9, "error": "Invalid dimension tag: Location" }
         ]
       }
       ```
     - `400`: Malformed request or invalid file format

2. **Attachment Re-use**

   - Consolidate drag-drop zone for both single JEs and batch uploads
   - Add "Attach file to every JE in batch" toggle

3. **Dimension Chips in Line Grid**

   - Show dimension values as removable chips next to each line
   - Persist to `tx_dimension_link` table

4. **Bulk-Paste / Keyboard Shortcuts**

   - Excel-style paste (`Ctrl+V`) and Tab navigation in JE grid

5. **Accrual Auto-Reversal**

   - "Accrual" flag → schedule reversing JE on user-selected date

6. **Lifecycle & EventBridge Hooks**

   - Publish `je.lifecycle.created` and `je.lifecycle.approved` events
   - Enable Smart Events to react to these hooks

7. **Performance / UX Polish**

   - Virtualised rows (1,000+ lines)
   - Consistent error toasts from Smart Rules engine

8. **i18n Currency & Separators**

   - Honor tenant locale for symbols and thousand/decimal separators

9. **Docs & Tests**
   - Swagger/OpenAPI update
   - Cypress flow: upload → validate → post batch
   - Jest unit tests for file parser edge-cases

- **(Task B.3)** Accounting Modules: **NOT STARTED**
  - 📝 **Next explicit priority after completion of B.1 and B.2:** Implement Accounts Payable (AP) backend foundation (Vendors, AP Bills Schema; Vendor CRUD Storage/API).
  - 📝 Implement Accounts Receivable (AR) module.
  - 📝 Implement other modules (Debt/Notes Payable, Inventory, Fixed Assets, Lease Accounting, Prepaid Expenses).
  - 📝 Ensure integration with CoA and GL.
  - 📝 Design/implement GAAP/IFRS financial statements with footnotes.

🔹 **Task B.4 – Dimensions & Smart Events (BACKLOG, SPECS READY)**  
 _Objective_: replicate Sage Intacct-style multi-dimensional tagging and
event-driven automation without expanding the CoA.

**Scope of MVP**

1.  **Dimensions Framework**  
    • Core tables (`dimensions`, `dimension_values`, `tx_dimension_link`).  
    • Pre-seeded dimensions (implemented exactly the same as any custom dimension): Department, Location, Class, Customer, Vendor,
    Employee, Project, Item.  
    • User-defined dimension creation UI (admin-only).  
    • Validation rules: required vs optional, active vs inactive.

2.  **Smart Rules (validation layer)**  
    • JSON-based rule engine to block invalid dimension/GL combos.  
    • Example rule stub:

    ```json
    { "account": "6000", "location": ["LON", "NYC"], "allow": false }
    ```

3.  **Smart Events (event layer)**  
    • Trigger types: `onCreate`, `onUpdate` for JE, AP, AR objects.  
    • Condition builder (simple expression parser).  
    • Actions: `email`, `fieldUpdate`, `webhook`.  
    • Async dispatcher queue (BullMQ).

4.  **AI Hooks**  
    • Every Smart Event emits an **EventBridge** message (`ai.ingest.*`) so the
    ML service can learn patterns and surface anomalies in real-time.

**Exit Criteria**

- Tag ≥ 90 % of new JE records with at least one dimension.
- Rule engine blocks invalid department-location pairs (unit tests).
- Example Smart Event: send Slack alert when `amount > $10k & location=INTL`.
- Cypress E2E: create JE → trigger event → verify webhook fired.

🔹 **Task B.5 – AP/AR Automation (DESIGN IN-PROGRESS)**  
 • OCR ingest micro-service for vendor invoices  
 • Rules-based approvals (reuse Smart Events engine)  
 • Automated dunning & payment matching  
 • Success KPI: 50 % reduction in manual AP touch-points

🔹 **Task B.6 – Fixed Assets Mini-Module (BACKLOG)**  
 • Asset master table, depreciation schedules (GAAP + Tax)  
 • Auto-post monthly depreciation JEs  
 • Disposal / partial-disposal workflow

### Phase C: Website Content Management (NEARLY COMPLETE)

- **(Task C.1)** ✅ Authentication & Backend: Authentication middleware verified and fixed, with proper user access control.
- **(Task C.2)** ✅ Content Schema & Storage: Homepage content schema and storage methods created and verified.
- **(Task C.3)** ✅ Admin UI Component: AdminWebsiteContent component developed with tabbed interface for content management.
- **(Task C.4)** ✅ Dashboard Integration: AdminWebsiteContent component integrated into Dashboard while preserving existing UI.
- **(Task C.5)** Blog Management & Integration:
  - ✅ Backend CRUD operations verified
  - ✅ Fixed homepage blog previews and "View Articles" link (Issue #6)
  - ✅ Resolved subscription form submission error (Issue #7)
  - ✅ Enhanced UI/UX for content management with responsive designs
  - ✅ Improved BlogContentManager with better tabs, filters, and search
- **(Task C.6)** AI Content Generation (PARTIALLY IMPLEMENTED):
  - ✅ Implemented chat assistance for website visitors with dynamic responses
  - 🔄 Plan integration of financial news feeds
  - 🔄 Design AI content draft generation process
  - 🔄 Create admin review workflow for AI-generated content

### Phase D: Reporting (Standard & Custom) & Data Collection

- **(Task D.1)** Standard Reporting: Finalize/optimize backend logic (`consolidation-group-methods.ts`) for TB, IS, BS, CF reports. Build reliable frontend display components.
  • **Real-Time Dashboards (D.1.a)**  
   – 200 pre-built widgets, drill-down to dimension-tagged data  
   – DashboardBuilder.tsx MVP (drag-drop, role-based view)  
   – Websocket-fed live KPI cards
- **(Task D.2)** Custom Reporting:
  - Define backend API capabilities for fetching data with flexible filters.
  - Build a frontend UI for custom report building.
- **(Task D.3)** Data Collection and Analysis:
  - Implement data collection mechanisms.
  - Ensure anonymization, privacy policies, and user consent.
  - Design for AI/ML and forecasting.
  - Prioritize state-of-the-art, innovative, customer-focused, easy-to-use solutions.
  - Create a great design (trustworthy, trendy, fun).

### Phase E: API Integrations & Automation

- **(Task E.1)** Implement Integrations: Connect to Plaid, Stripe, Gusto, Ramp/Concur etc.
- **(Task E.2)** Automate JE Creation: From fetched API data (AI assistance).
  - **(AI Assistance):** Explore Plaid, document analysis. Odoo/Sage Intacct inspiration.

🔹 **Task E.3 – Universal Data Flows & Connectors (SPEC READY)**  
 • Pre-built connectors: Salesforce, Bill.com, ADP  
 • Connector SDK (`connectors/`) for custom integrations  
 • Real-time sync pub/sub using EventBridge → triggers Smart Events

### Phase F: AI/ML & Predictive Forecasting (PARTIALLY IMPLEMENTED)

- **(Task F.1) ✅ Python Service Integration:**
  - ✅ Implemented `python_service/ml_service.py` with:
    - ✅ Prophet for time-series forecasting
    - ✅ scikit-learn for predictive analytics and regression
    - ✅ Anomaly detection for financial data
    - ✅ XAI integration with Grok models
- **(Task F.2) 🔄 Predictive Forecasting/Analytics:**
  - ✅ Core forecasting capabilities using Prophet
  - ✅ Regression analysis using scikit-learn
  - ✅ Anomaly detection for financial data
  - 🔄 Expand models for advanced financial forecasting
  - 🔄 Develop auto-categorization for transactions
- **(Task F.3) 🔄 Additional AI Features:**
  - ✅ Chat assistance for user queries implemented
  - 🔄 Improve NLP capabilities for financial queries
  - 🔄 Develop explainable AI insights for financial data

🔹 **Task F.4 – AI-Powered Ledger & Copilot (SPEC DRAFTED)**

- **Anomaly Detection Service**  
  • Uses **IsolationForest** for generating an anomaly score (0-1 scale).  
  • Purpose explicitly includes detection of potential fraud, input errors, data irregularities, and unusual financial patterns.  
  • Anomalies (score > 0.8) explicitly flagged and surfaced through real-time streaming to the `AIInsightsWidget`.

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

🔹 **Task F.7 – AI-Powered General Ledger**  
 • IsolationForest anomaly scoring on each posted JE (stream → `ai.anomaly`)  
 • Continuous consolidations with ML-based FX anomaly checks  
 • Auto-reconciliation runner (bank feeds)

🔹 **Task F.8 – Sage-style Copilot**  
 • `/api/copilot/ask` – NLQ → SQL using pgvector + GPT-4o3  
 • Chat thread UI (`CopilotDrawer.tsx`) with task automation hooks  
 • Contextual suggestions: late invoices, budget overruns, etc.

### Phase G: Future Enhancements

- **(Task G.1)** ✅ Implement Client Edit/Deactivate (Done).
- **(Task G.2)** Comprehensive Testing: Expand unit, integration, E2E tests.
- **(Task G.3)** Documentation: Update all technical and user documentation.
- **(Task G.4)** Deployment Prep: Finalize cloud configuration, CI/CD, monitoring.
- **(Task G.5)** AI-driven proactive website health monitoring and autonomous code updates.
- **(Task G.6)** XAI integration to enhance explainability and transparency in the accounting system.

🔹 **Task G.7 – Forms & Operational Flows**  
 • Low-code form builder UI (+ approvals engine)  
 • Mobile-friendly submission & audit trail

🔹 **Task G.8 – Project & Resource Management**  
 • Project master, budgeting, time & expense capture  
 • AI-driven resource allocation recommender

### Phase H: Future-Proofing (Long Term)

- **(Task H.1)** Explore Blockchain & IoT integrations.

🔹 **Task H.2 – Multi-Entity Real-Time Consolidations**  
 • Currency conversion service, inter-company elimination rules  
 • Shared CoA & dimensions across entities

🔹 **Task H.3 – Enterprise-Grade Security Enhancements**  
 • SOC-2 controls tracking module  
 • Role-based access overhaul, MFA enforcement, anomaly-login alerts

🔹 **Task H.4 – Infrastructure & Cost Optimization (COMPLETED, SPEC DOCUMENTED)**

Selected optimized tech stack explicitly chosen to ensure state-of-the-art performance and scalability at minimal cost:

- **CockroachDB Serverless**: Scalable distributed DB (~$840/year for 1TB).
- **Backblaze B2 Storage**: Cost-effective cloud storage (~$60/year per TB).
- **Vercel Pro Hosting**: High-performance frontend hosting (~$240/year).
- **GCP Preemptible VMs**: Affordable AI/ML compute (~$360-$960/year).
- **Total infrastructure costs explicitly estimated** at ~$1,500-$2,100/year for 1TB scale.

Explicit upfront costs documented:

- Minimal upfront cost (~$30-$35 initial setup).

## 5. General Guidelines for Agent (Explicit Immediate Action Required):

**Explicit Priority Order:**

1. ✅ Quick-cleanup (remove throw-away files, reorganize tests and scripts)
2. Complete debugging of JE File Attachment Bug (#7).
3. Implement Dimensions & Smart Rules (Task B.2.1).
4. Only after B.2.1 is complete, implement Batch Journal Entry uploads (endpoint `POST /api/journal-entries/batch`, CSV/XLSX support, explicit validation).
5. Begin expanding Dimensions & Smart Events implementation as per detailed spec in Task B.4.

**Explicit Standards to Follow:**

- Modularize code explicitly, remove unused logic regularly (`npx ts-prune`, `npx knip`).
- Ensure tests (Cypress/Jest) explicitly validate new functionality and regressions.
- Always use explicit logging (`console.log("DEBUG Component: Action:", value)`) in complex logic for clarity.
- Explicit verification required (`node verify-storage-modules.js`) after backend modifications.

**Additional Guidelines:**

- **Dimensions-Aware Thinking**: when creating new tables, APIs, or tests,
  always ask "does this need dimension tags or Smart Event hooks?" Add them
  early to avoid refactors.
- **Maintain Structure:** Keep the client-specific accounting design consistent. Follow established patterns (e.g., modular storage).
- **Simplify:** Avoid unnecessary complexity. Focus on clean state management.
- **Ask for Clarification:** If unsure, ask before proceeding.
- **Design Considerations:** Prioritize state-of-the-art, innovative, customer-focused, easy-to-use design. Aim for trust, trendiness, and fun.
- **Data Strategy:** Keep data collection/strategy goals in mind during design.
- **Code Quality:** Write clean, well-organized, documented code. Follow linting/formatting rules.
- **Efficiency:** Prioritize efficient algorithms and data structures.
- **Error Handling:** Implement robust error catching and user-friendly messages.
- **Documentation:** Maintain clear documentation and code comments.

## 6. Code Quality & Cleanup Strategy

**Automated Linting and Formatting:**

- **Tools:** Use ESLint and Prettier via project configurations (`.eslintrc.js`, `.prettierrc.json`).
- **Agent Action:** Run linting/formatting commands periodically (e.g., `npx eslint . --fix`, `npx prettier . --write`) to fix issues automatically.

**Automated Unused Code/Dependency Detection:**

- **Tools:** Consider using tools like ts-prune or Knip to find unused exports, files, types, and dependencies.
- **Agent Action:** Run these tools periodically. Based on reports, remove identified unused items after reviewing for potential impacts.

**Manual Code Review:**

- **Agent Action:** On completion of major features or key milestones, conduct a code review focused on identifying code smells, duplicated code, and potential refactoring opportunities.

**Performance Profiling:**

- **Tools:** Use browser performance tools for frontend (especially Lighthouse); use Node.js profiling tools for backend.
- **Agent Action:** Identify and address performance bottlenecks, focusing on critical paths first.

**Documentation Quality:**

- **Agent Action:** Ensure comprehensive technical (code) and user documentation is created and maintained, with a focus on clarity and completeness.

**Regression Testing:**

- **Agent Action:** Implement a robust suite of automated tests for each critical system component, ensuring new changes don't break existing functionality.

**Specific Focus Areas:**

- **Storage Logic:** Further decompose remaining monolithic pieces.
- **API Layer:** Continue enhancing route organization and documentation.
- **Frontend State Management:** Identify and clean up redundant state.
- **TypeScript Type Safety:** Enhance type coverage, especially for API boundary interfaces.

## 7. Continuous Refactoring & Code Quality Requirements

Throughout every task explicitly:

- Refactor continuously from monolithic to modular/microservice architecture:
  - Clearly ensure each module handles single, explicit responsibilities.
  - Immediately extract logic from large files/functions into smaller, maintainable, explicitly named modules and services.
- Proactively search for and remove explicitly:
  - Duplicate implementations, particularly resulting from refactoring.
  - Outdated or unused code, especially from old testing, agent mistakes, or deprecated implementations.
  - Run tools like ts-prune or Knip periodically to clearly detect unused or outdated code explicitly:
    ```bash
    npx ts-prune
    npx knip
    ```
  - Explicitly review results and safely remove verified unnecessary code.

## 8. Immediate Verification Checklist (Explicitly Required)

- Onboarding explicitly matches simplified flow:
  - Client → Automatic Default Entity creation
- Industry dropdown lists explicitly aligned and consistent everywhere.
- Task B.1 import/export functionality explicitly fixed post-refactoring.
- Continuous refactoring explicitly evident in PRs/code changes.
- All new and existing modules clearly documented explicitly.
- Regular execution of unused code detection scripts (ts-prune, knip).
- Quick-cleanup scripts/tests relocation passes — repo root is tidy.

## 📚 Appendix – Dimensions & Smart Events Glossary

| Term                | Definition (Explicitly Updated)                                                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AI EventBridge**  | Internal pub/sub topic (`ai.ingest.*`) explicitly streaming Smart Event payloads for continual ML learning.                                                                  |
| **Anomaly Score**   | IsolationForest-generated score (0-1); explicitly identifies unusual transactions, errors, irregularities, and potential fraud. Threshold >0.8 triggers high-risk UI alerts. |
| **Copilot**         | Explicitly defined as the Chat-style assistant enabling natural-language queries and internal task automation.                                                               |
| **Dimension**       | Categorical attribute explicitly attached to transactions for multi-dimensional reporting. Preloaded dimensions are explicitly customizable.                                 |
| **Lifecycle Event** | Explicitly triggered events at JE milestones (created, approved, posted) for automation and integration purposes.                                                            |
| **Smart Event**     | Defined explicitly as no-code automations (trigger-condition-action).                                                                                                        |
| **Smart Rule**      | JSON-based validation explicitly ensuring dimension/account compliance.                                                                                                      |

(Keep this glossary alphabetised as new terms emerge.)

## Newly Added Section: Resolved & Unresolved Issues

### ✅ Recently Completed

* **Journal Entry Editing Workflow: COMPLETE.** All parts of the definitive fix plan have been successfully implemented. The backend data persistence is non-destructive, the attachment data flow is correct, and the frontend UI updates reliably.
* **File Attachment Bug #7: COMPLETE.** The end-to-end workflow for attachments is now stable. Users can add and delete files from draft entries, the changes persist correctly, and the UI provides immediate feedback without resetting the form.
* **Automatic Accrual Reversal Feature: COMPLETE.** The feature to create and post automatic reversals for accrual entries is fully implemented on the frontend and backend.
* **Dimensions UI: COMPLETE.** The UI to create, edit, and manage dimension values is functional. The integration of dimension tagging into the journal entry form is also complete.
* **UX Polish: COMPLETE.** The Account Selector in the JE form has been improved with advanced filtering and display, and the action buttons now have robust logic to prevent conflicts.

### 🔄 Next Steps

**Batch JE Upload (High Priority):**
- **Status:** NOT STARTED
- **Goal:** Implement the "Batch Journal-Entry Upload" feature. This is the next major feature to be developed. It will allow users to upload a CSV/XLSX file to create multiple journal entries at once.

**Smart Rules MVP (Medium Priority):**
- **Status:** NOT STARTED
- **Goal:** Begin implementation of the JSON-based validation rule engine for Smart Rules.
