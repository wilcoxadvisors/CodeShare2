# Code Quality and Linting Guide

This document outlines the tools and commands available for ensuring code quality in the Financial Management Platform.

## Available Commands

The following scripts are available to check code quality:

### Complete Check (All-in-One)

Run all checks in sequence (lint, typecheck, format):

```bash
./scripts/check-all.sh
```

This is equivalent to `npm run lint && npm run typecheck && npm run format:check` and provides a comprehensive check of the entire codebase.

### Individual Checks

You can also run individual checks as needed:

#### Linting

Check for code quality and unused dependencies:

```bash
./scripts/lint.sh
```

#### TypeScript Type Checking

Verify TypeScript syntax and type correctness:

```bash
./scripts/check-ts.sh
```

#### Format Checking

Check code formatting and unused exports:

```bash
./scripts/format-check.sh
```

## TypeScript Errors

The TypeScript checker will identify type errors in the codebase. Common issues include:

- Missing or incompatible types
- Undefined or possibly undefined values
- Type mismatches in function parameters or return values

## Integration with Git

For best results, run the complete check before committing code:

```bash
./scripts/check-all.sh
```

## Fixing Common Issues

### TypeScript Errors

1. **Undefined values**: Add null/undefined checks or use optional chaining (`?.`)
   ```typescript
   // Before
   const name = user.profile.name; // Error: Object is possibly undefined
   
   // After
   const name = user?.profile?.name; // Safe access with optional chaining
   ```

2. **Type errors in parameters**: Ensure correct types are used or add type assertions
   ```typescript
   // Before
   function process(data: string) { /* ... */ }
   process(123); // Error: Argument of type 'number' is not assignable to parameter of type 'string'
   
   // After
   process(String(123)); // Convert to string
   ```

### Format Issues

Use Prettier to automatically format your code:

```bash
npx prettier --write "./client/src/**/*.{ts,tsx}" "./server/**/*.ts" "./shared/**/*.ts"
```

## Adding Custom Rules

To extend linting rules, consider adding:

1. ESLint configuration (requires installing eslint)
2. Custom Prettier configuration (requires installing prettier)
3. Additional TypeScript compiler options in tsconfig.json