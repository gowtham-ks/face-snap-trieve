import { useState, useEffect, useCallback, useRef } from 'react';
import { Scan, Loader2, Maximize, Minimize, Keyboard } from 'lucide-react';
import { WebcamCapture } from '@/components/FaceRecognition/WebcamCapture';
import { RegisterDialog } from '@/components/FaceRecognition/RegisterDialog';
import { SearchBox } from '@/components/FaceRecognition/SearchBox';
import { RecognitionDisplay } from '@/components/FaceRecognition/RecognitionDisplay';
import { UsersList } from '@/components/FaceRecognition/UsersList';
import { KeyboardShortcutsDialog } from '@/components/KeyboardShortcutsDialog';
import { Trie } from '@/utils/trie';
import { faceRecognition } from '@/utils/faceRecognition';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { requestNotificationPermission, notifyFaceRecognized } from '@/utils/notifications';
import { Button } from '@/components/ui/button';

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
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { toast } = useToast();
  const searchBoxRef = useRef<HTMLDivElement>(null);

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
    requestNotificationPermission();
  }, [loadFaceData]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'c',
      ctrl: true,
      action: () => setIsActive(!isActive),
      description: 'Toggle Camera',
    },
    {
      key: 'F11',
      action: toggleFullscreen,
      description: 'Toggle Fullscreen',
    },
    {
      key: '?',
      shift: true,
      action: () => setShowShortcuts(true),
      description: 'Show Keyboard Shortcuts',
    },
  ]);

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
            
            // Send desktop notification
            notifyFaceRecognized(result.name, result.confidence);
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
        {/* Header with Desktop Controls */}
        <header className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl gradient-primary glow">
                <Scan className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  Real-Time Face Recognition
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Advanced AI-powered detection with desktop features
                </p>
              </div>
            </div>
            
            {/* Desktop Controls */}
            <div className="hidden md:flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowShortcuts(true)}
                title="Keyboard Shortcuts (Shift + ?)"
              >
                <Keyboard className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={toggleFullscreen}
                title="Toggle Fullscreen (F11)"
              >
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <p className="text-base text-muted-foreground max-w-3xl">
            Hash Map + Trie data structures for lightning-fast lookup and autocomplete. Desktop notifications, keyboard shortcuts, and fullscreen mode enabled.
          </p>
        </header>

        {/* Desktop-Optimized Control Panel */}
        <div className="glass-card p-6 rounded-2xl space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
            <div ref={searchBoxRef} className="flex-1">
              <SearchBox trie={trie} onSelect={handleSearchSelect} />
            </div>
            
            <div className="flex gap-3">
              <RegisterDialog 
                onRegister={loadFaceData} 
                disabled={!faceRecognition.isReady()} 
              />
            </div>
          </div>
        </div>

        {/* Desktop Layout: Larger Video + Results Side-by-Side */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <WebcamCapture
              isActive={isActive}
              onFrame={handleFrame}
              onToggle={() => setIsActive(!isActive)}
            />
          </div>
          
          <div className="xl:col-span-1">
            {isActive && (
              <RecognitionDisplay
                results={recognitionResults}
                isProcessing={isProcessing}
              />
            )}
          </div>
        </div>

        {/* Users List */}
        <UsersList users={users} onUpdate={loadFaceData} />
        
        {/* Keyboard Shortcuts Dialog */}
        <KeyboardShortcutsDialog 
          open={showShortcuts}
          onOpenChange={setShowShortcuts}
        />
      </div>
    </div>
  );
};

export default Index;
