/*
  # Mise à jour des politiques RLS pour les interventions clôturées

  ## Modifications
  
  1. Mise à jour de la politique publique pour les interventions
    - Les utilisateurs publics (clients) ne peuvent voir que les interventions clôturées (is_closed = true)
    - Cela renforce la sécurité au niveau de la base de données
  
  2. Mise à jour de la politique publique pour les sections d'intervention
    - Les utilisateurs publics ne peuvent voir que les sections des interventions clôturées
  
  3. Mise à jour de la politique publique pour les photos
    - Les utilisateurs publics ne peuvent voir que les photos des sections d'interventions clôturées
  
  ## Notes importantes
  
  - Seules les interventions explicitement clôturées par le technicien sont visibles aux clients
  - Les politiques pour les techniciens authentifiés ne changent pas
  - Double protection : filtrage au niveau application ET au niveau base de données
*/

-- Supprimer l'ancienne politique pour les interventions publiques
DROP POLICY IF EXISTS "Clients peuvent voir leurs interventions" ON interventions;

-- Créer la nouvelle politique qui ne montre que les interventions clôturées
CREATE POLICY "Clients peuvent voir leurs interventions clôturées"
  ON interventions FOR SELECT
  TO public
  USING (is_closed = true);

-- Supprimer l'ancienne politique pour les sections publiques
DROP POLICY IF EXISTS "Clients peuvent voir les sections" ON intervention_sections;

-- Créer la nouvelle politique qui ne montre que les sections d'interventions clôturées
CREATE POLICY "Clients peuvent voir les sections des interventions clôturées"
  ON intervention_sections FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM interventions
      WHERE interventions.id = intervention_sections.intervention_id
      AND interventions.is_closed = true
    )
  );

-- Supprimer l'ancienne politique pour les photos publiques
DROP POLICY IF EXISTS "Clients peuvent voir les photos" ON section_photos;

-- Créer la nouvelle politique qui ne montre que les photos des sections d'interventions clôturées
CREATE POLICY "Clients peuvent voir les photos des interventions clôturées"
  ON section_photos FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM intervention_sections
      JOIN interventions ON interventions.id = intervention_sections.intervention_id
      WHERE intervention_sections.id = section_photos.section_id
      AND interventions.is_closed = true
    )
  );