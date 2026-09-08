import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/react';
import { User, OrganizationUsage } from '../types';
import { api, setAuthToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  usage: OrganizationUsage | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, fullName: string, orgName?: string) => Promise<void>;
  logout: () => void;
  refreshUsage: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded: isClerkLoaded, isSignedIn, user: clerkUser } = useUser();
  const clerk = useClerk();

  const [user, setUser] = useState<User | null>(null);
  const [usage, setUsage] = useState<OrganizationUsage | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUsage = async () => {
    try {
      const data = await api.getStorageUsage();
      setUsage(data);
    } catch (e) {
      console.warn('Could not load storage quota usage', e);
    }
  };

  // Sync Clerk authenticated user with platform backend
  useEffect(() => {
    const syncClerk = async () => {
      if (!isClerkLoaded) return;

      if (isSignedIn && clerkUser) {
        const primaryEmail = clerkUser.primaryEmailAddress?.emailAddress || '';
        const fullName = clerkUser.fullName || `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Clerk User';

        try {
          const res = await api.syncClerkUser({
            email: primaryEmail,
            fullName,
            clerkId: clerkUser.id,
          });
          setAuthToken(res.token);
          setUser(res.user);
          await refreshUsage();
        } catch (err) {
          console.error('Failed to sync Clerk user with backend', err);
        }
      }
      setLoading(false);
    };

    syncClerk();
  }, [isClerkLoaded, isSignedIn, clerkUser]);

  // Fallback / legacy local auth restore if not signed in with Clerk
  useEffect(() => {
    const initAuth = async () => {
      if (user) return;
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const { user } = await api.getMe();
          setUser(user);
          await refreshUsage();
        } catch (e) {
          console.warn('Session expired or invalid');
          setAuthToken(null);
          setUser(null);
        }
      }
      if (isClerkLoaded) {
        setLoading(false);
      }
    };

    initAuth();
  }, [isClerkLoaded, user]);

  const login = async (email: string, pass: string) => {
    const res = await api.login({ email, password: pass });
    setAuthToken(res.token);
    setUser(res.user);
    await refreshUsage();
  };

  const register = async (email: string, pass: string, fullName: string, orgName?: string) => {
    const res = await api.register({ email, password: pass, fullName, organizationName: orgName });
    setAuthToken(res.token);
    setUser(res.user);
    await refreshUsage();
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    setUsage(null);
    if (isSignedIn) {
      clerk.signOut().catch(() => {});
    }
  };

  return (
    <AuthContext.Provider value={{ user, usage, loading: loading && !isClerkLoaded, login, register, logout, refreshUsage }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
