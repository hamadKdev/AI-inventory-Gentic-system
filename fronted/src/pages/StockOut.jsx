import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { getProducts } from '../api/products.js';
import { removeStockOut } from '../api/stock.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import StockForm from '../components/StockForm.jsx';
import Loading from '../components/Loading.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';

export default function StockOut() {
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
      setLoadError(err?.message || 'Unable to load products for Stock Out.');
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    fetchProductsList();
  }, [fetchProductsList, refreshTrigger]);

  const handleStockOutSubmit = async ({ product_id, quantity, note }) => {
    setSubmitting(true);
    setSubmitError('');

    const targetProduct = products.find(
      (p) => String(p.id) === String(product_id)
    );

    try {
      const res = await removeStockOut({ product_id, quantity, note });
      const msg =
        res?.message ||
        res?.detail ||
        `Successfully removed ${quantity} units from stock.`;
      toast.success(msg);

      // Refresh live stock from backend
      await fetchProductsList();
      triggerDataRefresh();
      return true;
    } catch (err) {
      let errMsg = err?.message || 'Failed to remove stock.';
      if (
        targetProduct &&
        quantity > targetProduct.quantity &&
        !/current stock/i.test(errMsg)
      ) {
        errMsg = `Stock cannot go below zero. Current stock is ${targetProduct.quantity}.`;
      }
      setSubmitError(errMsg);
      toast.error(errMsg);
      // Do NOT modify UI stock manually when backend rejects the request
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingProducts) {
    return <Loading label="Loading product list for Stock Out..." />;
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
        type="out"
        products={products}
        initialProductId={preselectedId}
        onSubmit={handleStockOutSubmit}
        submitting={submitting}
        error={submitError}
      />
    </div>
  );
}
