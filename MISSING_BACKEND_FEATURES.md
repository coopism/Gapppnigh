# Missing Backend Features Audit

## Account Page Features

### 1. Write Review Button (MISSING FUNCTIONALITY)
- **Location**: Account.tsx line 729-732
- **Current State**: Button exists but has no onClick handler
- **Required**: Modal/dialog to write review with rating and comment
- **Backend**: POST /api/auth/reviews endpoint EXISTS ✓
- **Action Needed**: Add frontend modal and wire up to existing endpoint

### 2. Reviews Tab (USING MOCK DATA)
- **Location**: Account.tsx line 750-754
- **Current State**: Uses setTimeout with empty array
- **Required**: Fetch real reviews from API
- **Backend**: GET /api/auth/reviews endpoint EXISTS ✓
- **Action Needed**: Replace mock data with real API call (useRewards hook already has this!)

### 3. Account Stats Dashboard (MISSING CALCULATIONS)
- **Location**: Account.tsx - Stats cards showing Total Bookings, Total Saved, etc.
- **Current State**: Likely showing static/mock data
- **Required**: Calculate real stats from bookings and rewards data
- **Backend**: Data available from existing endpoints
- **Action Needed**: Calculate stats from fetched data

## Booking Page Features

### 4. Credit Balance Application (MISSING)
- **Location**: Booking.tsx - checkout flow
- **Current State**: No credit balance deduction during checkout
- **Required**: Apply user's credit balance to reduce booking total
- **Backend**: Need endpoint to apply credit to booking
- **Action Needed**: Create applyCreditToBooking integration

## Navigation/Global Features

### 5. Apple Sign-In (PLACEHOLDER)
- **Location**: Login.tsx, Signup.tsx
- **Current State**: Shows "Apple Sign-In coming soon" error
- **Backend**: POST /api/auth/oauth/apple endpoint EXISTS ✓
- **Action Needed**: Implement Apple OAuth flow (requires Apple Developer account)

## Rewards System Features

### 6. Automatic Points Award After Stay (MISSING CRON JOB)
- **Location**: Backend scheduled job
- **Current State**: Points must be manually awarded
- **Required**: Cron job to check completed bookings and award points
- **Backend**: awardBookingPoints function EXISTS ✓
- **Action Needed**: Create scheduled job to run daily

### 7. Credit Auto-Apply at Checkout (MISSING)
- **Location**: Booking.tsx payment flow
- **Current State**: Credit balance shown but not applied
- **Required**: Automatically deduct credit from booking total
- **Backend**: applyCreditToBooking function EXISTS ✓
- **Action Needed**: Integrate into booking flow

## Owner Dashboard Features

### 8. Auto-Listing Cron Job (MISSING)
- **Location**: Backend scheduled job
- **Current State**: Rules configured but not executed
- **Required**: Daily cron to auto-publish gap nights based on rules
- **Backend**: Auto-listing rules stored in DB ✓
- **Action Needed**: Create scheduled job

## Summary

**Critical Missing Features:**
1. Write Review Modal (frontend only)
2. Reviews Tab Real Data (easy fix - already have hook)
3. Credit Application at Checkout (backend integration)
4. Points Award Cron Job (backend scheduled task)
5. Auto-Listing Cron Job (backend scheduled task)

**Nice-to-Have:**
6. Apple Sign-In (requires Apple Developer account)
7. Account Stats Calculations (frontend only)
