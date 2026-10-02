import React from 'react';
import { Eye, Edit3, ArrowDownToLine, ArrowUpFromLine, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }
  return `PKR ${Number(value).toLocaleString()}`;
}

export default function ProductTable({
  products = [],
  onViewProduct,
  onEditProduct,
}) {
  const { isManager } = useAuth();
  const navigate = useNavigate();

  const showCostColumn =
    isManager && products.some((p) => p.cost_price !== null && p.cost_price !== undefined);

  if (!products || products.length === 0) {
    return (
      <div className="p-12 rounded-xl bg-slate-900/75 border border-slate-800/90 text-center">
        <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/70 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <Package className="w-6 h-6" />
        </div>
        <p className="text-base font-semibold text-slate-200">No products found.</p>
        <p className="text-xs text-slate-400 mt-1">
          Try adjusting your search or filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl bg-slate-900/80 border border-slate-800/90 overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold text-slate-400">
              <th className="py-3.5 px-4">Product</th>
              <th className="py-3.5 px-4">Category</th>
              <th className="py-3.5 px-4 text-right">Stock</th>
              <th className="py-3.5 px-4 text-right">Reorder Level</th>
              {showCostColumn && (
                <th className="py-3.5 px-4 text-right">Cost Price</th>
              )}
              <th className="py-3.5 px-4 text-right">Selling Price</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm">
            {products.map((product) => {
              const statusColor =
                product.status === 'Out of Stock'
                  ? 'text-rose-400 font-semibold'
                  : product.status === 'Low Stock'
                  ? 'text-amber-400 font-semibold'
                  : 'text-emerald-400 font-medium';

              return (
                <tr
                  key={product.id}
                  className="hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3.5 px-4 font-medium text-slate-100">
                    <div className="truncate max-w-[240px]" title={product.name}>
                      {product.name}
                    </div>
                    <div className="text-xs text-slate-500 font-mono tabular-nums">
                      ID: {String(product.id)}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-slate-300 text-xs">
                    {product.category_name || 'Uncategorized'}
                  </td>

                  <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-100">
                    {product.quantity}
                  </td>

                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-300">
                    {product.reorder_level}
                  </td>

                  {showCostColumn && (
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-300">
                      {product.cost_price !== null
                        ? formatCurrency(product.cost_price)
                        : '—'}
                    </td>
                  )}

                  <td className="py-3.5 px-4 text-right font-mono tabular-nums font-medium text-cyan-300">
                    {formatCurrency(product.selling_price)}
                  </td>

                  <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                    <span className={statusColor}>{product.status}</span>
                  </td>

                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center justify-end gap-1.5">
                      {onViewProduct && (
                        <button
                          type="button"
                          onClick={() => onViewProduct(product)}
                          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="View product details"
                          aria-label={`View ${product.name}`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          navigate('/stock-in', {
                            state: { selectedProductId: product.id },
                          })
                        }
                        className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-emerald-950/80 text-slate-300 hover:text-emerald-300 transition-colors"
                        title="Add Stock (Stock In)"
                        aria-label={`Add stock for ${product.name}`}
                      >
                        <ArrowDownToLine className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          navigate('/stock-out', {
                            state: { selectedProductId: product.id },
                          })
                        }
                        className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-amber-950/80 text-slate-300 hover:text-amber-300 transition-colors"
                        title="Remove Stock (Stock Out)"
                        aria-label={`Remove stock for ${product.name}`}
                      >
                        <ArrowUpFromLine className="w-4 h-4" />
                      </button>

                      {isManager && onEditProduct && (
                        <button
                          type="button"
                          onClick={() => onEditProduct(product)}
                          className="p-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 transition-colors"
                          title="Edit product"
                          aria-label={`Edit ${product.name}`}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
