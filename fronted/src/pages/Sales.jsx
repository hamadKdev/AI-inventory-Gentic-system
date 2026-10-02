import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingBag, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getProducts } from '../api/products.js';
import { recordSale } from '../api/sales.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import Loading from '../components/Loading.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import { formatCurrency } from '../components/ProductTable.jsx';

export default function Sales() {
  const { refreshTrigger, triggerDataRefresh } = useAuth();
  const toast = useToast();

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [lastSaleResult, setLastSaleResult] = useState(null);

  const fetchProductsList = useCallback(async () => {
    setLoadingProducts(true);
    setLoadError('');
    try {
      const list = await getProducts();
      setProducts(list);
    } catch (err) {
      setLoadError(err?.message || 'Unable to load products for sales.');
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    fetchProductsList();
  }, [fetchProductsList, refreshTrigger]);

  const selectedProduct = products.find(
    (p) => String(p.id) === String(productId)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setLastSaleResult(null);

    if (!productId) {
      setSubmitError('Please select a product.');
      return;
    }

    const numericQty = Number(quantity);
    if (!Number.isFinite(numericQty) || numericQty <= 0) {
      setSubmitError('Quantity must be greater than zero.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await recordSale({
        product_id: selectedProduct ? selectedProduct.id : productId,
        quantity: numericQty,
      });

      const successMessage =
        response?.message ||
        response?.detail ||
        `Sale recorded for ${numericQty} unit(s) of ${
          selectedProduct?.name || 'selected product'
        }.`;

      toast.success(successMessage);
      setLastSaleResult({
        message: successMessage,
        data: response?.sale || response?.data || response,
      });
      setQuantity('');

      await fetchProductsList();
      triggerDataRefresh();
    } catch (err) {
      let errMsg = err?.message || 'Unable to record sale.';
      if (
        selectedProduct &&
        numericQty > selectedProduct.quantity &&
        !/current stock/i.test(errMsg)
      ) {
        errMsg = `Stock cannot go below zero. Current stock is ${selectedProduct.quantity}.`;
      }
      setSubmitError(errMsg);
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingProducts) {
    return <Loading label="Loading products for sale recording..." />;
  }

  if (loadError) {
    return (
      <ErrorMessage
        title="Unable to Load Products"
        message={loadError}
        onRetry={fetchProductsList}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-page-enter">
      <form
        onSubmit={handleSubmit}
        className="p-6 sm:p-8 rounded-2xl bg-slate-900/85 border border-slate-800/90 shadow-xl space-y-5"
      >
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Record Sale Transaction
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select a product and quantity sold. Inventory stock is automatically
              updated by the backend.
            </p>
          </div>
        </div>

        {submitError && (
          <div className="p-4 rounded-xl bg-rose-950/45 border border-rose-500/40 flex items-start gap-3 text-sm text-rose-200">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}

        {lastSaleResult && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-3 text-sm text-emerald-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium">{lastSaleResult.message}</p>
              {lastSaleResult.data?.total_price !== undefined && (
                <p className="text-xs font-mono tabular-nums text-emerald-300">
                  Total Returned by Backend:{' '}
                  {formatCurrency(lastSaleResult.data.total_price)}
                </p>
              )}
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Product *
          </label>
          <select
            required
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            disabled={submitting}
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-slate-100"
          >
            <option value="">— Select a product —</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} (Stock: {product.quantity})
              </option>
            ))}
          </select>
        </div>

        {selectedProduct && (
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-slate-400">Available Stock: </span>
              <span className="font-mono tabular-nums font-semibold text-cyan-300">
                {selectedProduct.quantity}
              </span>
            </div>
            {selectedProduct.selling_price !== null && (
              <div>
                <span className="text-slate-400">Unit Selling Price: </span>
                <span className="font-mono tabular-nums text-slate-200">
                  {formatCurrency(selectedProduct.selling_price)}
                </span>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Quantity *
          </label>
          <input
            type="number"
            min="1"
            step="1"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            disabled={submitting}
            placeholder="e.g. 2"
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-slate-100 font-mono tabular-nums"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-semibold shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Record Sale</span>
          </button>
        </div>
      </form>
    </div>
  );
}
