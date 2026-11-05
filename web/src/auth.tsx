// Guarda quem está logado e disponibiliza login/logout para todo o app (React Context).
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, setUnauthorizedHandler, tokenStorage, type Session, type User } from './api';

const USER_KEY = 'optimik:user';

type AuthContextValue = {
  user: User | null;
  // Recebe uma sessão vinda do login, do cadastro ou do aceite de convite.
  startSession: (session: Session) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function loadUser(): User | null {
  if (!tokenStorage.get()) return null;
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null');
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadUser);

  const logout = useCallback(() => {
    tokenStorage.clear();
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const startSession = useCallback(({ token, user }: Session) => {
    tokenStorage.set(token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setUser(user);
  }, []);

  // Atenção às chaves: se o efeito devolvesse uma função, o React a rodaria como "faxina"
  // ao desmontar (e o StrictMode desmonta de propósito em desenvolvimento), deslogando o usuário.
  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  // Ao abrir o app, confirma no servidor se o usuário continua ativo e com o mesmo papel.
  useEffect(() => {
    if (!tokenStorage.get()) return;
    api
      .me()
      .then((fresh) => {
        localStorage.setItem(USER_KEY, JSON.stringify(fresh));
        setUser(fresh);
      })
      .catch(() => {});
  }, []);

  return <AuthContext.Provider value={{ user, startSession, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
