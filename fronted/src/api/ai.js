import {
  apiRequest,
  getNormalizedWebhookUrl,
  getAuthToken,
  isCrossOriginUrl,
  ApiError,
} from './config.js';

/**
 * GET /ai/data
 */
export async function getAIData() {
  return apiRequest('/ai/data', { method: 'GET' });
}

export function normalizeProposeAction(action) {
  const normalized = String(action || '').trim().toUpperCase();
  if (
    normalized === 'REMOVE' ||
    normalized === 'OUT' ||
    normalized === 'STOCK_OUT' ||
    normalized === 'STOCK OUT' ||
    normalized === 'REMOVE STOCK'
  ) {
    return 'REMOVE';
  }
  return 'ADD';
}

/**
 * POST /ai/propose
 * Supports both query parameters (as defined in FastAPI OpenAPI schema) and JSON body.
 * Action is strictly mapped to "ADD" or "REMOVE".
 */
export async function proposeStockChange({ product_id, action, quantity, note = '' }) {
  const mappedAction = normalizeProposeAction(action);
  const params = new URLSearchParams({
    product_id: String(product_id),
    action: mappedAction,
    quantity: String(Number(quantity)),
    note: note ? String(note) : '',
  });

  return apiRequest(`/ai/propose?${params.toString()}`, {
    method: 'POST',
    body: JSON.stringify({
      product_id: String(product_id),
      action: mappedAction,
      quantity: Number(quantity),
      note: note ? String(note) : '',
    }),
  });
}

/**
 * POST /ai/confirm
 * Request: { "request_id": "REQUEST_ID" }
 */
export async function confirmStockChange(requestId) {
  return apiRequest('/ai/confirm', {
    method: 'POST',
    body: JSON.stringify({ request_id: String(requestId) }),
  });
}

/**
 * POST /ai/cancel
 * Request: { "request_id": "REQUEST_ID" }
 */
export async function cancelStockChange(requestId) {
  return apiRequest('/ai/cancel', {
    method: 'POST',
    body: JSON.stringify({ request_id: String(requestId) }),
  });
}

/**
 * GET /ai/request/{request_id}
 */
export async function getAIRequestDetails(requestId) {
  return apiRequest(`/ai/request/${encodeURIComponent(requestId)}`, {
    method: 'GET',
  });
}

/**
 * Extracts structured confirmation proposal information if present in n8n / AI response.
 */
export function extractConfirmationProposal(rawPayload, messageText = '') {
  const source = Array.isArray(rawPayload) ? rawPayload[0] : rawPayload;
  const nested = source?.data || source?.proposal || source?.request || source || {};

  const requestId =
    nested?.request_id ||
    nested?.requestId ||
    nested?.id ||
    source?.request_id ||
    source?.requestId ||
    extractRequestIdFromText(messageText);

  const hasExplicitConfirmFlag =
    Boolean(nested?.requires_confirmation) ||
    Boolean(source?.requires_confirmation) ||
    String(nested?.status || '').toLowerCase() === 'pending' ||
    /please\s+confirm\s+or\s+cancel/i.test(messageText) ||
    (/current\s+stock\s*:/i.test(messageText) && /new\s+stock\s*:/i.test(messageText)) ||
    Boolean(requestId && /confirm|cancel|propose|action/i.test(messageText));

  if (!hasExplicitConfirmFlag && !requestId) {
    return null;
  }

  const productName =
    nested?.product_name ||
    nested?.product ||
    nested?.name ||
    extractLineValue(messageText, /product(?:\s+name)?\s*:\s*([^\n]+)/i);

  const currentStock =
    nested?.current_stock ??
    nested?.old_quantity ??
    nested?.old_stock ??
    extractNumberValue(messageText, /current\s+stock\s*:\s*(\d+)/i);

  const newStock =
    nested?.new_stock ??
    nested?.new_quantity ??
    nested?.projected_stock ??
    extractNumberValue(messageText, /new\s+stock\s*:\s*(\d+)/i);

  const action =
    nested?.action ||
    nested?.movement_type ||
    extractLineValue(messageText, /action\s*:\s*([A-Za-z_-\s]+)/i);

  const quantity =
    nested?.quantity ??
    extractNumberValue(messageText, /quantity\s*:\s*(\d+)/i);

  return {
    request_id: requestId || null,
    product_name: productName ? String(productName).trim() : null,
    current_stock: currentStock !== null && currentStock !== undefined ? Number(currentStock) : null,
    new_stock: newStock !== null && newStock !== undefined ? Number(newStock) : null,
    action: action ? normalizeProposeAction(action) : null,
    quantity: quantity !== null && quantity !== undefined ? Number(quantity) : null,
  };
}

