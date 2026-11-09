import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  Building2,
  ScanLine,
  Zap,
  QrCode,
  ArrowRight,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function Overview() {
  const [data, setData] = useState(null);
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingQR, setGeneratingQR] = useState(false);
  const [qrMessage, setQrMessage] = useState('');

  const fetchOverviewData = async () => {
    try {
      setLoading(true);
      const [resOverview, resTrends] = await Promise.all([
        api.get('/api/analytics/overview'),
        api.get('/api/analytics/trends')
      ]);
      if (resOverview.data.success) {
        setData(resOverview.data.data);
      }
      if (resTrends.data.success) {
        setTrends(resTrends.data);
      }
    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();
  }, []);

  const handleQuickGenerateQR = async () => {
    try {
      setGeneratingQR(true);
      setQrMessage('');
      const res = await api.post('/api/cards/generate-all-qr');
      if (res.data.success) {
        setQrMessage(`Successfully generated ${res.data.result.total_generated} print QR codes!`);
        fetchOverviewData();
      }
    } catch (err) {
      setQrMessage('Failed to generate QR codes.');
    } finally {
      setGeneratingQR(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500">Loading dashboard metrics...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Cards',
      value: data?.total_cards ?? 50,
      icon: CreditCard,
      color: 'text-slate-700 bg-slate-100',
      desc: 'Manufactured initial batch',
    },
    {
      title: 'Available Cards',
      value: data?.available_cards ?? 0,
      icon: Clock,
      color: 'text-emerald-700 bg-emerald-50',
      desc: 'Ready for in-person activation',
    },
    {
      title: 'Activated Cards',
      value: data?.activated_cards ?? 0,
      icon: CheckCircle2,
      color: 'text-teal-700 bg-teal-50',
      desc: 'Permanently deployed to stores',
    },
    {
      title: 'Deactivated Cards',
      value: data?.deactivated_cards ?? 0,
      icon: XCircle,
      color: 'text-rose-700 bg-rose-50',
      desc: 'Temporarily paused cards',
    },
    {
      title: 'Total Businesses',
      value: data?.total_businesses ?? 0,
      icon: Building2,
      color: 'text-indigo-700 bg-indigo-50',
      desc: 'Active business partners',
    },
    {
      title: 'Total QR / NFC Scans',
      value: data?.total_scans ?? 0,
      icon: ScanLine,
      color: 'text-cyan-700 bg-cyan-50',
      desc: 'Real customer tap & scans',
    },
  ];

  const pieData = trends?.inventory_distribution || [
    { name: 'Available', value: data?.available_cards || 50, color: '#10b981' },
    { name: 'Activated', value: data?.activated_cards || 0, color: '#0ea5e9' },
    { name: 'Deactivated', value: data?.deactivated_cards || 0, color: '#f43f5e' },
  ];

  // Dummy or real chart data
  const chartData = (trends?.daily_trends && trends.daily_trends.length > 0)
    ? trends.daily_trends
    : [
        { date: 'Initial', scans: 0 },
        { date: 'Today', scans: data?.total_scans || 0 }
      ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Dashboard Overview</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time status for 50 manufactured NFC Google Review cards.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchOverviewData}
            title="Refresh Data"
            className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleQuickGenerateQR}
            disabled={generatingQR}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
          >
            <QrCode className="w-4 h-4 text-slate-600" />
            <span>{generatingQR ? 'Generating 50 QRs...' : 'Generate 50 Print QRs'}</span>
          </button>
          <Link
            to="/activate"
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>Activate Card</span>
          </Link>
        </div>
      </div>

      {qrMessage && (
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl text-teal-800 text-sm font-medium flex items-center justify-between">
          <span>{qrMessage}</span>
          <button onClick={() => setQrMessage('')} className="text-teal-600 hover:text-teal-900 font-bold ml-4">
            &times;
          </button>
        </div>
      )}

      {/* 6 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {stat.title}
                </span>
                <div className={`p-2.5 rounded-xl ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {stat.value}
                </span>
                <p className="text-xs text-slate-400 mt-1">{stat.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scans Trend */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Customer Scan Trends</h3>
              <p className="text-xs text-slate-500">Real redirect scans recorded across all cards</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
              Live Analytics
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scanGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="scans"
                  stroke="#0d9488"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#scanGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Inventory Utilization Pie */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Inventory Utilization</h3>
            <p className="text-xs text-slate-500">Physical 50-card capacity distribution</p>
          </div>
          <div className="h-44 w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 pt-2 border-t border-slate-100">
            {pieData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  ></span>
                  <span className="text-slate-600 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900">{item.value} cards</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two Columns: Recent Activations & Recent Scans */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activations */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-base">Recent Card Activations</h3>
            <Link
              to="/inventory"
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {(!data?.recent_activations || data.recent_activations.length === 0) ? (
            <div className="text-center py-10 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <Zap className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">No cards activated yet</p>
              <p className="text-xs text-slate-400 mt-1">Visit your first business and activate a card.</p>
              <Link
                to="/activate"
                className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-teal-600 hover:underline"
              >
                <span>Activate TR001 now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recent_activations.map((card) => (
                <div key={card.id} className="py-3 flex items-center justify-between">
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{card.card_code}</span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 font-medium">
                        {card.business?.category || 'Business'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {card.business?.business_name || 'Assigned Business'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs text-slate-400 block">
                      {card.activated_at ? new Date(card.activated_at).toLocaleDateString() : 'Active'}
                    </span>
                    <a
                      href={`/r/${card.card_code}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-teal-600 hover:underline inline-flex items-center gap-0.5 mt-0.5"
                    >
                      <span>Redirect</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Scans */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-base">Recent Scan Events</h3>
            <Link
              to="/analytics"
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              <span>Detailed logs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {(!data?.recent_scans || data.recent_scans.length === 0) ? (
            <div className="text-center py-10 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <ScanLine className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">No scan activity recorded yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Scan events will appear as customers tap NFC or scan QR codes.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recent_scans.map((scan) => (
                <div key={scan.id} className="py-3 flex items-center justify-between">
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        {scan.card_code || 'Card Scan'}
                      </span>
                      <span className="text-[11px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                        {scan.source || 'QR/NFC'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {scan.business_name || 'Customer review tap'}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">
                    {scan.scanned_at ? new Date(scan.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

