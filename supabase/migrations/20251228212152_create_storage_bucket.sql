/*
  # Configuration du stockage pour les photos

  ## Création du bucket
  - Bucket `intervention-photos` pour stocker les photos
  
  ## Sécurité
  - Les techniciens authentifiés peuvent uploader des photos
  - Tout le monde peut voir les photos (pour l'accès client)
*/

-- Créer le bucket pour les photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('intervention-photos', 'intervention-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Politique pour permettre aux techniciens d'uploader
CREATE POLICY "Techniciens peuvent uploader des photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'intervention-photos');

-- Politique pour permettre à tout le monde de voir les photos
CREATE POLICY "Tout le monde peut voir les photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'intervention-photos');

-- Politique pour permettre aux techniciens de supprimer
CREATE POLICY "Techniciens peuvent supprimer des photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'intervention-photos');