import React, { useState } from 'react';
import {
  X,
  Download,
  Printer,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  Lock,
  Award,
} from 'lucide-react';

const ROLE_DISPLAY_MAP = {
  WINNER_1ST: 'First Place (Winner)',
  WINNER_2ND: 'Second Place (Runner-Up)',
  WINNER_3RD: 'Third Place (2nd Runner-Up)',
  FINALIST: 'Grand Finalist',
  ORGANIZER: 'Core Organizing Committee Member',
  VOLUNTEER: 'Official Student Volunteer',
  PARTICIPANT: 'Active Participant',
};

const SCOPE_DISPLAY_MAP = {
  INTRA_COLLEGE: 'Intra-Institutional Level',
  INTER_COLLEGE: 'Inter-Institutional Level',
  STATE: 'State Level',
  NATIONAL: 'National Level',
  INTERNATIONAL: 'International Level',
};

const CATEGORY_DISPLAY_MAP = {
  TECHNICAL: 'Technical & Engineering',
  HACKATHON: 'Hackathon & Innovation',
  SPORTS: 'Athletics & Sports',
  CULTURAL: 'Cultural & Literary Arts',
  NSS_SOCIAL: 'NSS & Community Service',
  WORKSHOP_SEMINAR: 'Academic Workshop & Seminar',
};

/**
 * Reusable Live Certificate Preview Modal & Inline Renderer
 *
 * @param {Object} props
 * @param {Object} props.certificate - Certificate object from backend API
 * @param {Object} [props.student] - Student user object ({ name, rollNo, department })
 * @param {Function} [props.onClose] - Close modal callback (if rendered as modal)
 * @param {boolean} [props.isModal=true] - Whether to wrap in a full-screen modal overlay
 */
