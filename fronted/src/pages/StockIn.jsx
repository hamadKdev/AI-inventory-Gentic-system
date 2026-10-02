import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { getProducts } from '../api/products.js';
import { addStockIn } from '../api/stock.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import StockForm from '../components/StockForm.jsx';
import Loading from '../components/Loading.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';

export default function StockIn() {
  const { refreshTrigger, triggerDataRefresh } = useAuth();
  const location = useLocation();
  const toast = useToast();

  const preselectedId = location.state?.selectedProductId || '';

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const fetchProductsList = useCallback(async () => {
    setLoadingProducts(true);
    setLoadError('');
    try {
      const list = await getProducts();
      setProducts(list);
    } catch (err) {
      setLoadError(err?.message || 'Unable to load products for Stock In.');
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    fetchProductsList();
  }, [fetchProductsList, refreshTrigger]);

  const handleStockInSubmit = async ({ product_id, quantity, note }) => {
    setSubmitting(true);
    setSubmitError('');

    try {
      const res = await addStockIn({ product_id, quantity, note });
      const msg =
        res?.message ||
        res?.detail ||
        `Successfully added ${quantity} units to stock.`;
      toast.success(msg);

      // Refresh product stock, dashboard, and history
      await fetchProductsList();
      triggerDataRefresh();
      return true;
    } catch (err) {
      const errMsg = err?.message || 'Failed to add stock.';
      setSubmitError(errMsg);
      toast.error(errMsg);
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingProducts) {
    return <Loading label="Loading product list for Stock In..." />;
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
    <div className="max-w-2xl mx-auto animate-page-enter">
      <StockForm
        type="in"
        products={products}
        initialProductId={preselectedId}
        onSubmit={handleStockInSubmit}
        submitting={submitting}
        error={submitError}
      />
    </div>
  );
}
