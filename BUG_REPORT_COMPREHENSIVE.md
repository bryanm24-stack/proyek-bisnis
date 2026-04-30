# 🐛 Comprehensive Bug Report - April 28, 2026

**Total Bugs Found: 30**
- 🔴 Critical: 4
- 🟠 High: 11  
- 🟡 Medium: 10
- 🔵 Low: 5

---

## 🔴 CRITICAL SEVERITY BUGS (Must Fix)

### 1. Plain Text Password Storage ⚠️ SECURITY CRITICAL
- **File**: [src/app/api/auth/login/route.js](src/app/api/auth/login/route.js#L12)
- **Line**: 12
- **Severity**: 🔴 Critical
- **Issue**: Passwords stored and compared in plain text. No hashing (bcrypt, argon2, etc.)
- **Why it's a bug**: Anyone with database access can steal user credentials. Major security breach.
- **Impact**: Complete account takeover possible
- **Fix**: Use bcrypt or argon2 to hash passwords before storage. Compare hashes during login.

```javascript
// VULNERABLE CODE:
const user = users.find(u => u.email === email && u.password === password);

// SHOULD BE:
const hashedPassword = await bcrypt.hash(password, 10);
const isValidPassword = await bcrypt.compare(password, user.password);
```

---

### 2. No Authentication/Authorization Middleware
- **File**: [src/app/api/admin/vendor-approval/route.js](src/app/api/admin/vendor-approval/route.js#L1)
- **Line**: 1-200
- **Severity**: 🔴 Critical
- **Issue**: No auth checks. Anyone can approve/reject vendors by calling the API directly.
- **Why it's a bug**: Complete authentication bypass - vendors can approve themselves.
- **Impact**: Malicious vendors bypass verification, fraud possible
- **Fix**: Add middleware to verify admin role before processing requests.

---

### 3. Unvalidated Base64 File Upload
- **File**: [src/app/api/vendor/register/route.js](src/app/api/vendor/register/route.js#L13)
- **Line**: 13
- **Severity**: 🔴 Critical
- **Issue**: `identityFile` stored as Base64 without size/type validation
- **Why it's a bug**: Users can upload malicious files (malware, huge files causing DoS)
- **Impact**: System vulnerable to DoS attacks, malware injection
- **Fix**: Validate file size (max 5MB), type (only images), and sanitize before storage.

---

### 4. Race Condition: Multiple Simultaneous File Writes
- **File**: [src/app/api/deals/route.js](src/app/api/deals/route.js#L170-180)
- **Line**: 170-180
- **Severity**: 🔴 Critical
- **Issue**: Writes to `deals.json` AND `invoices.json` simultaneously without locking. If system crashes between writes, data becomes inconsistent.
- **Why it's a bug**: Data loss, corrupted state if process crashes mid-write
- **Impact**: Financial data loss, corrupted deals
- **Fix**: Use database or implement file locking mechanism. Write atomically.

---

## 🟠 HIGH SEVERITY BUGS

### 5. ID Type Inconsistency Bug
- **File**: [src/app/api/deals/route.js](src/app/api/deals/route.js#L70)
- **Line**: 70
- **Severity**: 🟠 High
- **Issue**: String/number comparison: `String(deal.vendorId) !== String(vendorId)` - IDs sometimes treated as strings, sometimes numbers
- **Why it's a bug**: Comparisons fail silently. Wrong user gets access to resources.
- **Impact**: Authorization bypass possible
- **Fix**: Standardize all IDs as strings. Always convert: `String(id)` when comparing.

---

### 6. Hydration Mismatch in Navbar
- **File**: [src/app/layout.js](src/app/layout.js#L10) and [src/app/components/SharedNavbar.js](src/app/components/SharedNavbar.js#L11-26)
- **Line**: layout.js:10, SharedNavbar.js:11-26
- **Severity**: 🟠 High
- **Issue**: `suppressHydrationWarning` hides real hydration errors. SharedNavbar reads localStorage immediately without checking if hydrated first. **Also violates React hooks rule of calling setState in effect.**
- **Why it's a bug**: Component renders different content on server vs client, breaks user state on page reload.
- **Impact**: User session lost on page reload, UI inconsistency
- **Fix**: Properly check `isHydrated` before rendering user-specific content.

---

### 7. ESLint Error: Calling setState Synchronously in Effect (SharedNavbar.js)
- **File**: [src/app/components/SharedNavbar.js](src/app/components/SharedNavbar.js#L16)
- **Line**: 16
- **Severity**: 🟠 High
- **Issue**: Calling `setIsHydrated(true)` directly within useEffect body triggers cascading renders
- **Why it's a bug**: Performance issue, violates React best practices, causes unnecessary re-renders
- **Impact**: Performance degradation, potential memory leaks
- **Fix**: Use conditional rendering instead, or lazy initialize state

---

### 8. ESLint Error: Calling setState Synchronously in Effect (SharedFooter.js)
- **File**: [src/app/components/SharedFooter.js](src/app/components/SharedFooter.js#L13)
- **Line**: 13
- **Severity**: 🟠 High
- **Issue**: Calling `setUser(null)` directly within useEffect violates React hooks rule
- **Why it's a bug**: Same as #7, causes cascading renders
- **Impact**: Performance degradation
- **Fix**: Remove conditional setState or refactor effect logic

---

### 9. Infinite Poll Without Cleanup (Memory Leak)
- **File**: [src/app/components/HomePageClient.js](src/app/components/HomePageClient.js#L35-50)
- **Line**: 35-50
- **Severity**: 🟠 High
- **Issue**: Sets multiple intervals that never stop. If user navigates and returns, duplicate intervals run.
- **Why it's a bug**: Memory leak. API thrashed with duplicate requests every 5-10 seconds.
- **Impact**: Application slowdown, server overload, memory leak
- **Fix**: Clean up intervals properly in useEffect return, correct dependencies

---

### 10. Unvalidated Discount Calculation
- **File**: [src/app/api/deals/route.js](src/app/api/deals/route.js#L85-140)
- **Line**: 85-140
- **Severity**: 🟠 High
- **Issue**: Final price can become negative if discount exceeds original price. No floor validation.
- **Why it's a bug**: Vendors could get paid negative amounts (refund instead of payment).
- **Impact**: Financial loss, payment logic breaks
- **Fix**: Ensure `finalPrice = Math.max(originalPrice - amount, 0)`

---

### 11. No Duplicate Prevention for Ratings (Race Condition)
- **File**: [src/app/api/ratings/route.js](src/app/api/ratings/route.js#L35-45)
- **Line**: 35-45
- **Severity**: 🟠 High
- **Issue**: Race condition - check for existing rating then push new one. Two simultaneous requests bypass the check.
- **Why it's a bug**: Same user can rate multiple times, inflating ratings.
- **Impact**: Rating system unreliable
- **Fix**: Use database with unique constraint or add file locking.

---

### 12. Missing Error Handler in Promise Chain
- **File**: [src/app/components/HomePageClient.js](src/app/components/HomePageClient.js#L190-220)
- **Line**: 190-220
- **Severity**: 🟠 High
- **Issue**: `.catch()` logs error but continues rendering with partial/stale data
- **Why it's a bug**: Silent failures. User doesn't know data failed to load.
- **Impact**: User confusion, missing error feedback
- **Fix**: Show error state to user with retry option

---

### 13. Missing Admin Authorization Check
- **File**: [src/app/api/admin/transaction-verification/route.js](src/app/api/admin/transaction-verification/route.js#L37)
- **Line**: 37
- **Severity**: 🟠 High
- **Issue**: No check that user is admin. Anyone can approve identity verification.
- **Why it's a bug**: Non-admins can approve transactions and identities, fraud enabled.
- **Impact**: Security breach, fraud possibility
- **Fix**: Add admin role verification middleware.

---

### 14. Type Coercion in Comparison
- **File**: [src/app/api/deals/route.js](src/app/api/deals/route.js#L120)
- **Line**: 120
- **Severity**: 🟠 High
- **Issue**: `String(invoice.dealId) === String(deal.id)` - Converting after value may already be wrong type.
- **Why it's a bug**: "123" and "123abc" both stringify differently but comparison logic unclear.
- **Impact**: Authorization bypass possible
- **Fix**: Validate types at entry point, normalize consistently.

---

### 15. Synchronous File I/O Mixed with Async
- **File**: [src/app/api/transactions/route.js](src/app/api/transactions/route.js#L1-30)
- **Line**: 1-30
- **Severity**: 🟠 High
- **Issue**: Uses `fs` (sync) in some places, `fs/promises` (async) in others.
- **Why it's a bug**: Blocking the event loop with sync I/O. Performance issues under load.
- **Impact**: Performance degradation under high traffic
- **Fix**: Use only `fs/promises` everywhere.

---

## 🟡 MEDIUM SEVERITY BUGS

### 16. Inconsistent Response Formats
- **File**: [src/app/api/notifications/route.js](src/app/api/notifications/route.js#L28-35)
- **Line**: 28-35
- **Severity**: 🟡 Medium
- **Issue**: GET returns raw array. POST returns wrapped object. Inconsistent API contract.
- **Why it's a bug**: Frontend expects different structures causing runtime errors.
- **Impact**: Frontend errors, unpredictable behavior
- **Fix**: Standardize all responses: `{ success: true, data: [...] }`

---

### 17. Missing Error Handling in Vendor Services
- **File**: [src/app/api/vendor/services/route.js](src/app/api/vendor/services/route.js#L40-60)
- **Line**: 40-60
- **Severity**: 🟡 Medium
- **Issue**: Price parsing: `Number.parseInt(price, 10)` returns `NaN` on invalid input, no validation.
- **Why it's a bug**: Service created with price=0 or `NaN` silently.
- **Impact**: Services with invalid pricing
- **Fix**: Validate: `if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) throw error`

---

### 18. Unvalidated Search Parameters
- **File**: [src/app/api/vendor/services/route.js](src/app/api/vendor/services/route.js#L13)
- **Line**: 13
- **Severity**: 🟡 Medium
- **Issue**: `vendorId` from query params used directly without sanitization
- **Why it's a bug**: Potential for injection attacks or unauthorized access.
- **Impact**: Possible data leakage
- **Fix**: Validate vendorId format and type before use.

---

### 19. Missing Pagination on Deals Endpoint
- **File**: [src/app/api/deals/all/route.js](src/app/api/deals/all/route.js#L30)
- **Line**: 30
- **Severity**: 🟡 Medium
- **Issue**: Returns all deals without limit. If 100K deals exist, entire array loaded in memory.
- **Why it's a bug**: Memory leak, slow response, potential crash.
- **Impact**: Server crash on large datasets
- **Fix**: Add `limit` and `offset` parameters with pagination.

---

### 20. Unvalidated Invoice Creation
- **File**: [src/app/api/transactions/route.js](src/app/api/transactions/route.js#L80-120)
- **Line**: 80-120
- **Severity**: 🟡 Medium
- **Issue**: Creates invoice with unvalidated `totalAmount` and `remainingPayment` that could be negative.
- **Why it's a bug**: Negative invoice amounts cause payment logic errors.
- **Impact**: Payment system breaks
- **Fix**: Validate amounts > 0.

---

### 21. Weak Input Validation on Chat Messages
- **File**: [src/app/api/chat/route.js](src/app/api/chat/route.js#L73)
- **Line**: 73
- **Severity**: 🟡 Medium
- **Issue**: Message field accepted without length validation or content filtering
- **Why it's a bug**: Potential for message injection/XSS if messages displayed unsafely.
- **Impact**: Possible XSS attack
- **Fix**: Validate message length (max 500 chars), escape HTML on display.

---

### 22. No Error Handling for JSON Parse
- **File**: [src/app/api/invoices/route.js](src/app/api/invoices/route.js#L28)
- **Line**: 28
- **Severity**: 🟡 Medium
- **Issue**: `JSON.parse(data)` without try-catch if file is corrupted.
- **Why it's a bug**: Single corrupted JSON file crashes entire API.
- **Impact**: API goes down if data file corrupted
- **Fix**: Wrap in try-catch, return empty array as fallback.

---

### 23. Multiple <img> Elements Without Next Image Optimization (23 warnings)
- **Files**: Multiple pages (HomePageClient.js, VendorProductForm.js, etc.)
- **Line**: Various
- **Severity**: 🟡 Medium
- **Issue**: Using `<img>` instead of Next.js `<Image />` component for 23+ instances
- **Why it's a bug**: Slower LCP, higher bandwidth usage, no automatic optimization
- **Impact**: Poor performance, worse user experience
- **Fix**: Replace `<img>` with `import Image from 'next/image'` and use `<Image />` component

---

### 24. Incomplete Complaint Resolution Logic
- **File**: [src/app/api/orders/update-status/route.js](src/app/api/orders/update-status/route.js#L70-90)
- **Line**: 70-90
- **Severity**: 🟡 Medium
- **Issue**: Partial refund sets `refundAmount` but doesn't validate against deal's actual price.
- **Why it's a bug**: Refund could exceed original price in edge cases.
- **Impact**: Financial inconsistencies
- **Fix**: Add validation: `if (refundAmount > originalPrice) throw error`

---

### 25. Weak Chat Filtering Logic
- **File**: [src/app/api/vendor/chats/route.js](src/app/api/vendor/chats/route.js#L22)
- **Line**: 22
- **Severity**: 🟡 Medium
- **Issue**: `chats.filter(c => c.vendorId === vendorId || c.customerId === vendorId)` allows vendor to see ALL customer chats, not just their own
- **Why it's a bug**: Privacy breach - vendor sees other vendors' customer chats
- **Impact**: Privacy violation, data leakage
- **Fix**: Add more precise filtering: only return chats where vendor is participant in specific capacity

---

## 🔵 LOW SEVERITY BUGS

### 26. Inconsistent Naming Convention
- **Files**: Multiple files throughout project
- **Issue**: Some files use camelCase, others snake_case: `namaBarang`, `vendorId`, `customerId`
- **Severity**: 🔵 Low
- **Why it's a bug**: Code harder to maintain, confusion in team.
- **Fix**: Standardize on camelCase throughout.

---

### 27. Magic Numbers Without Constants
- **File**: [src/app/api/deals/route.js](src/app/api/deals/route.js#L145)
- **Line**: 145
- **Severity**: 🔵 Low
- **Issue**: `deadline.setDate(deadline.getDate() + 2)` - Hard-coded 2 days payment deadline.
- **Why it's a bug**: Business logic scattered in code, hard to change.
- **Fix**: Define `const PAYMENT_DEADLINE_DAYS = 2;`

---

### 28. Missing Default Values in ENV Check
- **File**: [src/app/layout.js](src/app/layout.js#L1)
- **Line**: 1
- **Severity**: 🔵 Low
- **Issue**: No environment variable checks for API endpoints (hardcoded `/api/...`)
- **Why it's a bug**: Can't deploy to different environments easily.
- **Fix**: Use environment variables: `${process.env.NEXT_PUBLIC_API_URL}/api/...`

---

### 29. Console Logs Left in Production Code
- **File**: [src/app/api/deals/all/route.js](src/app/api/deals/all/route.js#L20-25)
- **Line**: 20-25
- **Severity**: 🔵 Low
- **Issue**: Debug console.log statements left in
- **Why it's a bug**: Performance overhead, information disclosure.
- **Fix**: Remove or use proper logging library.

---

### 30. Missing Input Trimming on String Fields
- **File**: [src/app/api/auth/register/route.js](src/app/api/auth/register/route.js#L12-18)
- **Line**: 12-18
- **Severity**: 🔵 Low
- **Issue**: Email/username accept leading/trailing whitespace
- **Why it's a bug**: Email "user@test.com " and "user@test.com" treated as different accounts
- **Fix**: Always trim: `email = email.trim().toLowerCase()`

---

## 📊 ESLint Results Summary

```
✖ 25 problems (2 errors, 23 warnings)

ERRORS (2):
1. SharedFooter.js:13 - setState in effect (react-hooks/set-state-in-effect)
2. SharedNavbar.js:16 - setState in effect (react-hooks/set-state-in-effect)

WARNINGS (23):
- 23x Using <img> instead of <Image /> (@next/next/no-img-element)
```

---

## 🚨 IMMEDIATE ACTION PLAN

### Priority 1 (Fix TODAY):
1. ✅ Implement password hashing with bcrypt
2. ✅ Add authentication middleware for admin routes
3. ✅ Add input validation for file uploads
4. ✅ Fix setState in effect warnings (SharedNavbar.js, SharedFooter.js)
5. ✅ Add file locking for concurrent writes

### Priority 2 (Fix THIS WEEK):
6. Standardize ID handling (string vs number)
7. Fix hydration mismatches
8. Remove duplicate/infinite polling
9. Add proper error handling across all APIs
10. Implement pagination

### Priority 3 (Nice to Have):
11. Replace all `<img>` with `<Image />`
12. Standardize API response formats
13. Add environment variable support
14. Fix naming conventions
15. Add proper logging

---

## 📝 Development Recommendations

1. **Setup Database**: Move away from JSON file storage to proper database (PostgreSQL, MongoDB)
2. **Add Authentication Middleware**: Create reusable middleware for route protection
3. **Input Validation Library**: Use Zod or Joi for schema validation
4. **Error Handling**: Create global error handler middleware
5. **Testing**: Add unit tests for critical functions
6. **Code Review**: Implement peer review process before merging
7. **Logging**: Use Winston or similar logging library
8. **Environment Management**: Use .env.local for sensitive data

---

Generated: April 28, 2026
Total Bugs: 30 (Critical: 4, High: 11, Medium: 10, Low: 5)
ESLint Issues: 25 (Errors: 2, Warnings: 23)
