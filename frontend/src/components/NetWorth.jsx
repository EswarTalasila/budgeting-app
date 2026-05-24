import { useState, useEffect } from 'react';
import { getNetWorth } from '../lib/api';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(n));
}

function fmtCents(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n));
}

function prettySubtype(subtype) {
  if (!subtype) return '';
  return subtype.replace(/[_-]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

const ASSET_TYPES = new Set(['depository', 'investment', 'brokerage']);
const LIABILITY_TYPES = new Set(['credit', 'loan']);

export default function NetWorth() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getNetWorth()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.detail || err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="panel p-5">
        <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.06em]">
          Net worth
        </p>
        <p className="mt-3 text-[26px] font-semibold tracking-tight tabular-nums text-zinc-300 dark:text-zinc-700">
          ···
        </p>
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  if (!data.accounts || data.accounts.length === 0) {
    return null;
  }

  const net = Number(data.net_worth);
  const assets = Number(data.assets);
  const liabilities = Number(data.liabilities);

  const assetAccounts = data.accounts.filter((a) => ASSET_TYPES.has(a.type));
  const liabilityAccounts = data.accounts.filter((a) => LIABILITY_TYPES.has(a.type));

  return (
    <div className="panel p-5 mb-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.06em]">
            Net worth
          </p>
          <p
            className={`mt-2 text-[32px] font-semibold tracking-tight tabular-nums ${
              net < 0 ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-zinc-100'
            }`}
          >
            {fmt(net)}
          </p>
          <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-1 tabular-nums">
            {fmt(assets)} assets · {fmt(liabilities)} liabilities
          </p>
        </div>

        <div className="flex-1 min-w-[260px] grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 self-stretch">
          {assetAccounts.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.06em] mb-1">
                Assets
              </p>
              {assetAccounts.map((a, i) => (
                <div key={`a-${i}`} className="flex items-center justify-between text-[12px] py-0.5">
                  <span className="text-zinc-700 dark:text-zinc-300 truncate pr-2">
                    {a.name}
                    {a.mask && (
                      <span className="text-zinc-400 dark:text-zinc-500 ml-1">··{a.mask}</span>
                    )}
                  </span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-medium tabular-nums">
                    {fmtCents(a.current ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          )}
          {liabilityAccounts.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.06em] mb-1">
                Liabilities
              </p>
              {liabilityAccounts.map((a, i) => (
                <div key={`l-${i}`} className="flex items-center justify-between text-[12px] py-0.5">
                  <span className="text-zinc-700 dark:text-zinc-300 truncate pr-2">
                    {a.name}
                    {a.mask && (
                      <span className="text-zinc-400 dark:text-zinc-500 ml-1">··{a.mask}</span>
                    )}
                  </span>
                  <span className="text-red-700 dark:text-red-400 font-medium tabular-nums">
                    {fmtCents(a.current ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
