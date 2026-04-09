/*
  # Ajout de l'observation générale aux chantiers

  ## Modifications
  - Ajout de la colonne `general_observation` (text) à la table `chantiers`
    Contient une observation générale rédigée par le technicien concernant le client/chantier.
    Cette observation apparaîtra systématiquement en début de tout rapport PDF généré.

  ## Notes
  - Ce champ est optionnel
  - Il est visible et modifiable par le technicien depuis l'espace chantier
  - Il sera intégré en première section de tous les rapports PDF (global, par zone, et individuel)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chantiers' AND column_name = 'general_observation'
  ) THEN
    ALTER TABLE chantiers ADD COLUMN general_observation text;
  END IF;
END $$;
