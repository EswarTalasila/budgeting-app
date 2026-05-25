import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword, exportData, deleteAccount } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <div className="inline-flex border border-zinc-200 dark:border-zinc-800 p-0.5">
      {[
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
      ].map(({ value, label }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            onClick={() => {
              if (!active) toggle();
            }}
            className={`px-3.5 h-7 text-[12px] font-medium transition-colors duration-100 ${
              active
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function Section({ title, description, children }) {
  return (
    <div className="panel p-6 mb-6">
      <h2 className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
        {title}
      </h2>
      {description && (
        <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-0.5 mb-5">{description}</p>
      )}
      {children}
    </div>
  );
}

export default function Settings() {
  const { email, clearToken } = useAuth();
  const navigate = useNavigate();

  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState(null);
  const [pwdErr, setPwdErr] = useState(null);

  const [exporting, setExporting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [toast, setToast] = useState(null);

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwdMsg(null);
    setPwdErr(null);
    if (pwd.next !== pwd.confirm) {
      setPwdErr("New passwords don't match.");
      return;
    }
    if (pwd.next.length < 8) {
      setPwdErr('New password must be at least 8 characters.');
      return;
    }
    setPwdSaving(true);
    try {
      await changePassword(pwd.current, pwd.next);
      setPwd({ current: '', next: '', confirm: '' });
      setPwdMsg('Password updated.');
    } catch (err) {
      setPwdErr(err.response?.data?.detail || 'Failed to change password.');
    } finally {
      setPwdSaving(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const data = await exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clover-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    await deleteAccount();
    clearToken();
    navigate('/login');
  }

  return (
    <div>
      <div className="mb-8 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <p className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.08em]">
          Account
        </p>
        <h1 className="mt-1.5 text-[28px] font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
          Settings
        </h1>
      </div>

      <Section title="Profile" description="Your account email.">
        <div className="text-[13px]">
          <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.06em] mb-1">
            Email
          </p>
          <p className="text-zinc-900 dark:text-zinc-100">{email || '—'}</p>
        </div>
      </Section>

      <Section title="Appearance" description="Choose your color theme.">
        <ThemeToggle />
      </Section>

      <Section title="Change password" description="Use at least 8 characters.">
        <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
          <div>
            <label className="label">Current password</label>
            <input
              type="password"
              required
              value={pwd.current}
              onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))}
              className="input"
            />
          </div>
          <div>
            <label className="label">New password</label>
            <input
              type="password"
              required
              minLength={8}
              value={pwd.next}
              onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))}
              className="input"
            />
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input
              type="password"
              required
              minLength={8}
              value={pwd.confirm}
              onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))}
              className="input"
            />
          </div>
          {pwdMsg && (
            <div className="text-[13px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 px-3 py-2">
              {pwdMsg}
            </div>
          )}
          {pwdErr && (
            <div className="text-[13px] text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-3 py-2">
              {pwdErr}
            </div>
          )}
          <button type="submit" disabled={pwdSaving} className="btn-primary">
            {pwdSaving ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </Section>

      <Section title="Export your data" description="Download all your transactions, budgets, and accounts as JSON.">
        <button onClick={handleExport} disabled={exporting} className="btn-secondary">
          {exporting ? 'Preparing…' : 'Download JSON'}
        </button>
      </Section>

      <Section
        title="Danger zone"
        description="Deleting your account is permanent and cannot be undone."
      >
        <button
          onClick={() => setConfirmingDelete(true)}
          className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 text-[13px] font-medium border border-red-300 dark:border-red-900 bg-white dark:bg-zinc-900 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors duration-100"
        >
          Delete account
        </button>
      </Section>

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete your Clover account?"
        description="This permanently deletes your account, transactions, budgets, and bank connections. You'll be signed out. This cannot be undone."
        confirmText="Delete forever"
        variant="danger"
        confirmInput="DELETE"
        onConfirm={handleDeleteAccount}
        onCancel={() => setConfirmingDelete(false)}
      />

      <Toast message={toast?.message} type={toast?.type} onDismiss={() => setToast(null)} />
    </div>
  );
}
