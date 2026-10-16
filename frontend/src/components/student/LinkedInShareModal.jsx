import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Award,
  Lock,
  Sparkles,
  Send,
  Link as LinkIcon,
} from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';

const ROLE_TEXT_MAP = {
  WINNER_1ST: '1st Place (Winner)',
  WINNER_2ND: '2nd Place (Runner-Up)',
  WINNER_3RD: '3rd Place (2nd Runner-Up)',
  FINALIST: 'Grand Finalist',
  ORGANIZER: 'Core Organizing Committee Member',
  VOLUNTEER: 'Official Student Volunteer',
  PARTICIPANT: 'Active Participant',
};

const SCOPE_TEXT_MAP = {
  INTRA_COLLEGE: 'Intra-College',
  INTER_COLLEGE: 'Inter-College',
  STATE: 'State-Level',
  NATIONAL: 'National-Level',
  INTERNATIONAL: 'International-Level',
};

/**
 * Modal for 1-Click LinkedIn Profile Certification Addition & Social Media Show-Off
 *
 * @param {Object} props
 * @param {Object} props.certificate - Certificate record with nested event details
 * @param {Object} props.student - Logged-in student user object
 * @param {Function} props.onClose - Callback to close modal
 */
export default function LinkedInShareModal({ certificate, student, onClose }) {
  const [linkedInAddUrl, setLinkedInAddUrl] = useState('');
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [copiedPost, setCopiedPost] = useState(false);
  const [copiedVerifyUrl, setCopiedVerifyUrl] = useState(false);

  if (!certificate) return null;

  const institutionName =
    'Swami Keshvanand Institute of Technology, Management & Gramothan (SKIT)';
  const eventTitle = certificate?.event?.title || 'Institutional Event';
  const roleLabel =
    ROLE_TEXT_MAP[certificate.participationRole] || certificate.participationRole;
  const scopeLabel =
    SCOPE_TEXT_MAP[certificate?.event?.scope] || 'Institutional';

  const verificationUrl =
    certificate.qrVerificationUrl ||
    `${window.location.origin}/verify/${certificate.certificateNo}?sig=${certificate.cryptoSignature}`;

  // Fetch official LinkedIn Add-to-Profile URL from backend (with fallback client builder)
  useEffect(() => {
    let isMounted = true;

    async function fetchLinkedInUrl() {
      setLoadingUrl(true);
      try {
        const res = await axiosInstance.get(
          `/certificates/${certificate.id}/linkedin-share`
        );
        if (isMounted && res.data?.linkedInShareUrl) {
          setLinkedInAddUrl(res.data.linkedInShareUrl);
          setLoadingUrl(false);
          return;
        }
      } catch (_) {
        // Fallback client-side URL construction if offline
      }

      if (isMounted) {
        const issueDate = new Date(certificate.issuedAt || Date.now());
        const params = new URLSearchParams({
          startType: 'CERTIFICATION',
          name: `${eventTitle} — ${roleLabel}`,
          organizationName: institutionName,
          issueYear: String(issueDate.getFullYear()),
          issueMonth: String(issueDate.getMonth() + 1).padStart(2, '0'),
          certId: certificate.certificateNo,
          certUrl: verificationUrl,
        });
        setLinkedInAddUrl(
          `https://www.linkedin.com/profile/add?${params.toString()}`
        );
        setLoadingUrl(false);
      }
    }

    fetchLinkedInUrl();
    return () => {
      isMounted = false;
    };
  }, [certificate, eventTitle, roleLabel, verificationUrl]);

  // Pre-composed high-impact professional LinkedIn / X post caption
  const defaultPostCaption = `I am pleased to share that I have been awarded an official cryptographically verified credential as "${roleLabel}" in ${eventTitle} (${scopeLabel}), organized at ${institutionName}.

• Credential ID: ${certificate.certificateNo}
• Activity Credit Weight: +${certificate.creditPoints} Points (Semester ${certificate.semester})
• Cryptographic Algorithm: HMAC-SHA256 Institutional Ledger

Verify this credential's authenticity (zero-login public verification):
${verificationUrl}

#VerifiedCredential #SKIT #Engineering #StudentAchievement #${(
    certificate?.event?.category || 'Technical'
  )
    .replace(/[^a-zA-Z0-9]/g, '')}`;

  const [postText, setPostText] = useState(defaultPostCaption);

  const handleCopyPostText = () => {
    navigator.clipboard.writeText(postText);
    setCopiedPost(true);
    setTimeout(() => setCopiedPost(false), 2200);
  };

  const handleCopyVerificationUrl = () => {
    navigator.clipboard.writeText(verificationUrl);
    setCopiedVerifyUrl(true);
    setTimeout(() => setCopiedVerifyUrl(false), 2200);
  };

  // Direct Social Feed Share Intents
  const linkedInFeedShareIntent = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    verificationUrl
  )}`;

  const twitterShareIntent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `Earned a cryptographically verified credential as ${roleLabel} in "${eventTitle}" (${certificate.certificateNo}). Verify live:`
  )}&url=${encodeURIComponent(verificationUrl)}`;

  const whatsappShareIntent = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    postText
  )}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-300 rounded shadow-xl max-w-2xl w-full overflow-hidden my-auto">
        {/* Top Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center">
              <Share2 className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white">
                Share &amp; Publish Verified Credential
              </h3>
              <p className="font-mono text-[11px] text-slate-400">
                CREDENTIAL ID: {certificate.certificateNo} • +{certificate.creditPoints} PTS
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
          {/* SECTION 1: 1-Click Official LinkedIn Certifications Integration */}
          <div className="bg-slate-50 border border-slate-200 rounded p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded mb-1.5">
                  <ShieldCheck className="w-3 h-3" />
                  Official LinkedIn Profile Integration
                </span>
                <h4 className="text-sm font-bold text-slate-900">
                  Add directly to LinkedIn &ldquo;Licenses &amp; Certifications&rdquo;
                </h4>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Automatically pre-fills your Certificate Title, Issuing Institution,
                  Credential ID (<span className="font-mono">{certificate.certificateNo}</span>),
                  and Public Cryptographic Verification Link on your LinkedIn profile.
                </p>
              </div>

              <a
                href={linkedInAddUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className={`shrink-0 bg-[#0A66C2] hover:bg-[#004182] text-white font-semibold px-4 py-2.5 rounded text-xs flex items-center justify-center gap-2 shadow-sm transition-colors ${
                  loadingUrl ? 'opacity-60 pointer-events-none' : ''
                }`}
              >
                <span>Add to LinkedIn Profile</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Pre-filled Metadata Preview Table */}
            <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block uppercase font-mono text-[10px]">
                  Credential ID
                </span>
                <span className="font-mono font-semibold text-slate-800">
                  {certificate.certificateNo}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-mono text-[10px]">
                  Distinction
                </span>
                <span className="font-semibold text-slate-800">{roleLabel}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-mono text-[10px]">
                  Credits Earned
                </span>
                <span className="font-mono font-semibold text-emerald-700">
                  +{certificate.creditPoints} Points
                </span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-mono text-[10px]">
                  Public Verifier
                </span>
                <span className="font-mono text-slate-700">Zero-Login QR</span>
              </div>
            </div>
          </div>

          {/* SECTION 2: Public Zero-Login Verification URL */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Public Recruiter Verification Link (No Login Required)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  readOnly
                  value={verificationUrl}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded font-mono text-xs text-slate-700 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleCopyVerificationUrl}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors"
              >
                {copiedVerifyUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy URL</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* SECTION 3: Ready-to-Post Social Media Show-Off Caption */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Pre-Written Social Media Announcement Caption (Editable)
              </label>
              <button
                type="button"
                onClick={handleCopyPostText}
                className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1"
              >
                {copiedPost ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Caption Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Caption Text</span>
                  </>
                )}
              </button>
            </div>

            <textarea
              rows={7}
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              className="w-full p-3 text-xs font-mono text-slate-800 bg-slate-50 border border-slate-300 rounded leading-relaxed focus:outline-none focus:bg-white focus:border-slate-900"
            />
          </div>

          {/* SECTION 4: Direct 1-Click Social Platform Share Buttons */}
          <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              Tip: Copy the caption above, then click a platform to publish:
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={linkedInFeedShareIntent}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleCopyPostText}
                className="px-3 py-2 rounded bg-[#0A66C2] hover:bg-[#004182] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Post on LinkedIn Feed</span>
              </a>

              <a
                href={twitterShareIntent}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <span>Share on X</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <a
                href={whatsappShareIntent}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <span>Share on WhatsApp</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}