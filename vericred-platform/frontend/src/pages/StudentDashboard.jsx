import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  ShieldCheck,
  PlusCircle,
  FileText,
  Download,
  Share2,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Calendar,
  Building2,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  Eye,
  Lock,
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import LiveCertificatePreview from '../components/certificate/LiveCertificatePreview';
import LinkedInShareModal from '../components/student/LinkedInShareModal';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

const ROLE_OPTIONS = [
  { value: 'PARTICIPANT', label: 'Active Participant', basePts: 5 },
  { value: 'VOLUNTEER', label: 'Official Student Volunteer', basePts: 8 },
  { value: 'FINALIST', label: 'Grand Finalist', basePts: 12 },
  { value: 'ORGANIZER', label: 'Core Organizing Committee', basePts: 15 },
  { value: 'WINNER_3RD', label: '3rd Place (2nd Runner-Up)', basePts: 15 },
  { value: 'WINNER_2ND', label: '2nd Place (Runner-Up)', basePts: 20 },
  { value: 'WINNER_1ST', label: '1st Place (Winner)', basePts: 25 },
];

const SCOPE_MULTIPLIER_MAP = {
  INTRA_COLLEGE: 1.0,
  INTER_COLLEGE: 1.5,
  STATE: 2.0,
  NATIONAL: 2.5,
  INTERNATIONAL: 3.0,
};

