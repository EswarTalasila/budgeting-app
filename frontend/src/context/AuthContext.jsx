import { createContext, useContext, useEffect, useState } from 'react';
import { getMe } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [email, setEmail] = useState(() => localStorage.getItem('email'));

  useEffect(() => {
    if (token && !email) {
      getMe()
        .then((u) => {
          localStorage.setItem('email', u.email);
          setEmail(u.email);
        })
        .catch(() => {});
    }
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
