import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  CheckCircle2,
  XCircle,
  Search,
  Award,
  Building2,
  Calendar,
  ExternalLink,
  ArrowLeft,
  UserCheck,
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import LiveCertificatePreview from '../components/certificate/LiveCertificatePreview';
import axiosInstance from '../api/axiosInstance';

export default function PublicVerifyPage() {
  const { certificateNo } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const sigFromQuery = searchParams.get('sig') || '';

  const [manualCertNo, setManualCertNo] = useState(certificateNo || '');
  const [manualSig, setManualSig] = useState(sigFromQuery);

  const [loading, setLoading] = useState(true);
  const [verificationResult, setVerificationResult] = useState(null);

  useEffect(() => {
    async function verifyCredential() {
      if (!certificateNo) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await axiosInstance.get(
          `/verify/${encodeURIComponent(certificateNo.trim().toUpperCase())}`,
          {
            params: { sig: sigFromQuery },
          }
        );

        setVerificationResult(res.data);
      } catch (error) {
        if (error.response && error.response.data) {
          setVerificationResult(error.response.data);
        } else {
          setVerificationResult({
            success: false,
            isAuthentic: false,
            message: 'Unable to reach institutional verification ledger.',
          });
        }
      } finally {
        setLoading(false);
      }
    }

    verifyCredential();
  }, [certificateNo, sigFromQuery]);

  const handleManualVerifySubmit = (e) => {
    e.preventDefault();
    if (!manualCertNo.trim()) return;
    const certPart = encodeURIComponent(manualCertNo.trim().toUpperCase());
    const sigPart = manualSig.trim()
      ? `?sig=${encodeURIComponent(manualSig.trim())}`
      : '';
    window.location.href = `/verify/${certPart}${sigPart}`;
  };

  const details = verificationResult?.verificationDetails;

  // Build certificate object compatible with LiveCertificatePreview
  const previewCertificateObj = details
    ? {
        certificateNo: details.certificateNo,
        participationRole: details.participationRole,
        creditPoints: details.creditPoints,
        semester: details.semester,
        issuedAt: details.issuedAt,
        cryptoSignature: sigFromQuery,
        qrVerificationUrl: window.location.href,
        event: details.event,
        student: details.student,
      }
    : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Navigation Back Bar */}
        <div className="flex items-center justify-between">
          <Link
            to="/login"
            className="text-xs font-mono text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Institutional Portal</span>
          </Link>

          <span className="font-mono text-[11px] px-2.5 py-1 rounded bg-slate-900 text-amber-400">
            ZERO-LOGIN THIRD-PARTY VERIFICATION GATEWAY
          </span>
        </div>

        {/* Verification Status Banner */}
        {loading ? (
          <div className="bg-white border border-slate-200 rounded p-12 text-center shadow-sm">
            <div className="w-10 h-10 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
              Computing HMAC-SHA256 Cryptographic Verification...
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Validating canonical payload signature against immutable institutional records.
            </p>
          </div>
        ) : verificationResult?.isAuthentic && details ? (
          <>
            {/* AUTHENTIC VERIFIED BANNER */}
            <div className="bg-emerald-950 text-white border border-emerald-800 rounded p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded bg-emerald-900 border border-emerald-700 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-400 text-emerald-950">
                        AUTHENTIC CREDENTIAL
                      </span>
                      <span className="font-mono text-xs text-emerald-300">
                        ID: {details.certificateNo}
                      </span>
                    </div>
                    <h1 className="text-xl font-bold text-white mt-1.5">
                      Cryptographically Verified by {details.institutionName}
                    </h1>
                    <p className="text-xs text-emerald-200 mt-1">
                      The HMAC-SHA256 digital signature embedded in this QR link matches the
                      canonical institutional ledger with zero tampering detected.
                    </p>
                  </div>
                </div>

                {details.student?.rollNo && (
                  <Link
                    to={`/u/${details.student.rollNo}`}
                    className="shrink-0 px-4 py-2.5 rounded bg-emerald-800 hover:bg-emerald-700 text-white border border-emerald-600 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <span>View Student&rsquo;s Full Portfolio</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-emerald-800/80 text-xs">
                <div>
                  <span className="font-mono text-[10px] uppercase text-emerald-400 block">
                    Issued To Student
                  </span>
                  <span className="font-bold text-white text-sm block mt-0.5">
                    {details.student?.name}
                  </span>
                  <span className="font-mono text-emerald-300 text-[11px]">
                    {details.student?.rollNo} • {details.student?.department}
                  </span>
                </div>

                <div>
                  <span className="font-mono text-[10px] uppercase text-emerald-400 block">
                    Event &amp; Scope
                  </span>
                  <span className="font-bold text-white text-sm block mt-0.5">
                    {details.event?.title}
                  </span>
                  <span className="font-mono text-emerald-300 text-[11px]">
                    {details.event?.category} • {details.event?.scope}
                  </span>
                </div>

                <div>
                  <span className="font-mono text-[10px] uppercase text-emerald-400 block">
                    Distinction &amp; Credits
                  </span>
                  <span className="font-bold text-amber-300 text-sm block mt-0.5">
                    {details.participationRole.replace(/_/g, ' ')}
                  </span>
                  <span className="font-mono text-emerald-300 text-[11px]">
                    +{details.creditPoints} Credit Points (Sem {details.semester})
                  </span>
                </div>

                <div>
                  <span className="font-mono text-[10px] uppercase text-emerald-400 block">
                    Issue Timestamp
                  </span>
                  <span className="font-bold text-white text-sm block mt-0.5">
                    {new Date(details.issuedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <span className="font-mono text-emerald-300 text-[11px]">
                    Status: ACTIVE / UNREVOKED
                  </span>
                </div>
              </div>
            </div>

            {/* Inline Live Certificate Render */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 font-mono">
                Official Archival Credential Reproduction
              </h3>
              <LiveCertificatePreview
                certificate={previewCertificateObj}
                student={details.student}
                isModal={false}
              />
            </div>
          </>
        ) : (
          /* TAMPERED OR INVALID CREDENTIAL WARNING */
          <div className="bg-white border border-red-300 rounded overflow-hidden shadow-sm">
            <div className="bg-red-950 text-white p-6 border-b border-red-900 flex items-start gap-4">
              <div className="w-11 h-11 rounded bg-red-900 border border-red-700 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6 text-red-300" />
              </div>
              <div>
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-400 text-red-950">
                  VERIFICATION FAILED
                </span>
                <h1 className="text-xl font-bold text-white mt-1.5">
                  Unverified or Tampered Credential Signature
                </h1>
                <p className="text-xs text-red-200 mt-1">
                  {verificationResult?.message ||
                    'Could not validate cryptographic signature. Ensure you scanned the complete QR code containing both the Certificate ID and the 64-character SHA-256 signature (?sig=...).'}
                </p>
              </div>
            </div>

            {/* Manual Verification Input Form */}
            <form onSubmit={handleManualVerifySubmit} className="p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Manual Cryptographic Lookup
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-600 mb-1">
                    Certificate Number (e.g., VC-2026-...)
                  </label>
                  <input
                    type="text"
                    required
                    value={manualCertNo}
                    onChange={(e) => setManualCertNo(e.target.value.toUpperCase())}
                    placeholder="VC-2026-XXXXXX"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-600 mb-1">
                    HMAC-SHA256 Signature (optional — from QR URL)
                  </label>
                  <input
                    type="text"
                    value={manualSig}
                    onChange={(e) => setManualSig(e.target.value)}
                    placeholder="e.g., 9a8f7d6e5c... (leave blank for registry lookup)"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded transition-colors"
              >
                Re-Run Cryptographic Verification
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}