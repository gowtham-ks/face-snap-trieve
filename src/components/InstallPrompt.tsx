import { useState } from 'react';
import { Download, X, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useToast } from '@/hooks/use-toast';

export const InstallPrompt = () => {
  const { isInstallable, isInstalled, installApp } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const { toast } = useToast();

  if (!isInstallable || dismissed || isInstalled) return null;

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      toast({
        title: 'App Installed!',
        description: 'Face Recognition is now installed as a desktop app',
      });
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="glass-card p-4 rounded-2xl card-shadow border border-border/50 animate-in slide-in-from-bottom-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Monitor className="w-5 h-5 text-primary" />
          </div>
          
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-sm">Install Desktop App</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Install this app on your desktop for quick access and offline use
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 -mt-1"
                onClick={() => setDismissed(true)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <Button
              onClick={handleInstall}
              size="sm"
              className="w-full gradient-primary"
            >
              <Download className="w-4 h-4 mr-2" />
              Install Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
