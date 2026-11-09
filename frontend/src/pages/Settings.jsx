import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Settings as SettingsIcon,
  Globe,
  Database,
  Download,
  Clock,
  Shield,
  FileSpreadsheet,
  FileCode,
  CheckCircle2
} from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [baseUrlInput, setBaseUrlInput] = useState('');
  const [savingBaseUrl, setSavingBaseUrl] = useState(false);
  const [baseUrlMessage, setBaseUrlMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await api.get('/api/settings');
        if (res.data.success) {
          setSettings(res.data.settings);
          setBaseUrlInput(res.data.settings.public_redirect_base_url || '');
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleUpdateBaseUrl = async (e) => {
    e.preventDefault();
    try {
      setSavingBaseUrl(true);
      setBaseUrlMessage({ text: '', type: '' });
      const res = await api.put('/api/settings/base-url', {
        public_redirect_base_url: baseUrlInput
      });
      if (res.data.success) {
        setBaseUrlMessage({
          text: 'Base URL updated and 50 QR codes regenerated successfully! Phones can now scan and reach this URL.',
          type: 'success'
        });
        setSettings({ ...settings, public_redirect_base_url: res.data.public_redirect_base_url });
      }
    } catch (err) {
      setBaseUrlMessage({
        text: err.response?.data?.error || 'Failed to update base URL.',
        type: 'error'
      });
    } finally {
      setSavingBaseUrl(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">System Configuration &amp; Backups</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Production domain endpoints, database connection status, and complete data exports.
            </p>
          </div>
        </div>
      </div>

      {/* System Settings Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Domain & App Info */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Globe className="w-4 h-4 text-teal-600" />
            <h3 className="font-bold text-sm text-slate-900">Application &amp; Redirect Routing</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">Application Name</span>
              <span className="font-bold text-slate-800 text-sm">{settings?.app_name}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">
                Public Redirect Base URL / Domain
              </span>
              <form onSubmit={handleUpdateBaseUrl} className="mt-1 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={baseUrlInput}
                    onChange={(e) => setBaseUrlInput(e.target.value)}
                    placeholder="http://192.168.x.x:5000 or https://yourdomain.com"
                    className="flex-1 px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    type="submit"
                    disabled={savingBaseUrl}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50"
                  >
                    {savingBaseUrl ? 'Saving...' : 'Update & Regenerate QRs'}
                  </button>
                </div>
                {baseUrlMessage.text && (
                  <p className={`text-[11px] ${baseUrlMessage.type === 'success' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {baseUrlMessage.text}
                  </p>
                )}
                <p className="text-[11px] text-slate-400">
                  Tip: For testing on your phone via Wi-Fi, use your laptop's local IP (e.g. <code>http://10.224.253.245:5000</code>). For production cards, use your live domain.
                </p>
              </form>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">Timezone</span>
              <div className="flex items-center gap-1.5 font-semibold text-slate-700 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{settings?.timezone || 'Asia/Kolkata'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Database & Security */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Database className="w-4 h-4 text-teal-600" />
            <h3 className="font-bold text-sm text-slate-900">Database &amp; Access Controls</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">Active Database</span>
              <div className="flex items-center gap-1.5 mt-0.5 font-bold text-slate-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{settings?.database_provider}</span>
              </div>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">Admin Account</span>
              <span className="font-medium text-slate-800 block mt-0.5">{settings?.admin_email}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">Inventory Limit</span>
              <span className="font-medium text-slate-800 block mt-0.5">50 Manufactured NFC Cards</span>
            </div>
          </div>
        </div>
      </div>

      {/* Export & Data Backup Section */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div>
          <h3 className="font-bold text-base text-slate-900">Data Backups &amp; Manufacturing Exports</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Download your live database records, print manifests, and complete system snapshots.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Export Cards CSV */}
          <a
            href="/api/settings/export/cards-csv"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/20 transition-all flex flex-col justify-between"
          >
            <div>
              <FileSpreadsheet className="w-6 h-6 text-teal-600 mb-2" />
              <h4 className="font-bold text-sm text-slate-900">Cards Inventory CSV</h4>
              <p className="text-xs text-slate-500 mt-1">Export all 50 cards with codes, status, and scan counts.</p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-teal-600">
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </div>
          </a>

          {/* Export Businesses CSV */}
          <a
            href="/api/settings/export/businesses-csv"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/20 transition-all flex flex-col justify-between"
          >
            <div>
              <FileSpreadsheet className="w-6 h-6 text-teal-600 mb-2" />
              <h4 className="font-bold text-sm text-slate-900">Businesses Directory CSV</h4>
              <p className="text-xs text-slate-500 mt-1">Export registered businesses, contact details and destinations.</p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-teal-600">
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </div>
          </a>

          {/* Export Complete JSON */}
          <a
            href="/api/settings/export/backup-json"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/20 transition-all flex flex-col justify-between"
          >
            <div>
              <FileCode className="w-6 h-6 text-indigo-600 mb-2" />
              <h4 className="font-bold text-sm text-slate-900">Complete Backup JSON</h4>
              <p className="text-xs text-slate-500 mt-1">Full database snapshot including cards, businesses, and audit logs.</p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-indigo-600">
              <Download className="w-3.5 h-3.5" />
              <span>Download JSON</span>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}

