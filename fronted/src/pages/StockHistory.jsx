import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  History,
  Search,
  RefreshCw,
  Filter,
  ArrowDownToLine,
  ArrowUpFromLine,
} from 'lucide-react';
import { getStockHistory } from '../api/stock.js';
import { getProducts } from '../api/products.js';
import { useAuth } from '../context/AuthContext.jsx';
import { TableSkeleton } from '../components/Loading.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';

function formatTimestamp(value) {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return String(value);
  }
}

export default function StockHistory() {
  const { refreshTrigger } = useAuth();

  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const productsList = await getProducts().catch(() => []);
      const map = {};
      productsList.forEach((p) => {
        if (p?.id) map[String(p.id)] = p.name;
      });
      const list = await getStockHistory(map);
      setMovements(list);
    } catch (err) {
      setError(err?.message || 'Unable to load stock movement history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, refreshTrigger]);

  const availableActions = useMemo(() => {
    const set = new Set();
    movements.forEach((m) => {
      if (m.action) set.add(m.action);
    });
    return Array.from(set);
  }, [movements]);

  const filteredMovements = useMemo(() => {
    return movements.filter((item) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.product_name.toLowerCase().includes(q) ||
        item.note.toLowerCase().includes(q) ||
        item.user.toLowerCase().includes(q);

      const matchesAction =
        actionFilter === 'ALL' || item.action === actionFilter;

      return matchesSearch && matchesAction;
    });
  }, [movements, searchQuery, actionFilter]);

  const showStockTransitionColumn = useMemo(
    () =>
      movements.some(
        (m) => m.previous_stock !== null || m.current_stock !== null
      ),
    [movements]
  );

  return (
    <div className="space-y-6 animate-page-enter">
      {/* Header & Filter Bar */}
      <div className="p-5 rounded-2xl bg-slate-900/85 border border-slate-800/90 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Stock Movement History
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Audit trail of all Stock In, Stock Out, Sales, and AI-confirmed adjustments.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchHistory}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-colors whitespace-nowrap self-start sm:self-auto disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-cyan-400 ${
                loading ? 'animate-spin' : ''
              }`}
            />
            <span>Refresh</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-slate-800/80">
          <div className="md:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product, note, or user..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="md:col-span-4 flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500 shrink-0 hidden sm:block" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none rounded-xl px-3 py-2 text-sm text-slate-200"
              aria-label="Filter by movement action"
            >
              <option value="ALL">All Actions</option>
              {availableActions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table / Empty / Error */}
      {loading ? (
        <TableSkeleton rows={6} columns={6} />
      ) : error ? (
        <ErrorMessage
          title="Unable to Load Stock History"
          message={error}
          onRetry={fetchHistory}
        />
      ) : filteredMovements.length === 0 ? (
        <div className="p-12 rounded-xl bg-slate-900/75 border border-slate-800/90 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/70 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <History className="w-6 h-6" />
          </div>
          <p className="text-base font-semibold text-slate-200">
            No stock movements yet.
          </p>
        </div>
      ) : (
        <div className="w-full rounded-xl bg-slate-900/80 border border-slate-800/90 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold text-slate-400">
                  <th className="py-3.5 px-4">Product</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4 text-right">Quantity</th>
                  {showStockTransitionColumn && (
                    <th className="py-3.5 px-4 text-right">
                      Previous / Current Stock
                    </th>
                  )}
                  <th className="py-3.5 px-4">Note</th>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4 text-right">Date / Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {filteredMovements.map((item) => {
                  const isAdd =
                    item.action.includes('IN') || item.action.includes('ADD');

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-medium text-slate-100">
                        {item.product_name}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                            isAdd ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {isAdd ? (
                            <ArrowDownToLine className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowUpFromLine className="w-3.5 h-3.5" />
                          )}
                          {item.action}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-100">
                        {item.quantity}
                      </td>

                      {showStockTransitionColumn && (
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs text-slate-300">
                          {item.previous_stock !== null ||
                          item.current_stock !== null
                            ? `${item.previous_stock ?? '—'} → ${
                                item.current_stock ?? '—'
                              }`
                            : '—'}
                        </td>
                      )}

                      <td className="py-3.5 px-4 text-xs text-slate-300 max-w-[260px] truncate">
                        {item.note || '—'}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-300 font-mono truncate max-w-[140px]">
                        {item.user || '—'}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs text-slate-400 whitespace-nowrap">
                        {formatTimestamp(item.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
