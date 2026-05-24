import { useState, useEffect } from 'react';
import { getTopMerchants } from '../lib/api';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n));
}

export default function TopMerchants({ month }) {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getTopMerchants(month, 5)
      .then((d) => {
        if (!cancelled) setMerchants(d);
      })
      .catch(() => {
        if (!cancelled) setMerchants([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [month]);

  if (loading) return null;
  if (merchants.length === 0) return null;

  const maxSpent = Math.max(...merchants.map((m) => Number(m.spent)));

  return (
    <div className="panel p-5 h-full flex flex-col">
      <div className="mb-3">
        <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.06em]">
          Top merchants
        </p>
        <p className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight mt-0.5">
          This month
        </p>
      </div>

      <div className="flex-1 space-y-2.5">
        {merchants.map((m) => {
          const spent = Number(m.spent);
          const pct = maxSpent > 0 ? (spent / maxSpent) * 100 : 0;
          return (
            <div key={m.merchant}>
              <div className="flex items-center justify-between text-[12px] mb-1">
                <span className="text-zinc-900 dark:text-zinc-100 font-medium truncate pr-3">
                  {m.merchant}
                </span>
                <span className="text-zinc-500 dark:text-zinc-400 tabular-nums flex-shrink-0">
                  {fmt(spent)}
                </span>
              </div>
              <div className="h-[3px] bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-zinc-900 dark:bg-zinc-100 transition-[width] duration-500 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                {m.transaction_count} {m.transaction_count === 1 ? 'transaction' : 'transactions'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
