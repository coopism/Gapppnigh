# GapNight Admin Panel — Site Operations Console
## Complete Architecture Specification

---

## 1. NAVIGATION TREE (Sidebar)

```
🏠 Dashboard                    — Real-time metrics, alerts, quick actions
📦 Deals & Listings
  ├─ All Deals                  — Hotel gap night deals (legacy + new)
  ├─ Properties                 — Airbnb-style stay listings
  ├─ Inventory Calendar         — Per-property availability calendar
  └─ Pricing Rules              — Platform fees, margins, city overrides
👥 Users & Trust
  ├─ All Users                  — Consumer user management
  ├─ Hosts                      — Airbnb host management
  ├─ ID Verification            — Identity verification queue
  └─ Flagged / Banned           — Fraud, abuse, suspended accounts
📅 Bookings
  ├─ All Bookings               — Full bookings table with actions
  ├─ Pending Approval           — Host-approval queue
  └─ Cancellations & Refunds    — Cancelled/refunded bookings
💳 Payments & Payouts
  ├─ Transactions               — All payment events
  ├─ Failed Payments            — Triage queue
  ├─ Payouts                    — Host payout management
  └─ Reconciliation             — Commission/margin breakdown
🎁 Promotions
  ├─ Promo Codes                — Create/manage promo codes
  ├─ Travel Credits             — User wallet/credit management
  └─ Referrals                  — Referral program controls
📝 Content (CMS)
  ├─ City Pages                 — Hero text, SEO, featured deals
  ├─ Banners & Announcements    — Global/city-specific alerts
  └─ Static Pages               — Terms, Privacy, Help content
📧 Notifications
  ├─ Send Notification          — Email/push to user segments
  ├─ Templates                  — Email template editor
  └─ Delivery Logs              — Send history + status
🎫 Support & Disputes
  ├─ Tickets                    — User issues, booking disputes
  ├─ Disputes & Claims          — Chargebacks, damage claims
  └─ Canned Responses           — Reusable reply templates
⚙️ System
  ├─ Feature Flags              — Enable/disable modules, A/B toggles
  ├─ Site Configuration         — Fees, taxes, search ranking, rate limits
  ├─ Admin Users & Roles        — RBAC management
  └─ Maintenance Mode           — Maintenance toggle, env banner
📋 Audit Logs                   — Who did what, before/after snapshots
```

---

## 2. MODULE SPECIFICATIONS

### A) Dashboard / Overview
**Route:** `/admin/dashboard`

**Metrics Cards (top row):**
| Metric | Source | Format |
|--------|--------|--------|
| Total Bookings (period) | bookings table | Count |
| GMV / Revenue (period) | bookings.totalPrice | $X,XXX |
| Conversion Rate | bookings / unique visitors | X.X% |
| Active Deals/Properties | deals + properties (active) | Count |
| Failed Payments (period) | Stripe webhook events | Count (red if >0) |
| Cancellations (period) | bookings WHERE status=CANCELLED | Count |
| Open Disputes | support_tickets WHERE type=dispute, status=open | Count |
| New Users (period) | users WHERE createdAt > period | Count |

**Period Selector:** 7d / 30d / 90d / Custom

**Charts:**
- Revenue over time (line chart, daily granularity)
- Bookings over time (bar chart)
- Top 10 cities by bookings (horizontal bar)
- User signups over time (area chart)

**Alerts Panel ("Needs Action"):**
- Pending host approvals (properties WHERE status=pending_approval)
- Failed payments in last 24h
- Open support tickets > 24h old
- Properties with no availability in next 30 days
- Unverified hosts with active listings
- Expiring promo codes (next 7 days)

**Quick Actions (button row):**
- Create Promo Code → opens promo form
- Approve Properties → links to pending queue
- View Failed Payments → links to payments/failed
- Send Notification → opens notification composer
- Add Host → opens host creation form
- Toggle Maintenance → confirmation modal

---

### B) Deals Management
**Route:** `/admin/deals`

