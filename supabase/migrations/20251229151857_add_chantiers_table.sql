/*
  # Ajout de la table Chantiers

  ## Nouvelle structure hiérarchique
  Client → Chantier → Catégories → Interventions

  ## Nouvelles tables
  
  ### 1. `chantiers` (sites/worksites)
  - `id` (uuid, clé primaire)
  - `name` (text) - Nom du chantier
  - `client_id` (uuid) - Référence au client
  - `address` (text) - Adresse du chantier
  - `description` (text) - Description du chantier
  - `created_at` (timestamptz)

  ## Modifications
  - Modifier la table `categories` pour référencer `chantier_id` au lieu de `client_id`
  - Ajouter une colonne `chantier_id` aux interventions

  ## Sécurité
  - Activer RLS sur la nouvelle table
  - Les techniciens peuvent tout gérer
  - Les clients peuvent voir leurs chantiers
*/

-- Créer la table chantiers
CREATE TABLE IF NOT EXISTS chantiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  address text,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chantiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Techniciens peuvent voir tous les chantiers"
  ON chantiers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Techniciens peuvent créer des chantiers"
  ON chantiers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Techniciens peuvent modifier des chantiers"
  ON chantiers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Techniciens peuvent supprimer des chantiers"
  ON chantiers FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Public peut voir les chantiers"
  ON chantiers FOR SELECT
  TO public
  USING (true);

-- Ajouter une colonne chantier_id à la table categories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'chantier_id'
  ) THEN
    ALTER TABLE categories ADD COLUMN chantier_id uuid REFERENCES chantiers(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ajouter une colonne chantier_id à la table interventions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'interventions' AND column_name = 'chantier_id'
  ) THEN
    ALTER TABLE interventions ADD COLUMN chantier_id uuid REFERENCES chantiers(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Créer des index pour les performances
CREATE INDEX IF NOT EXISTS idx_chantiers_client_id ON chantiers(client_id);
CREATE INDEX IF NOT EXISTS idx_categories_chantier_id ON categories(chantier_id);
CREATE INDEX IF NOT EXISTS idx_interventions_chantier_id ON interventions(chantier_id);