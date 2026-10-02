import React, { useState, useEffect } from 'react';
import { Loader2, X, Info } from 'lucide-react';

export default function ProductForm({
  isOpen,
  mode = 'create', // 'create' | 'edit'
  initialData = null,
  onSubmit,
  onCancel,
  submitting = false,
}) {
  const isEdit = mode === 'edit';

  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    supplier_id: '',
    quantity: 0,
    reorder_level: 5,
    cost_price: '',
    selling_price: '',
  });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (isEdit && initialData) {
      setFormData({
        name: initialData.name || '',
        category_id:
          initialData.category_id !== null && initialData.category_id !== undefined
            ? String(initialData.category_id)
            : '',
        supplier_id:
          initialData.supplier_id !== null && initialData.supplier_id !== undefined
            ? String(initialData.supplier_id)
            : '',
        reorder_level:
          initialData.reorder_level !== null && initialData.reorder_level !== undefined
            ? Number(initialData.reorder_level)
            : 5,
        cost_price:
          initialData.cost_price !== null && initialData.cost_price !== undefined
            ? Number(initialData.cost_price)
            : '',
        selling_price:
          initialData.selling_price !== null && initialData.selling_price !== undefined
            ? Number(initialData.selling_price)
            : '',
      });
    } else {
      setFormData({
        name: '',
        category_id: '',
        supplier_id: '',
        quantity: 0,
        reorder_level: 5,
        cost_price: '',
        selling_price: '',
      });
    }
    setFormError('');
  }, [isEdit, initialData, isOpen]);

  if (!isOpen) return null;

  const parseOptionalId = (val) => {
    const trimmed = String(val ?? '').trim();
    return trimmed ? trimmed : null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      setFormError('Product Name is required.');
      return;
    }

    if (formData.selling_price === '' || Number(formData.selling_price) < 0) {
      setFormError('Please enter a valid Selling Price.');
      return;
    }

    if (formData.cost_price === '' || Number(formData.cost_price) < 0) {
      setFormError('Please enter a valid Cost Price.');
      return;
    }

    if (isEdit) {
      // IMPORTANT: Quantity is NOT part of PUT /products/{product_id}
      const updatePayload = {
        name: trimmedName,
        category_id: parseOptionalId(formData.category_id),
        supplier_id: parseOptionalId(formData.supplier_id),
        reorder_level: Number(formData.reorder_level ?? 0),
        cost_price: Number(formData.cost_price),
        selling_price: Number(formData.selling_price),
      };
      await onSubmit(updatePayload);
    } else {
      const createPayload = {
        name: trimmedName,
        category_id: parseOptionalId(formData.category_id),
        supplier_id: parseOptionalId(formData.supplier_id),
        quantity: Number(formData.quantity ?? 0),
        reorder_level: Number(formData.reorder_level ?? 0),
        cost_price: Number(formData.cost_price),
        selling_price: Number(formData.selling_price),
      };
      await onSubmit(createPayload);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-page-enter"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="text-lg font-semibold text-slate-100">
            {isEdit ? 'Edit Product Details & Pricing' : 'Create New Product'}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-200">
              {formError}
            </div>
          )}

          {isEdit && (
            <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-start gap-2.5 text-xs text-indigo-200">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                Stock quantity is managed exclusively through Stock In and Stock Out
                operations.
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Product Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g. Type-C Fast Charging Cable"
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none rounded-xl px-3.5 py-2.5 text-sm text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Category ID (Optional)
              </label>
              <input
                type="text"
                value={formData.category_id}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, category_id: e.target.value }))
                }
                placeholder="Leave empty for null"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none rounded-xl px-3.5 py-2.5 text-sm text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Supplier ID (Optional)
              </label>
              <input
                type="text"
                value={formData.supplier_id}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, supplier_id: e.target.value }))
                }
                placeholder="Leave empty for null"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none rounded-xl px-3.5 py-2.5 text-sm text-slate-100 font-mono"
              />
            </div>
          </div>

          <div
            className={`grid grid-cols-1 ${
              isEdit ? 'sm:grid-cols-1' : 'sm:grid-cols-2'
            } gap-4`}
          >
            {!isEdit && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Initial Quantity *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, quantity: e.target.value }))
                  }
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none rounded-xl px-3.5 py-2.5 text-sm text-slate-100 font-mono tabular-nums"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Reorder Level *
              </label>
              <input
                type="number"
                min="0"
                required
                value={formData.reorder_level}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    reorder_level: e.target.value,
                  }))
                }
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none rounded-xl px-3.5 py-2.5 text-sm text-slate-100 font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Cost Price *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={formData.cost_price}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, cost_price: e.target.value }))
                }
                placeholder="e.g. 600"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none rounded-xl px-3.5 py-2.5 text-sm text-slate-100 font-mono tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Selling Price *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={formData.selling_price}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    selling_price: e.target.value,
                  }))
                }
                placeholder="e.g. 1000"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none rounded-xl px-3.5 py-2.5 text-sm text-slate-100 font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-semibold transition-all disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isEdit ? 'Save Changes' : 'Create Product'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
