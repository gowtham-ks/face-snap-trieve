import { UserCheck, Activity } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface RecognitionResult {
  name: string;
  confidence: number;
  timestamp: number;
}

interface RecognitionDisplayProps {
  results: RecognitionResult[];
  isProcessing: boolean;
}

export const RecognitionDisplay = ({ results, isProcessing }: RecognitionDisplayProps) => {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <div className="glass-card rounded-2xl p-6 card-shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Recognition Status
          </h3>
          {isProcessing && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              Processing...
            </div>
          )}
        </div>

        {results.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No faces detected yet</p>
            <p className="text-sm mt-1">Start the camera to begin recognition</p>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((result, index) => (
              <div
                key={index}
                className="bg-secondary/30 rounded-lg p-4 border border-border/30 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-accent" />
                    <span className="font-semibold text-lg">{result.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Confidence</span>
                    <span className="font-medium text-primary">
                      {(result.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={result.confidence * 100} 
                    className="h-2 bg-secondary/50"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
