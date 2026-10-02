import { apiRequest } from './config.js';
import { extractArray, normalizeProduct } from './products.js';

/**
 * GET /reports/dashboard
 */
export async function getDashboardReport() {
  return apiRequest('/reports/dashboard', { method: 'GET' });
}

/**
 * GET /reports/low-stock
 */
export async function getLowStockReport() {
  const data = await apiRequest('/reports/low-stock', { method: 'GET' });
  const list = extractArray(data, [
    'low_stock',
    'low_stock_items',
    'products',
    'items',
    'data',
    'results',
  ]);
  return {
    items: list.map(normalizeProduct).filter(Boolean),
    raw: data,
  };
}

/**
 * GET /reports/sales
 * Manager-only endpoint
 */
export async function getSalesReport() {
  const data = await apiRequest('/reports/sales', { method: 'GET' });
  const list = extractArray(data, [
    'sales',
    'recent_sales',
    'items',
    'transactions',
    'data',
    'results',
  ]);
  return {
    sales: list,
    raw: data,
  };
}
