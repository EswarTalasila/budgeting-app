import { createContext, useContext, useEffect, useState } from 'react';
import { getMe } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [email, setEmail] = useState(() => localStorage.getItem('email'));

  useEffect(() => {
    if (!token || email) return;
    let cancelled = false;
    getMe()
      .then((u) => {
        if (cancelled) return;
        localStorage.setItem('email', u.email);
        setEmail(u.email);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('email');
          setToken(null);
          setEmail(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, email]);

  function saveToken(t, userEmail) {
    localStorage.setItem('token', t);
    setToken(t);
    if (userEmail) {
      localStorage.setItem('email', userEmail);
      setEmail(userEmail);
    }
  }

  function clearToken() {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    setToken(null);
    setEmail(null);
  }

  return (
    <AuthContext.Provider value={{ token, email, saveToken, clearToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
