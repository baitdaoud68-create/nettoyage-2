/*
  # Ajouter des codes d'accès pour le portail client

  1. Modifications
    - Ajouter la colonne `access_code` à la table `clients`
      - Type: text
      - Unique et non-null
      - Index pour des recherches rapides
    - Générer des codes uniques pour les clients existants

  2. Notes
    - Les codes générés sont des chaînes aléatoires de 12 caractères
    - Format: ABC123XYZ456 (alphanumériques majuscules)
    - Les nouveaux clients devront recevoir un code lors de leur création
*/

-- Ajouter la colonne access_code
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS access_code text;

-- Générer des codes uniques pour les clients existants
DO $$
DECLARE
  client_record RECORD;
  new_code text;
  code_exists boolean;
BEGIN
  FOR client_record IN SELECT id FROM clients WHERE access_code IS NULL
  LOOP
    LOOP
      -- Générer un code de 12 caractères
      new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 12));
      
      -- Vérifier si le code existe déjà
      SELECT EXISTS(SELECT 1 FROM clients WHERE access_code = new_code) INTO code_exists;
      
      EXIT WHEN NOT code_exists;
    END LOOP;
    
    UPDATE clients SET access_code = new_code WHERE id = client_record.id;
  END LOOP;
END $$;

-- Rendre la colonne obligatoire et unique
ALTER TABLE clients 
ALTER COLUMN access_code SET NOT NULL;

ALTER TABLE clients 
ADD CONSTRAINT clients_access_code_unique UNIQUE (access_code);

-- Créer un index pour des recherches rapides
CREATE INDEX IF NOT EXISTS idx_clients_access_code ON clients(access_code);