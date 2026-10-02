import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  Plus,
  Filter,
  Loader2,
} from 'lucide-react';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
} from '../api/products.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import ProductTable, { formatCurrency } from '../components/ProductTable.jsx';
import ProductForm from '../components/ProductForm.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { TableSkeleton } from '../components/Loading.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';

export default function Products() {
  const { isManager, refreshTrigger, triggerDataRefresh } = useAuth();
  const toast = useToast();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Manager Form Modal (Create / Edit)
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [editingProduct, setEditingProduct] = useState(null);
  const [submittingForm, setSubmittingForm] = useState(false);

  // Product Detail Modal (GET /products/{product_id})
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedProductDetail, setSelectedProductDetail] = useState(null);

  const fetchProductsList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await getProducts();
      setProducts(list);
    } catch (err) {
      setError(err?.message || 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProductsList();
  }, [fetchProductsList, refreshTrigger]);

  const categories = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      if (p.category_name) {
        set.add(p.category_name);
      }
    });
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        !searchQuery.trim() ||
        product.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        String(product.id)
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase());

      const matchesCategory =
        categoryFilter === 'ALL' || product.category_name === categoryFilter;

      const matchesStatus =
        statusFilter === 'ALL' || product.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchQuery, categoryFilter, statusFilter]);

  const handleOpenCreate = () => {
    setFormMode('create');
    setEditingProduct(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (product) => {
    setFormMode('edit');
    setEditingProduct(product);
    setFormOpen(true);
  };

  const handleFormSubmit = async (payload) => {
    setSubmittingForm(true);
    try {
      if (formMode === 'edit' && editingProduct) {
        await updateProduct(editingProduct.id, payload);
        toast.success(`Product "${payload.name}" updated successfully.`);
      } else {
        await createProduct(payload);
        toast.success(`Product "${payload.name}" created successfully.`);
      }
      setFormOpen(false);
      setEditingProduct(null);
      triggerDataRefresh();
    } catch (err) {
      toast.error(err?.message || 'Unable to save product.');
    } finally {
      setSubmittingForm(false);
    }
  };

  const handleViewProduct = async (product) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setSelectedProductDetail(product);

    try {
      const freshDetail = await getProductById(product.id);
      if (freshDetail) {
        setSelectedProductDetail(freshDetail);
      }
    } catch (err) {
      toast.error(err?.message || 'Could not load extended product details.');
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-page-enter">
      {/* Header & Controls */}
      <div className="p-5 rounded-2xl bg-slate-900/85 border border-slate-800/90 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Mall Product Inventory
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live product catalog, stock availability, and reorder thresholds.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={fetchProductsList}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-colors whitespace-nowrap disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-cyan-400 ${
                  loading ? 'animate-spin' : ''
                }`}
              />
              <span>Refresh</span>
            </button>

            {isManager && (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-cyan-500/20 transition-all whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Add Product</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-slate-800/80">
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product name or ID..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="md:col-span-3 flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500 shrink-0 hidden sm:block" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none rounded-xl px-3 py-2 text-sm text-slate-200"
              aria-label="Filter by category"
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none rounded-xl px-3 py-2 text-sm text-slate-200"
              aria-label="Filter by stock status"
            >
              <option value="ALL">All Stock Statuses</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table or Loading/Error */}
      {loading ? (
        <TableSkeleton rows={6} columns={isManager ? 8 : 7} />
      ) : error ? (
        <ErrorMessage
          title="Unable to Load Products"
          message={error}
          onRetry={fetchProductsList}
        />
      ) : (
        <ProductTable
          products={filteredProducts}
          onViewProduct={handleViewProduct}
          onEditProduct={isManager ? handleOpenEdit : undefined}
        />
      )}

      {/* Manager Create/Edit Product Modal */}
      {isManager && (
        <ProductForm
          isOpen={formOpen}
          mode={formMode}
          initialData={editingProduct}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setFormOpen(false);
            setEditingProduct(null);
          }}
          submitting={submittingForm}
        />
      )}

      {/* Product Detail Modal (GET /products/{product_id}) */}
      <ConfirmModal
        isOpen={detailOpen}
        title={selectedProductDetail?.name || 'Product Details'}
        onCancel={() => {
          setDetailOpen(false);
          setSelectedProductDetail(null);
        }}
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-slate-300 text-sm">
            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
            <span>Loading latest product record...</span>
          </div>
        ) : selectedProductDetail ? (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-950/80 border border-slate-800">
              <div>
                <span className="text-xs text-slate-400 block">Product ID</span>
                <span className="font-mono tabular-nums text-slate-100">
                  {String(selectedProductDetail.id)}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Status</span>
                <span className="font-semibold text-cyan-300">
                  {selectedProductDetail.status}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">
                  Current Stock
                </span>
                <span className="font-mono tabular-nums font-bold text-slate-100">
                  {selectedProductDetail.quantity}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">
                  Reorder Level
                </span>
                <span className="font-mono tabular-nums text-slate-200">
                  {selectedProductDetail.reorder_level}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">
                  Selling Price
                </span>
                <span className="font-mono tabular-nums font-semibold text-emerald-400">
                  {formatCurrency(selectedProductDetail.selling_price)}
                </span>
              </div>

              {isManager &&
                selectedProductDetail.cost_price !== null &&
                selectedProductDetail.cost_price !== undefined && (
                  <div>
                    <span className="text-xs text-slate-400 block">
                      Cost Price
                    </span>
                    <span className="font-mono tabular-nums text-slate-200">
                      {formatCurrency(selectedProductDetail.cost_price)}
                    </span>
                  </div>
                )}

              <div>
                <span className="text-xs text-slate-400 block">Category</span>
                <span className="text-slate-200">
                  {selectedProductDetail.category_name || 'Uncategorized'}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Supplier</span>
                <span className="text-slate-200">
                  {selectedProductDetail.supplier_name || '—'}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </ConfirmModal>
    </div>
  );
}
