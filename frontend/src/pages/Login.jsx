import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../lib/api';
import { useAuth } from '../context/AuthContext';

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
      saveToken(data.access_token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-72 h-72 bg-emerald-400 rounded-full filter blur-3xl" />
          <div className="absolute bottom-20 right-20 w-72 h-72 bg-indigo-500 rounded-full filter blur-3xl" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-2 text-xl font-bold">
            <div className="w-8 h-8 rounded-lg bg-white text-slate-900 flex items-center justify-center font-extrabold">
              B
            </div>
            <span>Budget</span>
          </div>
        </div>
        <div className="relative space-y-4">
          <h1 className="text-4xl font-bold leading-tight">
            Take control of your finances.
          </h1>
          <p className="text-lg text-slate-300 max-w-md">
            Track every dollar, set smart budgets, and let AI categorize your transactions automatically.
          </p>
        </div>
        <div className="relative text-sm text-slate-400">
          A personal budgeting MVP.
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-slate-50">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 text-xl font-bold mb-8">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-extrabold">
              B
            </div>
            <span>Budget</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {mode === 'login'
                ? 'Sign in to your account to continue.'
                : 'Get started by creating an account.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Loading...' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-500 text-center">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError(null);
              }}
              className="text-slate-900 font-medium hover:underline"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
