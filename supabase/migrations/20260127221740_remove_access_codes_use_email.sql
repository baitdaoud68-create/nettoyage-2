/*
  # Supprimer les codes d'accès et revenir à l'email

  1. Modifications
    - Supprimer la colonne `access_code` de la table `clients`
    - Supprimer l'index et la contrainte associés
    
  2. Notes
    - Les clients se connecteront désormais avec leur email
    - L'email est déjà unique dans la table clients
*/

-- Supprimer l'index
DROP INDEX IF EXISTS idx_clients_access_code;

-- Supprimer la contrainte unique
ALTER TABLE clients 
DROP CONSTRAINT IF EXISTS clients_access_code_unique;

-- Supprimer la colonne access_code
ALTER TABLE clients 
DROP COLUMN IF EXISTS access_code;