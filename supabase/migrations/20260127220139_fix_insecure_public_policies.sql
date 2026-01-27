/*
  # Correction des politiques RLS publiques dangereuses

  ## Problème
  Les politiques actuelles permettent à n'importe qui (public) de voir TOUTES les données
  avec `USING (true)`, ce qui est une faille de sécurité majeure.

  ## Solution
  1. Supprimer toutes les politiques publiques dangereuses
  2. Les clients devront passer par l'authentification ou une edge function sécurisée
  3. Seuls les techniciens authentifiés peuvent accéder aux données

  ## Modifications
  - Suppression de toutes les politiques `TO public` avec `USING (true)`
  - Conservation uniquement des politiques authentifiées sécurisées
*/

-- Supprimer les politiques publiques dangereuses sur clients
DROP POLICY IF EXISTS "Clients peuvent voir leurs propres données" ON clients;

-- Supprimer les politiques publiques dangereuses sur categories
DROP POLICY IF EXISTS "Clients peuvent voir leurs catégories" ON categories;

-- Supprimer les politiques publiques dangereuses sur interventions
DROP POLICY IF EXISTS "Clients peuvent voir leurs interventions" ON interventions;

-- Supprimer les politiques publiques dangereuses sur intervention_sections
DROP POLICY IF EXISTS "Clients peuvent voir les sections" ON intervention_sections;

-- Supprimer les politiques publiques dangereuses sur section_photos
DROP POLICY IF EXISTS "Clients peuvent voir les photos" ON section_photos;

-- Supprimer les politiques publiques dangereuses sur chantiers
DROP POLICY IF EXISTS "Public peut voir les chantiers" ON chantiers;

-- Les politiques pour les techniciens authentifiés restent en place
-- Elles sont sécurisées car elles utilisent l'authentification Supabase