export default function LiveCertificatePreview({
  certificate,
  student,
  onClose,
  isModal = true,
}) {
  const [copiedLink, setCopiedLink] = useState(false);

  if (!certificate) return null;

  const backendOrigin = (
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
  ).replace(/\/api\/?$/, '');

  const studentName =
    student?.name || certificate?.student?.name || 'Verified Student';
  const studentRollNo = (
    student?.rollNo ||
    certificate?.student?.rollNo ||
    'N/A'
  ).toUpperCase();
  const studentDept =
    student?.department ||
    certificate?.student?.department ||
    'Engineering & Technology';

  const eventTitle = certificate?.event?.title || 'Institutional Event';
  const eventCategory = certificate?.event?.category || 'TECHNICAL';
  const eventScope = certificate?.event?.scope || 'INTRA_COLLEGE';
  const eventDate = certificate?.event?.eventDate
    ? new Date(certificate.event.eventDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Academic Session 2025-26';

  const issuedDate = certificate?.issuedAt
    ? new Date(certificate.issuedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

  const isMerit = [
    'WINNER_1ST',
    'WINNER_2ND',
    'WINNER_3RD',
    'FINALIST',
  ].includes(certificate.participationRole);

  const verificationUrl =
    certificate.qrVerificationUrl ||
    `${window.location.origin}/verify/${certificate.certificateNo}?sig=${certificate.cryptoSignature}`;

  // High-reliability QR code image URL for instant crisp rendering on screen
  const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=1&color=0f172a&bgcolor=ffffff&data=${encodeURIComponent(
    verificationUrl
  )}`;

  const fullPdfDownloadUrl = certificate.pdfUrl
    ? `${backendOrigin}${certificate.pdfUrl}`
    : null;

  const handleCopyVerifyLink = () => {
    navigator.clipboard.writeText(verificationUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  const certificateDocumentContent = (
    <div className="bg-[#FCFBF9] text-slate-900 p-4 sm:p-6 shadow-sm border border-slate-300 select-none print:shadow-none print:border-none">
      {/* Outer Heavy Institutional Navy Frame */}
      <div className="border-[3px] border-slate-900 p-1.5">
        {/* Middle Antique Gold Rule */}
        <div className="border border-amber-700 p-1">
          {/* Inner Hairline Slate Frame */}
          <div className="border border-slate-300 px-6 py-7 sm:px-12 sm:py-10 relative bg-[#FCFBF9]">
            {/* Top Metadata Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 mb-6 font-mono text-[11px] text-slate-600">
              <span>CREDENTIAL ID: {certificate.certificateNo}</span>
              <span className="font-semibold text-slate-900 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded">
                VERIFIED ACTIVITY CREDITS: +{certificate.creditPoints} PTS (SEM{' '}
                {certificate.semester})
              </span>
            </div>

            {/* Institution Header */}
            <div className="text-center">
              <h2 className="font-serif text-base sm:text-xl font-bold tracking-wider text-slate-900 uppercase">
                Swami Keshvanand Institute of Technology, Management &amp;
                Gramothan
              </h2>
              <p className="text-[10px] sm:text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase mt-1">
                Centralized Directorate of Student Affairs &amp; Internal
                Quality Assurance Cell (IQAC)
              </p>
              <div className="w-48 h-[1.5px] bg-amber-700 mx-auto mt-3 mb-5" />
            </div>

            {/* Certificate Main Heading */}
            <div className="text-center my-4">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-[0.12em] text-slate-900 uppercase">
                {isMerit
                  ? 'Certificate of Excellence & Merit'
                  : 'Certificate of Verified Participation'}
              </h1>
              <p className="font-serif italic text-xs sm:text-sm text-slate-600 mt-3">
                This official institutional credential is proudly presented to
              </p>
            </div>

            {/* Student Name & Enrollment Details */}
            <div className="text-center my-5">
              <div className="inline-block border-b border-slate-300 px-8 pb-1.5">
                <span className="font-serif text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                  {studentName}
                </span>
              </div>
              <div className="mt-2.5 font-mono text-xs font-semibold text-slate-700 tracking-wide">
                ENROLLMENT / ROLL NO: {studentRollNo} &nbsp;|&nbsp; DEPARTMENT:{' '}
                {studentDept.toUpperCase()}
              </div>
            </div>

            {/* Citation Body */}
            <div className="text-center max-w-2xl mx-auto my-5">
              <p className="font-serif text-sm sm:text-base text-slate-800 leading-relaxed">
                in recognition of serving/achieving the distinction of{' '}
                <span className="font-bold text-amber-800">
                  {ROLE_DISPLAY_MAP[certificate.participationRole] ||
                    certificate.participationRole}
                </span>{' '}
                in the{' '}
                <span className="font-semibold">
                  {SCOPE_DISPLAY_MAP[eventScope] || eventScope}
                </span>{' '}
                event:
              </p>

              <h3 className="font-serif text-lg sm:text-2xl font-bold text-slate-900 mt-3">
                &ldquo;{eventTitle}&rdquo;
              </h3>

              <p className="text-xs text-slate-600 mt-2 font-sans">
                Category:{' '}
                <span className="font-medium text-slate-800">
                  {CATEGORY_DISPLAY_MAP[eventCategory] || eventCategory}
                </span>{' '}
                &nbsp;&bull;&nbsp; Conducted on:{' '}
                <span className="font-medium text-slate-800">{eventDate}</span>{' '}
                &nbsp;&bull;&nbsp; Academic Semester:{' '}
                <span className="font-medium text-slate-800">
                  Semester {certificate.semester}
                </span>
              </p>
            </div>

            {/* Bottom 3-Column Cryptographic & Authority Footer */}
            <div className="mt-8 pt-5 border-t border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
              {/* Left Column: Authority Signature */}
              <div className="md:col-span-3 text-left">
                <div className="font-serif italic text-sm text-slate-700 mb-1">
                  Digitally Signed &amp; Verified
                </div>
                <div className="w-40 border-b border-slate-700 mb-1.5" />
                <p className="text-xs font-bold text-slate-900">
                  Institutional Verification Cell
                </p>
                <p className="text-[11px] text-slate-500">
                  Authorized Verifying Authority
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Issued On: {issuedDate}
                </p>
              </div>

              {/* Center Column: HMAC-SHA256 Ledger Box */}
              <div className="md:col-span-6 bg-slate-50 border border-slate-300 rounded p-3 text-left">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-700" />
                    Cryptographic Verification Record (HMAC-SHA256)
                  </span>
                  <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                    ACTIVE
                  </span>
                </div>
                <div className="font-mono text-[10px] text-slate-700 space-y-0.5 break-all leading-tight">
                  <div>CERT NO : {certificate.certificateNo}</div>
                  <div>ROLL NO : {studentRollNo}</div>
                  <div>
                    SHA-256 : {certificate.cryptoSignature}
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5 leading-snug">
                  Scan the QR code or visit the public verification portal (zero
                  login required) to validate cryptographic integrity.
                </p>
              </div>

              {/* Right Column: QR Code */}
              <div className="md:col-span-3 flex flex-col items-center md:items-end justify-end">
                <div className="p-1.5 bg-white border-2 border-slate-900 inline-block">
                  <img
                    src={qrImageSrc}
                    alt="Verification QR Code"
                    className="w-24 h-24 object-contain"
                  />
                </div>
                <span className="font-mono text-[10px] font-bold tracking-wider text-slate-900 mt-1">
                  SCAN TO VERIFY
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!isModal) {
    return certificateDocumentContent;
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white border border-slate-300 rounded shadow-xl max-w-5xl w-full overflow-hidden my-auto">
        {/* Top Modal Action Bar (Hidden when printing) */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-semibold text-white leading-none">
                Official Verifiable Credential — {certificate.certificateNo}
              </h3>
              <p className="text-[11px] font-mono text-slate-400 mt-1">
                HMAC-SHA256 Signed • Credit Weight: +{certificate.creditPoints}{' '}
                Pts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Copy Public Verification URL */}
            <button
              type="button"
              onClick={handleCopyVerifyLink}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied Link</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Verify Link</span>
                </>
              )}
            </button>

            {/* Open Public Verification Page */}
            <a
              href={verificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <span>Test Public Verifier</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>

            {/* Print / Save via Browser */}
            <button
              type="button"
              onClick={handlePrintCertificate}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden sm:inline">Print</span>
            </button>

            {/* Download Backend-Generated PDFKit File */}
            {fullPdfDownloadUrl && (
              <a
                href={fullPdfDownloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                download={`${certificate.certificateNo}.pdf`}
                className="px-3.5 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Official PDF</span>
              </a>
            )}

            {/* Close Modal Button */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-300 border border-slate-700 ml-1 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Certificate Rendering Canvas */}
        <div className="p-4 sm:p-8 bg-slate-100 max-h-[82vh] overflow-y-auto print:p-0 print:bg-white print:max-h-none">
          {certificateDocumentContent}
        </div>
      </div>
    </div>
  );
}