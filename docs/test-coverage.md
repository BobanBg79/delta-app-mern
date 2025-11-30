# Test Coverage Guide

This document explains how to use test coverage reporting in the Delta App MERN project.

---

## Overview

The project uses **Jest** with built-in **Istanbul** coverage for both backend and frontend tests. Coverage reports are automatically generated and can be viewed as HTML tables in your browser.

---

## Coverage Scripts

### Backend (Root)

| Script | Description |
|--------|-------------|
| `npm test` | Run tests without coverage |
| `npm run test:coverage` | Run tests with coverage (text output) |
| `npm run test:coverage:html` | Generate HTML + text + lcov reports |
| `npm run test:coverage:open` | Generate HTML report and open in browser |

### Frontend (Client)

| Script | Description |
|--------|-------------|
| `npm test` | Run tests in watch mode (no coverage) |
| `npm run test:coverage` | Run tests with coverage (text output) |
| `npm run test:coverage:html` | Generate HTML + text + lcov reports |
| `npm run test:coverage:open` | Generate HTML report and open in browser |

---

## Viewing Coverage Reports

### Quick View (Text)

Run coverage with text output in the terminal:

```bash
# Backend
npm run test:coverage

# Frontend
cd client && npm run test:coverage
```

### HTML Report (Recommended)

Generate and open interactive HTML report:

```bash
# Backend
npm run test:coverage:open

# Frontend
cd client && npm run test:coverage:open
```

This will:
1. Run all tests with coverage
2. Generate HTML report in `coverage/index.html` folder
3. Automatically open the report in your default browser

### Manual HTML View

If automatic opening doesn't work, manually open:

- **Backend**: `coverage/index.html`
- **Frontend**: `client/coverage/index.html`

You can simply double-click the `index.html` file or use any local HTTP server.

---

## Coverage Reports Location

Coverage reports are generated in the following folders:

```
/coverage/               # Backend coverage
  ├── index.html         # Main HTML report
  ├── lcov-report/       # Detailed HTML reports
  ├── lcov.info          # LCOV format
  └── ...

/client/coverage/        # Frontend coverage
  ├── index.html         # Main HTML report
  ├── lcov-report/       # Detailed HTML reports
  ├── lcov.info          # LCOV format
  └── ...
```

**Note**: `coverage/` folders are git-ignored and won't be committed to the repository.

---

## Git Hooks Integration

### Pre-Commit Hook

When you commit changes, Husky will automatically:
- Run backend tests with coverage
- Display coverage summary in terminal
- Block commit if tests fail

### Pre-Push Hook

When you push to remote, Husky will automatically:
- Run backend tests with coverage
- Run frontend tests with coverage
- Display coverage summaries for both
- Block push if any tests fail

**Files:**
- `.husky/pre-commit` - Backend coverage check
- `.husky/pre-push` - Backend + Frontend coverage check

---

## Coverage Thresholds

The project currently has coverage thresholds configured in `jest.config.js` (if applicable). If tests pass but coverage is below threshold, you'll see warnings like:

```
Jest: "global" coverage threshold for statements (50%) not met: 44.67%
Jest: "global" coverage threshold for branches (50%) not met: 31.11%
```

This is informational and won't block commits, but it's a reminder to improve test coverage.

---

## Understanding Coverage Metrics

Coverage reports show 4 main metrics:

| Metric | Description |
|--------|-------------|
| **Statements** | Percentage of code statements executed during tests |
| **Branches** | Percentage of conditional branches (if/else) tested |
| **Functions** | Percentage of functions called during tests |
| **Lines** | Percentage of code lines executed during tests |

**Goal**: Aim for at least 80% coverage across all metrics for critical business logic (services, utils, operations).

---

## Best Practices

1. **Run coverage before commits**: Always check coverage locally before committing
2. **Focus on business logic**: Prioritize coverage for services, operations, and utils
3. **Don't obsess over 100%**: Focus on meaningful tests, not just coverage numbers
4. **Review HTML reports**: Use the interactive HTML report to identify untested code paths
5. **Test critical flows**: Ensure high coverage for accounting, permissions, and payment logic

---

## Troubleshooting

### Coverage reports not generated

**Problem**: `coverage/` folder is empty or missing

**Solution**: Make sure you run `test:coverage:html` script, not just `test:coverage`

### HTML report won't open

**Problem**: `start coverage/index.html` doesn't work

**Solution**: Manually navigate to the `coverage/` folder and double-click `index.html`

### Coverage too low

**Problem**: Coverage below desired threshold

**Solution**:
1. Open HTML report to see which files/lines are uncovered
2. Write tests for uncovered code paths
3. Focus on critical business logic first (services, accounting, permissions)

---

## Related Documentation

- [Unit Testing Rules](./unit-testing-rules.md) - Testing standards and best practices
- [CLAUDE.md](../.claude/CLAUDE.md) - Project instructions for Claude Code

---

## Summary

```bash
# Quick workflow
npm run test:coverage:open              # Backend coverage + open report
cd client && npm run test:coverage:open # Frontend coverage + open report

# Git hooks
git commit   # Runs backend coverage automatically
git push     # Runs backend + frontend coverage automatically
```

That's it! Coverage is now fully integrated into the development workflow.
