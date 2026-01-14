# Bug Report - HW-Dashboard

Generated: 2026-01-14

## Critical Security Issues

### 1. XSS Vulnerabilities - Multiple Locations
**Severity**: HIGH
**Files**: employer.js, partners.js, charts.js

Multiple instances where unsanitized CSV data is directly inserted into HTML via `.innerHTML`:

- **employer.js:113,115,107** - Company names and club names from CSV inserted without sanitization
  ```javascript
  <span class="emp-name">${k}</span>
  <span>• ${cn}</span>
  ```

- **partners.js:17-20** - Partner data inserted without sanitization, including URLs
  ```javascript
  <span>${p.name}</span>
  <span class="badge payment">${p.pay}</span>
  <a href="${p.link}" target="_blank">
  ```
  The `p.link` field is especially dangerous as it could contain `javascript:` URLs.

- **charts.js:194-195** - Club names inserted directly into checkboxes
  ```javascript
  <label class="checkbox-item"><input type="checkbox" value="${c}" checked> ${c}</label>
  ```

**Impact**: Malicious data in CSV files could execute arbitrary JavaScript in users' browsers.

**Recommendation**: Sanitize all user-controllable data before inserting into DOM, or use `textContent` instead of `innerHTML` where possible.

---

## Logic Errors

### 2. Hardcoded Column Index
**Severity**: MEDIUM
**File**: employer.js:64
**Location**: `renderEmployer()` function

```javascript
const dateCol = headers[9]; // Column J
```

**Issue**: Assumes the date column is always at index 9. If CSV structure changes, this breaks silently.

**Recommendation**: Search for column by name pattern (e.g., `headers.find(h => h.toLowerCase().includes('date'))`).

---

### 3. Ambiguous Date Parsing Logic
**Severity**: MEDIUM
**File**: data.js:107-114
**Location**: `loadData()` function

```javascript
if (isNaN(dateParsed) || ds.includes("-") || ds.includes("/")) {
   const parts = ds.split(/[\/\-\.]/);
   if (parts.length === 3) {
     let p1 = parseInt(parts[0], 10), p2 = parseInt(parts[1], 10), p3 = parseInt(parts[2], 10);
     if (p3 > 1000) dateParsed = new Date(p3, p1 - 1, p2);
     else if (p1 > 1000) dateParsed = new Date(p1, p2 - 1, p3);
     else if (p3 < 100) dateParsed = new Date(p3 + 2000, p1 - 1, p2);
   }
}
```

**Issues**:
1. Condition `isNaN(dateParsed) || ds.includes("-") || ds.includes("/")` means even valid dates with separators trigger manual parsing
2. Format detection is ambiguous - MM/DD/YYYY vs DD/MM/YYYY is guessed based on magnitude
3. Two-digit years < 100 assumed to be 2000+ (fails for dates in 1900s)
4. No documentation of which formats are supported

**Recommendation**: Use a proper date parsing library (e.g., date-fns) or clearly document expected format.

---

### 4. Type Coercion Issues
**Severity**: LOW
**File**: main.js:148
**Location**: `updateDashboard()` function

```javascript
if (isNaN(d) || String(d.getFullYear()) !== yr) return false;
```

**Issue**: `getFullYear()` returns a number, but `yr` is a string from the select element. This works due to type coercion but is not explicit.

**Recommendation**: Use `d.getFullYear() !== parseInt(yr, 10)` or `d.getFullYear().toString() !== yr`.

---

### 5. Unsafe DOM Selector Construction
**Severity**: MEDIUM
**File**: main.js:172
**Location**: `openTab()` function

```javascript
document.querySelector(`button[onclick="openTab('${tab}')"]`)?.classList.add("active");
```

**Issue**: If `tab` parameter contains quotes or special characters, the selector breaks or could be exploited.

**Recommendation**: Store reference to button elements or use data attributes for selection.

---

## Error Handling Issues

### 6. Silent Error Suppression
**Severity**: MEDIUM
**File**: employer.js:17
**Location**: `fetchCSV()` function

```javascript
error:()=>resolve({data:[], meta:{fields:[]}})
```

**Issue**: Parse errors are completely swallowed, making debugging impossible. Users see empty data without knowing why.

