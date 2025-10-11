import { useState, useRef } from 'react';
import { UserPlus, Loader2, SwitchCamera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { faceRecognition } from '@/utils/faceRecognition';
import { supabase } from '@/integrations/supabase/client';

interface RegisterDialogProps {
  onRegister: () => void;
  disabled?: boolean;
}

export const RegisterDialog = ({ onRegister, disabled }: RegisterDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

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

  const handleRegister = async () => {
    if (!name.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter a name',
        variant: 'destructive',
      });
      return;
    }

    if (!videoRef.current) return;

    setIsRegistering(true);

    try {
      // Detect face and get embedding
      const embedding = await faceRecognition.detectFace(videoRef.current);

      if (!embedding) {
        toast({
          title: 'No Face Detected',
          description: 'Please ensure your face is clearly visible',
          variant: 'destructive',
        });
        setIsRegistering(false);
        return;
      }

      // Save to database
      const { error } = await supabase
        .from('face_embeddings')
        .insert({
          name: name.trim(),
          embedding: embedding,
        });

      if (error) {
        throw error;
      }

      toast({
        title: 'Success!',
        description: `${name} has been registered successfully`,
      });

      setName('');
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
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      startCapture();
    } else {
      stopCapture();
      setName('');
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
            />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm"
              onClick={toggleCamera}
              disabled={isRegistering}
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
            onClick={handleRegister}
            disabled={isRegistering || !name.trim()}
            className="w-full gradient-primary hover:opacity-90 transition-opacity"
            size="lg"
          >
            {isRegistering ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Registering...
              </>
            ) : (
              'Register Face'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
