import { apiRequest } from './config.js';
import { extractArray } from './products.js';

/**
 * POST /stock/in
 * Request:
 * {
 *   "product_id": "PRODUCT_ID",
 *   "quantity": 40,
 *   "note": "Received from Ali Traders"
 * }
 */
export async function addStockIn({ product_id, quantity, note }) {
  return apiRequest('/stock/in', {
    method: 'POST',
    body: JSON.stringify({
      product_id: String(product_id),
      quantity: Number(quantity),
      note: note ? String(note).trim() : '',
    }),
  });
}

/**
 * POST /stock/out
 * Request:
 * {
 *   "product_id": "PRODUCT_ID",
 *   "quantity": 5,
 *   "note": "Sold to customer"
 * }
 */
export async function removeStockOut({ product_id, quantity, note }) {
  return apiRequest('/stock/out', {
    method: 'POST',
    body: JSON.stringify({
      product_id: String(product_id),
      quantity: Number(quantity),
      note: note ? String(note).trim() : '',
    }),
  });
}

export function normalizeStockMovement(item, index = 0, productMap = {}) {
  if (!item || typeof item !== 'object') return null;

  const rawAction = String(
    item.action || item.movement_type || item.type || item.change_type || 'MOVEMENT'
  ).toUpperCase();

  const resolvedFromMap = item.product_id ? productMap[String(item.product_id)] : null;

  const productName =
    item.product_name ||
    item.product?.name ||
    item.products?.name ||
    item.name ||
    resolvedFromMap ||
    (item.product_id ? `Product #${item.product_id}` : 'Unknown Product');

  const userName =
    item.user_name ||
    item.performed_by_name ||
    item.user?.name ||
    item.user?.email ||
    item.users?.name ||
    item.users?.email ||
    item.performed_by ||
    item.user_id ||
    'System';

  const prevStockRaw =
    item.previous_stock ?? item.old_quantity ?? item.old_stock ?? null;
  const currStockRaw =
    item.current_stock ??
    item.new_quantity ??
    item.new_stock ??
    item.stock_after ??
    null;

  return {
    id: item.id ?? item.movement_id ?? `mov-${index}`,
    product_id: item.product_id ?? item.product?.id ?? null,
    product_name: productName,
    action: rawAction,
    quantity: Number(item.quantity ?? item.change_quantity ?? item.amount ?? 0),
    previous_stock: prevStockRaw !== null ? Number(prevStockRaw) : null,
    current_stock: currStockRaw !== null ? Number(currStockRaw) : null,
    note: item.note || item.reason || item.description || '',
    user: String(userName),
    created_at:
      item.created_at || item.timestamp || item.date || item.movement_date || null,
    raw: item,
  };
}

/**
 * GET /stock/history
 */
export async function getStockHistory(productMap = {}) {
  const data = await apiRequest('/stock/history', { method: 'GET' });
  const list = extractArray(data, [
    'history',
    'movements',
    'stock_movements',
    'items',
    'data',
    'results',
  ]);
  return list
    .map((item, idx) => normalizeStockMovement(item, idx, productMap))
    .filter(Boolean);
}