**Table Columns:**
| Column | Type | Filterable | Sortable |
|--------|------|-----------|----------|
| ID (short) | mono | No | No |
| Title/Hotel | text | Search | Yes |
| City | text | Dropdown | Yes |
| Status | badge (draft/active/paused/expired) | Dropdown | Yes |
| Check-in | date | Date range | Yes |
| Check-out | date | — | — |
| Base Price | currency | Range | Yes |
| Deal Price | currency | — | Yes |
| Discount % | number | Range | Yes |
| Inventory | number | — | Yes |
| Bookings | count | — | Yes |
| Featured | boolean | Toggle | — |
| Created | datetime | Date range | Yes |

**Bulk Actions:** Pause, Activate, Feature, Unfeature, Delete (soft)
**Row Actions:** Edit, Pause/Resume, Feature toggle, View bookings, Preview deal page, Duplicate, Delete

**Create/Edit Deal Form Fields:**
- title, description (rich text)
- hotel/property selector
- images (upload/reorder)
- location (city, state, address)
- check-in date, check-out date
- base price, deal price, discount %
- inclusions (text list)
- cancellation policy (dropdown)
- max bookings, inventory count
- visibility: featured, search boost weight (1-10)
- scheduling: publish date, expiry date
- status: draft / active / paused

---

### B.2) Properties Management
**Route:** `/admin/properties`

**Table Columns:**
| Column | Type | Filterable |
|--------|------|-----------|
| Title | text | Search |
| Host | text (linked) | Search |
| City | text | Dropdown |
| Status | badge (pending/approved/rejected/suspended) | Dropdown |
| Type | text | Dropdown |
| Base Rate | currency | Range |
| Gap Nights | count | — |
| Rating | number | — |
| Reviews | count | — |
| Created | datetime | Date range |

**Row Actions:** Approve, Reject (with reason), Suspend, View listing, Edit, View host, View bookings
**Bulk Actions:** Approve all, Reject all, Suspend

---

### C) Inventory / Availability
**Route:** `/admin/inventory`

**Calendar View:**
- Property selector dropdown
- Month navigation
- Each day cell shows: available (green), booked (red), gap night (amber), blocked (gray)
- Click day → slide-over with: date, current rate, gap night toggle, discount %, availability toggle, override price input, notes

**Bulk Date Actions:**
- Select date range → Block dates, Unblock, Set as gap night, Set rate, Set discount

**City Overview:**
- Aggregate view: total available nights per city for next 30/60/90 days
- Properties with zero availability flagged

---

### D) Hotels/Hosts Management
**Route:** `/admin/hosts`

**Table Columns:**
| Column | Type | Filterable |
|--------|------|-----------|
| Name | text | Search |
| Email | text | Search |
| Phone | text | — |
| Properties | count | — |
| Status | badge (active/suspended/pending) | Dropdown |
| Verified | boolean | Toggle |
| Total Bookings | count | — |
| Last Active | datetime | — |
| Joined | datetime | Date range |

**Row Actions:** View profile, View properties, Suspend/Activate, Edit, Send message, View payouts
**Onboarding Checklist (per host):** Email verified, ID uploaded, First property listed, First booking received, Payout method set

**Host Detail Page:**
- Profile info (editable)
- Properties list
- Booking history
- Payout history
- Commission rate (editable, default from site config)
- Internal notes
- Activity timeline

---

### E) Bookings Management
**Route:** `/admin/bookings`

**Table Columns:**
| Column | Type | Filterable |
|--------|------|-----------|
| Booking ID | mono | Search |
| Property/Hotel | text | Search |
| Guest | text (email) | Search |
| City | text | Dropdown |
| Check-in | date | Date range |
| Check-out | date | — |
| Nights | number | — |
| Total | currency | Range |
| Payment Status | badge | Dropdown |
| Booking Status | badge | Dropdown |
| Type | badge (deal/property) | Dropdown |
| Created | datetime | Date range |

