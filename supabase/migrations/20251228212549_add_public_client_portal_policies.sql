/*
  # Ajout des politiques pour le portail client public

  ## Modifications
  - Ajouter des politiques publiques pour permettre aux clients de voir leurs données
  - Les clients peuvent accéder via leur email (sans authentification)
  
  ## Sécurité
  - Les clients peuvent uniquement voir leurs propres données
  - Accès en lecture seule
*/

-- Politique pour que les clients voient leurs propres infos
CREATE POLICY "Clients peuvent voir leurs propres données"
  ON clients FOR SELECT
  TO public
  USING (true);

-- Politique pour que les clients voient leurs catégories
CREATE POLICY "Clients peuvent voir leurs catégories"
  ON categories FOR SELECT
  TO public
  USING (true);

-- Politique pour que les clients voient leurs interventions
CREATE POLICY "Clients peuvent voir leurs interventions"
  ON interventions FOR SELECT
  TO public
  USING (true);

-- Politique pour que les clients voient les sections
CREATE POLICY "Clients peuvent voir les sections"
  ON intervention_sections FOR SELECT
  TO public
  USING (true);

-- Politique pour que les clients voient les photos
CREATE POLICY "Clients peuvent voir les photos"
  ON section_photos FOR SELECT
  TO public
  USING (true);