function extractRequestIdFromText(text) {
  if (!text || typeof text !== 'string') return null;
  const uuidMatch = text.match(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i
  );
  if (uuidMatch) return uuidMatch[0];

  const labeledMatch = text.match(
    /(?:request[_\s-]*id|proposal[_\s-]*id)\s*[:#]?\s*([A-Za-z0-9_-]{4,64})/i
  );
  if (labeledMatch) return labeledMatch[1];

  return null;
}

function extractLineValue(text, regex) {
  if (!text || typeof text !== 'string') return null;
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

function extractNumberValue(text, regex) {
  if (!text || typeof text !== 'string') return null;
  const match = text.match(regex);
  return match ? Number(match[1]) : null;
}

export function extractAITextResponse(data) {
  if (!data) return '';
  if (typeof data === 'string') return data.trim();

  if (Array.isArray(data)) {
    if (data.length === 0) return '';
    return extractAITextResponse(data[0]);
  }

  if (typeof data === 'object') {
    const candidateKeys = [
      'output',
      'response',
      'message',
      'reply',
      'text',
      'answer',
      'result',
      'content',
      'detail',
    ];
    for (const key of candidateKeys) {
      if (typeof data[key] === 'string' && data[key].trim()) {
        return data[key].trim();
      }
    }
    if (data.data) {
      const nestedText = extractAITextResponse(data.data);
      if (nestedText) return nestedText;
    }
  }

  return '';
}

/**
 * Sends a message to the configured n8n webhook URL.
 * Basic request: { "message": "..." }
 */
export async function sendMessageToN8n(message, extraPayload = {}) {
  const webhookUrl = getNormalizedWebhookUrl();
  if (!webhookUrl) {
    throw new ApiError(
      'The inventory assistant is temporarily unavailable. Please use the normal inventory system.',
      0
    );
  }

  const token = getAuthToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  const headers = {
    Accept: 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const fetchOptions = {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message: String(message).trim(),
      ...extraPayload,
    }),
    signal: controller.signal,
  };

  try {
    let response;
    if (isCrossOriginUrl(webhookUrl)) {
      try {
        response = await fetch('/__n8n_proxy', fetchOptions);
        const ct = response.headers.get('content-type') || '';
        if (response.status === 404 && ct.includes('text/html')) {
          response = await fetch(webhookUrl, fetchOptions);
        }
      } catch {
        response = await fetch(webhookUrl, fetchOptions);
      }
    } else {
      response = await fetch(webhookUrl, fetchOptions);
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new ApiError(
        'The inventory assistant is temporarily unavailable. Please use the normal inventory system.',
        response.status
      );
    }

    const contentType = response.headers.get('content-type') || '';
    let payload = null;

    if (contentType.includes('application/json')) {
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
    } else {
      const rawText = await response.text();
      try {
        payload = JSON.parse(rawText);
      } catch {
        payload = { output: rawText };
      }
    }

    const text = extractAITextResponse(payload);
    if (!text && !payload) {
      throw new ApiError(
        'The inventory assistant is temporarily unavailable. Please use the normal inventory system.',
        502
      );
    }

    const proposal = extractConfirmationProposal(payload, text);

    return {
      text:
        text ||
        (proposal
          ? `Stock change proposal ready for ${proposal.product_name || 'selected item'}. Please Confirm or Cancel.`
          : 'Response received from assistant.'),
      proposal,
      raw: payload,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      'The inventory assistant is temporarily unavailable. Please use the normal inventory system.',
      0,
      null,
      error
    );
  }
}
