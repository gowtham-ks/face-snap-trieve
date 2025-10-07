-- Fix function search path security issue by recreating with proper settings
DROP TRIGGER IF EXISTS update_face_embeddings_updated_at ON public.face_embeddings;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_face_embeddings_updated_at
  BEFORE UPDATE ON public.face_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();