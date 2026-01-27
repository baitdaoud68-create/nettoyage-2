/*
  # Fix client deletion policy

  1. Changes
    - Drop and recreate the DELETE policy for clients table
    - Ensures authenticated users can delete clients
    - Maintains cascade deletion for related records (chantiers, categories, interventions)

  2. Security
    - Policy restricted to authenticated users only
    - Cascade deletes handle cleanup of related data
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Techniciens peuvent supprimer des clients" ON clients;

-- Recreate the policy with proper configuration
CREATE POLICY "Techniciens peuvent supprimer des clients"
  ON clients 
  FOR DELETE 
  TO authenticated
  USING (true);
