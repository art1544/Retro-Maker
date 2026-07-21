import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User } from '../types';

interface SessionCtx {
  user: User | null;
  setUser: (u: User | null) => void;
}

const Ctx = createContext<SessionCtx>({ user: null, setUser: () => {} });
const KEY = 'retromaker.user';

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  });

  const setUser = (u: User | null) => {
    setUserState(u);
    try {
      if (u) sessionStorage.setItem(KEY, JSON.stringify(u));
      else sessionStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    document.title = 'RetroMaker';
  }, []);

  return <Ctx.Provider value={{ user, setUser }}>{children}</Ctx.Provider>;
}

export const useSession = () => useContext(Ctx);
