# GapNight Bug Report

## Executive Summary

GapNight is a hotel gap-night deals marketplace that is largely functional across desktop, tablet, and mobile viewports. The core booking flow, partner access, and hotel owner portal work correctly. However, there are several issues affecting user experience and code quality: inconsistent currency formatting (showing "AUD" prefix instead of "$"), font inconsistencies on the Coming Soon page, missing accessibility attributes, duplicate component files, and limited amenity icon coverage. These issues range from medium to low priority and are all fixable with targeted code changes.

---

## Prioritized Issues

### HIGH Priority

#### BUG-001: Currency Display Uses "AUD" Instead of "$" Symbol
- **Severity**: High
- **Priority**: P1
- **Steps to Reproduce**:
  1. Navigate to /deals
  2. View any deal card
- **Expected**: Prices show as "$247" (standard Australian format)
- **Actual**: Prices show as "AUD247" with no space or symbol
- **Root Cause**: DealCard.tsx and other components display `deal.currency` directly concatenated with price
- **Proposed Fix**: Create `formatPrice()` utility that formats currency properly with "$" symbol and comma separators

#### BUG-002: Missing data-testid on Mobile Hamburger Menu
- **Severity**: High
- **Priority**: P1
- **Steps to Reproduce**:
  1. View site on mobile (390x844)
  2. Inspect the hamburger menu button
- **Expected**: Button has `data-testid="button-hamburger"`
- **Actual**: Button lacks data-testid attribute
- **Root Cause**: Navigation.tsx Sheet trigger button missing data-testid
- **Proposed Fix**: Add `data-testid="button-hamburger"` to the Sheet trigger button

---

### MEDIUM Priority

#### BUG-003: Font Inconsistency on Coming Soon Page
- **Severity**: Medium
- **Priority**: P2
- **Steps to Reproduce**:
  1. Navigate to / without partner access
  2. Observe the "Gap Night" heading
- **Expected**: Heading uses the display font (Outfit) defined in theme
- **Actual**: Heading uses inline `style={{ fontFamily: "Georgia, serif" }}`
- **Root Cause**: ComingSoon.tsx overrides theme font with inline style
- **Proposed Fix**: Remove inline style and use `font-display` class (or keep serif if intentional design choice)

#### BUG-004: Duplicate NotFound Component Files
- **Severity**: Medium
- **Priority**: P2
- **Steps to Reproduce**:
  1. Check pages directory
- **Expected**: Single NotFound component
- **Actual**: Both `not-found.tsx` and `NotFound.tsx` exist
- **Root Cause**: Accidental duplication during development
- **Proposed Fix**: Remove `not-found.tsx` (lowercase) as `NotFound.tsx` is the one imported in App.tsx

#### BUG-005: Missing Amenity Icons
- **Severity**: Medium
- **Priority**: P2
- **Steps to Reproduce**:
  1. View deal card for hotel with "Beach Access" or "Bar" amenity
- **Expected**: All amenities show icons
- **Actual**: "Beach Access", "Bar", "Room Service", "Concierge" show nothing (no icon)
- **Root Cause**: AMENITY_ICONS map in DealCard.tsx only has 6 entries
- **Proposed Fix**: Add icons for missing amenities: Bar, Beach Access, Room Service, Concierge

#### BUG-006: Navigation Link Text Inconsistency
- **Severity**: Medium
- **Priority**: P2
- **Steps to Reproduce**:
  1. View desktop nav - says "For Hotels"
  2. View mobile nav - says "List Your Hotel"
- **Expected**: Consistent text across breakpoints
- **Actual**: Different wording
- **Root Cause**: Different labels used in desktop vs mobile nav sections
- **Proposed Fix**: Standardize to "For Hotels" on both

#### BUG-007: No Image Error Handling
- **Severity**: Medium
- **Priority**: P2
- **Steps to Reproduce**:
  1. If an image URL fails to load, no fallback displays
- **Expected**: Placeholder or fallback image shown
- **Actual**: Broken image or empty space
- **Root Cause**: img tags have no onError handler
- **Proposed Fix**: Add onError handler to show placeholder image

---

### LOW Priority

#### BUG-008: Missing aria-labels on Icon-Only Buttons
- **Severity**: Low
- **Priority**: P3
- **Steps to Reproduce**:
  1. Inspect grid/map toggle buttons
  2. Inspect view toggle buttons
- **Expected**: Buttons have aria-label for screen readers
- **Actual**: Only icon inside, no accessible label
- **Root Cause**: Button components only contain icons without aria-label
- **Proposed Fix**: Add aria-label to all icon-only buttons

#### BUG-009: Missing Autocomplete Attributes on Form Inputs
- **Severity**: Low
- **Priority**: P3
- **Steps to Reproduce**:
  1. View booking form
  2. Check browser console for warnings
- **Expected**: Form inputs have appropriate autocomplete attributes
- **Actual**: Console shows autocomplete warnings
- **Root Cause**: Input elements missing autocomplete attributes
- **Proposed Fix**: Add appropriate autocomplete values (name, email, tel, cc-number, etc.)

#### BUG-010: Date Format Inconsistency
- **Severity**: Low
- **Priority**: P3
- **Steps to Reproduce**:
  1. View deal dates across different pages
- **Expected**: Consistent date format (e.g., "1 Feb 2026")
- **Actual**: Some places use different formats
- **Root Cause**: Various date formatting approaches used
- **Proposed Fix**: Create `formatDate()` utility and use consistently

---

## UX/Polish Issues

### BUG-011: Category Chips Lack Hover Focus Ring
- **Severity**: Low
- **Priority**: P3
- **Root Cause**: Custom button styling lacks focus-visible ring
- **Proposed Fix**: Add `focus-visible:ring-2 focus-visible:ring-ring` to category buttons

### BUG-012: Search Input Missing Form Submit on Enter
- **Severity**: Low
- **Priority**: P3
- **Root Cause**: Search bar doesn't submit on Enter key in some contexts
- **Proposed Fix**: Ensure all search inputs handle Enter key properly

---

## Summary Statistics

| Priority | Count |
|----------|-------|
| High (P1) | 2 |
| Medium (P2) | 5 |
| Low (P3) | 5 |
| **Total** | **12** |

---

## Files to Modify

1. `client/src/components/DealCard.tsx` - Currency formatting, amenity icons
2. `client/src/components/Navigation.tsx` - data-testid, link consistency
3. `client/src/pages/ComingSoon.tsx` - Font consistency
4. `client/src/pages/not-found.tsx` - Delete duplicate
5. `client/src/pages/Booking.tsx` - Autocomplete attributes
6. `client/src/pages/Home.tsx` - Accessibility improvements
7. `client/src/lib/utils.ts` - Add formatPrice, formatDate utilities
8. `client/src/pages/DealDetail.tsx` - Currency formatting
9. `client/src/pages/Landing.tsx` - Currency formatting
