-- Create recognition logs table for tracking all face recognition events
CREATE TABLE public.recognition_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recognized_name TEXT NOT NULL,
  confidence DECIMAL(5,4) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  face_embedding_id UUID REFERENCES public.face_embeddings(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.recognition_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for recognition logs
CREATE POLICY "Anyone can view recognition logs" 
ON public.recognition_logs 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert recognition logs" 
ON public.recognition_logs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can delete recognition logs" 
ON public.recognition_logs 
FOR DELETE 
USING (true);

-- Create index for faster queries
CREATE INDEX idx_recognition_logs_timestamp ON public.recognition_logs(timestamp DESC);
CREATE INDEX idx_recognition_logs_name ON public.recognition_logs(recognized_name);

-- Enable realtime for recognition logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.recognition_logs;