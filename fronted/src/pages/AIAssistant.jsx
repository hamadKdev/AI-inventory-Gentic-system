import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  Database,
  Send,
} from 'lucide-react';
import AIChat from '../components/AIChat.jsx';
import {
  getAIData,
  getAIRequestDetails,
  proposeStockChange,
  confirmStockChange,
  cancelStockChange,
} from '../api/ai.js';
import { getProducts } from '../api/products.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';

export default function AIAssistant() {
  const { refreshTrigger, triggerDataRefresh } = useAuth();
  const toast = useToast();

  const [products, setProducts] = useState([]);

  // Request Lookup & Confirmation Inspector (GET /ai/request/{request_id}, POST /ai/confirm, POST /ai/cancel)
  const [requestIdInput, setRequestIdInput] = useState('');
  const [requestDetails, setRequestDetails] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Propose Stock Change form (POST /ai/propose)
  const [proposeProductId, setProposeProductId] = useState('');
  const [proposeAction, setProposeAction] = useState('ADD');
  const [proposeQuantity, setProposeQuantity] = useState('');
  const [proposeNote, setProposeNote] = useState('');
  const [proposing, setProposing] = useState(false);

  // AI Data Context check (GET /ai/data)
  const [aiContextSummary, setAiContextSummary] = useState(null);
  const [loadingAiData, setLoadingAiData] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      const list = await getProducts();
      setProducts(list);
      if (list.length > 0 && !proposeProductId) {
        setProposeProductId(String(list[0].id));
      }
    } catch {
      // Ignore product load error in side panel
    }
  }, [proposeProductId]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts, refreshTrigger]);

  const handleLookupRequest = async (e) => {
    e.preventDefault();
    const trimmed = requestIdInput.trim();
    if (!trimmed) return;

    setLookupLoading(true);
    try {
      const data = await getAIRequestDetails(trimmed);
      setRequestDetails(data?.request || data?.data || data);
    } catch (err) {
      toast.error(err?.message || 'Could not find AI change request.');
      setRequestDetails(null);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleDirectDecision = async (decision) => {
    const targetId =
      requestDetails?.request_id ||
      requestDetails?.id ||
      requestIdInput.trim();
    if (!targetId) return;

    setActionLoading(true);
    try {
      if (decision === 'confirm') {
        await confirmStockChange(targetId);
        toast.success('Stock updated successfully.');
      } else {
        await cancelStockChange(targetId);
        toast.info('Stock change cancelled. No changes were made.');
      }
      const updated = await getAIRequestDetails(targetId).catch(() => null);
      if (updated) {
        setRequestDetails(updated?.request || updated?.data || updated);
      }
      triggerDataRefresh();
    } catch (err) {
      toast.error(err?.message || 'Unable to process AI request decision.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleProposeSubmit = async (e) => {
    e.preventDefault();
    if (
      !proposeProductId.trim() ||
      !proposeQuantity ||
      Number(proposeQuantity) <= 0
    ) {
      toast.warning('Please select a product and enter a Quantity > 0.');
      return;
    }

    setProposing(true);
    try {
      const res = await proposeStockChange({
        product_id: proposeProductId.trim(),
        action: proposeAction,
        quantity: Number(proposeQuantity),
        note: proposeNote.trim(),
      });
      const createdId =
        res?.request_id ||
        res?.id ||
        res?.data?.request_id ||
        res?.data?.id ||
        '';
      if (createdId) {
        setRequestIdInput(String(createdId));
      }
      setRequestDetails(res?.request || res?.data || res);
      toast.success('AI stock change proposal created. Please Confirm or Cancel.');
      setProposeQuantity('');
      setProposeNote('');
    } catch (err) {
      toast.error(err?.message || 'Failed to propose stock change.');
    } finally {
      setProposing(false);
    }
  };

  const handleSyncAiData = async () => {
    setLoadingAiData(true);
    try {
      const data = await getAIData();
      const count = Array.isArray(data?.products)
        ? data.products.length
        : Array.isArray(data)
        ? data.length
        : Object.keys(data || {}).length;
      setAiContextSummary({
        syncedAt: new Date().toLocaleTimeString(),
        recordCount: count,
        role: data?.role || 'verified',
      });
      toast.success('AI inventory data context verified from /ai/data.');
    } catch (err) {
      toast.error(err?.message || 'Unable to fetch /ai/data.');
    } finally {
      setLoadingAiData(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-page-enter">
      {/* Main n8n AI Chat Column */}
      <div className="xl:col-span-8">
        <AIChat />
      </div>

      {/* Right Column: AI Change Request Verification & Tools */}
      <div className="xl:col-span-4 space-y-5">
        {/* Inspect / Confirm AI Request by ID */}
        <div className="p-5 rounded-2xl bg-slate-900/85 border border-slate-800/90 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              AI Change Request Verification
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Retrieve or confirm a pending stock change proposal by Request ID.
            </p>
          </div>

          <form onSubmit={handleLookupRequest} className="flex gap-2">
            <input
              type="text"
              value={requestIdInput}
              onChange={(e) => setRequestIdInput(e.target.value)}
              placeholder="Enter request_id..."
              className="flex-1 bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-slate-100 font-mono"
            />
            <button
              type="submit"
              disabled={lookupLoading || !requestIdInput.trim()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap disabled:opacity-50"
            >
              {lookupLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span>Inspect</span>
            </button>
          </form>

          {requestDetails && (
            <div className="p-4 rounded-xl bg-slate-950/90 border border-cyan-500/30 space-y-2.5 text-xs">
              <div className="font-semibold text-cyan-300">
                {requestDetails.product_name ||
                  requestDetails.name ||
                  'Stock Change Proposal'}
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                {requestDetails.current_stock !== undefined && (
                  <div>
                    <span className="text-slate-500">Current Stock: </span>
                    <span className="font-mono tabular-nums font-semibold">
                      {requestDetails.current_stock}
                    </span>
                  </div>
                )}
                {requestDetails.new_stock !== undefined && (
                  <div>
                    <span className="text-slate-500">New Stock: </span>
                    <span className="font-mono tabular-nums font-semibold text-cyan-300">
                      {requestDetails.new_stock}
                    </span>
                  </div>
                )}
                {requestDetails.action && (
                  <div>
                    <span className="text-slate-500">Action: </span>
                    <span className="font-mono font-semibold">
                      {String(requestDetails.action).toUpperCase()}
                    </span>
                  </div>
                )}
                {requestDetails.quantity !== undefined && (
                  <div>
                    <span className="text-slate-500">Quantity: </span>
                    <span className="font-mono tabular-nums font-semibold">
                      {requestDetails.quantity}
                    </span>
                  </div>
                )}
                {requestDetails.status && (
                  <div className="col-span-2">
                    <span className="text-slate-500">Status: </span>
                    <span className="font-mono uppercase text-amber-300">
                      {requestDetails.status}
                    </span>
                  </div>
                )}
              </div>

              {String(requestDetails.status || 'pending').toLowerCase() ===
                'pending' && (
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleDirectDecision('confirm')}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confirm
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleDirectDecision('cancel')}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-500/40 text-slate-200 hover:text-rose-200 font-semibold transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Direct Proposal Tool (POST /ai/propose) */}
        <div className="p-5 rounded-2xl bg-slate-900/85 border border-slate-800/90 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Propose AI Stock Change
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Create a confirmation-gated stock proposal via /ai/propose.
            </p>
          </div>

          <form onSubmit={handleProposeSubmit} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Product</label>
              {products.length > 0 ? (
                <select
                  value={proposeProductId}
                  onChange={(e) => setProposeProductId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none rounded-xl px-3 py-2 text-slate-100"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock: {p.quantity})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={proposeProductId}
                  onChange={(e) => setProposeProductId(e.target.value)}
                  placeholder="Product ID"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none rounded-xl px-3.5 py-2 text-slate-100"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-400 mb-1">Action</label>
                <select
                  value={proposeAction}
                  onChange={(e) => setProposeAction(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none rounded-xl px-3 py-2 text-slate-100"
                >
                  <option value="ADD">Stock In / Add Stock</option>
                  <option value="REMOVE">Stock Out / Remove Stock</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={proposeQuantity}
                  onChange={(e) => setProposeQuantity(e.target.value)}
                  placeholder="40"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none rounded-xl px-3.5 py-2 text-slate-100 font-mono tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Note (Optional)</label>
              <input
                type="text"
                value={proposeNote}
                onChange={(e) => setProposeNote(e.target.value)}
                placeholder="Reason for adjustment"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none rounded-xl px-3.5 py-2 text-slate-100"
              />
            </div>

            <button
              type="submit"
              disabled={proposing}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/45 border border-indigo-500/40 text-indigo-200 font-semibold transition-colors disabled:opacity-50"
            >
              {proposing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Submit Proposal</span>
            </button>
          </form>
        </div>

        {/* Verify AI Data Feed (GET /ai/data) */}
        <div className="p-5 rounded-2xl bg-slate-900/85 border border-slate-800/90 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                AI Tool Data Feed
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Verify FastAPI /ai/data connectivity
              </p>
            </div>
            <button
              type="button"
              onClick={handleSyncAiData}
              disabled={loadingAiData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors disabled:opacity-50"
            >
              {loadingAiData ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              ) : (
                <Database className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span>Check Feed</span>
            </button>
          </div>

          {aiContextSummary && (
            <div className="text-xs text-slate-300 font-mono tabular-nums pt-1 border-t border-slate-800">
              Verified at {aiContextSummary.syncedAt} · Products:{' '}
              {aiContextSummary.recordCount} · Role: {aiContextSummary.role}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
