import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Sparkles,
  User,
} from 'lucide-react';
import {
  sendMessageToN8n,
  confirmStockChange,
  cancelStockChange,
  getAIRequestDetails,
  normalizeProposeAction,
} from '../api/ai.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from './Toast.jsx';

const SUGGESTED_PROMPTS = [
  'How many Type-C Fast Charging Cables are in stock?',
  'Which items are low in stock?',
  'Which product sold the most this week?',
  'Show me the stock of Type-C Fast Charging Cable.',
  'Add 40 Type-C Fast Charging Cables.',
];

function formatTime(date) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return '';
  }
}

export default function AIChat({ compact = false }) {
  const { user, triggerDataRefresh } = useAuth();
  const toast = useToast();

  const [messages, setMessages] = useState(() => [
    {
      id: 'welcome-msg',
      sender: 'ai',
      text: `Hello ${user?.name || 'there'}. I am the Nowshera Shopping Mall Inventory AI Assistant. Ask me about live product stock, low-stock items, sales performance, or propose a stock adjustment.`,
      timestamp: formatTime(new Date()),
      proposal: null,
      proposalResolved: false,
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [processingProposalId, setProcessingProposalId] = useState(null);
  const [errorBanner, setErrorBanner] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  const handleClearChat = () => {
    setErrorBanner('');
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'ai',
        text: 'Chat cleared. How can I assist you with the mall inventory today?',
        timestamp: formatTime(new Date()),
        proposal: null,
        proposalResolved: false,
      },
    ]);
  };

  const enrichProposalIfPossible = async (proposal) => {
    if (!proposal?.request_id) return proposal;
    try {
      const details = await getAIRequestDetails(proposal.request_id);
      const data = details?.request || details?.data || details;
      if (data && typeof data === 'object') {
        return {
          ...proposal,
          product_name:
            data.product_name || data.product?.name || proposal.product_name,
          current_stock:
            data.current_stock ?? data.old_stock ?? proposal.current_stock,
          new_stock: data.new_stock ?? proposal.new_stock,
          action:
            data.action || proposal.action
              ? normalizeProposeAction(data.action || proposal.action)
              : null,
          quantity: data.quantity ?? proposal.quantity,
        };
      }
    } catch {
      // Keep original proposal if request lookup fails
    }
    return proposal;
  };

  const handleSendMessage = async (textToSend) => {
    const trimmed = String(textToSend ?? input).trim();
    if (!trimmed || isSending) return;

    setErrorBanner('');
    const userMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: formatTime(new Date()),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (textToSend === undefined) {
      setInput('');
    }
    setIsSending(true);

    try {
      const response = await sendMessageToN8n(trimmed, {
        user_id: user?.id || undefined,
        role: user?.role || undefined,
      });

      const enrichedProposal = response.proposal
        ? await enrichProposalIfPossible(response.proposal)
        : null;

      const aiMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: response.text,
        timestamp: formatTime(new Date()),
        proposal: enrichedProposal,
        proposalResolved: false,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      const fallbackMsg =
        'The inventory assistant is temporarily unavailable. Please use the normal inventory system.';
      setErrorBanner(fallbackMsg);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          text: fallbackMsg,
          timestamp: formatTime(new Date()),
          isError: true,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleProposalDecision = async (messageId, proposal, decision) => {
    if (processingProposalId) return;
    setProcessingProposalId(messageId);
    setErrorBanner('');

    const isConfirm = decision === 'confirm';
    const requestId = proposal?.request_id;

    try {
      let resultText = '';
      let handled = false;

      // 1. Try n8n webhook confirmation/cancellation flow
      try {
        const promptMessage = isConfirm
          ? requestId
            ? `Confirm stock change request ${requestId}`
            : 'Confirm'
          : requestId
          ? `Cancel stock change request ${requestId}`
          : 'Cancel';

        const n8nRes = await sendMessageToN8n(promptMessage, {
          action: isConfirm ? 'confirm' : 'cancel',
          request_id: requestId || undefined,
        });

        if (n8nRes?.text) {
          resultText = n8nRes.text;
          handled = true;
        }
      } catch {
        // If n8n webhook is unreachable or confirmation is handled via direct FastAPI endpoint
      }

      // 2. If request_id exists, ensure FastAPI /ai/confirm or /ai/cancel is synchronized
      if (requestId) {
        let shouldCallBackend = !handled;
        if (handled) {
          try {
            const reqStatus = await getAIRequestDetails(requestId);
            const statusStr = String(
              reqStatus?.status || reqStatus?.data?.status || ''
            ).toLowerCase();
            if (statusStr === 'pending') {
              shouldCallBackend = true;
            }
          } catch {
            // Ignore lookup error
          }
        }

        if (shouldCallBackend) {
          const backendRes = isConfirm
            ? await confirmStockChange(requestId)
            : await cancelStockChange(requestId);

          const backendMsg =
            backendRes?.message ||
            backendRes?.detail ||
            backendRes?.status ||
            '';
          if (backendMsg && !resultText) {
            resultText = String(backendMsg);
          }
          handled = true;
        }
      }

      if (!handled) {
        throw new Error(
          'Unable to process confirmation request. Please try again.'
        );
      }

      const finalMessage =
        resultText ||
        (isConfirm
          ? 'Stock updated successfully.'
          : 'Stock change cancelled. No changes were made.');

      setMessages((prev) =>
        prev
          .map((m) =>
            m.id === messageId
              ? { ...m, proposalResolved: true, resolutionStatus: decision }
              : m
          )
          .concat({
            id: `ai-decision-${Date.now()}`,
            sender: 'ai',
            text: finalMessage,
            timestamp: formatTime(new Date()),
            proposal: null,
          })
      );

      if (isConfirm) {
        toast.success('Stock updated successfully.');
      } else {
        toast.info('Stock change cancelled. No changes were made.');
      }

      // Refresh Products, Dashboard, and Stock History from backend
      triggerDataRefresh();
    } catch (error) {
      const errMsg =
        error?.message ||
        'The inventory assistant is temporarily unavailable. Please use the normal inventory system.';
      toast.error(errMsg);
      setErrorBanner(errMsg);
    } finally {
      setProcessingProposalId(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div
      className={`flex flex-col rounded-2xl bg-slate-900/85 border border-slate-800/90 backdrop-blur-xl overflow-hidden shadow-2xl ${
        compact ? 'h-[520px]' : 'h-[calc(100vh-11rem)] min-h-[540px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20 shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-100 truncate">
              Nowshera Mall AI Inventory Assistant
            </h2>
            <p className="text-xs text-slate-400 truncate">
              Connected via n8n Agent · FastAPI Verified
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClearChat}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 text-xs font-medium text-slate-300 hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          title="Clear conversation"
        >
          <Trash2 className="w-3.5 h-3.5 text-slate-400" />
          Clear Chat
        </button>
      </div>

      {/* Suggested Prompts */}
      {!compact && (
        <div className="px-5 py-2.5 bg-slate-950/50 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={isSending}
              onClick={() => handleSendMessage(prompt)}
              className="px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 hover:border-cyan-500/40 text-xs text-slate-300 hover:text-cyan-200 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Error Banner */}
      {errorBanner && (
        <div className="px-4 py-2.5 bg-rose-950/50 border-b border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-200">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* Messages Viewport */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                isUser ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isUser
                    ? 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-300'
                    : msg.isError
                    ? 'bg-rose-500/20 border border-rose-500/30 text-rose-300'
                    : 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-300'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${
                  isUser
                    ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white'
                    : msg.isError
                    ? 'bg-rose-950/40 border border-rose-500/30 text-rose-100'
                    : 'bg-slate-800/90 border border-slate-700/80 text-slate-100'
                }`}
              >
                <div className="text-sm whitespace-pre-wrap leading-relaxed break-words">
                  {msg.text}
                </div>

                {/* Stock Change Confirmation Card */}
                {msg.proposal && (
                  <div className="mt-3.5 p-4 rounded-xl bg-slate-950/80 border border-cyan-500/30 space-y-2.5">
                    <div className="text-xs font-semibold text-cyan-300">
                      Stock Change Confirmation Required
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {msg.proposal.product_name && (
                        <div className="col-span-2">
                          <span className="text-slate-400">Product: </span>
                          <span className="font-semibold text-slate-100">
                            {msg.proposal.product_name}
                          </span>
                        </div>
                      )}
                      {msg.proposal.current_stock !== null && (
                        <div>
                          <span className="text-slate-400">Current Stock: </span>
                          <span className="font-mono tabular-nums font-semibold text-slate-200">
                            {msg.proposal.current_stock}
                          </span>
                        </div>
                      )}
                      {msg.proposal.new_stock !== null && (
                        <div>
                          <span className="text-slate-400">New Stock: </span>
                          <span className="font-mono tabular-nums font-semibold text-cyan-300">
                            {msg.proposal.new_stock}
                          </span>
                        </div>
                      )}
                      {msg.proposal.action && (
                        <div>
                          <span className="text-slate-400">Action: </span>
                          <span className="font-mono font-semibold text-slate-100">
                            {msg.proposal.action}
                          </span>
                        </div>
                      )}
                      {msg.proposal.quantity !== null && (
                        <div>
                          <span className="text-slate-400">Quantity: </span>
                          <span className="font-mono tabular-nums font-semibold text-slate-100">
                            {msg.proposal.quantity}
                          </span>
                        </div>
                      )}
                      {msg.proposal.request_id && (
                        <div className="col-span-2">
                          <span className="text-slate-400">Request ID: </span>
                          <span className="font-mono text-[11px] text-slate-300">
                            {msg.proposal.request_id}
                          </span>
                        </div>
                      )}
                    </div>

                    {!msg.proposalResolved ? (
                      <div className="pt-2 flex items-center gap-2.5">
                        <button
                          type="button"
                          disabled={processingProposalId === msg.id}
                          onClick={() =>
                            handleProposalDecision(msg.id, msg.proposal, 'confirm')
                          }
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors whitespace-nowrap disabled:opacity-50"
                        >
                          {processingProposalId === msg.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          Confirm
                        </button>
                        <button
                          type="button"
                          disabled={processingProposalId === msg.id}
                          onClick={() =>
                            handleProposalDecision(msg.id, msg.proposal, 'cancel')
                          }
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-500/40 text-slate-200 hover:text-rose-200 text-xs font-semibold transition-colors whitespace-nowrap disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="pt-1 text-xs font-medium text-slate-400">
                        Status:{' '}
                        <span
                          className={
                            msg.resolutionStatus === 'confirm'
                              ? 'text-emerald-400'
                              : 'text-amber-400'
                          }
                        >
                          {msg.resolutionStatus === 'confirm'
                            ? 'Confirmed'
                            : 'Cancelled'}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div
                  className={`mt-1.5 text-[11px] font-mono tabular-nums ${
                    isUser ? 'text-cyan-100/80 text-right' : 'text-slate-400'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isSending && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="rounded-2xl px-4 py-3 bg-slate-800/90 border border-slate-700/80 flex items-center gap-2 text-slate-300 text-xs">
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
              <span>AI Assistant is checking live inventory...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3.5 bg-slate-950/70 border-t border-slate-800 flex items-center gap-2.5"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSending}
          placeholder="Ask about stock levels, low-stock items, or propose stock changes..."
          className="flex-1 bg-slate-900 border border-slate-700/90 focus:border-cyan-500 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isSending || !input.trim()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-semibold transition-all whitespace-nowrap shrink-0 disabled:opacity-50"
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}
