// InviteContext.tsx
// useState-only context, matching Vydora's existing six-context convention
// (no reducers / Zustand / Redux). Wraps inviteService.

import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
  sendInvite as sendInviteService,
  getInviteByToken as getInviteByTokenService,
  acceptInvite as acceptInviteService,
  declineInvite as declineInviteService,
  InviteDetails,
  InviteRole,
} 
from "../services/inviteService"

interface InviteContextValue {
  currentInvite: InviteDetails | null;
  isLoading: boolean;
  error: string | null;
  lastInviteLink: string | null;

  sendInvite: (
    projectId: string,
    emails: string[],
    role: InviteRole,
    message?: string
  ) => Promise<void>;
  loadInviteByToken: (token: string) => Promise<void>;
  acceptInvite: (token: string) => Promise<string | null>; // returns projectId on success
  declineInvite: (token: string) => Promise<void>;
  clearInviteError: () => void;
}

const InviteContext = createContext<InviteContextValue | undefined>(undefined);

export function InviteProvider({ children }: { children: ReactNode }) {
  const [currentInvite, setCurrentInvite] = useState<InviteDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);

async function sendInvite(
  projectId: string,
  emails: string[],
  role: InviteRole,
  message?: string
) {
  setIsLoading(true);
  setError(null);

  try {
    const result = await sendInviteService(projectId, emails, role, message);
    setLastInviteLink(result.inviteLink);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to send invite';
    setError(msg);
    throw err; // let the caller's try/catch handle UI feedback (Alert, status reset)
  } finally {
    setIsLoading(false);
  }
}

  async function loadInviteByToken(token: string) {
    setIsLoading(true);
    setError(null);

    try {
      const invite = await getInviteByTokenService(token);
      setCurrentInvite(invite);
    } catch (err) {
      setCurrentInvite(null);
      setError(err instanceof Error ? err.message : 'Failed to load invite');
    } finally {
      setIsLoading(false);
    }
  }

  async function acceptInvite(token: string): Promise<string | null> {
    setIsLoading(true);
    setError(null);

    try {
      const result = await acceptInviteService(token);
      setCurrentInvite((prev:any) => (prev ? { ...prev, status: 'accepted' } : prev));
      return result.projectId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite');
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  async function declineInvite(token:string) {
    setIsLoading(true);
    setError(null);

    try {
      await declineInviteService(token);
      setCurrentInvite((prev:any) => (prev ? { ...prev, status: 'declined' } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline invite');
    } finally {
      setIsLoading(false);
    }
  }

  function clearInviteError() {
    setError(null);
  }

  const value: InviteContextValue = {
    currentInvite,
    isLoading,
    error,
    lastInviteLink,
    sendInvite,
    loadInviteByToken,
    acceptInvite,
    declineInvite,
    clearInviteError,
  };

  return <InviteContext.Provider value={value}>{children}</InviteContext.Provider>;
}

export function useInvite(): InviteContextValue {
  const context = useContext(InviteContext);

  if (context === undefined) {
    throw new Error('useInvite must be used within an InviteProvider');
  }

  return context;
}