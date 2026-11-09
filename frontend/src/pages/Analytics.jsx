import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  BarChart3,
  TrendingUp,
  ScanLine,
  Building2,
  Calendar,
  Shield,
  FileText
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';

export default function Analytics() {
  const [cardAnalytics, setCardAnalytics] = useState([]);
  const [businessAnalytics, setBusinessAnalytics] = useState([]);
  const [trends, setTrends] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const [resCards, resBiz, resTrends, resLogs] = await Promise.all([
          api.get('/api/analytics/cards'),
          api.get('/api/analytics/businesses'),
          api.get('/api/analytics/trends'),
          api.get('/api/analytics/logs')
        ]);
        if (resCards.data.success) setCardAnalytics(resCards.data.data);
        if (resBiz.data.success) setBusinessAnalytics(resBiz.data.data);
        if (resTrends.data.success) setTrends(resTrends.data);
        if (resLogs.data.success) setAuditLogs(resLogs.data.logs);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500">Loading analytics &amp; audit reports...</p>
        </div>
      </div>
    );
  }

  // Top 10 scanned cards for bar chart
  const topCardsChart = cardAnalytics.slice(0, 10).map((c) => ({
    name: c.card_code,
    scans: c.scan_count || 0,
    business: c.business_name || 'Unassigned'
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Analytics &amp; Audit Logs</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Operational scan counts, performance rankings, and immutable administrative audit trails.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600">
          <Shield className="w-3.5 h-3.5 text-teal-600" />
          <span>Privacy Protected: IP Hashes Only</span>
        </div>
      </div>

      {/* Bar Chart: Most Popular Cards */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900">Top 10 Scanned Cards</h3>
            <p className="text-xs text-slate-500">Total scan and tap volume per physical review card</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <TrendingUp className="w-4 h-4 text-teal-600" />
            <span>Real customer engagements</span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topCardsChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '12px'
                }}
              />
              <Bar dataKey="scans" fill="#0d9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Grids: Business Performance & Audit History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Leaderboard */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <h3 className="font-bold text-base text-slate-900 mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-teal-600" />
            <span>Business Performance Ranking</span>
          </h3>

          {businessAnalytics.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center italic">No business records registered yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {businessAnalytics.map((b, index) => (
                <div key={b.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 pr-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {index + 1}
                    </span>
                    <div className="truncate">
                      <span className="font-bold text-sm text-slate-900 block truncate">
                        {b.business_name}
                      </span>
                      <span className="text-xs text-slate-400">Card {b.card_code || 'TR001'}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-extrabold text-sm text-teal-700 block">
                      {b.total_scans ?? 0}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase">scans</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Audit Log Table */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <h3 className="font-bold text-base text-slate-900 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-600" />
            <span>Admin Audit Trail</span>
          </h3>

          {auditLogs.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center italic">No audit records logged yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                      {log.action}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {log.created_at ? new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : ''}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{log.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

