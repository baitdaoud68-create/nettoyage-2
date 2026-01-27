/*
  # Ajouter une politique de suppression pour les clients

  1. Sécurité
    - Ajoute une politique DELETE pour permettre aux techniciens authentifiés de supprimer des clients
    - Les suppressions en cascade sont déjà configurées sur les tables liées (categories, interventions, etc.)
*/

CREATE POLICY "Techniciens peuvent supprimer des clients"
  ON clients FOR DELETE
  TO authenticated
  USING (true);
