/*
  # Ajout du statut de clôture des interventions

  ## Modifications
  
  1. Modifications de la table `interventions`
    - Ajout de la colonne `is_closed` (boolean) pour indiquer si l'intervention est clôturée et visible au client
    - Par défaut, les interventions ne sont pas clôturées (false)
  
  ## Notes importantes
  
  - Une intervention peut être terminée (status='termine') mais pas encore clôturée
  - Seules les interventions clôturées (is_closed=true) seront visibles sur le portail client
  - Le technicien doit explicitement clôturer l'intervention pour la rendre visible au client
*/

-- Ajouter la colonne is_closed à la table interventions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'interventions' AND column_name = 'is_closed'
  ) THEN
    ALTER TABLE interventions ADD COLUMN is_closed boolean DEFAULT false;
  END IF;
END $$;

-- Créer un index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_interventions_is_closed ON interventions(is_closed);