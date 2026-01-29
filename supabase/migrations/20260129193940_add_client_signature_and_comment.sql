/*
  # Add client signature and comment fields

  1. Changes
    - Add `signature_data` column to clients table (text, stores base64 signature image)
    - Add `client_comment` column to clients table (text, stores client comments)
    - Add `signature_date` column to clients table (timestamptz, stores when signature was added)
  
  2. Security
    - No RLS changes needed - signature and comment are part of client record
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'signature_data'
  ) THEN
    ALTER TABLE clients ADD COLUMN signature_data text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'client_comment'
  ) THEN
    ALTER TABLE clients ADD COLUMN client_comment text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'signature_date'
  ) THEN
    ALTER TABLE clients ADD COLUMN signature_date timestamptz;
  END IF;
END $$;