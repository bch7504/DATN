"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AuthenticatedUser } from "@/types/api";

interface SessionContextValue {
  user: AuthenticatedUser;
  demo: boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

interface SessionProviderProps extends SessionContextValue {
  children: ReactNode;
}

/**
 * Provides the Java-validated (or explicitly demo) session to the app shell.
 * @param user Profile whose role has already passed the route guard.
 * @param demo Whether the explicit NEXT_PUBLIC_DEMO_MODE fixture is active.
 * @param children Protected workspace content.
 * @returns A scoped session context provider.
 */
export function SessionProvider({ user, demo, children }: SessionProviderProps) {
  return <SessionContext.Provider value={{ user, demo }}>{children}</SessionContext.Provider>;
}

/**
 * Reads the guarded session for protected workspace components.
 * @returns Current authenticated/demo session.
 * @throws Error when called outside SessionProvider.
 */
export function useSession(): SessionContextValue {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside SessionProvider");
  return session;
}
