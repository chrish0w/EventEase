import React, { createContext, useContext, useState } from 'react';

interface User { id: string; name: string; email: string; role: string; }

interface SelectedClub {
  clubId: string;
  clubName: string;
  role: 'president' | 'committee' | 'user';
  committeeRole?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  selectedClub: SelectedClub | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  selectClub: (club: SelectedClub) => void;
  clearClub: () => void;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(() => {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  });
  const [selectedClub, setSelectedClub] = useState<SelectedClub | null>(() => {
    const c = localStorage.getItem('selectedClub');
    return c ? JSON.parse(c) : null;
  });

  const login = (t: string, u: User) => {
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
    setToken(t);
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('selectedClub');
    setToken(null);
    setUser(null);
    setSelectedClub(null);
  };

  const selectClub = (club: SelectedClub) => {
    localStorage.setItem('selectedClub', JSON.stringify(club));
    setSelectedClub(club);
  };

  const clearClub = () => {
    localStorage.removeItem('selectedClub');
    setSelectedClub(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, selectedClub, login, logout, selectClub, clearClub }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