**Row Actions:**
- View details (slide-over)
- Cancel + refund (with reason, confirmation modal)
- Resend confirmation email
- Mark checked-in / checked-out
- Add internal note
- View payment timeline
- Download invoice/receipt (PDF)
- View guest profile
- View host profile

**Payment Timeline (per booking):**
- Created → Payment authorized → Payment captured → Payout initiated → Payout completed
- Shows Stripe payment intent ID, amounts, timestamps

**Pending Approval Sub-page:** `/admin/bookings/pending`
- Only bookings WHERE status=PENDING_APPROVAL
- Actions: Approve on behalf of host, Reject, Contact host

---

### F) Payments & Payouts
**Route:** `/admin/payments`

**Transactions Table:**
| Column | Type | Filterable |
|--------|------|-----------|
| Transaction ID | mono | Search |
| Booking ID | mono (linked) | Search |
| Type | badge (charge/refund/chargeback) | Dropdown |
| Amount | currency | Range |
| Status | badge (succeeded/failed/pending/disputed) | Dropdown |
| Stripe ID | mono | Search |
| Guest | text | Search |
| Created | datetime | Date range |

**Failed Payments Queue:** `/admin/payments/failed`
- Only failed transactions
- Actions: Retry, Cancel booking, Contact guest, Mark resolved

**Payouts:** `/admin/payments/payouts`
| Column | Type | Filterable |
|--------|------|-----------|
| Host | text | Search |
| Period | date range | — |
| Gross | currency | — |
| Commission | currency | — |
| Net Payout | currency | — |
| Status | badge (pending/processing/paid) | Dropdown |
| Stripe Transfer ID | mono | — |

**Actions:** Process payout, Hold payout, Export CSV, Generate statement

**Reconciliation:** `/admin/payments/reconciliation`
- Period selector
- Total GMV, Total commission, Total payouts, Discrepancies
- Per-host breakdown

---

### G) Users & Trust/Safety
**Route:** `/admin/users`

**Enhanced Table Columns:**
| Column | Type | Filterable |
|--------|------|-----------|
| Email | text | Search |
| Name | text | Search |
| Status | badge (active/suspended/banned) | Dropdown |
| Email Verified | boolean | Toggle |
| ID Verified | boolean | Toggle |
| Fraud Risk | badge (none/low/medium/high) | Dropdown |
| Bookings | count | — |
| Total Spent | currency | — |
| Rewards Tier | badge | Dropdown |
| Joined | datetime | Date range |

**Row Actions:**
- View full profile (slide-over)
- Edit profile
- Suspend / Ban (with reason)
- Unsuspend / Unban
- Reset password (sends reset email)
- Issue credit (amount + reason)
- Manual refund approval
- View bookings
- View rewards history
- Impersonate user (audit-logged, requires Owner/Admin role)
- Add internal note

**Flagged/Banned Sub-page:** `/admin/users/flagged`
- Users with fraudRisk > none OR status = suspended/banned
- Chargeback history, abuse reports

**ID Verification Queue:** `/admin/users/verification`
- Users with pending ID verification
- Actions: Approve, Reject (with reason), Request re-upload

---

### H) Promotions & Credits
**Route:** `/admin/promotions`

**Promo Codes (enhanced):**
| Field | Type | Description |
|-------|------|-------------|
| code | text | Unique code string |
| type | enum | PERCENTAGE, FIXED_AMOUNT, POINTS |
| value | number | Discount value |
| minSpend | number | Minimum booking amount (cents) |
| maxDiscount | number | Cap for percentage discounts |
| cityOnly | text[] | Restrict to specific cities |
| propertyOnly | text[] | Restrict to specific properties |
| newUsersOnly | boolean | First booking only |
| maxUses | number | Total usage limit |
| maxUsesPerUser | number | Per-user limit |
| startsAt | datetime | Activation date |
| expiresAt | datetime | Expiry date |
| isActive | boolean | Toggle |

**Travel Credits:** `/admin/promotions/credits`
- User search → Grant credit (amount, reason, expiry)
- Revoke credit (reason)
- Credit history per user
- Bulk grant (CSV upload or segment)

