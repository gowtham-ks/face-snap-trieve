import { useState, useEffect, useCallback } from 'react';
import { Scan, Loader2 } from 'lucide-react';
import { WebcamCapture } from '@/components/FaceRecognition/WebcamCapture';
import { RegisterDialog } from '@/components/FaceRecognition/RegisterDialog';
import { SearchBox } from '@/components/FaceRecognition/SearchBox';
import { RecognitionDisplay } from '@/components/FaceRecognition/RecognitionDisplay';
import { UsersList } from '@/components/FaceRecognition/UsersList';
import { Trie } from '@/utils/trie';
import { faceRecognition } from '@/utils/faceRecognition';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RecognitionResult {
  name: string;
  confidence: number;
  timestamp: number;
}

interface User {
  id: string;
  name: string;
  created_at: string;
  embedding: number[];
}

const Index = () => {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognitionResults, setRecognitionResults] = useState<RecognitionResult[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [trie] = useState(() => new Trie());
  const { toast } = useToast();

  // Load face data and initialize
  const loadFaceData = useCallback(async () => {
    try {
      // Load models
      await faceRecognition.loadModels();

      // Fetch users from database
      const { data, error } = await supabase
        .from('face_embeddings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setUsers(data);
        
        // Load into hash map
        faceRecognition.loadFacesFromData(data);

        // Build trie for search
        data.forEach((user: User) => {
          trie.insert(user.name);
        });
      }

      setIsLoading(false);
    } catch (error: any) {
      console.error('Error loading face data:', error);
      toast({
        title: 'Initialization Error',
        description: error.message || 'Failed to initialize face recognition',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  }, [trie, toast]);

  useEffect(() => {
    loadFaceData();
  }, [loadFaceData]);

  // Handle frame processing for recognition
  const handleFrame = async (video: HTMLVideoElement) => {
    if (!isActive || isProcessing) return;

    setIsProcessing(true);

    try {
      const detections = await faceRecognition.detectAllFaces(video);

      if (detections && detections.length > 0) {
        const newResults: RecognitionResult[] = [];

        for (const detection of detections) {
          const embedding = Array.from(detection.descriptor);
          const result = faceRecognition.recognizeFace(embedding);

          if (result) {
            newResults.push({
              name: result.name,
              confidence: result.confidence,
              timestamp: Date.now(),
            });
          }
        }

        if (newResults.length > 0) {
          setRecognitionResults(prev => {
            // Keep only last 10 results
            const updated = [...newResults, ...prev].slice(0, 10);
            return updated;
          });
        }
      }
    } catch (error) {
      console.error('Recognition error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSearchSelect = (name: string) => {
    const user = users.find(u => u.name.toLowerCase() === name.toLowerCase());
    if (user) {
      toast({
        title: 'User Found',
        description: `${user.name} registered on ${new Date(user.created_at).toLocaleDateString()}`,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">Initializing face recognition...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 rounded-2xl gradient-primary glow">
              <Scan className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Real-Time Face Recognition
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Advanced AI-powered face detection and recognition using Hash Map + Trie data structures
            for lightning-fast lookup and autocomplete
          </p>
        </header>

        {/* Search Box */}
        <div className="flex justify-center">
          <SearchBox trie={trie} onSelect={handleSearchSelect} />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 justify-center">
          <RegisterDialog 
            onRegister={loadFaceData} 
            disabled={!faceRecognition.isReady()} 
          />
        </div>

        {/* Webcam */}
        <WebcamCapture
          isActive={isActive}
          onFrame={handleFrame}
          onToggle={() => setIsActive(!isActive)}
        />

        {/* Recognition Results */}
        {isActive && (
          <RecognitionDisplay
            results={recognitionResults}
            isProcessing={isProcessing}
          />
        )}

        {/* Users List */}
        <UsersList users={users} onUpdate={loadFaceData} />
      </div>
    </div>
  );
};

export default Index;
