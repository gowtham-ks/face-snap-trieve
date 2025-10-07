-- Create face_embeddings table to store user face data
CREATE TABLE IF NOT EXISTS public.face_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  embedding FLOAT[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.face_embeddings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read face embeddings (for recognition)
CREATE POLICY "Anyone can read face embeddings"
  ON public.face_embeddings
  FOR SELECT
  USING (true);

-- Allow anyone to insert new face embeddings (for registration)
CREATE POLICY "Anyone can insert face embeddings"
  ON public.face_embeddings
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to delete face embeddings
CREATE POLICY "Anyone can delete face embeddings"
  ON public.face_embeddings
  FOR DELETE
  USING (true);

-- Create index on name for faster Trie-like searches
CREATE INDEX IF NOT EXISTS idx_face_embeddings_name 
  ON public.face_embeddings USING btree (name);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_face_embeddings_updated_at
  BEFORE UPDATE ON public.face_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();