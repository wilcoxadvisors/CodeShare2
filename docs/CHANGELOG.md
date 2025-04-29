# Changelog

All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- Cypress E2E testing infrastructure for journal entries
- Test file fixture for attachment testing
- Comprehensive unit tests for date and file utilities

### Fixed
- Date timezone issue in journal entries (see [date-timezone-fix.md](fixes/date-timezone-fix.md))
- File attachment workflow when posting entries directly (see [file-attachment-workflow.md](fixes/file-attachment-workflow.md))

## [1.3.0] - 2025-04-29

### Added
- Support for email file formats (.eml, .msg) in journal entry attachments
- New SendHorizontal icon for email file types
- Centralized file utility functions in fileUtils.ts
- Improved error messages specifically mentioning supported file formats

### Changed
- Updated MIME type whitelist to include email formats
- Enhanced file icon selection logic
- Improved documentation for file handling

## [1.2.0] - 2025-04-25

### Added
- Journal entry file attachment storage in PostgreSQL blobs
- File metadata table with appropriate indexes
- Role-based permissions for file attachments (JE_FILES_ADMIN)

### Changed
- Migrated from filesystem storage to database storage for attachments
- Enhanced audit trail to include file operations
- Updated file download paths to use new API endpoints

### Fixed
- Attachment duplication bug during save operations
- File size validation not working consistently

## [1.1.0] - 2025-04-20

### Added
- Comprehensive account filtering and search capability
- Entity balance validation for intercompany entries
- Parent-child account relationships
- Draft/pending/posted workflow for journal entries

### Changed
- Enhanced form validation with Zod schemas
- Improved error message formatting
- Performance optimizations for large charts of accounts

### Fixed
- Inconsistent balance calculation in different views
- User session management timeout issues