export default function StudentDashboard() {
  const { user, refreshUserProfile } = useAuth();

  // Data States
  const [events, setEvents] = useState([]);
  const [claims, setClaims] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Claim Form State
  const [selectedEventId, setSelectedEventId] = useState('');
  const [claimedRole, setClaimedRole] = useState('PARTICIPANT');
  const [achievementNotes, setAchievementNotes] = useState('');
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [claimFeedback, setClaimFeedback] = useState(null); // { type: 'success'|'error', message: '' }

  // Active Tab: 'CERTIFICATES' | 'CLAIMS'
  const [activeTab, setActiveTab] = useState('CERTIFICATES');

  // Modals State
  const [previewCertificate, setPreviewCertificate] = useState(null);
  const [shareCertificate, setShareCertificate] = useState(null);
  const [copiedPortfolio, setCopiedPortfolio] = useState(false);

  const backendOrigin = (
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
  ).replace(/\/api\/?$/, '');

  const fetchDashboardData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [eventsRes, claimsRes, certsRes] = await Promise.all([
        axiosInstance.get('/events'),
        axiosInstance.get('/claims/my-claims'),
        axiosInstance.get('/certificates/my-certificates'),
      ]);

      if (eventsRes.data?.events) {
        setEvents(eventsRes.data.events);
      }
      if (claimsRes.data?.claims) {
        setClaims(claimsRes.data.claims);
      }
      if (certsRes.data?.certificates) {
        setCertificates(certsRes.data.certificates);
      }
    } catch (error) {
      console.error('Error loading student dashboard data:', error);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Filter out events the student has already claimed
  const claimedEventIds = new Set(claims.map((c) => c.eventId));
  const availableEventsToClaim = events.filter((ev) => !claimedEventIds.has(ev.id));

  // Auto-select first available event
  useEffect(() => {
    if (!selectedEventId && availableEventsToClaim.length > 0) {
      setSelectedEventId(availableEventsToClaim[0].id);
    }
  }, [availableEventsToClaim, selectedEventId]);

  // Calculate preview points for currently selected event + role
  const selectedEventObj = events.find((ev) => ev.id === selectedEventId);
  const selectedRoleObj = ROLE_OPTIONS.find((r) => r.value === claimedRole);
  const estimatedCreditPoints = selectedEventObj && selectedRoleObj
    ? Math.round(
        selectedRoleObj.basePts *
          (SCOPE_MULTIPLIER_MAP[selectedEventObj.scope] || 1.0)
      )
    : 0;

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEventId) return;

    setSubmittingClaim(true);
    setClaimFeedback(null);

    try {
      const res = await axiosInstance.post('/claims', {
        eventId: selectedEventId,
        claimedRole,
        achievementNotes,
      });

      if (res.data?.success) {
        const wasAutoVerified = res.data.claim?.status === 'APPROVED_BY_CSV';
        setClaimFeedback({
          type: 'success',
          isAutoVerified: wasAutoVerified,
          message: res.data.message,
        });
        setAchievementNotes('');
        setSelectedEventId('');

        await Promise.all([fetchDashboardData(), refreshUserProfile()]);

        if (wasAutoVerified) {
          setActiveTab('CERTIFICATES');
        } else {
          setActiveTab('CLAIMS');
        }
      }
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        'Failed to submit participation claim.';
      setClaimFeedback({
        type: 'error',
        message: msg,
      });
    } finally {
      setSubmittingClaim(false);
    }
  };

  const publicPortfolioUrl = `${window.location.origin}/u/${
    user?.rollNo || '23ESKIT001'
  }`;

  const handleCopyPortfolioUrl = () => {
    navigator.clipboard.writeText(publicPortfolioUrl);
    setCopiedPortfolio(true);
    setTimeout(() => setCopiedPortfolio(false), 2000);
  };

  // Compute Category Summary
  const totalEarnedPoints = certificates.reduce(
    (sum, cert) => sum + (cert.creditPoints || 0),
    0
  );
  const pendingClaimsCount = claims.filter((c) => c.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* TOP IDENTITY & PORTFOLIO BANNER */}
        <div className="bg-white border border-slate-200 rounded p-6 mb-8 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-slate-900 text-white">
                  {user?.rollNo || 'STUDENT'}
                </span>
                <span className="font-mono text-xs text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded">
                  {user?.department} • Semester {user?.currentSemester || 5} (Sec{' '}
                  {user?.section || 'A'})
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Cryptographic Ledger Active
                </span>
              </div>

              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {user?.name}&rsquo;s Verified Participation &amp; Credential Ledger
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                All approved certificates carry an HMAC-SHA256 signature and automatically
                sync with your Faculty&rsquo;s Semester Grading Matrix.
              </p>
            </div>

            {/* Shareable Public Portfolio Box */}
            <div className="bg-slate-50 border border-slate-200 rounded p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 block">
                  Public Verifiable Portfolio Route
                </span>
                <span className="font-mono text-xs font-semibold text-slate-900">
                  {publicPortfolioUrl}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyPortfolioUrl}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  {copiedPortfolio ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
                <Link
                  to={`/u/${user?.rollNo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <span>Open</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* 4 KPI METRIC STRIP */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-200">
            <div className="bg-slate-50 border border-slate-200 rounded p-4">
              <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500 block">
                Verified Certificates
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {certificates.length}
                </span>
                <span className="text-xs text-emerald-700 font-medium">
                  QR Signed
                </span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded p-4">
              <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500 block">
                Total Credit Score
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {totalEarnedPoints} PTS
                </span>
                <span className="text-xs text-amber-700 font-medium">
                  Sem {user?.currentSemester || 5}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded p-4">
              <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500 block">
                Est. Co-Curricular Marks
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {Math.min(20, Math.ceil((totalEarnedPoints / 60) * 20))} / 20
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  Target: 60 Pts
                </span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded p-4">
              <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500 block">
                Pending Claims
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {pendingClaimsCount}
                </span>
                <span className="text-xs text-slate-500">
                  Awaiting Review
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN 12-COLUMN WORKSPACE: LEFT (Claim Form) + RIGHT (Certificates & Claims Ledger) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT 4 COLUMNS: Submit New Event Participation Claim */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold tracking-tight">
                  Claim Event Participation
                </h2>
              </div>
              <span className="font-mono text-[10px] text-slate-400 uppercase">
                Auto-CSV Check
              </span>
            </div>

            <div className="p-5">
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Select an institutional event you participated in. If your Roll Number (
                <span className="font-mono font-semibold text-slate-900">
                  {user?.rollNo}
                </span>
                ) is present in the Faculty&rsquo;s uploaded CSV roster, your cryptographic
                certificate is generated <strong>instantly</strong>.
              </p>

              {claimFeedback && (
                <div
                  className={`mb-4 p-3 rounded border text-xs flex items-start gap-2.5 ${
                    claimFeedback.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}
                >
                  {claimFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-semibold block">
                      {claimFeedback.type === 'success'
                        ? claimFeedback.isAutoVerified
                          ? 'Auto-Verified via Faculty CSV Roster!'
                          : 'Claim Submitted for Faculty Approval'
                        : 'Submission Error'}
                    </span>
                    <span className="mt-0.5 block">{claimFeedback.message}</span>
                  </div>
                </div>
              )}

              {availableEventsToClaim.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded text-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-800">
                    All Available Events Claimed
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    You have already submitted claims or received certificates for all
                    currently listed institutional events.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleClaimSubmit} className="space-y-4">
                  {/* Select Event */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Select Institutional Event
                    </label>
                    <select
                      required
                      value={selectedEventId}
                      onChange={(e) => setSelectedEventId(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded bg-white focus:outline-none focus:border-slate-900"
                    >
                      {availableEventsToClaim.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.title} ({ev.scope.replace('_', ' ')})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selected Event Metadata Preview */}
                  {selectedEventObj && (
                    <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-mono text-[11px]">
                          CATEGORY / SCOPE:
                        </span>
                        <span className="font-mono font-semibold text-slate-800">
                          {selectedEventObj.category} • {selectedEventObj.scope}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-mono text-[11px]">
                          ORGANIZER DEPT:
                        </span>
                        <span className="font-medium text-slate-800">
                          {selectedEventObj.organizerDept}
                        </span>
                      </div>
                      {selectedEventObj.naacCriteriaTag && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-mono text-[11px]">
                            NAAC MAPPING:
                          </span>
                          <span className="font-mono text-[11px] text-amber-800">
                            {selectedEventObj.naacCriteriaTag}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Select Participation Role */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Participation Role / Distinction
                    </label>
                    <select
                      value={claimedRole}
                      onChange={(e) => setClaimedRole(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded bg-white focus:outline-none focus:border-slate-900"
                    >
                      {ROLE_OPTIONS.map((roleOpt) => (
                        <option key={roleOpt.value} value={roleOpt.value}>
                          {roleOpt.label} (Base: {roleOpt.basePts} Pts)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Notes / Project Title */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Team Name / Project Title / Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={achievementNotes}
                      onChange={(e) => setAchievementNotes(e.target.value)}
                      placeholder="e.g., Team VeriCred - Built decentralized verification portal"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:outline-none focus:border-slate-900"
                    />
                  </div>

                  {/* Estimated Credit Calculation Preview */}
                  <div className="bg-slate-900 text-slate-100 rounded p-3 flex items-center justify-between">
                    <span className="text-xs text-slate-300">
                      Estimated Credit Points on Approval:
                    </span>
                    <span className="font-mono text-sm font-bold text-amber-400">
                      +{estimatedCreditPoints} PTS
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingClaim}
                    className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-300 text-slate-950 font-bold py-2.5 px-4 rounded text-xs uppercase tracking-wider transition-colors"
                  >
                    {submittingClaim
                      ? 'Verifying & Submitting...'
                      : 'Submit Participation Claim'}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* RIGHT 8 COLUMNS: Issued Cryptographic Certificates & Claims History */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
            {/* Tabs Header */}
            <div className="border-b border-slate-200 bg-slate-50 px-5 flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <button
                  type="button"
                  onClick={() => setActiveTab('CERTIFICATES')}
                  className={`py-4 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-colors ${
                    activeTab === 'CERTIFICATES'
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Award className="w-4 h-4 text-amber-600" />
                  <span>Verified Certificates ({certificates.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('CLAIMS')}
                  className={`py-4 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-colors ${
                    activeTab === 'CLAIMS'
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>All Participation Claims ({claims.length})</span>
                </button>
              </div>

              <button
                type="button"
                onClick={fetchDashboardData}
                title="Refresh Ledger"
                className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* TAB 1: VERIFIED CRYPTOGRAPHIC CERTIFICATES */}
            {activeTab === 'CERTIFICATES' && (
              <div className="p-6">
                {loadingData ? (
                  <div className="py-12 text-center text-xs font-mono text-slate-500">
                    Loading cryptographic credentials...
                  </div>
                ) : certificates.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-slate-300 rounded bg-slate-50 p-6">
                    <Award className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <h3 className="text-sm font-bold text-slate-800">
                      No Verified Certificates Issued Yet
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                      Submit a participation claim using the form on the left. Once verified via
                      Faculty CSV Roster or 1-Click Approval, your QR-signed certificate will
                      appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {certificates.map((cert) => {
                      const pdfDownloadHref = cert.pdfUrl
                        ? `${backendOrigin}${cert.pdfUrl}`
                        : null;

                      return (
                        <div
                          key={cert.id}
                          className="border border-slate-200 rounded bg-white hover:border-slate-300 transition-all p-5"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-amber-400">
                                  {cert.certificateNo}
                                </span>
                                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  +{cert.creditPoints} CREDITS
                                </span>
                                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                  {cert.participationRole.replace(/_/g, ' ')}
                                </span>
                                <span className="font-mono text-[11px] text-slate-500">
                                  Sem {cert.semester}
                                </span>
                              </div>

                              <h3 className="text-base font-bold text-slate-900">
                                {cert.event?.title}
                              </h3>

                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                <span>
                                  Category:{' '}
                                  <strong className="text-slate-700">
                                    {cert.event?.category}
                                  </strong>
                                </span>
                                <span>•</span>
                                <span>
                                  Scope:{' '}
                                  <strong className="text-slate-700">
                                    {cert.event?.scope?.replace('_', ' ')}
                                  </strong>
                                </span>
                                <span>•</span>
                                <span>
                                  Issued:{' '}
                                  {new Date(cert.issuedAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                              </div>

                              {/* Truncated Cryptographic Signature Bar */}
                              <div className="pt-1 flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
                                <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                                <span className="truncate max-w-md">
                                  HMAC-SHA256: {cert.cryptoSignature}
                                </span>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap sm:flex-col items-stretch gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => setPreviewCertificate(cert)}
                                className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5 text-amber-400" />
                                <span>Inspect &amp; QR Preview</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setShareCertificate(cert)}
                                className="px-3 py-1.5 rounded bg-[#0A66C2] hover:bg-[#004182] text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                                <span>LinkedIn &amp; Social Share</span>
                              </button>

                              {pdfDownloadHref && (
                                <a
                                  href={pdfDownloadHref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={`${cert.certificateNo}.pdf`}
                                  className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Download PDF</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: ALL PARTICIPATION CLAIMS STATUS TABLE */}
            {activeTab === 'CLAIMS' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 font-mono text-[11px] uppercase text-slate-600">
                      <th className="py-3 px-4">Event Details</th>
                      <th className="py-3 px-4">Claimed Role</th>
                      <th className="py-3 px-4">Verification Status</th>
                      <th className="py-3 px-4">Credential ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {claims.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-500">
                          No participation claims submitted yet.
                        </td>
                      </tr>
                    ) : (
                      claims.map((claim) => (
                        <tr key={claim.id} className="hover:bg-slate-50">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">
                              {claim.event?.title}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {claim.event?.category} • {claim.event?.organizerDept}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-800">
                            {claim.claimedRole.replace(/_/g, ' ')}
                          </td>
                          <td className="py-3.5 px-4">
                            {claim.status === 'APPROVED_BY_CSV' && (
                              <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                AUTO-VERIFIED (CSV)
                              </span>
                            )}
                            {claim.status === 'APPROVED_BY_FACULTY' && (
                              <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                FACULTY APPROVED
                              </span>
                            )}
                            {claim.status === 'PENDING' && (
                              <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                <Clock className="w-3 h-3" />
                                PENDING REVIEW
                              </span>
                            )}
                            {claim.status === 'REJECTED' && (
                              <div>
                                <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                                  <XCircle className="w-3 h-3" />
                                  REJECTED
                                </span>
                                {claim.rejectionReason && (
                                  <p className="text-[11px] text-red-600 mt-1">
                                    Reason: {claim.rejectionReason}
                                  </p>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono">
                            {claim.certificate ? (
                              <button
                                type="button"
                                onClick={() => setPreviewCertificate({
                                  ...claim.certificate,
                                  event: claim.event,
                                })}
                                className="text-slate-900 font-bold underline underline-offset-2 hover:text-amber-700"
                              >
                                {claim.certificate.certificateNo}
                              </button>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MODAL 1: Live Certificate Preview & QR Inspection */}
      {previewCertificate && (
        <LiveCertificatePreview
          certificate={previewCertificate}
          student={user}
          onClose={() => setPreviewCertificate(null)}
        />
      )}

      {/* MODAL 2: LinkedIn 1-Click Certification & Social Post Generator */}
      {shareCertificate && (
        <LinkedInShareModal
          certificate={shareCertificate}
          student={user}
          onClose={() => setShareCertificate(null)}
        />
      )}
    </div>
  );
}