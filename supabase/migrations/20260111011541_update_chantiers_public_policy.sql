/*
  # Mise à jour de la politique RLS pour les chantiers

  ## Modifications
  
  1. Mise à jour de la politique publique pour les chantiers
    - Les utilisateurs publics (clients) ne peuvent voir que les chantiers qui ont au moins une intervention clôturée
    - Cela garantit que les chantiers sans interventions clôturées restent invisibles pour les clients
  
  ## Notes importantes
  
  - Un chantier devient visible uniquement quand au moins une de ses interventions est clôturée
  - Les politiques pour les techniciens authentifiés ne changent pas
*/

-- Supprimer l'ancienne politique pour les chantiers publics si elle existe
DROP POLICY IF EXISTS "Clients peuvent voir leurs chantiers" ON chantiers;

-- Créer la nouvelle politique qui ne montre que les chantiers avec interventions clôturées
CREATE POLICY "Clients peuvent voir les chantiers avec interventions clôturées"
  ON chantiers FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM interventions
      WHERE interventions.chantier_id = chantiers.id
      AND interventions.is_closed = true
    )
  );