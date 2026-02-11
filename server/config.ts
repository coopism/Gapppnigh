/**
 * Application Configuration Constants
 * Fix #21: Centralize magic numbers to make them configurable
 */

// Session durations (in hours)
export const SESSION_DURATION_HOURS = {
  HOST: 48,
  ADMIN: 24,
  USER: 168, // 7 days
};

// Session durations (in milliseconds)
export const SESSION_DURATION_MS = {
  HOST: SESSION_DURATION_HOURS.HOST * 60 * 60 * 1000,
  ADMIN: SESSION_DURATION_HOURS.ADMIN * 60 * 60 * 1000,
  USER: SESSION_DURATION_HOURS.USER * 60 * 60 * 1000,
};

// Rate limiting defaults
export const RATE_LIMITS = {
  AUTH_ATTEMPTS: 5,
  AUTH_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  BOOKING_ATTEMPTS: 10,
  BOOKING_WINDOW_MS: 60 * 60 * 1000, // 1 hour
  PAYMENT_ATTEMPTS: 30,
  PAYMENT_WINDOW_MS: 60 * 60 * 1000, // 1 hour
  API_ATTEMPTS: 100,
  API_WINDOW_MS: 60 * 1000, // 1 minute
  UPLOAD_ATTEMPTS: 20,
  UPLOAD_WINDOW_MS: 60 * 60 * 1000, // 1 hour
};

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100,
  ACTIVITY_LOGS_MAX_LIMIT: 500,
};

// Deal hold duration (in milliseconds)
export const HOLD_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// File upload limits
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES_PER_UPLOAD: 10,
  ALLOWED_EXTENSIONS: [".jpg", ".jpeg", ".png", ".webp"],
};

// Property validation limits
export const PROPERTY_LIMITS = {
  MAX_TITLE_LENGTH: 200,
  MAX_DESCRIPTION_LENGTH: 5000,
  MAX_ADDRESS_LENGTH: 500,
  MAX_AMENITIES: 50,
  MAX_GUESTS: 100,
  MAX_BEDROOMS: 50,
  MAX_BEDS: 100,
  MIN_NIGHTS: 1,
  MAX_NIGHTS: 365,
  MIN_BASE_RATE: 100, // cents ($1)
};

// Password requirements
export const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  BCRYPT_ROUNDS: 12,
};

// Email retry configuration
export const EMAIL_RETRY = {
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 5000, // 5 seconds between retries
};

// Activity log retention (in days)
export const LOG_RETENTION_DAYS = 90;

// API Version
export const API_VERSION = "v1";
