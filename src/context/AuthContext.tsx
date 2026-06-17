import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import * as authApi from "../lib/api/auth";
import type { AdminUser } from "../lib/api/auth";

interface AuthContextValue {
  admin: AdminUser | null;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi.getMe().then((user) => {
      setAdmin(user);
      setLoading(false);
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { admin: user } = await authApi.login(email, password);
    setAdmin(user);
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    setAdmin(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ admin, isAdmin: !!admin, loading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
