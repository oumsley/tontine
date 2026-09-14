import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { tokenStore } from "./tokenStore";

interface SessionContextValue {
  hasSession: boolean | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    const token = await tokenStore.getAccessToken();
    setHasSession(!!token);
  }, []);

  const signOut = useCallback(async () => {
    await tokenStore.clear();
    setHasSession(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return <SessionContext.Provider value={{ hasSession, refresh, signOut }}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
