import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Boxes,
  AlertTriangle,
  ShoppingBag,
  ArrowDownToLine,
  ArrowUpFromLine,
  Bot,
  DollarSign,
  TrendingUp,
  History,
  RefreshCw,
} from 'lucide-react';
import {
  getDashboardReport,
  getLowStockReport,
  getSalesReport,
} from '../api/reports.js';
import { getStockHistory } from '../api/stock.js';
import { getProducts, extractArray, normalizeProduct } from '../api/products.js';
import { useAuth } from '../context/AuthContext.jsx';
import { CardSkeleton, TableSkeleton } from '../components/Loading.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import { formatCurrency } from '../components/ProductTable.jsx';

function pickStat(obj, keys) {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) {
      return obj[key];
    }
  }
  if (obj.data && typeof obj.data === 'object') {
    for (const key of keys) {
      if (obj.data[key] !== undefined && obj.data[key] !== null) {
        return obj.data[key];
      }
    }
  }
  return undefined;
}

export default function Dashboard() {
  const { isManager, refreshTrigger } = useAuth();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [productMap, setProductMap] = useState({});
  const [lowStockItems, setLowStockItems] = useState([]);
  const [recentMovements, setRecentMovements] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [report, productsList] = await Promise.all([
        getDashboardReport(),
        getProducts().catch(() => []),
      ]);

      setDashboardData(report);

      const map = {};
      productsList.forEach((p) => {
        if (p?.id) map[String(p.id)] = p.name;
      });
      setProductMap(map);

      // Extract low stock items from dashboard payload or fallback to /reports/low-stock
      const embeddedLowStock = extractArray(report, [
        'low_stock',
        'low_stock_products',
        'low_stock_list',
      ]);

      if (embeddedLowStock.length > 0) {
        setLowStockItems(embeddedLowStock.map(normalizeProduct).filter(Boolean));
      } else {
        try {
          const lowRes = await getLowStockReport();
          setLowStockItems(lowRes.items || []);
        } catch {
          setLowStockItems([]);
        }
      }

      // Fetch stock history for recent movements
      let historyList = [];
      try {
        historyList = await getStockHistory(map);
        setRecentMovements(historyList.slice(0, 6));
      } catch {
        setRecentMovements([]);
      }

      // Extract recent sales from dashboard, /reports/sales (for manager), or sale movements
      const embeddedSales = extractArray(report, [
        'recent_sales',
        'sales',
        'today_sales_list',
      ]);

      if (embeddedSales.length > 0) {
        setRecentSales(embeddedSales.slice(0, 6));
      } else if (isManager) {
        try {
          const salesRes = await getSalesReport();
          setRecentSales((salesRes.sales || []).slice(0, 6));
        } catch {
          const saleMovs = historyList.filter(
            (m) =>
              m.note.toLowerCase() === 'sale' || m.action.includes('SALE')
          );
          setRecentSales(saleMovs.slice(0, 6));
        }
      } else {
        const saleMovs = historyList.filter(
          (m) => m.note.toLowerCase() === 'sale' || m.action.includes('SALE')
        );
        setRecentSales(saleMovs.slice(0, 6));
      }
    } catch (err) {
      setError(err?.message || 'Unable to load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  }, [isManager]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard, refreshTrigger]);

  const totalProducts = pickStat(dashboardData, [
    'total_products',
    'products_count',
    'product_count',
  ]);
  const totalStock = pickStat(dashboardData, [
    'total_stock',
    'total_units',
    'total_quantity',
    'stock_count',
  ]);
  const lowStockCount =
    pickStat(dashboardData, [
      'low_stock_items',
      'low_stock_count',
      'low_stock_products_count',
    ]) ?? (Array.isArray(lowStockItems) ? lowStockItems.length : undefined);

  const rawTodaysSales = pickStat(dashboardData, [
    'today_sales',
    'todays_sales',
    'sales_today',
    'total_sales_today',
    'total_sales',
  ]);

  const computedSalesCount =
    rawTodaysSales !== undefined
      ? rawTodaysSales
      : recentSales.reduce((acc, s) => acc + Number(s.quantity ?? 0), 0);

  // Financial metrics strictly restricted to Manager role and only when returned by backend
  const totalInventoryCost = isManager
    ? pickStat(dashboardData, [
        'inventory_cost_value',
        'total_inventory_cost',
        'inventory_cost',
        'total_cost',
      ])
    : undefined;

  const totalInventoryValue = isManager
    ? pickStat(dashboardData, [
        'inventory_selling_value',
        'total_inventory_value',
        'inventory_value',
        'total_selling_value',
      ])
    : undefined;

  const explicitProfit = isManager
    ? pickStat(dashboardData, [
        'total_profit',
        'estimated_profit',
        'today_profit',
        'profit',
      ])
    : undefined;

  const totalProfit =
    explicitProfit !== undefined
      ? explicitProfit
      : isManager &&
        totalInventoryValue !== undefined &&
        totalInventoryCost !== undefined
      ? Number(totalInventoryValue) - Number(totalInventoryCost)
      : undefined;

  return (
    <div className="space-y-6 animate-page-enter">
      {/* Quick Action Bar */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900/95 via-indigo-950/40 to-slate-900/95 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100">
            Quick Inventory Operations
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Execute stock adjustments, record counter sales, or query the AI Assistant.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/stock-in')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors whitespace-nowrap"
          >
            <ArrowDownToLine className="w-4 h-4" />
            <span>Add Stock</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/stock-out')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-colors whitespace-nowrap"
          >
            <ArrowUpFromLine className="w-4 h-4" />
            <span>Remove Stock</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/sales')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-semibold transition-colors whitespace-nowrap"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Record Sale</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/ai-assistant')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-cyan-500/20 transition-all whitespace-nowrap"
          >
            <Bot className="w-4 h-4" />
            <span>Ask AI</span>
          </button>
        </div>
      </div>

      {/* Main Content or Error State */}
      {loading ? (
        <>
          <CardSkeleton count={4} />
          <TableSkeleton rows={4} columns={4} />
        </>
      ) : error ? (
        <ErrorMessage
          title="Dashboard Statistics Unavailable"
          message={error}
          onRetry={loadDashboard}
        />
      ) : (
        <>
          {/* Primary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/85 border border-slate-800/90 hover:border-cyan-500/30 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-400">
                  Total Products
                </span>
                <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-100">
                {totalProducts !== undefined && typeof totalProducts !== 'object'
                  ? Number(totalProducts).toLocaleString()
                  : '—'}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Active catalog SKUs in system
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/85 border border-slate-800/90 hover:border-blue-500/30 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-400">
                  Total Stock
                </span>
                <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400">
                  <Boxes className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-100">
                {totalStock !== undefined && typeof totalStock !== 'object'
                  ? Number(totalStock).toLocaleString()
                  : '—'}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Combined units on hand
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/85 border border-slate-800/90 hover:border-amber-500/30 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-400">
                  Low Stock Items
                </span>
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-amber-400">
                {lowStockCount !== undefined && typeof lowStockCount !== 'object'
                  ? Number(lowStockCount).toLocaleString()
                  : '—'}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                At or below reorder threshold
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/85 border border-slate-800/90 hover:border-emerald-500/30 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-400">
                  Today&apos;s Sales
                </span>
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-emerald-400">
                {computedSalesCount !== undefined &&
                typeof computedSalesCount !== 'object'
                  ? `${Number(computedSalesCount).toLocaleString()} units`
                  : '—'}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Units sold in recent transactions
              </p>
            </div>
          </div>

          {/* Manager-Only Financial Cards (Only rendered if Manager AND returned by backend) */}
          {isManager &&
            (totalInventoryCost !== undefined ||
              totalInventoryValue !== undefined ||
              totalProfit !== undefined) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {totalInventoryCost !== undefined && (
                  <div className="p-5 rounded-2xl bg-slate-900/85 border border-indigo-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-indigo-300">
                        Total Inventory Cost
                      </span>
                      <DollarSign className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="text-xl font-bold font-mono tabular-nums text-slate-100">
                      {formatCurrency(totalInventoryCost)}
                    </div>
                  </div>
                )}

                {totalInventoryValue !== undefined && (
                  <div className="p-5 rounded-2xl bg-slate-900/85 border border-cyan-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-cyan-300">
                        Total Inventory Selling Value
                      </span>
                      <TrendingUp className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="text-xl font-bold font-mono tabular-nums text-slate-100">
                      {formatCurrency(totalInventoryValue)}
                    </div>
                  </div>
                )}

                {totalProfit !== undefined && (
                  <div className="p-5 rounded-2xl bg-slate-900/85 border border-emerald-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-emerald-300">
                        Projected Inventory Margin
                      </span>
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-xl font-bold font-mono tabular-nums text-emerald-400">
                      {formatCurrency(totalProfit)}
                    </div>
                  </div>
                )}
              </div>
            )}

          {/* Low Stock & Recent Stock Movements Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Low Stock Section */}
            <div className="rounded-2xl bg-slate-900/85 border border-slate-800/90 overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-slate-100">
                    Low Stock Alerts
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/products')}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  View All Products
                </button>
              </div>

              <div className="p-5 flex-1">
                {lowStockItems.length === 0 ? (
                  <p className="text-sm text-slate-400 py-6 text-center">
                    All products are sufficiently stocked.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-800/60">
                    {lowStockItems.slice(0, 6).map((item) => (
                      <div
                        key={item.id}
                        className="py-3 flex items-center justify-between gap-4 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-100 truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-slate-400 font-mono tabular-nums">
                            Reorder Level: {item.reorder_level}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className={`font-mono tabular-nums font-semibold ${
                              item.quantity <= 0
                                ? 'text-rose-400'
                                : 'text-amber-400'
                            }`}
                          >
                            {item.quantity} in stock
                          </span>
                          <div className="text-[11px] text-slate-400">
                            {item.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Stock Movements */}
            <div className="rounded-2xl bg-slate-900/85 border border-slate-800/90 overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <History className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold text-slate-100">
                    Recent Stock Movements
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/stock-history')}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  Full History
                </button>
              </div>

              <div className="p-5 flex-1">
                {recentMovements.length === 0 ? (
                  <p className="text-sm text-slate-400 py-6 text-center">
                    No stock movements yet.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-800/60">
                    {recentMovements.map((mov, index) => {
                      const prodName =
                        mov.product_name ||
                        (mov.product_id && productMap[String(mov.product_id)]) ||
                        `Product #${mov.product_id || index + 1}`;
                      const actionStr = String(
                        mov.action || mov.movement_type || mov.type || 'UPDATE'
                      ).toUpperCase();
                      const qty = mov.quantity ?? mov.change_quantity ?? 0;

                      return (
                        <div
                          key={mov.id || index}
                          className="py-3 flex items-center justify-between gap-4 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-slate-100 truncate">
                              {prodName}
                            </p>
                            <p className="text-xs text-slate-400 truncate">
                              {actionStr}
                              {mov.note ? ` · ${mov.note}` : ''}
                            </p>
                          </div>
                          <div className="text-right font-mono tabular-nums shrink-0">
                            <span
                              className={`font-semibold ${
                                actionStr.includes('IN') ||
                                actionStr.includes('ADD')
                                  ? 'text-emerald-400'
                                  : 'text-amber-400'
                              }`}
                            >
                              {qty} units
                            </span>
                            {mov.previous_stock !== null &&
                              mov.current_stock !== null && (
                                <div className="text-[11px] text-slate-500">
                                  {mov.previous_stock} → {mov.current_stock}
                                </div>
                              )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Sales Section */}
          <div className="rounded-2xl bg-slate-900/85 border border-slate-800/90 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-100">
                  Recent Sales Activity
                </h3>
              </div>
              <button
                type="button"
                onClick={loadDashboard}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            </div>

            <div className="p-5">
              {recentSales.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">
                  No sales recorded yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs text-slate-400">
                        <th className="py-2.5 px-3">Product</th>
                        <th className="py-2.5 px-3 text-right">Quantity</th>
                        <th className="py-2.5 px-3 text-right">Date / Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {recentSales.map((sale, idx) => {
                        const resolvedName =
                          sale.product_name ||
                          sale.product?.name ||
                          sale.products?.name ||
                          (sale.product_id && productMap[String(sale.product_id)]) ||
                          `Product #${sale.product_id || idx + 1}`;
                        return (
                          <tr key={sale.id || idx}>
                            <td className="py-2.5 px-3 font-medium text-slate-100">
                              {resolvedName}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-400 font-semibold">
                              {sale.quantity ?? 0}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums text-xs text-slate-400">
                              {sale.created_at
                                ? new Date(sale.created_at).toLocaleString()
                                : sale.date || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
