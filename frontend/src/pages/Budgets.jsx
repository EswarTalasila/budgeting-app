import { useState, useEffect } from 'react';
import { getBudgets, createBudget } from '../lib/api';

const CATEGORIES = [
  'Food & Dining',
  'Shopping',
  'Transportation',
  'Entertainment',
  'Bills & Utilities',
  'Health',
  'Travel',
  'Other',
];

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n));
}

export default function Budgets() {
  const [month, setMonth] = useState(currentMonth());
  const [budgets, setBudgets] = useState([]);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [limit, setLimit] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getBudgets(month).then(setBudgets).catch(() => setBudgets([]));
  }, [month]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await createBudget({
        category,
        monthly_limit: parseFloat(limit),
        month,
      });
      setBudgets((prev) => {
        const existing = prev.findIndex((b) => b.category === updated.category);
        if (existing >= 0) {
          const next = [...prev];
          next[existing] = updated;
          return next;
        }
        return [...prev, updated];
      });
      setLimit('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save budget');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Budgets</h1>
          <p className="text-sm text-slate-500 mt-1">Set monthly spending limits per category.</p>
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="input w-auto"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <div className="card p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-1">Set a budget</h2>
            <p className="text-xs text-slate-500 mb-4">
              Existing categories will be updated.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Monthly limit</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    className="input pl-7"
                    placeholder="0.00"
                  />
                </div>
              </div>
              {error && (
                <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
              <button type="submit" disabled={saving} className="btn-primary w-full">
                {saving ? 'Saving...' : 'Save budget'}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">Current budgets</h2>
            </div>
            {budgets.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-slate-500">No budgets set yet.</p>
                <p className="text-sm text-slate-400 mt-1">Add one to get started.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Monthly limit
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {budgets.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3.5 text-slate-900 font-medium">{b.category}</td>
                      <td className="px-6 py-3.5 text-right text-slate-900 font-semibold tabular-nums">
                        {fmt(b.monthly_limit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
