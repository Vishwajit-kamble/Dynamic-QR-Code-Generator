import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import {
  Zap,
  CreditCard,
  Building2,
  Link2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  ArrowRight,
  ShieldAlert,
  ArrowLeft
} from 'lucide-react';

export default function ActivateCard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [availableCards, setAvailableCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [step, setStep] = useState(1); // 1: Select Card, 2: Business & Review URL, 3: Review & Confirm, 4: Success

  // Form State
  const [selectedCardId, setSelectedCardId] = useState(searchParams.get('card') || '');
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('Restaurant / Cafe');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');
  const [notes, setNotes] = useState('');

  // Status & Success state
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activationResult, setActivationResult] = useState(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    const fetchAvailable = async () => {
      try {
        setLoadingCards(true);
        const res = await api.get('/api/cards/available');
        if (res.data.success) {
          setAvailableCards(res.data.cards);
          if (searchParams.get('card')) {
            const match = res.data.cards.find(c => c.id === searchParams.get('card') || c.card_code === searchParams.get('card'));
            if (match) {
              setSelectedCardId(match.id);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load available cards:', err);
      } finally {
        setLoadingCards(false);
      }
    };
    fetchAvailable();
  }, [searchParams]);

  const selectedCard = availableCards.find(c => c.id === selectedCardId);

  const handleNextToStep2 = () => {
    if (!selectedCardId) {
      setErrorMessage('Please select a card to activate.');
      return;
    }
    setErrorMessage('');
    setStep(2);
  };

  const handleNextToStep3 = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!businessName.trim()) {
      setErrorMessage('Business name is required.');
      return;
    }

    if (!googleReviewUrl.trim().toLowerCase().startsWith('https://')) {
      setErrorMessage('Google Review URL must begin with https://');
      return;
    }

    setStep(3);
  };

  const handleConfirmActivation = async () => {
    setSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        card_id: selectedCardId,
        business_name: businessName.trim(),
        category: category.trim(),
        contact_name: contactName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        google_review_url: googleReviewUrl.trim(),
        notes: notes.trim()
      };

      const res = await api.post('/api/cards/activate', payload);
      if (res.data.success) {
        setActivationResult(res.data.data);
        setStep(4);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to activate card. Please check inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">In-Person Card Activation</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Permanently link a manufactured NFC review card to a local business partner.
            </p>
          </div>
        </div>

        {/* Stepper Progress */}
        <div className="grid grid-cols-4 gap-2 mt-6 pt-6 border-t border-slate-100 text-center">
          {[
            { num: 1, label: 'Select Card' },
            { num: 2, label: 'Business & Link' },
            { num: 3, label: 'Review & Confirm' },
            { num: 4, label: 'Complete' }
          ].map((s) => (
            <div key={s.num} className="space-y-1">
              <div
                className={`h-1.5 rounded-full transition-colors ${
                  step >= s.num ? 'bg-teal-600' : 'bg-slate-200'
                }`}
              />
              <span
                className={`text-[11px] font-bold uppercase tracking-wider ${
                  step >= s.num ? 'text-teal-700' : 'text-slate-400'
                }`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* STEP 1: Select Available Card */}
      {step === 1 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">Step 1: Select an Available Physical Card</h3>
            <p className="text-xs text-slate-500 mt-1">
              Choose the card code matching the physical NFC card you are delivering to the client.
            </p>
          </div>

          {loadingCards ? (
            <div className="py-12 text-center">
              <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs text-slate-500">Scanning inventory...</p>
            </div>
          ) : availableCards.length === 0 ? (
            <div className="py-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No available cards in inventory</p>
              <p className="text-xs text-slate-400 mt-1">
                All 50 initial cards are already activated. Go to QR Management to seed or check stock.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-72 overflow-y-auto p-1">
              {availableCards.map((card) => {
                const isSelected = card.id === selectedCardId;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setSelectedCardId(card.id)}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50/70 text-teal-900 ring-2 ring-teal-500 font-bold shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <span className="block text-sm font-extrabold">{card.card_code}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                      /r/{card.slug}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {selectedCard && (
            <div className="p-4 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-200">
              <div className="flex items-center gap-3">
                <img
                  src={`/api/cards/${selectedCard.id}/qr`}
                  alt="QR"
                  className="w-12 h-12 rounded bg-white p-1 border border-slate-200"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-500 block">Selected Physical Card:</span>
                  <span className="text-base font-bold text-slate-900">{selectedCard.card_code}</span>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg">
                READY FOR ACTIVATION
              </span>
            </div>
          )}

          <div className="flex justify-end pt-3">
            <button
              onClick={handleNextToStep2}
              disabled={!selectedCardId}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl flex items-center gap-2 shadow-xs"
            >
              <span>Continue to Business Details</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Business Information & Review URL */}
      {step === 2 && (
        <form onSubmit={handleNextToStep3} className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Step 2: Business &amp; Google Review Details</h3>
            <p className="text-xs text-slate-500 mt-1">
              Enter the partner business info and their Google Review destination link.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Business Name *
            </label>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Bella Italia Trattoria"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Google Review Destination URL *
            </label>
            <div className="relative">
              <input
                type="url"
                required
                value={googleReviewUrl}
                onChange={(e) => setGoogleReviewUrl(e.target.value)}
                placeholder="https://g.page/r/YOUR_PLACE_ID/review"
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
              <Link2 className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Must be an HTTPS Google Review or Google Business link.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="Restaurant / Cafe">Restaurant / Cafe</option>
                <option value="Salon & Spa">Salon &amp; Spa</option>
                <option value="Retail & Boutique">Retail &amp; Boutique</option>
                <option value="Healthcare & Dental">Healthcare &amp; Dental</option>
                <option value="Automotive">Automotive</option>
                <option value="Professional Services">Professional Services</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Name</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Manager / Owner name"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@business.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Business Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Shop 4, Market Complex..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Card placement notes (e.g. front reception desk)..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm rounded-xl flex items-center gap-2 shadow-xs"
            >
              <span>Review Activation</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: Review & Irreversible Confirmation */}
      {step === 3 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">Step 3: Review and Confirm Activation</h3>
            <p className="text-xs text-slate-500 mt-1">
              Verify the card assignment details before writing permanent database records.
            </p>
          </div>

          {/* Warning Banner */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-900 text-xs">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold mb-0.5">Permanent Assignment Warning:</strong>
              Once activated, card <strong>{selectedCard?.card_code}</strong> will be permanently bound to{' '}
              <strong>{businessName}</strong>. It cannot be reassigned or transferred to another business.
            </div>
          </div>

          {/* Details Summary Card */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b border-slate-200">
              <img
                src={`/api/cards/${selectedCard?.id}/qr`}
                alt="QR Preview"
                className="w-20 h-20 bg-white p-1 rounded-xl border border-slate-200"
              />
              <div>
                <span className="text-xs text-slate-500 block font-semibold">Physical Card ID</span>
                <span className="text-xl font-extrabold text-slate-900">{selectedCard?.card_code}</span>
                <span className="text-xs font-mono text-slate-400 block mt-0.5">
                  Redirect: {selectedCard?.redirect_url}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block uppercase font-bold text-[10px]">Business Name</span>
                <span className="font-bold text-slate-900 text-sm">{businessName}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-bold text-[10px]">Category</span>
                <span className="font-semibold text-slate-800">{category}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-bold text-[10px]">Contact Person</span>
                <span className="text-slate-800">{contactName || 'None'}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-bold text-[10px]">Phone</span>
                <span className="text-slate-800">{phone || 'None'}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block uppercase font-bold text-[10px] mb-1">
                Google Review Destination
              </span>
              <p className="text-xs font-mono text-teal-700 bg-white p-2.5 rounded-lg border border-slate-200 break-all">
                {googleReviewUrl}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Edit</span>
            </button>
            <button
              onClick={handleConfirmActivation}
              disabled={submitting}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl flex items-center gap-2 shadow-xs"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Permanently Activating...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm &amp; Permanently Activate</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Activation Success Screen */}
      {step === 4 && activationResult && (
        <div className="bg-white rounded-2xl p-8 border border-slate-200/80 shadow-xs text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto shadow-xs border border-teal-100">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900">Card Activated Successfully!</h2>
            <p className="text-sm text-slate-500 mt-1">
              Card <span className="font-bold text-slate-800">{activationResult.card_code}</span> is now active and dynamically redirecting customers to{' '}
              <span className="font-bold text-slate-800">{activationResult.business_name}</span>.
            </p>
          </div>

          {/* Details Card */}
          <div className="max-w-md mx-auto bg-slate-50 p-5 rounded-2xl border border-slate-200 text-left space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-xs font-semibold text-slate-500">Physical Card:</span>
              <span className="font-bold text-sm text-slate-900">{activationResult.card_code}</span>
            </div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-xs font-semibold text-slate-500">Business:</span>
              <span className="font-bold text-sm text-slate-900">{activationResult.business_name}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                Permanent QR / NFC URL:
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={activationResult.redirect_url}
                  className="flex-1 text-xs font-mono bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700"
                />
                <button
                  onClick={() => handleCopy(activationResult.redirect_url)}
                  className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600"
                  title="Copy URL"
                >
                  {copiedUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <a
              href={`/r/${activationResult.card_code}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm rounded-xl shadow-xs inline-flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Test Dynamic Redirect</span>
            </a>
            <Link
              to="/inventory"
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm rounded-xl"
            >
              Back to Inventory
            </Link>
            <button
              onClick={() => {
                setStep(1);
                setSelectedCardId('');
                setBusinessName('');
                setGoogleReviewUrl('');
                setActivationResult(null);
              }}
              className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl"
            >
              Activate Another Card
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

