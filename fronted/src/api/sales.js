import { apiRequest } from './config.js';

/**
 * POST /sales
 * Request:
 * {
 *   "product_id": "PRODUCT_ID",
 *   "quantity": 2
 * }
 */
export async function recordSale({ product_id, quantity }) {
  return apiRequest('/sales', {
    method: 'POST',
    body: JSON.stringify({
      product_id,
      quantity: Number(quantity),
    }),
  });
}
