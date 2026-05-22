import { useState, useEffect } from 'react';
import { getBudgetSummary } from '../lib/api';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(n));
}

function fmtCents(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n));
}

function Stat({ label, value, sub, accent }) {
  return (
    <div className="panel p-5">
      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-[0.06em]">{label}</p>
      <p className={`mt-3 text-[26px] font-semibold tracking-tight tabular-nums ${accent || 'text-slate-900'}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-[12px] text-slate-500 tabular-nums">{sub}</p>}
    </div>
  );
}

function BudgetRow({ item }) {
  const limit = Number(item.monthly_limit);
  const spent = Number(item.spent);
  const remaining = Number(item.remaining);
  const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  const over = spent > limit;

  return (
    <div className="px-5 py-4 hover:bg-slate-50/50 transition-colors duration-100">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] font-medium text-slate-900">{item.category}</span>
          <span className="text-[12px] text-slate-500 tabular-nums">
            {fmtCents(spent)} / {fmtCents(limit)}
          </span>
        </div>
        <span
          className={`text-[12px] font-medium tabular-nums ${
            over ? 'text-red-700' : 'text-slate-500'
          }`}
        >
          {over ? `${fmtCents(spent - limit)} over` : `${fmtCents(remaining)} left`}
        </span>
      </div>
      <div className="h-[3px] bg-slate-100 overflow-hidden">
        <div
          className={`h-full transition-[width] duration-500 ease-out ${
            over ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-slate-900'
          }`}
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
  const overallPct = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;

  const formattedMonth = new Date(`${month}-01T00:00:00`).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div>
      <div className="mb-8 pb-6 border-b border-slate-200">
        <p className="text-[12px] font-medium text-slate-500 uppercase tracking-[0.08em]">
          Overview
        </p>
        <div className="mt-1.5 flex items-baseline justify-between">
          <h1 className="text-[28px] font-semibold text-slate-900 tracking-tight">
            {formattedMonth}
          </h1>
          {totalLimit > 0 && (
            <span className="text-[13px] text-slate-500 tabular-nums">
              {overallPct.toFixed(0)}% of budget used
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-10">
        <Stat label="Budgeted" value={fmt(totalLimit)} />
        <Stat label="Spent" value={fmt(totalSpent)} />
        <Stat
          label="Remaining"
          value={fmt(totalRemaining)}
          accent={totalRemaining < 0 ? 'text-red-700' : 'text-slate-900'}
        />
      </div>

      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold text-slate-900 tracking-tight">By category</h2>
        <span className="text-[12px] text-slate-500">{summary.length} budget{summary.length === 1 ? '' : 's'}</span>
      </div>

      {loading && <p className="text-[13px] text-slate-500">Loading…</p>}
      {error && (
        <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 px-3 py-2">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="panel">
          {summary.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-[13px] text-slate-600">No budgets set for this month.</p>
              <p className="text-[12px] text-slate-400 mt-1">
                Set spending limits on the Budgets page to track progress here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {summary.map((item) => (
                <BudgetRow key={item.category} item={item} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
