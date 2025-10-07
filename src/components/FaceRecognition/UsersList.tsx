import { Users, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';

interface User {
  id: string;
  name: string;
  created_at: string;
}

interface UsersListProps {
  users: User[];
  onUpdate: () => void;
}

export const UsersList = ({ users, onUpdate }: UsersListProps) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDelete = async (id: string, name: string) => {
    setDeletingId(id);
    
    try {
      const { error } = await supabase
        .from('face_embeddings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'User Deleted',
        description: `${name} has been removed`,
      });

      onUpdate();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to delete user',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="glass-card rounded-2xl p-6 card-shadow">
        <div className="flex items-center gap-2 mb-6">
          <Users className="w-6 h-6 text-primary" />
          <h3 className="text-2xl font-semibold">Registered Users</h3>
          <span className="ml-auto text-sm text-muted-foreground">
            {users.length} {users.length === 1 ? 'user' : 'users'}
          </span>
        </div>

        {users.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No users registered yet</p>
            <p className="text-sm mt-2">Click "Register New Face" to add your first user</p>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="bg-secondary/30 rounded-lg p-4 border border-border/30 hover:border-primary/30 transition-all flex items-center justify-between"
              >
                <div className="space-y-1">
                  <p className="font-semibold text-lg">{user.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Registered: {new Date(user.created_at).toLocaleDateString()} at{' '}
                    {new Date(user.created_at).toLocaleTimeString()}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(user.id, user.name)}
                  disabled={deletingId === user.id}
                  className="hover:bg-destructive/20 hover:text-destructive transition-colors"
                >
                  {deletingId === user.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Trash2 className="w-5 h-5" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