**Referrals:** `/admin/promotions/referrals`
- Referral program toggle (feature flag)
- Referrer reward amount
- Referee reward amount
- View referral chains

---

### I) Content / CMS-lite
**Route:** `/admin/content`

**City Pages:** `/admin/content/cities`
| Field | Type |
|-------|------|
| city | text (unique) |
| heroTitle | text |
| heroSubtitle | text |
| seoTitle | text |
| seoDescription | text |
| featuredPropertyIds | text[] |
| faqs | json (question/answer pairs) |
| isPublished | boolean |

**Banners:** `/admin/content/banners`
| Field | Type |
|-------|------|
| title | text |
| message | text (supports markdown) |
| type | enum (info/warning/promo) |
| placement | enum (global/city-specific) |
| cityFilter | text[] |
| bgColor | text |
| textColor | text |
| linkUrl | text |
| linkText | text |
| startsAt | datetime |
| expiresAt | datetime |
| isActive | boolean |
| priority | number |

**Static Pages:** `/admin/content/pages`
| Field | Type |
|-------|------|
| slug | text (terms, privacy, help, about) |
| title | text |
| content | text (markdown/rich text) |
| seoTitle | text |
| seoDescription | text |
| lastEditedBy | admin ID |
| updatedAt | datetime |

---

### J) Notifications
**Route:** `/admin/notifications`

**Send Notification:** `/admin/notifications/send`
- Segment selector: All users, City watchers, Users with bookings, Users without bookings, Custom email list
- Channel: Email, Push (future), In-app (future)
- Template selector or custom
- Subject, Body (rich text with variables: {{firstName}}, {{email}}, {{city}})
- Preview / Test send (to admin email)
- Schedule or send immediately

**Templates:** `/admin/notifications/templates`
| Field | Type |
|-------|------|
| name | text |
| subject | text |
| body | text (HTML/markdown) |
| variables | text[] |
| category | enum (marketing/transactional/system) |

**Delivery Logs:** `/admin/notifications/logs`
- Notification ID, Recipient, Channel, Status (sent/delivered/bounced/failed), Sent at

---

### K) Support & Disputes
**Route:** `/admin/support`

**Tickets:** `/admin/support/tickets`
| Field | Type |
|-------|------|
| id | UUID |
| userId | ref → users |
| bookingId | ref → bookings (optional) |
| subject | text |
| category | enum (booking_issue/refund_request/account/bug/other) |
| priority | enum (low/medium/high/urgent) |
| status | enum (open/in_progress/waiting_on_user/resolved/closed) |
| assignedTo | ref → adminUsers |
| messages | json[] (sender, message, timestamp, isInternal) |
| slaDeadline | datetime |
| createdAt | datetime |
| resolvedAt | datetime |

**Row Actions:** Assign, Change priority, Change status, Reply, Add internal note, Escalate, Close
**Canned Responses:** Reusable reply templates with variables

**Disputes:** `/admin/support/disputes`
- Chargebacks from Stripe
- Damage claims from hosts
- Actions: Accept, Contest, Refund, Escalate

---

### L) System / Configuration
**Route:** `/admin/system`

**Feature Flags:** `/admin/system/flags`
| Field | Type |
|-------|------|
| key | text (unique) |
| label | text |
| description | text |
| enabled | boolean |
| category | text (feature/experiment/ops) |
| updatedBy | admin ID |
| updatedAt | datetime |

Default flags: `deals_enabled`, `stays_enabled`, `referrals_enabled`, `reviews_enabled`, `gap_night_booking_bypass_min_nights`, `maintenance_mode`, `registration_enabled`, `google_auth_enabled`, `apple_auth_enabled`

