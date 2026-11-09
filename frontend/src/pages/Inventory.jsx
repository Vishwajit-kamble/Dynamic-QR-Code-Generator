import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import {
  CreditCard,
  Search,
  Filter,
  Download,
  ExternalLink,
  Copy,
  Check,
  Zap,
  PowerOff,
  RotateCcw,
  Eye,
  Radio,
  X,
  AlertTriangle
} from 'lucide-react';

export default function Inventory() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, type: '', card: null });

  const fetchCards = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;

      const res = await api.get('/api/cards', { params });
      if (res.data.success) {
        setCards(res.data.cards);
      }
    } catch (err) {
      console.error('Failed to fetch cards:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCards();
  };

  const handleCopyUrl = (url) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleUpdateNfcStatus = async (cardId, newStatus) => {
    try {
      setActionLoading(true);
      const res = await api.post(`/api/cards/${cardId}/nfc-status`, { nfc_status: newStatus });
      if (res.data.success) {
        if (selectedCard && selectedCard.id === cardId) {
          setSelectedCard({ ...selectedCard, nfc_status: newStatus });
        }
        fetchCards();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update NFC status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirmModal.card) return;
    try {
      setActionLoading(true);
      const res = await api.post(`/api/cards/${confirmModal.card.id}/deactivate`, {
        reason: 'Deactivated via Inventory dashboard'
      });
      if (res.data.success) {
        setConfirmModal({ open: false, type: '', card: null });
        if (selectedCard && selectedCard.id === confirmModal.card.id) {
          setSelectedCard({ ...selectedCard, status: 'DEACTIVATED' });
        }
        fetchCards();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to deactivate card');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async (card) => {
    try {
      setActionLoading(true);
      const res = await api.post(`/api/cards/${card.id}/reactivate`);
      if (res.data.success) {
        if (selectedCard && selectedCard.id === card.id) {
          setSelectedCard({ ...selectedCard, status: 'ACTIVATED' });
        }
        fetchCards();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reactivate card');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">QR Review Cards (50 Units)</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage permanent QR codes, redirect URLs, and business review assignments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/qr-management"
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-xl transition-all"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Download All QR Codes</span>
          </Link>
          <Link
            to="/activate"
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>Activate Card</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Card Code (e.g. TR001) or Business Name..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-900"
          />
        </form>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="ACTIVATED">Activated</option>
              <option value="DEACTIVATED">Deactivated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cards Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm text-slate-500">Loading cards...</p>
          </div>
        ) : cards.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-base font-semibold text-slate-800">No cards matched your filter</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting search or status filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200/70">
                <tr>
                  <th className="px-5 py-3.5 font-bold">Card ID</th>
                  <th className="px-5 py-3.5 font-bold">Status</th>
                  <th className="px-5 py-3.5 font-bold">Assigned Business</th>
                  <th className="px-5 py-3.5 font-bold">Scans</th>
                  <th className="px-5 py-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cards.map((card) => {
                  const isAvailable = card.status === 'AVAILABLE';
                  const isActivated = card.status === 'ACTIVATED';
                  const isDeactivated = card.status === 'DEACTIVATED';

                  return (
                    <tr key={card.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={() => setSelectedCard(card)}
                            className="font-bold text-slate-900 hover:text-teal-600 text-sm flex items-center gap-1.5"
                          >
                            <span>{card.card_code}</span>
                            <Eye className="w-3.5 h-3.5 text-slate-400 hover:text-teal-600" />
                          </button>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono block">
                          /r/{card.slug}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        {isAvailable && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            AVAILABLE
                          </span>
                        )}
                        {isActivated && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200/60">
                            ACTIVATED
                          </span>
                        )}
                        {isDeactivated && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
                            DEACTIVATED
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        {card.business ? (
                          <div>
                            <span className="font-semibold text-slate-900 block">
                              {card.business.business_name}
                            </span>
                            <span className="text-xs text-slate-400">
                              {card.business.category || 'Retail'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Not assigned yet</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        {card.scan_count ?? 0}
                      </td>

                      <td className="px-5 py-3.5 text-right space-x-2">
                        {isAvailable && (
                          <Link
                            to={`/activate?card=${card.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                          >
                            <Zap className="w-3 h-3" />
                            <span>Activate</span>
                          </Link>
                        )}

                        {isActivated && (
                          <>
                            <button
                              onClick={() => setConfirmModal({ open: true, type: 'deactivate', card })}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-medium transition-colors"
                              title="Deactivate Redirect"
                            >
                              <PowerOff className="w-3 h-3" />
                              <span>Deactivate</span>
                            </button>
                            <a
                              href={`/r/${card.card_code}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded-lg text-xs font-medium transition-colors"
                              title="Test Dynamic Redirect"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Redirect</span>
                            </a>
                          </>
                        )}

                        {isDeactivated && (
                          <button
                            onClick={() => handleReactivate(card)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reactivate</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Card Details Modal */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 bg-navy-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-slate-900">
                  Card {selectedCard.card_code}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {selectedCard.status}
                </span>
              </div>
              <button
                onClick={() => setSelectedCard(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              {/* QR Image and URLs */}
              <div className="flex flex-col sm:flex-row items-center gap-5 bg-slate-50 p-4 rounded-xl">
                <img
                  src={`/api/cards/${selectedCard.id}/qr`}
                  alt={`QR ${selectedCard.card_code}`}
                  className="w-32 h-32 rounded-lg bg-white p-2 border border-slate-200"
                />
                <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Permanent Redirect URL
                    </span>
                    <p className="text-xs font-mono text-slate-800 break-all">
                      {selectedCard.redirect_url}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1 justify-center sm:justify-start">
                    <button
                      onClick={() => handleCopyUrl(selectedCard.redirect_url)}
                      className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 rounded-lg flex items-center gap-1 text-slate-700"
                    >
                      {copiedUrl ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedUrl ? 'Copied!' : 'Copy URL'}</span>
                    </button>
                    <a
                      href={`/api/cards/${selectedCard.id}/qr?download=true`}
                      className="px-2.5 py-1 text-xs font-semibold bg-teal-50 border border-teal-200 text-teal-700 hover:bg-teal-100 rounded-lg flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download PNG</span>
                    </a>
                    <a
                      href={`/r/${selectedCard.card_code}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 text-xs font-semibold bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-800 rounded-lg flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3 text-slate-500" />
                      <span>Test Redirect</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Business Info if assigned */}
              {selectedCard.business && (
                <div className="bg-slate-50 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase">
                      Permanently Assigned Business
                    </span>
                    <span className="text-xs font-semibold text-teal-700">
                      {selectedCard.business.category || 'Retail'}
                    </span>
                  </div>
                  <p className="text-base font-bold text-slate-900">
                    {selectedCard.business.business_name}
                  </p>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Google Review Destination:</span>
                    <a
                      href={selectedCard.business.google_review_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-teal-600 hover:underline break-all inline-flex items-center gap-1"
                    >
                      <span>{selectedCard.business.google_review_url}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedCard(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Irreversible Action Confirmation Modal */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 bg-navy-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Deactivate Card {confirmModal.card?.card_code}?
            </h3>
            <p className="text-sm text-slate-600 mt-2">
              Deactivating this card will immediately disable the dynamic redirect so scanning customers
              see an inactive notice instead of the review page.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 my-4 text-xs text-amber-800">
              <strong>Business Rule:</strong> This card will remain permanently bound to{' '}
              <strong>{confirmModal.card?.business?.business_name}</strong>. It cannot be reassigned to any other business.
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmModal({ open: false, type: '', card: null })}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading}
                onClick={handleDeactivate}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs"
              >
                {actionLoading ? 'Deactivating...' : 'Confirm Deactivation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

