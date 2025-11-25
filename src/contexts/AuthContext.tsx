'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error?: string;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    const getSession = async () => {
      try {
        console.log('AuthProvider: Getting session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('AuthProvider: Session result:', { session, error });
        
        if (error) {
          console.error('AuthProvider: Session error:', error);
          setError(error.message);
        } else {
          setUser(session?.user ?? null);
        }
        setLoading(false);
      } catch (err) {
        console.error('AuthProvider: Auth context error:', err);
        setError('Failed to initialize authentication');
        setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthProvider: Auth state changed:', event, session);
      setUser(session?.user ?? null);
      setLoading(false);
      setError(undefined);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};