# GapNight Security Documentation

## Overview

This document outlines the security measures implemented in the GapNight user authentication system.

## Authentication Architecture

### Session Management
- **Session Storage**: Database-backed sessions with hashed tokens
- **Session Duration**: 
  - Default: 24 hours
  - "Remember me": 30 days
- **Cookie Configuration**:
  - `HttpOnly`: Yes (prevents XSS access to session)
  - `Secure`: Yes in production (HTTPS only)
  - `SameSite`: Lax (CSRF protection)
- **Session Invalidation**:
  - On logout
  - On password change (all sessions)
  - "Log out of all devices" feature

### Password Security
- **Hashing Algorithm**: bcrypt with 12 salt rounds
- **Password Policy**:
  - Minimum 10 characters
  - Must include at least 3 of: uppercase, lowercase, number, symbol
- **Password Reset**:
  - One-time use tokens
  - 1 hour expiry
  - Tokens hashed before storage

### CSRF Protection
- Double-submit cookie pattern
- CSRF token required for all state-changing requests (POST, PUT, DELETE)
- Token stored in non-HttpOnly cookie for JavaScript access
- Token validated via `X-CSRF-Token` header

### Rate Limiting
| Endpoint | Limit | Window |
|----------|-------|--------|
| Login | 10 attempts | 1 minute |
| Password reset request | 3 requests | 1 hour |
| Email verification resend | 3 requests | 1 hour |

### Email Verification
- Required for full account access
- Token expiry: 24 hours
- Rate-limited resend

## Security Headers

The following security headers are applied to all responses:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; ...
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(self)
Strict-Transport-Security: max-age=31536000; includeSubDomains (production only)
```

## Database Security

### User Table
- Passwords stored as bcrypt hashes only
- Soft delete implemented (preserves audit trail)
- Email verification status tracked

### Session Table
- Only session hash stored (not raw token)
- User agent and IP logged for audit
- Revocation timestamp for invalidated sessions

### Email Tokens Table
- Only token hash stored
- One-time use enforcement
- Automatic expiry

## Audit Logging

Security events logged (server-side only):
- Login success/failure (no password logged)
- Signup
- Password reset requested
- Password changed
- Email verified
- Rate limit triggers
- Account deletion

## Environment Variables

Required for authentication:

```env
# Session secret (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
SESSION_SECRET=<random-32-byte-hex>

# Email service (Resend)
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=GapNight <bookings@gapnight.com>

# Base URL for email links
BASE_URL=https://www.gapnight.com
```

## Security Best Practices

### For Developers
1. Never log passwords or tokens
2. Always use parameterized queries (Drizzle ORM handles this)
3. Validate all inputs server-side
4. Use timing-safe comparisons for sensitive values
5. Keep dependencies updated

### For Users
1. Use strong, unique passwords
2. Verify your email address
3. Log out on shared devices
4. Use "Log out of all devices" if account compromised

## Vulnerability Reporting

If you discover a security vulnerability, please email security@gapnight.com with:
1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact

Do not publicly disclose until patched.

## Compliance Notes

- Passwords never stored in plaintext
- Personal data can be deleted (soft delete with anonymization)
- Session data retained for security auditing
- GDPR-compliant data handling

---

*Last updated: February 3, 2026*
