import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

function friendlyError(err, mode) {
  const status = err.response?.status;
  const detail = err.response?.data?.detail;

  if (!err.response) {
    return { message: "Can't reach the server. Check your connection and try again." };
  }

  if (status === 429) {
    return { message: 'Too many attempts. Wait a minute and try again.' };
  }

  if (mode === 'register') {
    if (typeof detail === 'string' && detail.toLowerCase().includes('already registered')) {
      return {
        message: 'An account with that email already exists.',
        action: { label: 'Sign in instead', target: 'login' },
      };
    }
    if (status === 422) {
      return { message: 'Please enter a valid email and a password with at least 6 characters.' };
    }
  }

  if (mode === 'login') {
    if (status === 401) {
      return { message: 'Email or password is incorrect.' };
    }
    if (status === 422) {
      return { message: 'Please enter a valid email and password.' };
    }
  }

  return { message: typeof detail === 'string' ? detail : 'Something went wrong. Please try again.' };
}

export default function Login() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { saveToken } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const fn = mode === 'login' ? login : register;
      const data = await fn({ email, password });
      saveToken(data.access_token, email);
      navigate('/');
    } catch (err) {
      setError(friendlyError(err, mode));
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next) {
    setMode(next);
    setError(null);
    setPassword('');
  }

  return (
    <div className="min-h-screen bg-zinc-50/60 dark:bg-zinc-950 flex items-center justify-center px-6">
      <div className="w-full max-w-[360px] fade-in">
        <div className="flex flex-col items-center mb-10">
          <Logo className="w-10 h-10 mb-5" />
          <h1 className="text-[22px] font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
            {mode === 'login' ? 'Sign in to Clover' : 'Create your Clover account'}
          </h1>
          <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-1.5">
            {mode === 'login' ? 'Enter your email to continue.' : 'Start tracking your finances.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
            {mode === 'register' && (
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1.5">
                At least 6 characters.
              </p>
            )}
          </div>

          {error && (
            <div className="text-[13px] text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-3 py-2">
              <p>{error.message}</p>
              {error.action && (
                <button
                  type="button"
                  onClick={() => switchMode(error.action.target)}
                  className="mt-1 underline underline-offset-2 font-medium"
                >
                  {error.action.label}
                </button>
              )}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Loading…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800 text-center">
          <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              className="text-zinc-900 dark:text-zinc-100 font-medium hover:underline underline-offset-2"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
