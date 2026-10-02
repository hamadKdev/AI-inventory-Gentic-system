import { apiRequest } from './config.js';

export function normalizeProduct(item) {
  if (!item || typeof item !== 'object') return null;

  const quantity = Number(
    item.quantity ?? item.stock ?? item.current_stock ?? item.stock_quantity ?? 0
  );
  const reorderLevel = Number(
    item.reorder_level ?? item.min_stock ?? item.reorder_point ?? 0
  );

  let computedStatus = 'In Stock';
  if (quantity <= 0) {
    computedStatus = 'Out of Stock';
  } else if (quantity <= reorderLevel) {
    computedStatus = 'Low Stock';
  }

  const categoryName =
    item.category_name ||
    (typeof item.category === 'string' ? item.category : item.category?.name) ||
    item.categories?.name ||
    (item.category_id != null ? `Category #${item.category_id}` : 'Uncategorized');

  const supplierName =
    item.supplier_name ||
    (typeof item.supplier === 'string' ? item.supplier : item.supplier?.name) ||
    item.suppliers?.name ||
    (item.supplier_id != null ? `Supplier #${item.supplier_id}` : 'Standard Supplier');

  const hasCostPrice =
    item.cost_price !== undefined && item.cost_price !== null && item.cost_price !== '';

  return {
    id: item.id ?? item.product_id ?? item.uuid,
    name: item.name || item.product_name || item.title || 'Unnamed Product',
    category_id: item.category_id ?? item.category?.id ?? null,
    category_name: categoryName,
    supplier_id: item.supplier_id ?? item.supplier?.id ?? null,
    supplier_name: supplierName,
    quantity,
    reorder_level: reorderLevel,
    selling_price:
      item.selling_price !== undefined && item.selling_price !== null
        ? Number(item.selling_price)
        : item.price !== undefined && item.price !== null
        ? Number(item.price)
        : null,
    cost_price: hasCostPrice ? Number(item.cost_price) : null,
    status: computedStatus,
    created_at: item.created_at || item.updated_at || null,
    raw: item,
  };
}

export function extractArray(response, keys = ['products', 'items', 'data', 'results']) {
  if (Array.isArray(response)) return response;
  if (!response || typeof response !== 'object') return [];
  for (const key of keys) {
    if (Array.isArray(response[key])) {
      return response[key];
    }
  }
  if (response.data && typeof response.data === 'object') {
    for (const key of keys) {
      if (Array.isArray(response.data[key])) {
        return response.data[key];
      }
    }
  }
  return [];
}

/**
 * GET /products
 */
export async function getProducts() {
  const data = await apiRequest('/products', { method: 'GET' });
  const list = extractArray(data, ['products', 'items', 'data', 'results']);
  return list.map(normalizeProduct).filter(Boolean);
}

/**
 * GET /products/{product_id}
 */
export async function getProductById(productId) {
  const data = await apiRequest(`/products/${encodeURIComponent(productId)}`, {
    method: 'GET',
  });
  const item = data?.product || data?.data || data;
  return normalizeProduct(item);
}

/**
 * POST /products
 * Request format:
 * {
 *   "name": "Type-C Cable",
 *   "category_id": null,
 *   "supplier_id": null,
 *   "quantity": 15,
 *   "reorder_level": 5,
 *   "cost_price": 500,
 *   "selling_price": 800
 * }
 */
export async function createProduct(payload) {
  const body = {
    name: String(payload.name || '').trim(),
    category_id:
      payload.category_id === '' || payload.category_id === undefined
        ? null
        : payload.category_id,
    supplier_id:
      payload.supplier_id === '' || payload.supplier_id === undefined
        ? null
        : payload.supplier_id,
    quantity: Number(payload.quantity ?? 0),
    reorder_level: Number(payload.reorder_level ?? 0),
    cost_price: Number(payload.cost_price ?? 0),
    selling_price: Number(payload.selling_price ?? 0),
  };

  return apiRequest('/products', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * PUT /products/{product_id}
 * IMPORTANT: Quantity is NOT part of the product update request.
 * {
 *   "name": "Type-C Fast Charging Cable",
 *   "category_id": null,
 *   "supplier_id": null,
 *   "reorder_level": 10,
 *   "cost_price": 600,
 *   "selling_price": 1000
 * }
 */
export async function updateProduct(productId, payload) {
  const body = {
    name: String(payload.name || '').trim(),
    category_id:
      payload.category_id === '' || payload.category_id === undefined
        ? null
        : payload.category_id,
    supplier_id:
      payload.supplier_id === '' || payload.supplier_id === undefined
        ? null
        : payload.supplier_id,
    reorder_level: Number(payload.reorder_level ?? 0),
    cost_price: Number(payload.cost_price ?? 0),
    selling_price: Number(payload.selling_price ?? 0),
  };

  return apiRequest(`/products/${encodeURIComponent(productId)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}
