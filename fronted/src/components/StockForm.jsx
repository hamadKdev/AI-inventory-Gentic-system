import React, { useState, useEffect } from 'react';
import { Loader2, ArrowDownToLine, ArrowUpFromLine, AlertCircle } from 'lucide-react';

export default function StockForm({
  type = 'in', // 'in' | 'out'
  products = [],
  initialProductId = '',
  onSubmit,
  submitting = false,
  error = '',
}) {
  const isStockIn = type === 'in';
  const [productId, setProductId] = useState(initialProductId || '');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (initialProductId) {
      setProductId(String(initialProductId));
    }
  }, [initialProductId]);

  const selectedProduct = products.find(
    (p) => String(p.id) === String(productId)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!productId) {
      setValidationError('Please select a product.');
      return;
    }

    const numericQty = Number(quantity);
    if (!Number.isFinite(numericQty) || numericQty <= 0) {
      setValidationError('Quantity must be greater than zero.');
      return;
    }

    const success = await onSubmit({
      product_id: selectedProduct ? selectedProduct.id : productId,
      quantity: numericQty,
      note: note.trim(),
    });

    if (success) {
      setQuantity('');
      setNote('');
    }
  };

  const displayError = validationError || error;

  return (
    <form
      onSubmit={handleSubmit}
      className="p-6 sm:p-8 rounded-2xl bg-slate-900/85 border border-slate-800/90 shadow-xl space-y-5"
    >
      <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isStockIn
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
              : 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
          }`}
        >
          {isStockIn ? (
            <ArrowDownToLine className="w-5 h-5" />
          ) : (
            <ArrowUpFromLine className="w-5 h-5" />
          )}
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-100">
            {isStockIn ? 'Add Inventory Stock (Stock In)' : 'Remove Inventory Stock (Stock Out)'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isStockIn
              ? 'Record incoming shipment or supplier delivery.'
              : 'Dispatch or deduct stock units. Stock cannot go below zero.'}
          </p>
        </div>
      </div>

      {displayError && (
        <div className="p-4 rounded-xl bg-rose-950/45 border border-rose-500/40 flex items-start gap-3 text-sm text-rose-200">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">{displayError}</div>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-300 mb-1.5">
          Select Product *
        </label>
        <select
          required
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          disabled={submitting}
          className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-slate-100"
        >
          <option value="">— Choose a product —</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} (Current Stock: {product.quantity})
            </option>
          ))}
        </select>
      </div>

      {selectedProduct && (
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-slate-400">Selected Product: </span>
            <span className="font-semibold text-slate-100">
              {selectedProduct.name}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span>
              <span className="text-slate-400">Current Stock: </span>
              <span className="font-mono tabular-nums font-semibold text-cyan-300">
                {selectedProduct.quantity}
              </span>
            </span>
            <span>
              <span className="text-slate-400">Reorder Level: </span>
              <span className="font-mono tabular-nums text-slate-300">
                {selectedProduct.reorder_level}
              </span>
            </span>
          </div>
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
          placeholder={isStockIn ? 'e.g. 40' : 'e.g. 5'}
          className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-slate-100 font-mono tabular-nums"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-300 mb-1.5">
          Note / Reference
        </label>
        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={submitting}
          placeholder={
            isStockIn
              ? 'e.g. Received from Ali Traders'
              : 'e.g. Sold to customer / Dispatched to floor'
          }
          className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-slate-100"
        />
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={submitting}
          className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 ${
            isStockIn
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-lg shadow-emerald-500/20'
              : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-lg shadow-amber-500/20'
          }`}
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>{isStockIn ? 'Confirm Stock In' : 'Confirm Stock Out'}</span>
        </button>
      </div>
    </form>
  );
}
