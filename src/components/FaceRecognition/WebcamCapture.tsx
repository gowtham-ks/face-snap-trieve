import { useRef, useEffect, useState } from 'react';
import { Camera, CameraOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface WebcamCaptureProps {
  isActive: boolean;
  onFrame?: (video: HTMLVideoElement) => void;
  onToggle: () => void;
}

export const WebcamCapture = ({ isActive, onFrame, onToggle }: WebcamCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const { toast } = useToast();
  const frameIntervalRef = useRef<number>();

  useEffect(() => {
    if (isActive) {
      startWebcam();
    } else {
      stopWebcam();
    }

    return () => stopWebcam();
  }, [isActive]);

  const startWebcam = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          
          // Process frames every 1 second for recognition
          if (onFrame) {
            frameIntervalRef.current = window.setInterval(() => {
              if (videoRef.current) {
                onFrame(videoRef.current);
              }
            }, 1000);
          }
        };
      }
    } catch (error) {
      console.error('Error accessing webcam:', error);
      toast({
        title: 'Camera Error',
        description: 'Failed to access webcam. Please check permissions.',
        variant: 'destructive',
      });
      onToggle();
    }
  };

  const stopWebcam = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
    }

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto">
      <div className="glass-card rounded-2xl overflow-hidden card-shadow">
        <div className="relative aspect-video bg-secondary/20">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          
          {!isActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-secondary/40 backdrop-blur-sm">
              <div className="text-center space-y-4">
                <CameraOff className="w-16 h-16 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">Camera is off</p>
              </div>
            </div>
          )}

          {/* Recording indicator */}
          {isActive && (
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-destructive/90 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-xs font-medium text-white">LIVE</span>
            </div>
          )}
        </div>

        <div className="p-4 flex justify-center">
          <Button
            onClick={onToggle}
            variant="default"
            size="lg"
            className="gradient-primary hover:opacity-90 transition-opacity"
          >
            {isActive ? (
              <>
                <CameraOff className="mr-2 h-5 w-5" />
                Stop Camera
              </>
            ) : (
              <>
                <Camera className="mr-2 h-5 w-5" />
                Start Camera
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
