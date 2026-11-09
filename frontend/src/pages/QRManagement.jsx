import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  QrCode,
  Download,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function QRManagement() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });

  const fetchCards = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/cards');
      if (res.data.success) {
        setCards(res.data.cards);
      }
    } catch (err) {
      console.error('Failed to load cards:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const handleGenerateAll = async () => {
    try {
      setGenerating(true);
      setStatusMessage({ text: '', type: '' });
      const res = await api.post('/api/cards/generate-all-qr');
      if (res.data.success) {
        setStatusMessage({
          text: `Success: Generated high-resolution 300 DPI QR codes for all ${res.data.result.total_generated} cards!`,
          type: 'success'
        });
        fetchCards();
      }
    } catch (err) {
      setStatusMessage({
        text: err.response?.data?.error || 'Failed to generate QR codes.',
        type: 'error'
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">QR Code &amp; Manufacturing Management</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Production-ready print assets, ZIP packaging, and factory manifests for 50 NFC cards.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleGenerateAll}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
            <span>{generating ? 'Generating 50 Images...' : 'Generate All 50 QRs'}</span>
          </button>
          <a
            href="/api/cards/download-all"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-all"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Download ZIP Archive</span>
          </a>
          <a
            href="/api/cards/manifest-csv"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV Manifest</span>
          </a>
          <a
            href="/api/cards/print-sheet"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Production Sheet</span>
          </a>
        </div>
      </div>

      {statusMessage.text && (
        <div
          className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage({ text: '', type: '' })}
            className="text-slate-400 hover:text-slate-600 font-bold ml-4"
          >
            &times;
          </button>
        </div>
      )}

      {/* Production Specifications Callout */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <h3 className="font-bold text-sm text-slate-900">Print Quality &amp; Manufacturing Checklist</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600 mt-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200">
            <span className="font-bold text-slate-800 block mb-1">High Error Correction</span>
            <p>Level H error correction (30% redundancy) ensures cards remain scannable even with surface scratches.</p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200">
            <span className="font-bold text-slate-800 block mb-1">Quiet Zone &amp; Contrast</span>
            <p>Solid black modules on pure white backing with a 4-module quiet zone prevents scanner reading errors.</p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200">
            <span className="font-bold text-slate-800 block mb-1">Stable URLs &amp; Immutability</span>
            <p>Physical cards are preprinted with permanent URLs. Never change card codes or redirect slugs after printing.</p>
          </div>
        </div>
      </div>

      {/* 50 Card QR Gallery */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900">Physical QR Codes (Initial 50 Cards)</h3>
            <p className="text-xs text-slate-500">Preview or download individual high-res PNG images for card printing.</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
            {cards.length} Cards in Inventory
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-slate-500">Loading QR codes...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {cards.map((card) => (
              <div
                key={card.id}
                className="bg-slate-50/60 p-4 rounded-xl border border-slate-200 hover:border-slate-300 text-center transition-all flex flex-col items-center justify-between"
              >
                <span className="text-sm font-extrabold text-slate-900">{card.card_code}</span>
                <img
                  src={`/api/cards/${card.id}/qr`}
                  alt={card.card_code}
                  className="w-28 h-28 my-2 bg-white p-1.5 rounded-lg border border-slate-200"
                />
                <span className="text-[10px] font-mono text-slate-400 block truncate max-w-full mb-2">
                  /r/{card.slug}
                </span>
                <div className="flex items-center gap-1.5 w-full">
                  <a
                    href={`/api/cards/${card.id}/qr?download=true`}
                    className="flex-1 py-1 text-[11px] font-semibold bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg inline-flex items-center justify-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>PNG</span>
                  </a>
                  <a
                    href={`/r/${card.card_code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-slate-400 hover:text-teal-600 bg-white border border-slate-200 rounded-lg"
                    title="Test Redirect"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

