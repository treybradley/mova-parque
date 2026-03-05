import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/app/supabase/client";

type OAuthProvider = "google" | "github";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>;
  verifyEmailOtp: (email: string, token: string) => Promise<{ error: string | null }>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setError(null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithMagicLink = useCallback(
    async (email: string): Promise<{ error: string | null }> => {
      setError(null);
      if (!supabase) {
        setError("Auth is not configured.");
        return { error: "Auth is not configured." };
      }
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      if (err) {
        setError(err.message);
        return { error: err.message };
      }
      return { error: null };
    },
    []
  );

  const verifyEmailOtp = useCallback(
    async (email: string, token: string): Promise<{ error: string | null }> => {
      setError(null);
      if (!supabase) {
        setError("Auth is not configured.");
        return { error: "Auth is not configured." };
      }
      const { error: err } = await supabase.auth.verifyOtp({
        email,
        token: token.trim(),
        type: "email",
      });
      if (err) {
        setError(err.message);
        return { error: err.message };
      }
      return { error: null };
    },
    []
  );

  const signInWithOAuth = useCallback(
    async (provider: OAuthProvider): Promise<{ error: string | null }> => {
      setError(null);
      if (!supabase) {
        setError("Auth is not configured.");
        return { error: "Auth is not configured." };
      }
      const { data, error: err } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      });
      if (err) {
        setError(err.message);
        return { error: err.message };
      }
      if (data?.url) {
        window.location.href = data.url;
      }
      return { error: null };
    },
    []
  );

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setError(null);
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    error,
    signInWithMagicLink,
    verifyEmailOtp,
    signInWithOAuth,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