**Site Configuration:** `/admin/system/config`
| Key | Type | Description |
|-----|------|-------------|
| platform_fee_percent | number | Service fee % (default 8) |
| default_commission_percent | number | Host commission % |
| tax_rate_percent | number | Tax rate |
| currency | text | Default currency (AUD) |
| min_payout_amount | number | Minimum payout threshold |
| search_boost_featured | number | Featured listing weight |
| search_boost_gap_night | number | Gap night listing weight |
| rate_limit_api | number | API requests per minute |
| rate_limit_auth | number | Auth attempts per minute |
| max_images_per_property | number | Image upload limit |
| points_per_dollar | number | Rewards earning rate |
| review_bonus_points | number | Points for review |
| points_to_credit_ratio | number | Conversion ratio |

**Admin Users & Roles:** `/admin/system/admins`
- CRUD admin users
- Assign roles: Owner, Admin, Support, Finance, Content Manager, Read-only

**Maintenance Mode:** `/admin/system/maintenance`
- Toggle on/off
- Custom maintenance message
- Allowed IPs (admin bypass)
- Environment banner (prod/staging)
- App version display

---

### M) Audit Logs
**Route:** `/admin/logs`

**Enhanced Table:**
| Column | Type | Filterable |
|--------|------|-----------|
| Timestamp | datetime | Date range |
| Admin | text | Dropdown |
| Action | text | Dropdown |
| Module | text | Dropdown |
| Target | text (linked) | Search |
| IP Address | mono | Search |
| Before | json (expandable) | — |
| After | json (expandable) | — |

**Features:**
- Before/after snapshot for mutations
- Filter by module (users/bookings/deals/system/etc.)
- Filter by admin user
- Filter by date range
- Export CSV
- Soft delete indicator
- "Undo" button for safe operations (where reversible)

---

## 3. SCHEMA ADDITIONS

```sql
-- RBAC: Expand admin roles
ALTER TABLE admin_users ADD COLUMN permissions text[] DEFAULT '{}';
-- Roles: owner, admin, support, finance, content_manager, readonly

-- Feature Flags
CREATE TABLE feature_flags (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  category TEXT DEFAULT 'feature',
  updated_by TEXT REFERENCES admin_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Site Configuration (key-value)
CREATE TABLE site_config (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  value_type TEXT NOT NULL DEFAULT 'string', -- string, number, boolean, json
  label TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  updated_by TEXT REFERENCES admin_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Support Tickets
CREATE TABLE support_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  booking_id TEXT,
  subject TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to TEXT REFERENCES admin_users(id),
  messages JSONB DEFAULT '[]',
  sla_deadline TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- CMS: City Pages
CREATE TABLE cms_city_pages (
  id TEXT PRIMARY KEY,
  city TEXT NOT NULL UNIQUE,
  state TEXT,
  hero_title TEXT,
  hero_subtitle TEXT,
  seo_title TEXT,
  seo_description TEXT,
  featured_property_ids TEXT[],
  faqs JSONB DEFAULT '[]',
  is_published BOOLEAN DEFAULT false,
  updated_by TEXT REFERENCES admin_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- CMS: Banners
CREATE TABLE cms_banners (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  placement TEXT NOT NULL DEFAULT 'global',
  city_filter TEXT[],
  bg_color TEXT,
  text_color TEXT,
  link_url TEXT,
  link_text TEXT,
  starts_at TIMESTAMP,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_by TEXT REFERENCES admin_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- CMS: Static Pages
CREATE TABLE cms_static_pages (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  seo_title TEXT,
  seo_description TEXT,
  last_edited_by TEXT REFERENCES admin_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Notification Templates
CREATE TABLE notification_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  variables TEXT[],
  category TEXT DEFAULT 'marketing',
  created_by TEXT REFERENCES admin_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Notification Logs
CREATE TABLE notification_logs (
  id TEXT PRIMARY KEY,
  template_id TEXT REFERENCES notification_templates(id),
  recipient_email TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  sent_by TEXT REFERENCES admin_users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- User flags (trust/safety)
ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'; -- active, suspended, banned
ALTER TABLE users ADD COLUMN fraud_risk TEXT DEFAULT 'none'; -- none, low, medium, high
ALTER TABLE users ADD COLUMN admin_notes TEXT;
ALTER TABLE users ADD COLUMN suspended_at TIMESTAMP;
ALTER TABLE users ADD COLUMN suspended_by TEXT;
ALTER TABLE users ADD COLUMN suspension_reason TEXT;

-- Enhanced audit logs (before/after snapshots)
ALTER TABLE admin_activity_logs ADD COLUMN module TEXT;
ALTER TABLE admin_activity_logs ADD COLUMN before_snapshot JSONB;
ALTER TABLE admin_activity_logs ADD COLUMN after_snapshot JSONB;
```

