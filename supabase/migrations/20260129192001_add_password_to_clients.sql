/*
  # Add password authentication for clients

  1. Changes
    - Add `password_hash` column to `clients` table (nullable initially for migration)
    - Add `must_change_password` column to track if client needs to change password
    - Add `password_changed_at` column to track when password was last changed
  
  2. Security
    - Password hashes will be managed via edge functions
    - Clients must change default password on first login
*/

-- Add password columns to clients table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE clients ADD COLUMN password_hash text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'must_change_password'
  ) THEN
    ALTER TABLE clients ADD COLUMN must_change_password boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'password_changed_at'
  ) THEN
    ALTER TABLE clients ADD COLUMN password_changed_at timestamptz;
  END IF;
END $$;