import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Building2,
  Search,
  ExternalLink,
  Edit,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  ScanLine,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function Businesses() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [editingBusiness, setEditingBusiness] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (selectedCategory) params.category = selectedCategory;

      const res = await api.get('/api/businesses', { params });
      if (res.data.success) {
        setBusinesses(res.data.businesses);
      }
    } catch (err) {
      console.error('Failed to fetch businesses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, [selectedCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchBusinesses();
  };

  const openEditModal = (b) => {
    setEditingBusiness(b);
    setEditForm({
      business_name: b.business_name || '',
      category: b.category || '',
      contact_name: b.contact_name || '',
      phone: b.phone || '',
      email: b.email || '',
      address: b.address || '',
      google_review_url: b.google_review_url || '',
      notes: b.notes || '',
    });
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!editForm.google_review_url.toLowerCase().startsWith('https://')) {
      setErrorMessage('Google Review URL must begin with https://');
      return;
    }

    try {
      setSaving(true);
      const res = await api.put(`/api/businesses/${editingBusiness.id}`, editForm);
      if (res.data.success) {
        setSuccessMessage('Business details updated successfully!');
        setTimeout(() => {
          setEditingBusiness(null);
          fetchBusinesses();
        }, 1200);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to update business');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Assigned Businesses</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Directory of businesses with permanently assigned TapReview NFC cards.
          </p>
        </div>
        <div className="text-sm text-slate-600 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl">
          Total Partner Businesses: <span className="font-bold text-slate-900">{businesses.length}</span>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search business by name, owner or phone..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-900"
          />
        </form>

        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="">All Categories</option>
            <option value="Restaurant / Cafe">Restaurant / Cafe</option>
            <option value="Salon & Spa">Salon &amp; Spa</option>
            <option value="Retail & Boutique">Retail &amp; Boutique</option>
            <option value="Healthcare & Dental">Healthcare &amp; Dental</option>
            <option value="Automotive">Automotive</option>
            <option value="Professional Services">Professional Services</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Businesses Grid */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-slate-500">Loading business directory...</p>
        </div>
      ) : businesses.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-base font-semibold text-slate-800">No businesses found</p>
          <p className="text-xs text-slate-400 mt-1">Activate a card to register your first business client.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {businesses.map((b) => (
            <div
              key={b.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {b.category || 'Local Business'}
                    </span>
                    <h3 className="font-bold text-base text-slate-900 mt-2">{b.business_name}</h3>
                  </div>
                  <button
                    onClick={() => openEditModal(b)}
                    className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Edit Contact & Destination"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>

                {/* Assigned Card Badge */}
                <div className="mt-3 p-2.5 bg-teal-50/60 border border-teal-100 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-teal-800 font-semibold">
                    <CreditCard className="w-3.5 h-3.5 text-teal-600" />
                    <span>Assigned Card: {b.card_code || 'TR001'}</span>
                  </div>
                  <span className="font-bold text-teal-900 flex items-center gap-1">
                    <ScanLine className="w-3 h-3 text-teal-600" />
                    {b.total_scans ?? 0} scans
                  </span>
                </div>

                {/* Contact Info */}
                <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                  {b.contact_name && (
                    <p className="font-medium text-slate-800">Contact: {b.contact_name}</p>
                  )}
                  {b.phone && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{b.phone}</span>
                    </div>
                  )}
                  {b.email && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Mail className="w-3.5 h-3.5" />
                      <span>{b.email}</span>
                    </div>
                  )}
                  {b.address && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{b.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Review URL Preview */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Google Review Destination
                </span>
                <a
                  href={b.google_review_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-teal-600 hover:text-teal-800 font-medium truncate flex items-center gap-1"
                >
                  <span className="truncate">{b.google_review_url}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Business Details Modal */}
      {editingBusiness && (
        <div className="fixed inset-0 z-50 bg-navy-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                Edit {editingBusiness.business_name}
              </h3>
              <button
                onClick={() => setEditingBusiness(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-700 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleUpdate} className="py-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  required
                  value={editForm.business_name}
                  onChange={(e) => setEditForm({ ...editForm, business_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Google Review Destination URL (HTTPS)
                </label>
                <input
                  type="url"
                  required
                  value={editForm.google_review_url}
                  onChange={(e) => setEditForm({ ...editForm, google_review_url: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="https://g.page/r/your-place/review"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Updating this destination immediately redirects physical card scans to the new link.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Owner
                  </label>
                  <input
                    type="text"
                    value={editForm.contact_name}
                    onChange={(e) => setEditForm({ ...editForm, contact_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingBusiness(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-xs disabled:opacity-50"
                >
                  {saving ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

