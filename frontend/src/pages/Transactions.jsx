import { useState } from 'react';
import { useTransactions } from '../hooks/useTransactions';
import { createTransaction, deleteTransaction } from '../lib/api';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(Number(n)));
}

const CATEGORY_COLORS = {
  'Food & Dining': 'bg-orange-50 text-orange-700 border-orange-200',
  Shopping: 'bg-pink-50 text-pink-700 border-pink-200',
  Transportation: 'bg-blue-50 text-blue-700 border-blue-200',
  Entertainment: 'bg-purple-50 text-purple-700 border-purple-200',
  'Bills & Utilities': 'bg-slate-100 text-slate-700 border-slate-200',
  Health: 'bg-green-50 text-green-700 border-green-200',
  Travel: 'bg-sky-50 text-sky-700 border-sky-200',
  Income: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Other: 'bg-amber-50 text-amber-700 border-amber-200',
};

function CategoryBadge({ category }) {
  const color = CATEGORY_COLORS[category] || 'bg-slate-50 text-slate-600 border-slate-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${color}`}>
      {category || 'Uncategorized'}
    </span>
  );
}

export default function Transactions() {
  const [month, setMonth] = useState(currentMonth());
  const { transactions, loading, error, refetch } = useTransactions(month);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  async function handleAdd(e) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await createTransaction({ ...form, amount: parseFloat(form.amount) });
      setForm({ description: '', amount: '', date: new Date().toISOString().slice(0, 10) });
      setShowForm(false);
      refetch();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to add transaction');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    await deleteTransaction(id);
    refetch();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Transactions</h1>
          <p className="text-sm text-slate-500 mt-1">All your income and expenses.</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="input w-auto"
          />
          <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
            {showForm ? 'Cancel' : '+ Add'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="card p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Description</label>
              <input
                required
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="input"
                placeholder="Coffee at Starbucks"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Amount</label>
              <input
                required
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="input"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Date</label>
              <input
                required
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="input"
              />
            </div>
          </div>
          {formError && (
            <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mt-4">
              {formError}
            </div>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Saving...' : 'Save transaction'}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Category will be assigned automatically by AI.
          </p>
        </form>
      )}

      {loading && <p className="text-sm text-slate-500">Loading...</p>}
      {error && (
        <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="card overflow-hidden">
          {transactions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-500">No transactions for this month.</p>
              <p className="text-sm text-slate-400 mt-1">Add one above to get started.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-3.5 text-slate-500 whitespace-nowrap">
                      {new Date(t.date + 'T00:00:00').toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-3.5 text-slate-900 font-medium max-w-xs truncate">
                      {t.description}
                    </td>
                    <td className="px-6 py-3.5">
                      <CategoryBadge category={t.category} />
                    </td>
                    <td
                      className={`px-6 py-3.5 text-right font-semibold tabular-nums ${
                        t.amount < 0 ? 'text-emerald-600' : 'text-slate-900'
                      }`}
                    >
                      {t.amount < 0 ? '+' : '-'}
                      {fmt(t.amount)}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 hover:text-rose-600 transition-all"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
