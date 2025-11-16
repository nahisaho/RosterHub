# Execution Plan: Fix E2E Tests to Achieve 100% Pass Rate

**Task**: Fix the final 10 failing E2E tests in RosterHub API
**Date**: 2025-11-16
**Orchestrator Session ID**: 20251116-000001
**Target**: 33/33 tests passing (100% success rate)

---

## Current Status

**Total Tests**: 33
**Passing**: 23 tests (69.7%)
**Failing**: 10 tests (30.3%)

---

## Problem Analysis

### Priority 1: Orgs API Tests (4 failing tests)

**Root Cause Hypothesis**: OrgsController and OrgsService are missing the same implementations that were recently added to UsersController/UsersService:
- Field selection (`fields` query parameter)
- Sort functionality
- Filter support
- Response structure wrapping

**Failing Tests**:
1. `Filter by type=school` - Filter not working correctly
2. `Filter by status=active` - Filter not working correctly
3. `Include Japan Profile metadata` - Metadata not included or response structure issue
4. `Return org by sourcedId` - Response structure may need wrapping

**Expected Fixes**:
- Apply same field selection logic as Users API
- Add filter support for `type` and `status` fields
- Add sort support
- Ensure response wrapping is consistent
- Include metadata in response DTOs

---

### Priority 2: CSV Import Tests (2 failing tests)

**Root Cause Hypothesis**: Parameter binding issue - the E2E test is sending `entityType` as a query parameter, but the controller expects it differently (or vice versa).

**Failing Tests**:
1. `should import valid users CSV file`
   - Expected: 202 Accepted
   - Actual: 404 Not Found
   - Issue: Route not matching, likely parameter binding problem

2. `should reject CSV without required fields`
   - Expected: 400 Bad Request
   - Actual: 404 Not Found
   - Same issue as above

**Expected Fixes**:
- Verify CSV import route configuration
- Check if `entityType` should be query param vs route param vs body field
- Review Multer file upload configuration
- Ensure controller method signature matches test expectations

---

### Priority 3: CSV Export Tests (4 failing tests)

**Root Cause Hypothesis**: All CSV export tests are returning 500 Internal Server Error, indicating a crash or unhandled exception in the export service.

**Failing Tests**:
1. `should export users as CSV` - 500 Internal Server Error
2. `should include Japan Profile metadata in exported CSV` - 500 Internal Server Error
3. `should export orgs as CSV` - 500 Internal Server Error
4. `should return 400 for unknown entity type` - 500 Internal Server Error (should return 400)

**Investigation Needed**:
- Check CSV export service implementation for crashes
- Verify file system write permissions
- Check if export directory exists
- Review error logs for specific stack traces
- Verify CSV formatter service is properly configured
- Check if repositories are properly injected

---

## Selected Agents & Execution Strategy

### Execution Approach: Sequential (3 Priorities)

**Rationale**:
- Orgs API fixes are similar to already-completed Users API fixes (apply proven pattern)
- CSV Import and CSV Export have different root causes requiring separate investigation
- Each priority can build on learnings from the previous one

---

## Agent Selection & Execution Plan

### Stage 1: Orgs API Fixes (Priority 1)

**Agent**: @software-developer
**Task**: Apply the same field selection, sort, and filter implementations from Users API to Orgs API
**Dependencies**: None (standalone fix)
**Deliverables**:
- Updated `OrgsController` with field selection support
- Updated `OrgsService` with filter and sort support
- Updated `OrgsRepository` with query building logic
- Response DTO updates for metadata inclusion

**Validation**: Run Orgs E2E tests to verify 4 tests now pass

---

### Stage 2: CSV Import Fixes (Priority 2)

**Agent**: @bug-hunter (investigation) → @software-developer (implementation)
**Task**: Investigate 404 errors and fix parameter binding issue
**Dependencies**: None (independent of Orgs API)
**Deliverables**:
- Root cause analysis report
- Fixed CSV import controller route configuration
- Corrected parameter handling (query param vs route param)
- Updated tests if needed

**Validation**: Run CSV import E2E tests to verify 2 tests now pass

---

### Stage 3: CSV Export Fixes (Priority 3)

**Agent**: @bug-hunter (investigation) → @software-developer (implementation)
**Task**: Investigate 500 errors and fix CSV export service crashes
**Dependencies**: None (independent of previous fixes)
**Deliverables**:
- Root cause analysis report with stack traces
- Fixed CSV export service implementation
- Directory/permission fixes if needed
- Error handling improvements (400 vs 500)

**Validation**: Run CSV export E2E tests to verify 4 tests now pass

---

## Execution Timeline

**Estimated Duration**: 2-3 hours total

| Stage | Agent | Task | Duration | Tests Fixed |
|-------|-------|------|----------|-------------|
| 1 | @software-developer | Orgs API fixes | 45 min | 4 tests |
| 2 | @bug-hunter + @software-developer | CSV Import fixes | 30 min | 2 tests |
| 3 | @bug-hunter + @software-developer | CSV Export fixes | 60 min | 4 tests |

**Final Validation**: Full E2E test suite run to confirm 33/33 passing

---

## Success Criteria

1. All 4 Orgs API tests pass
2. All 2 CSV Import tests pass
3. All 4 CSV Export tests pass
4. **Final Result**: 33/33 tests passing (100% success rate)
5. No regressions in previously passing tests
6. All fixes follow RosterHub architectural patterns (steering context)

---

## Risk Mitigation

**Risk 1**: Orgs API fixes may introduce regressions
- **Mitigation**: Run full test suite after each fix, not just failing tests

**Risk 2**: CSV export may have multiple root causes (not just one 500 error)
- **Mitigation**: @bug-hunter will provide detailed investigation before implementation

**Risk 3**: Time estimate may be optimistic
- **Mitigation**: Progress checkpoints after each stage, can pause and reassess

---

## Next Steps

Once execution plan is approved:
1. Start Stage 1: Invoke @software-developer for Orgs API fixes
2. After Stage 1 validation: Invoke @bug-hunter for CSV Import investigation
3. After Stage 2 completion: Invoke @bug-hunter for CSV Export investigation
4. Final validation: Run full E2E suite and generate completion report

---

**Orchestrator Notes**:
- Project memory (steering files) has been reviewed
- All agents will be informed to follow RosterHub architectural patterns
- Sequential execution ensures each fix is validated before moving to next priority
- Progress will be logged in real-time to execution log file

**Ready to Execute**: ✅
