'use client';

import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface Room {
  id: string;
  name: string;
  group_id: string;
}

interface HeaderProps {
  activeRoom: Room | null;
  userRole: 'admin' | 'member' | null;
}

export function Header({ activeRoom, userRole }: HeaderProps) {
  const { user } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <header className="h-16 border-b border-border px-6 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-semibold">
          {activeRoom ? activeRoom.name : 'Secure Chat'}
        </h1>
        {activeRoom && userRole === 'admin' && (
          <Badge variant="secondary">Group ID: {activeRoom.group_id}</Badge>
        )}
      </div>

      <div className="flex items-center space-x-4">
        <ThemeToggle />
        <Avatar
          src={user?.user_metadata?.avatar_url}
          alt={user?.email || 'User'}
          fallback={user?.email?.charAt(0).toUpperCase()}
        />
        <Button variant="ghost" size="icon" onClick={handleSignOut}>
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}