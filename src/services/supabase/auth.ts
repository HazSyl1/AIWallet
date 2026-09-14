import { supabase } from './client';
import type { Session, User } from '@supabase/supabase-js';

export interface AuthResult {
  user: User | null;
  session: Session | null;
  error: string | null;
}

export const authService = {
  async signUp(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return {
      user: data.user,
      session: data.session,
      error: error?.message ?? null,
    };
  },

  async signIn(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return {
      user: data.user,
      session: data.session,
      error: error?.message ?? null,
    };
  },

  async signOut(): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signOut();
    return { error: error?.message ?? null };
  },

  async getSession(): Promise<{ user: User | null; session: Session | null }> {
    const { data } = await supabase.auth.getSession();
    return {
      session: data.session,
      user: data.session?.user ?? null,
    };
  },

  onAuthStateChange(callback: (user: User | null) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  },
};