**Recommendation**: Log errors with details and show user-friendly error messages.

---

### 7. Missing Null Checks on Array Operations
**Severity**: LOW
**File**: data.js:132-138
**Location**: `loadData()` function

```javascript
const dates = window.ST.data.map(r => r.dateParsed).filter(d => !isNaN(d));
if (dates.length) {
   const latest = new Date(Math.max(...dates));
```

**Issue**: If `dates` array is very large, spreading it into `Math.max(...dates)` could exceed call stack size.

**Recommendation**: Use `Math.max.apply(null, dates)` or iterate to find max.

---

### 8. Missing Error Details in Logging
**Severity**: LOW
**Files**: partners.js:125, data.js:140, data.js:142

**Issue**: Error handlers log generic messages without including actual error details:
```javascript
console.error("Partner Load Error");  // No error object logged
```

**Recommendation**: Always log the actual error object: `console.error("Partner Load Error:", error)`.

---

## Performance Issues

### 9. Memory Leak - Unremoved Event Listener
**Severity**: LOW
**File**: main.js:114-126
**Location**: Global scope

```javascript
window.addEventListener('click', e => { ... });
```

**Issue**: Click listener added to window but never removed. In a long-running SPA, this could accumulate listeners.

**Recommendation**: Either remove listener on cleanup or document that this is intentional for a static page.

---

### 10. Empty Function Called Repeatedly
**Severity**: LOW
**File**: charts.js:391-393
**Location**: `window.resizeCharts()` function

```javascript
window.resizeCharts = function() {
  // Optional resize logic
};
```

**Issue**: Function is empty but called from:
- main.js:180 via `requestAnimationFrame`
- main.js:217 on window resize

**Recommendation**: Either implement the function or remove the calls.

---

### 11. Potential Null Reference
**Severity**: LOW
**File**: partners.js:117
**Location**: `renderPartners()` function

```javascript
listIds.forEach(id => document.getElementById(id).innerHTML = '<li>...</li>');
```

**Issue**: Doesn't check if element exists before accessing `.innerHTML`. If HTML structure changes, this throws an error.

**Recommendation**: Add null check:
```javascript
const el = document.getElementById(id);
if (el) el.innerHTML = '...';
```

---

### 12. Incorrect isNaN Usage
**Severity**: LOW
**Files**: Multiple
**Locations**: data.js:132, main.js:132, charts.js:63, charts.js:281, charts.js:324

**Issue**: Using `isNaN(dateObject)` to check if date is valid. While this works, it's semantically incorrect. Should check for Invalid Date explicitly.

**Recommendation**: Use `!isNaN(date.getTime())` or `date instanceof Date && !isNaN(date)`.

---

## UI/UX Issues

### 13. Inefficient Date Parsing
**Severity**: LOW
**File**: data.js:107-108
**Location**: `loadData()` function

```javascript
let dateParsed = new Date(ds);
if (isNaN(dateParsed) || ds.includes("-") || ds.includes("/")) {
```

**Issue**: Always attempts manual parsing if date string contains separators, even if native parsing succeeded.

**Recommendation**: Only attempt manual parsing if native parsing fails:
```javascript
if (isNaN(dateParsed)) {
  // manual parsing
}
```

---

### 14. Missing Data Validation
**Severity**: MEDIUM
**Files**: Multiple
**Location**: CSV data processing

**Issue**: No validation that required CSV columns exist before accessing them. If CSV structure is wrong, code fails with cryptic errors.

**Recommendation**: Validate CSV headers on load and show clear error if structure is unexpected.

---

## Summary

- **Critical Security Issues**: 1 (XSS vulnerabilities)
- **High Severity**: 0
- **Medium Severity**: 5 (Hardcoded indices, date parsing, unsafe selectors, silent errors, missing validation)
- **Low Severity**: 8 (Type coercion, missing null checks, performance issues)

**Total Issues Found**: 14

### Recommended Priority Fixes

1. **Immediate**: Fix XSS vulnerabilities by sanitizing CSV data
2. **High Priority**: Fix hardcoded column index and improve error handling
3. **Medium Priority**: Address date parsing ambiguity and unsafe DOM operations
4. **Low Priority**: Clean up code quality issues (type coercion, empty functions)
