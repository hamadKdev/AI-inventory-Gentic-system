import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  AlertTriangle,
  ShoppingBag,
  RefreshCw,
} from 'lucide-react';
import {
  getLowStockReport,
  getSalesReport,
  getDashboardReport,
} from '../api/reports.js';
import { getProducts } from '../api/products.js';
import { useAuth } from '../context/AuthContext.jsx';
import { TableSkeleton, CardSkeleton } from '../components/Loading.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import { formatCurrency } from '../components/ProductTable.jsx';

export default function Reports() {
  const { isManager, refreshTrigger } = useAuth();

  const [activeTab, setActiveTab] = useState('low-stock');
  const [productMap, setProductMap] = useState({});

  // Low Stock Report state
  const [lowStockItems, setLowStockItems] = useState([]);
  const [lowStockLoading, setLowStockLoading] = useState(true);
  const [lowStockError, setLowStockError] = useState('');

  // Manager Sales Report state
  const [salesReport, setSalesReport] = useState(null);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesError, setSalesError] = useState('');

  // Dashboard Summary Report state
  const [dashboardSummary, setDashboardSummary] = useState(null);

  const loadLowStock = useCallback(async () => {
    setLowStockLoading(true);
    setLowStockError('');
    try {
      const [lowRes, dashRes, productsList] = await Promise.all([
        getLowStockReport(),
        getDashboardReport().catch(() => null),
        getProducts().catch(() => []),
      ]);
      setLowStockItems(lowRes.items || []);
      if (dashRes) {
        setDashboardSummary(dashRes);
      }
      const map = {};
      productsList.forEach((p) => {
        if (p?.id) map[String(p.id)] = p.name;
      });
      setProductMap(map);
    } catch (err) {
      setLowStockError(err?.message || 'Unable to load low-stock report.');
    } finally {
      setLowStockLoading(false);
    }
  }, []);

  const loadSales = useCallback(async () => {
    if (!isManager) return;
    setSalesLoading(true);
    setSalesError('');
    try {
      const res = await getSalesReport();
      setSalesReport(res);
    } catch (err) {
      setSalesError(err?.message || 'Unable to load sales report.');
    } finally {
      setSalesLoading(false);
    }
  }, [isManager]);

  useEffect(() => {
    loadLowStock();
    if (isManager) {
      loadSales();
    }
  }, [loadLowStock, loadSales, isManager, refreshTrigger]);

  const handleRefresh = () => {
    loadLowStock();
    if (isManager) {
      loadSales();
    }
  };

  const salesList = salesReport?.sales || [];
  const totalSalesUnits = salesList.reduce(
    (sum, s) => sum + Number(s.quantity ?? 0),
    0
  );
  const totalSalesRevenue = salesList.reduce(
    (sum, s) => sum + Number(s.total_amount ?? s.total_price ?? 0),
    0
  );

  return (
    <div className="space-y-6 animate-page-enter">
      {/* Header & Interactive Report Tabs */}
      <div className="p-5 rounded-2xl bg-slate-900/85 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Inventory &amp; Sales Reports
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live data from /reports/low-stock, /reports/dashboard
              {isManager ? ', and /reports/sales' : ''}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('low-stock')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === 'low-stock'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Low Stock Report
            </button>

            {isManager && (
              <button
                type="button"
                onClick={() => setActiveTab('sales')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'sales'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sales Report (Manager)
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-colors whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Dashboard Summary Metrics Row */}
      {dashboardSummary && typeof dashboardSummary === 'object' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-xs text-slate-400 block">
              Total Catalog Products
            </span>
            <span className="text-xl font-bold font-mono tabular-nums text-slate-100 mt-1 block">
              {dashboardSummary.total_products ??
                dashboardSummary.products_count ??
                '—'}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-xs text-slate-400 block">
              Total Units in Stock
            </span>
            <span className="text-xl font-bold font-mono tabular-nums text-cyan-300 mt-1 block">
              {dashboardSummary.total_stock ??
                dashboardSummary.total_units ??
                dashboardSummary.total_quantity ??
                '—'}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-xs text-slate-400 block">
              Low Stock Items Count
            </span>
            <span className="text-xl font-bold font-mono tabular-nums text-amber-400 mt-1 block">
              {dashboardSummary.low_stock_items ??
                dashboardSummary.low_stock_count ??
                lowStockItems.length}
            </span>
          </div>
        </div>
      )}

      {/* TAB 1: LOW STOCK REPORT */}
      {activeTab === 'low-stock' && (
        <div className="space-y-4">
          {lowStockLoading ? (
            <TableSkeleton rows={5} columns={4} />
          ) : lowStockError ? (
            <ErrorMessage
              title="Low Stock Report Unavailable"
              message={lowStockError}
              onRetry={loadLowStock}
            />
          ) : lowStockItems.length === 0 ? (
            <div className="p-12 rounded-xl bg-slate-900/75 border border-slate-800/90 text-center">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3 text-emerald-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <p className="text-base font-semibold text-slate-200">
                All products are sufficiently stocked.
              </p>
            </div>
          ) : (
            <div className="w-full rounded-xl bg-slate-900/80 border border-slate-800/90 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold text-slate-400">
                      <th className="py-3.5 px-4">Product</th>
                      <th className="py-3.5 px-4 text-right">Current Stock</th>
                      <th className="py-3.5 px-4 text-right">Reorder Level</th>
                      <th className="py-3.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {lowStockItems.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-medium text-slate-100">
                          {item.name}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-amber-400">
                          {item.quantity}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-300">
                          {item.reorder_level}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold">
                          <span
                            className={
                              item.quantity <= 0
                                ? 'text-rose-400'
                                : 'text-amber-400'
                            }
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MANAGER-ONLY SALES REPORT */}
      {activeTab === 'sales' && isManager && (
        <div className="space-y-4">
          {salesLoading ? (
            <>
              <CardSkeleton count={3} />
              <TableSkeleton rows={5} columns={5} />
            </>
          ) : salesError ? (
            <ErrorMessage
              title="Sales Report Unavailable"
              message={salesError}
              onRetry={loadSales}
            />
          ) : (
            <>
              {salesList.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-5 rounded-xl bg-slate-900/85 border border-slate-800">
                    <span className="text-xs text-slate-400 block">
                      Total Sales Transactions
                    </span>
                    <span className="text-xl font-bold font-mono tabular-nums text-slate-100 mt-1 block">
                      {salesList.length.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-5 rounded-xl bg-slate-900/85 border border-cyan-500/30">
                    <span className="text-xs text-cyan-300 block">
                      Total Units Sold
                    </span>
                    <span className="text-xl font-bold font-mono tabular-nums text-slate-100 mt-1 block">
                      {totalSalesUnits.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-5 rounded-xl bg-slate-900/85 border border-emerald-500/30">
                    <span className="text-xs text-emerald-300 block">
                      Total Sales Revenue
                    </span>
                    <span className="text-xl font-bold font-mono tabular-nums text-emerald-400 mt-1 block">
                      {formatCurrency(totalSalesRevenue)}
                    </span>
                  </div>
                </div>
              )}

              {salesList.length === 0 ? (
                <div className="p-12 rounded-xl bg-slate-900/75 border border-slate-800/90 text-center">
                  <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/70 flex items-center justify-center mx-auto mb-3 text-slate-400">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <p className="text-base font-semibold text-slate-200">
                    No sales recorded yet.
                  </p>
                </div>
              ) : (
                <div className="w-full rounded-xl bg-slate-900/80 border border-slate-800/90 overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold text-slate-400">
                          <th className="py-3.5 px-4">Product</th>
                          <th className="py-3.5 px-4 text-right">Quantity</th>
                          <th className="py-3.5 px-4 text-right">Unit Selling Price</th>
                          <th className="py-3.5 px-4 text-right">Total Amount</th>
                          <th className="py-3.5 px-4 text-right">Date / Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-sm">
                        {salesList.map((sale, index) => {
                          const productName =
                            sale.product_name ||
                            sale.product?.name ||
                            sale.products?.name ||
                            sale.name ||
                            (sale.product_id && productMap[String(sale.product_id)]) ||
                            `Product #${sale.product_id || index + 1}`;
                          const unitPrice = sale.selling_price ?? sale.price ?? null;
                          const totalAmount =
                            sale.total_amount ?? sale.total_price ?? null;

                          return (
                            <tr
                              key={sale.id || index}
                              className="hover:bg-slate-800/40 transition-colors"
                            >
                              <td className="py-3.5 px-4 font-medium text-slate-100">
                                {productName}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-emerald-400">
                                {sale.quantity ?? 0}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-300">
                                {unitPrice !== null ? formatCurrency(unitPrice) : '—'}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-cyan-300">
                                {totalAmount !== null
                                  ? formatCurrency(totalAmount)
                                  : '—'}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs text-slate-400">
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
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
