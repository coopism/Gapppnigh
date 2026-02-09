-- Create admin user
-- Password: ChangeMe123! (hashed with bcrypt, 10 rounds)
INSERT INTO admin_users (id, email, password_hash, name, role, is_active, created_at, updated_at)
VALUES (
  gen_random_uuid()::text,
  'admin@gapnight.com',
  '$2b$10$1yD/tT8KntmCiUi1ZBWdoOtELu7TfQqnTPtTWtjMOmAuz0jaDDITS',
  'System Administrator',
  'super_admin',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;