---

## 4. RBAC PERMISSION MATRIX

| Permission | Owner | Admin | Support | Finance | Content | Read-only |
|-----------|-------|-------|---------|---------|---------|-----------|
| View dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage deals | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage properties | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage inventory | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage users | ✅ | ✅ | ✅ (limited) | ❌ | ❌ | ❌ |
| Ban/suspend users | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Impersonate users | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage bookings | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Cancel/refund | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| View payments | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Process payouts | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Manage promos | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Issue credits | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage content | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Send notifications | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Manage support tickets | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| System configuration | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Feature flags | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage admin users | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View audit logs | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 5. IMPLEMENTATION ROADMAP

### Phase 1: Core Infrastructure (THIS SPRINT)
1. Schema additions (feature_flags, site_config, support_tickets, CMS tables, user flags, enhanced audit logs)
2. RBAC middleware with permission checking
3. New sidebar layout (replace tabs with persistent sidebar nav)
4. Enhanced Dashboard (real metrics, charts via recharts, alerts panel, quick actions)
5. Enhanced Users (status/flags, suspend/ban, notes, credit issuing)
6. Enhanced Bookings (row actions: cancel/refund, notes, status changes)
7. Properties management (approve/reject queue, edit, suspend)
8. Feature flags UI + API
9. Site config UI + API

### Phase 2: Operations
10. Inventory calendar (per-property availability editor)
11. Payments & Payouts module (Stripe integration views)
12. Promo codes enhancement (rules engine: min spend, city-only, new users only)
13. Travel credits management
14. Support tickets (create, assign, reply, close)
15. Audit logs enhancement (before/after snapshots, module filter)

### Phase 3: Content & Communications
16. CMS city pages editor
17. Banners & announcements manager
18. Static pages editor (markdown)
19. Notification composer + templates
20. Notification delivery logs
21. Canned responses for support

### Phase 4: Advanced
22. Reconciliation reports
23. Referral program controls
24. Search ranking controls
25. Impersonate user
26. Bulk actions across all modules
27. Export CSV across all tables
28. Saved views / filter presets

---

## 6. WHAT ADMIN CAN DO WITHOUT CODE AFTER THIS REVAMP

- **Create/edit/pause/feature deals and properties** without touching the database
- **Approve or reject new property listings** from a queue
- **Adjust availability and pricing** per property per date via calendar UI
- **Suspend/ban users**, issue credits, reset passwords, add internal notes
- **Cancel bookings and process refunds** with audit trail
- **Create promo codes** with advanced rules (city-only, min spend, new users only, expiry)
- **Grant/revoke travel credits** to any user with reason tracking
- **Edit city page content** (hero text, SEO, FAQs) without deploying
- **Create/schedule site banners** (global or city-specific) with colors and links
- **Edit Terms/Privacy/Help pages** via markdown editor
- **Send email notifications** to user segments with templates and variables
- **Toggle feature flags** to enable/disable modules instantly
- **Adjust platform fees, tax rates, search ranking weights** from config UI
- **Enable/disable maintenance mode** with custom message
- **Manage support tickets** with assignment, priority, SLA tracking
- **View complete audit trail** of every admin action with before/after snapshots
- **Manage admin team** with role-based access (Owner/Admin/Support/Finance/Content/Read-only)
- **Monitor system health**, revenue trends, conversion rates, top cities from dashboard
