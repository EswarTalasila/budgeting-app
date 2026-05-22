import { useState, useEffect } from 'react';
import { getBudgetSummary } from '../lib/api';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n));
}

function StatCard({ label, value, sub, tone = 'default' }) {
  const tones = {
    default: 'text-slate-900',
    positive: 'text-emerald-600',
    negative: 'text-rose-600',
  };
  return (
    <div className="card p-5">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${tones[tone]}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function BudgetCard({ item }) {
  const limit = Number(item.monthly_limit);
  const spent = Number(item.spent);
  const remaining = Number(item.remaining);
  const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  const over = spent > limit;

  const barColor = over
    ? 'bg-rose-500'
    : pct > 80
    ? 'bg-amber-400'
    : 'bg-emerald-500';

  return (
    <div className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{item.category}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {fmt(spent)} of {fmt(limit)}
          </p>
        </div>
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full ${
            over ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {over ? 'Over' : fmt(remaining) + ' left'}
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const month = currentMonth();
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getBudgetSummary(month)
      .then(setSummary)
      .catch((err) => setError(err.response?.data?.detail || err.message))
      .finally(() => setLoading(false));
  }, [month]);

  const totalLimit = summary.reduce((acc, s) => acc + Number(s.monthly_limit), 0);
  const totalSpent = summary.reduce((acc, s) => acc + Number(s.spent), 0);
  const totalRemaining = totalLimit - totalSpent;

  const formattedMonth = new Date(`${month}-01T00:00:00`).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">{formattedMonth}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Budget" value={fmt(totalLimit)} />
        <StatCard label="Spent" value={fmt(totalSpent)} />
        <StatCard
          label="Remaining"
          value={fmt(totalRemaining)}
          tone={totalRemaining >= 0 ? 'positive' : 'negative'}
        />
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Budgets by category</h2>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading...</p>}
      {error && (
        <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {summary.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-slate-500">No budgets set for this month yet.</p>
              <p className="text-sm text-slate-400 mt-1">
                Head to the Budgets page to set spending limits per category.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {summary.map((item) => (
                <BudgetCard key={item.category} item={item} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
