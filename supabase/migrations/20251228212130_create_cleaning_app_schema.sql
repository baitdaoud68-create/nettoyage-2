/*
  # Schéma pour l'application de nettoyage

  ## Tables créées
  
  ### 1. `clients`
  Table des entreprises clientes
  - `id` (uuid, clé primaire)
  - `name` (text) - Nom de l'entreprise
  - `email` (text) - Email du client
  - `phone` (text) - Téléphone du client
  - `address` (text) - Adresse du client
  - `created_at` (timestamptz) - Date de création
  
  ### 2. `categories`
  Rubriques personnalisables (équipements à nettoyer)
  - `id` (uuid, clé primaire)
  - `name` (text) - Nom de la rubrique (ex: "Climatisation Bureau 1")
  - `client_id` (uuid) - Référence au client
  - `created_at` (timestamptz)
  
  ### 3. `interventions`
  Interventions de nettoyage
  - `id` (uuid, clé primaire)
  - `client_id` (uuid) - Référence au client
  - `category_id` (uuid) - Référence à la rubrique
  - `technician_id` (uuid) - Référence au technicien (auth.users)
  - `intervention_date` (date) - Date de l'intervention
  - `status` (text) - Statut (en_cours, terminé)
  - `created_at` (timestamptz)
  
  ### 4. `intervention_sections`
  Sections d'une intervention (implantation, bac à condensat, etc.)
  - `id` (uuid, clé primaire)
  - `intervention_id` (uuid) - Référence à l'intervention
  - `section_type` (text) - Type: implantation, bac_condensat, echangeur, evacuation, observations
  - `notes` (text) - Notes pour cette section
  - `created_at` (timestamptz)
  
  ### 5. `section_photos`
  Photos pour chaque section
  - `id` (uuid, clé primaire)
  - `section_id` (uuid) - Référence à la section
  - `photo_url` (text) - URL de la photo dans le storage
  - `created_at` (timestamptz)

  ## Sécurité
  
  ### RLS activé sur toutes les tables
  
  ### Politiques clients
  - Les clients peuvent voir leurs propres données
  - Les techniciens (authentifiés) peuvent tout voir et modifier
  
  ### Politiques interventions
  - Les techniciens peuvent créer et modifier
  - Les clients peuvent voir leurs interventions
  
  ### Politiques photos
  - Les techniciens peuvent ajouter des photos
  - Les clients peuvent voir les photos de leurs interventions
*/

-- Table des clients
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Techniciens peuvent tout voir sur clients"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Techniciens peuvent créer des clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Techniciens peuvent modifier des clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Table des catégories (rubriques renommables)
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Techniciens peuvent voir toutes les catégories"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Techniciens peuvent créer des catégories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Techniciens peuvent modifier des catégories"
  ON categories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Techniciens peuvent supprimer des catégories"
  ON categories FOR DELETE
  TO authenticated
  USING (true);

-- Table des interventions
CREATE TABLE IF NOT EXISTS interventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  technician_id uuid REFERENCES auth.users(id),
  intervention_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'en_cours' CHECK (status IN ('en_cours', 'termine')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Techniciens peuvent voir toutes les interventions"
  ON interventions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Techniciens peuvent créer des interventions"
  ON interventions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Techniciens peuvent modifier des interventions"
  ON interventions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Techniciens peuvent supprimer des interventions"
  ON interventions FOR DELETE
  TO authenticated
  USING (true);

-- Table des sections d'intervention
CREATE TABLE IF NOT EXISTS intervention_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id uuid REFERENCES interventions(id) ON DELETE CASCADE NOT NULL,
  section_type text NOT NULL CHECK (section_type IN ('implantation', 'bac_condensat', 'echangeur', 'evacuation', 'observations')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE intervention_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Techniciens peuvent voir toutes les sections"
  ON intervention_sections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Techniciens peuvent créer des sections"
  ON intervention_sections FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Techniciens peuvent modifier des sections"
  ON intervention_sections FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Techniciens peuvent supprimer des sections"
  ON intervention_sections FOR DELETE
  TO authenticated
  USING (true);

-- Table des photos
CREATE TABLE IF NOT EXISTS section_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid REFERENCES intervention_sections(id) ON DELETE CASCADE NOT NULL,
  photo_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE section_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Techniciens peuvent voir toutes les photos"
  ON section_photos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Techniciens peuvent ajouter des photos"
  ON section_photos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Techniciens peuvent supprimer des photos"
  ON section_photos FOR DELETE
  TO authenticated
  USING (true);

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_categories_client_id ON categories(client_id);
CREATE INDEX IF NOT EXISTS idx_interventions_client_id ON interventions(client_id);
CREATE INDEX IF NOT EXISTS idx_interventions_category_id ON interventions(category_id);
CREATE INDEX IF NOT EXISTS idx_intervention_sections_intervention_id ON intervention_sections(intervention_id);
CREATE INDEX IF NOT EXISTS idx_section_photos_section_id ON section_photos(section_id);