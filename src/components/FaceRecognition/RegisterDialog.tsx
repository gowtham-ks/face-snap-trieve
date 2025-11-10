import { useState, useRef, useEffect } from 'react';
import { UserPlus, Loader2, SwitchCamera, CheckCircle2, AlertCircle, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { faceRecognition } from '@/utils/faceRecognition';
import { supabase } from '@/integrations/supabase/client';
import { notifyFaceRecognized } from '@/utils/notifications';
import { assessFaceQuality, getQualityFeedbackMessage, type FaceQualityMetrics } from '@/utils/faceQuality';
import { Progress } from '@/components/ui/progress';

interface RegisterDialogProps {
  onRegister: () => void;
  disabled?: boolean;
}

export const RegisterDialog = ({ onRegister, disabled }: RegisterDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [qualityMetrics, setQualityMetrics] = useState<FaceQualityMetrics | null>(null);
  const [captureCount, setCaptureCount] = useState(0);
  const [capturedSamples, setCapturedSamples] = useState<number[][]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();
  const { toast } = useToast();

  const TOTAL_SAMPLES = 3;

  const startCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: 'Camera Error',
        description: 'Failed to access camera',
        variant: 'destructive',
      });
    }
  };

  const stopCapture = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const toggleCamera = async () => {
    stopCapture();
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (error) {
      console.error('Error switching camera:', error);
      toast({
        title: 'Camera Switch Failed',
        description: 'Unable to access the requested camera',
        variant: 'destructive',
      });
      // Revert to previous facing mode if switch fails
      setFacingMode(facingMode);
    }
  };

  // Live face detection and quality assessment
  useEffect(() => {
    if (!open || !videoRef.current) return;

    const detectFaceLoop = async () => {
      if (!videoRef.current || !canvasRef.current) return;

      const detection = await faceRecognition.detectAllFaces(videoRef.current);
      
      if (detection && detection.length > 0) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw bounding box for first detected face
        const face = detection[0];
        const box = face.detection.box;
        
        // Assess quality
        const metrics = assessFaceQuality(face, videoRef.current.videoWidth, videoRef.current.videoHeight);
        setQualityMetrics(metrics);

        // Draw box with color based on quality
        ctx.strokeStyle = metrics.overallScore > 75 ? '#10b981' : metrics.overallScore > 50 ? '#f59e0b' : '#ef4444';
        ctx.lineWidth = 3;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        // Draw landmarks
        ctx.fillStyle = ctx.strokeStyle;
        face.landmarks.positions.forEach((point: any) => {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
          ctx.fill();
        });
      } else {
        setQualityMetrics(null);
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }

      animationFrameRef.current = requestAnimationFrame(detectFaceLoop);
    };

    detectFaceLoop();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [open]);

  const captureSample = async (): Promise<number[] | null> => {
    if (!videoRef.current) return null;
    return await faceRecognition.detectFace(videoRef.current);
  };

  const handleStartCapture = async () => {
    if (!name.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter a name',
        variant: 'destructive',
      });
      return;
    }

    if (!qualityMetrics || qualityMetrics.overallScore < 60) {
      toast({
        title: 'Improve Face Quality',
        description: 'Please adjust your position for better quality',
        variant: 'destructive',
      });
      return;
    }

    setIsCapturing(true);
    setCapturedSamples([]);
    setCaptureCount(0);

    const samples: number[][] = [];

    for (let i = 0; i < TOTAL_SAMPLES; i++) {
      setCaptureCount(i + 1);
      
      // Wait a moment between captures
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      const embedding = await captureSample();
      
      if (!embedding) {
        toast({
          title: 'Capture Failed',
          description: 'Face not detected. Please try again.',
          variant: 'destructive',
        });
        setIsCapturing(false);
        setCaptureCount(0);
        return;
      }

      samples.push(embedding);
      setCapturedSamples([...samples]);
    }

    // All samples captured, now register
    await registerWithSamples(samples);
  };

  const registerWithSamples = async (samples: number[][]) => {
    setIsRegistering(true);

    try {
      // Average the embeddings for better accuracy
      const avgEmbedding = samples[0].map((_, i) => {
        const sum = samples.reduce((acc, sample) => acc + sample[i], 0);
        return sum / samples.length;
      });

      // Save to database
      const { error } = await supabase
        .from('face_embeddings')
        .insert({
          name: name.trim(),
          embedding: avgEmbedding,
        });

      if (error) {
        throw error;
      }

      toast({
        title: 'Success!',
        description: `${name} registered with ${TOTAL_SAMPLES} samples`,
      });

      notifyFaceRecognized(name.trim(), 100);

      setName('');
      setCaptureCount(0);
      setCapturedSamples([]);
      setOpen(false);
      onRegister();
    } catch (error: any) {
      console.error('Registration error:', error);
      
      if (error.code === '23505') {
        toast({
          title: 'Name Already Exists',
          description: 'This name is already registered',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Registration Failed',
          description: error.message || 'Failed to register face',
          variant: 'destructive',
        });
      }
    } finally {
      setIsRegistering(false);
      setIsCapturing(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      startCapture();
    } else {
      stopCapture();
      setName('');
      setCaptureCount(0);
      setCapturedSamples([]);
      setQualityMetrics(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          size="lg"
          disabled={disabled}
          className="gradient-accent hover:opacity-90 transition-opacity"
        >
          <UserPlus className="mr-2 h-5 w-5" />
          Register New Face
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-border/50 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Register New Face</DialogTitle>
          <DialogDescription>
            Position your face in the camera and enter your name
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative aspect-video bg-secondary/20 rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              onLoadedMetadata={(e) => {
                if (canvasRef.current) {
                  canvasRef.current.width = e.currentTarget.videoWidth;
                  canvasRef.current.height = e.currentTarget.videoHeight;
                }
              }}
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
            />
            
            {/* Quality Indicators */}
            {qualityMetrics && (
              <div className="absolute top-2 left-2 space-y-1">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                  qualityMetrics.distance === 'optimal' ? 'bg-green-500/90' : 'bg-orange-500/90'
                } text-white`}>
                  <span>Distance: {qualityMetrics.distance}</span>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                  qualityMetrics.lighting === 'optimal' ? 'bg-green-500/90' : 'bg-orange-500/90'
                } text-white`}>
                  <span>Lighting: {qualityMetrics.lighting}</span>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                  qualityMetrics.angle === 'good' ? 'bg-green-500/90' : 'bg-orange-500/90'
                } text-white`}>
                  <span>Angle: {qualityMetrics.angle}</span>
                </div>
              </div>
            )}

            {/* Feedback Message */}
            {qualityMetrics && (
              <div className={`absolute bottom-2 left-2 right-2 px-3 py-2 rounded-md text-sm font-medium text-center ${
                qualityMetrics.overallScore > 75 
                  ? 'bg-green-500/90 text-white' 
                  : 'bg-orange-500/90 text-white'
              }`}>
                {qualityMetrics.overallScore > 75 ? (
                  <span className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    {getQualityFeedbackMessage(qualityMetrics)}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {getQualityFeedbackMessage(qualityMetrics)}
                  </span>
                )}
              </div>
            )}

            {/* Capture Progress */}
            {isCapturing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="bg-background/95 rounded-lg p-6 space-y-3 min-w-[200px]">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <Camera className="h-5 w-5 animate-pulse" />
                    Capturing {captureCount}/{TOTAL_SAMPLES}
                  </div>
                  <Progress value={(captureCount / TOTAL_SAMPLES) * 100} />
                </div>
              </div>
            )}
            
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm"
              onClick={toggleCamera}
              disabled={isRegistering || isCapturing}
            >
              <SwitchCamera className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isRegistering}
              className="bg-secondary/50 border-border/50"
            />
          </div>

          <Button
            onClick={handleStartCapture}
            disabled={isRegistering || isCapturing || !name.trim() || !qualityMetrics || qualityMetrics.overallScore < 60}
            className="w-full gradient-primary hover:opacity-90 transition-opacity"
            size="lg"
          >
            {isRegistering ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : isCapturing ? (
              <>
                <Camera className="mr-2 h-5 w-5 animate-pulse" />
                Capturing...
              </>
            ) : (
              <>
                <Camera className="mr-2 h-5 w-5" />
                Capture {TOTAL_SAMPLES} Samples
              </>
            )}
          </Button>
          
          {capturedSamples.length > 0 && !isCapturing && (
            <div className="text-sm text-center text-muted-foreground">
              {capturedSamples.length} sample{capturedSamples.length > 1 ? 's' : ''} captured
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
