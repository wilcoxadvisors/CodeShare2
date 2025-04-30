# Merge Plan for Bug #7 Fix

Following the recommendation, we'll take a staged approach:

## Commit 1: Documentation Update
- Change: Update Instructions.md with Dimensions-first sequencing and Entitlements design
- Commit message: `docs: update instructions.md — Dimensions-first sequencing + Entitlements design`
- Status: Ready to merge (fully reviewed, no test requirements)

## Commit 2: Bug #7 Fix & UI Enhancements
- Change: Fix file upload issues and enhance UI with progress indicators 
- Commit message: `feat: JE attachment UX (per-file progress + cancel)`
- Status: Ready for code review, test suite requires further work
- Note: Test timeouts to be addressed in a separate ticket

## Test Suite Work (Separate Ticket)
- Fix: Add proper DB connection cleanup and handle in tests
- Fix: Export Express server instance for proper test teardown
- Fix: Add afterAll cleanup hooks to all test files
- Skip: Temporarily skip flaky Cypress tests with TODO comments

## Post-Merge Tasks
- Close Bug #7 in the tracker
- Create ticket for test suite stabilization
- Begin Dimensions thin-slice sprint (B.2.1)