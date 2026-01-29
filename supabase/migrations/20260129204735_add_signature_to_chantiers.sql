/*
  # Ajout de signature et commentaires aux chantiers

  1. Modifications
    - Ajout de la colonne `signature_data` (text) à la table `chantiers`
      Contient les données de la signature au format base64
    - Ajout de la colonne `client_comment` (text) à la table `chantiers`
      Contient les commentaires optionnels du client
    - Ajout de la colonne `signature_date` (timestamptz) à la table `chantiers`
      Date et heure de la signature
  
  2. Notes
    - Ces colonnes permettent de capturer la signature et les commentaires du client pour chaque chantier
    - La signature et les commentaires apparaîtront en fin de rapport d'intervention
    - Ces champs sont optionnels et peuvent être remplis à tout moment
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chantiers' AND column_name = 'signature_data'
  ) THEN
    ALTER TABLE chantiers ADD COLUMN signature_data text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chantiers' AND column_name = 'client_comment'
  ) THEN
    ALTER TABLE chantiers ADD COLUMN client_comment text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chantiers' AND column_name = 'signature_date'
  ) THEN
    ALTER TABLE chantiers ADD COLUMN signature_date timestamptz;
  END IF;
END $$;