import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderKanban,
  PlusCircle,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Download,
  Eye,
  RefreshCw,
  Calendar,
  Building2,
  ShieldCheck,
  Users,
  Award,
  X,
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import LiveCertificatePreview from '../components/certificate/LiveCertificatePreview';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

const EVENT_CATEGORIES = [
  { value: 'HACKATHON', label: 'Hackathon & Innovation' },
  { value: 'TECHNICAL', label: 'Technical & Engineering' },
  { value: 'SPORTS', label: 'Athletics & Sports' },
  { value: 'CULTURAL', label: 'Cultural & Literary Arts' },
  { value: 'NSS_SOCIAL', label: 'NSS & Community Service' },
  { value: 'WORKSHOP_SEMINAR', label: 'Academic Workshop & Seminar' },
];

const EVENT_SCOPES = [
  { value: 'INTRA_COLLEGE', label: 'Intra-College (1.0x Multiplier)' },
  { value: 'INTER_COLLEGE', label: 'Inter-College (1.5x Multiplier)' },
  { value: 'STATE', label: 'State Level (2.0x Multiplier)' },
  { value: 'NATIONAL', label: 'National Level (2.5x Multiplier)' },
  { value: 'INTERNATIONAL', label: 'International Level (3.0x Multiplier)' },
];

const PARTICIPATION_ROLES = [
  'PARTICIPANT',
  'VOLUNTEER',
  'ORGANIZER',
  'FINALIST',
  'WINNER_3RD',
  'WINNER_2ND',
  'WINNER_1ST',
];

const NAAC_CRITERIA_OPTIONS = [
  '5.3.1 - Awards/Medals in Sports & Cultural Activities',
  '3.2.2 - Workshops, Seminars & Innovation Hackathons',
  '3.4.3 - NSS / Social Extension & Community Outreach',
  '5.1.3 - Capacity Building & Technical Skill Enhancement',
];

export default function FacultyEventManager() {
  const { user } = useAuth();

  // Primary Data State
  const [events, setEvents] = useState([]);
  const [pendingClaims, setPendingClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Right-Column Tab: 'PENDING_QUEUE' | 'EVENTS_REGISTRY' | 'CSV_UPLOADER'
  const [activeTab, setActiveTab] = useState('PENDING_QUEUE');

  // Create Event Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('HACKATHON');
  const [scope, setScope] = useState('NATIONAL');
  const [eventDate, setEventDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [semesterTag, setSemesterTag] = useState('5');
  const [naacCriteriaTag, setNaacCriteriaTag] = useState(
    NAAC_CRITERIA_OPTIONS[1]
  );
  const [organizerDept, setOrganizerDept] = useState(
    user?.department || 'Information Technology'
  );
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [eventFeedback, setEventFeedback] = useState(null);

  // CSV Upload State
  const [selectedCsvEventId, setSelectedCsvEventId] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [csvUploadResult, setCsvUploadResult] = useState(null);

  // Pending Claims Review State
  const [roleOverrides, setRoleOverrides] = useState({});
  const [processingClaimId, setProcessingClaimId] = useState(null);
  const [reviewFeedback, setReviewFeedback] = useState(null);

  // Event Detail Inspector Modal State
  const [inspectedEvent, setInspectedEvent] = useState(null);
  const [loadingEventDetail, setLoadingEventDetail] = useState(false);
  const [previewCertModal, setPreviewCertModal] = useState(null);

  const fetchManagerData = useCallback(async () => {
    setLoading(true);
    try {
      const [eventsRes, pendingRes] = await Promise.all([
        axiosInstance.get('/events'),
        axiosInstance.get('/claims/pending'),
      ]);

      if (eventsRes.data?.events) {
        setEvents(eventsRes.data.events);
        // Initialize CSV event selector to first event the faculty owns
        const owned = eventsRes.data.events.filter(
          (ev) => user?.role === 'HOD_ADMIN' || ev.createdById === user?.id
        );
        if (!selectedCsvEventId && owned.length > 0) {
          setSelectedCsvEventId(owned[0].id);
        }
      }

      if (pendingRes.data?.pendingClaims) {
        setPendingClaims(pendingRes.data.pendingClaims);
      }
    } catch (error) {
      console.error('Error fetching faculty event manager data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCsvEventId, user?.id, user?.role]);

  useEffect(() => {
    fetchManagerData();
  }, [fetchManagerData]);

  // 1. Create Institutional Event Handler
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setCreatingEvent(true);
    setEventFeedback(null);

    try {
      const res = await axiosInstance.post('/events', {
        title,
        description,
        category,
        scope,
        eventDate,
        semesterTag: parseInt(semesterTag, 10),
        naacCriteriaTag,
        organizerDept,
      });

      if (res.data?.success) {
        setEventFeedback({
          type: 'success',
          message: `Event "${res.data.event.title}" created and added to institutional ledger.`,
        });
        setTitle('');
        setDescription('');
        await fetchManagerData();
        setSelectedCsvEventId(res.data.event.id);
      }
    } catch (error) {
      setEventFeedback({
        type: 'error',
        message:
          error.response?.data?.message || 'Failed to create institutional event.',
      });
    } finally {
      setCreatingEvent(false);
    }
  };

  // 2. Upload Master Participant CSV Roster Handler
  const handleCsvUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCsvEventId || !csvFile) return;

    setUploadingCsv(true);
    setCsvUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('rosterFile', csvFile);

      const res = await axiosInstance.post(
        `/events/${selectedCsvEventId}/upload-roster`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (res.data?.success) {
        setCsvUploadResult({
          type: 'success',
          message: res.data.message,
          stats: res.data.stats,
        });
        setCsvFile(null);
        await fetchManagerData();
      }
    } catch (error) {
      setCsvUploadResult({
        type: 'error',
        message:
          error.response?.data?.message ||
          'Failed to parse and process participant CSV file.',
      });
    } finally {
      setUploadingCsv(false);
    }
  };

  // Generate & Download a Sample CSV Roster for quick demo testing
  const handleDownloadSampleCsv = () => {
    const sampleCsvContent = [
      'roll_no,student_name,participation_role',
      '23ESKIT001,Aarav Sharma,WINNER_1ST',
      '23ESKIT014,Priya Verma,WINNER_2ND',
      '23ESKIT028,Kunal Meena,ORGANIZER',
      '23ESKIT045,Rohan Gupta,PARTICIPANT',
    ].join('\n');

    const blob = new Blob([sampleCsvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_event_participant_roster.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 3. 1-Click Approve / Reject Pending Claim Handler
  const handleReviewClaim = async (claim, action) => {
    let rejectionReason = null;
    if (action === 'REJECT') {
      rejectionReason = window.prompt(
        `Enter rejection reason for ${claim.student?.name} (${claim.student?.rollNo}):`,
        'Participation record could not be verified with event attendance sheet.'
      );
      if (rejectionReason === null) return; // Cancelled prompt
    }

    setProcessingClaimId(claim.id);
    setReviewFeedback(null);

    try {
      const overrideRole = roleOverrides[claim.id] || claim.claimedRole;
      const res = await axiosInstance.put(`/claims/${claim.id}/review`, {
        action,
        overrideRole,
        rejectionReason,
      });

      if (res.data?.success) {
        setReviewFeedback({
          type: action === 'APPROVE' ? 'success' : 'warning',
          message:
            action === 'APPROVE'
              ? `Approved ${claim.student?.name} (${claim.student?.rollNo}). Signed Certificate ${res.data.certificate?.certificateNo} generated!`
              : `Rejected participation claim for ${claim.student?.name}.`,
        });
        await fetchManagerData();
      }
    } catch (error) {
      setReviewFeedback({
        type: 'error',
        message:
          error.response?.data?.message || 'Failed to review participation claim.',
      });
    } finally {
      setProcessingClaimId(null);
    }
  };

  // 4. Inspect Event Roster & Issued Certificates Modal
  const handleInspectEvent = async (eventId) => {
    setLoadingEventDetail(true);
    try {
      const res = await axiosInstance.get(`/events/${eventId}`);
      if (res.data?.event) {
        setInspectedEvent(res.data.event);
      }
    } catch (error) {
      console.error('Failed to load event details:', error);
    } finally {
      setLoadingEventDetail(false);
    }
  };

  // FACULTY only manages events they created; HOD_ADMIN sees all events
  const myEvents = user?.role === 'HOD_ADMIN'
    ? events
    : events.filter((ev) => ev.createdById === user?.id);

  const totalCertificatesIssuedAcrossEvents = myEvents.reduce(
    (sum, ev) => sum + (ev._count?.certificates || 0),
    0
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* TOP FACULTY COMMAND HEADER */}
        <div className="bg-white border border-slate-200 rounded p-6 mb-8 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-slate-900 text-amber-400">
                  {user?.role} AUTHORITY
                </span>
                <span className="font-mono text-xs text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded">
                  {user?.department}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Institutional Event Registry, CSV Auto-Matcher &amp; Claim Verifier
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Create official events, upload master participant CSV rosters for zero-touch
                bulk certificate generation, or approve individual student claims with 1 click.
              </p>
            </div>

            {/* Quick KPI Counters */}
            <div className="grid grid-cols-3 gap-3 shrink-0">
              <div className="bg-slate-50 border border-slate-200 rounded px-4 py-2.5 text-center">
                <span className="font-mono text-[10px] uppercase text-slate-500 block">
                  {user?.role === 'HOD_ADMIN' ? 'All Events' : 'My Events'}
                </span>
                <span className="font-mono text-xl font-bold text-slate-900">
                  {myEvents.length}
                </span>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded px-4 py-2.5 text-center">
                <span className="font-mono text-[10px] uppercase text-amber-800 block">
                  Pending Claims
                </span>
                <span className="font-mono text-xl font-bold text-amber-900">
                  {pendingClaims.length}
                </span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded px-4 py-2.5 text-center">
                <span className="font-mono text-[10px] uppercase text-emerald-800 block">
                  Issued Certs
                </span>
                <span className="font-mono text-xl font-bold text-emerald-900">
                  {totalCertificatesIssuedAcrossEvents}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN 12-COLUMN WORKSPACE: LEFT (Create Event Form) + RIGHT (Verification & CSV Tabs) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT 4 COLUMNS: Create New Institutional Event */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold tracking-tight">
                  Register Institutional Event
                </h2>
              </div>
              <span className="font-mono text-[10px] text-slate-400 uppercase">
                NAAC Tagged
              </span>
            </div>

            <div className="p-5">
              {eventFeedback && (
                <div
                  className={`mb-4 p-3 rounded border text-xs flex items-start gap-2 ${eventFeedback.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-700'
                    }`}
                >
                  {eventFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <span>{eventFeedback.message}</span>
                </div>
              )}

              <form onSubmit={handleCreateEvent} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Event Official Title
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Smart India Internal Hackathon 2026"
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:border-slate-900"
                    >
                      {EVENT_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                      Event Scope
                    </label>
                    <select
                      value={scope}
                      onChange={(e) => setScope(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:border-slate-900"
                    >
                      {EVENT_SCOPES.map((sc) => (
                        <option key={sc.value} value={sc.value}>
                          {sc.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                      Conducted Date
                    </label>
                    <input
                      type="date"
                      required
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded focus:outline-none focus:border-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                      Target Semester
                    </label>
                    <select
                      value={semesterTag}
                      onChange={(e) => setSemesterTag(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:border-slate-900"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                        <option key={sem} value={sem}>
                          Semester {sem}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Organizing Department / Cell
                  </label>
                  <input
                    type="text"
                    required
                    value={organizerDept}
                    onChange={(e) => setOrganizerDept(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    NAAC / IQAC Accreditation Mapping
                  </label>
                  <select
                    value={naacCriteriaTag}
                    onChange={(e) => setNaacCriteriaTag(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:border-slate-900"
                  >
                    {NAAC_CRITERIA_OPTIONS.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Description / Objectives (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief summary of the competition or workshop..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:outline-none focus:border-slate-900"
                  />
                </div>

                <button
                  type="submit"
                  disabled={creatingEvent}
                  className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold py-2.5 px-4 rounded text-xs uppercase tracking-wider transition-colors"
                >
                  {creatingEvent ? 'Creating Event...' : 'Publish Official Event'}
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT 8 COLUMNS: Pending Claims Queue, Bulk CSV Auto-Matcher & Event Registry */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
            {/* Top Navigation Tabs */}
            <div className="border-b border-slate-200 bg-slate-50 px-5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-5 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('PENDING_QUEUE')}
                  className={`py-4 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${activeTab === 'PENDING_QUEUE'
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>1-Click Claim Approval Queue ({pendingClaims.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('CSV_UPLOADER')}
                  className={`py-4 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${activeTab === 'CSV_UPLOADER'
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Upload Master CSV Roster (Bulk Auto-Verify)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('EVENTS_REGISTRY')}
                  className={`py-4 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${activeTab === 'EVENTS_REGISTRY'
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                  <FolderKanban className="w-4 h-4 text-slate-600" />
                  <span>All Events &amp; Rosters ({myEvents.length})</span>
                </button>
              </div>

              <button
                type="button"
                onClick={fetchManagerData}
                className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-600"
                title="Refresh Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* TAB 1: 1-CLICK PENDING CLAIMS APPROVAL QUEUE */}
            {activeTab === 'PENDING_QUEUE' && (
              <div className="p-6">
                {reviewFeedback && (
                  <div
                    className={`mb-4 p-3 rounded border text-xs flex items-start gap-2.5 ${reviewFeedback.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : reviewFeedback.type === 'warning'
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : 'bg-red-50 border-red-200 text-red-700'
                      }`}
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{reviewFeedback.message}</span>
                  </div>
                )}

                {pendingClaims.length === 0 ? (
                  <div className="py-12 text-center bg-slate-50 border border-dashed border-slate-300 rounded p-6">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                    <h3 className="text-sm font-bold text-slate-800">
                      Zero Pending Claims in Queue
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                      All student participation claims have either been auto-verified via
                      Faculty CSV rosters or reviewed manually.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 font-mono text-[11px] uppercase text-slate-600">
                          <th className="py-3 px-4">Student Identity</th>
                          <th className="py-3 px-4">Event &amp; Notes</th>
                          <th className="py-3 px-4">Verify / Adjust Role</th>
                          <th className="py-3 px-4 text-right">1-Click Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-xs">
                        {pendingClaims.map((claim) => {
                          const isBusy = processingClaimId === claim.id;
                          const currentRole =
                            roleOverrides[claim.id] || claim.claimedRole;

                          return (
                            <tr key={claim.id} className="hover:bg-slate-50">
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-slate-900">
                                  {claim.student?.name}
                                </div>
                                <div className="font-mono text-[11px] text-slate-600 mt-0.5">
                                  {claim.student?.rollNo} • {claim.student?.department} (Sem{' '}
                                  {claim.student?.currentSemester})
                                </div>
                              </td>

                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-slate-900">
                                  {claim.event?.title}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {claim.event?.category} • {claim.event?.scope}
                                </div>
                                {claim.achievementNotes && (
                                  <div className="mt-1 text-[11px] italic text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                    &ldquo;{claim.achievementNotes}&rdquo;
                                  </div>
                                )}
                              </td>

                              <td className="py-3.5 px-4">
                                <select
                                  value={currentRole}
                                  onChange={(e) =>
                                    setRoleOverrides((prev) => ({
                                      ...prev,
                                      [claim.id]: e.target.value,
                                    }))
                                  }
                                  className="px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded bg-white focus:outline-none focus:border-slate-900"
                                >
                                  {PARTICIPATION_ROLES.map((r) => (
                                    <option key={r} value={r}>
                                      {r}
                                    </option>
                                  ))}
                                </select>
                              </td>

                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleReviewClaim(claim, 'APPROVE')}
                                    className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-400 text-white font-semibold text-xs flex items-center gap-1 transition-colors"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>
                                      {isBusy ? 'Issuing...' : 'Approve & Issue QR Cert'}
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleReviewClaim(claim, 'REJECT')}
                                    className="px-2.5 py-1.5 rounded bg-white hover:bg-red-50 text-red-700 border border-red-200 font-medium text-xs transition-colors"
                                  >
                                    Reject
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: BULK MASTER CSV ROSTER UPLOADER */}
            {activeTab === 'CSV_UPLOADER' && (
              <div className="p-6 space-y-6">
                <div className="bg-slate-50 border border-slate-200 rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Automated CSV Roster Verification &amp; Bulk Certificate Generator
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Upload a spreadsheet containing{' '}
                      <code className="font-mono bg-white px-1.5 py-0.5 border border-slate-200 rounded">
                        roll_no, student_name, participation_role
                      </code>
                      . Any registered student matching the CSV will immediately receive their
                      HMAC-SHA256 signed PDF certificate, and future student claims for this
                      event will auto-verify with zero manual intervention.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadSampleCsv}
                    className="shrink-0 px-3.5 py-2 rounded bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span>Download Sample CSV</span>
                  </button>
                </div>

                {csvUploadResult && (
                  <div
                    className={`p-4 rounded border text-xs ${csvUploadResult.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-red-50 border-red-200 text-red-800'
                      }`}
                  >
                    <div className="font-bold flex items-center gap-2">
                      {csvUploadResult.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span>{csvUploadResult.message}</span>
                    </div>

                    {csvUploadResult.stats && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-emerald-200 font-mono">
                        <div>
                          <span className="text-[10px] text-emerald-700 block uppercase">
                            Rows Parsed
                          </span>
                          <span className="text-sm font-bold">
                            {csvUploadResult.stats.totalRowsParsed}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-emerald-700 block uppercase">
                            Roster Saved
                          </span>
                          <span className="text-sm font-bold">
                            {csvUploadResult.stats.rosterSavedCount}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-emerald-700 block uppercase">
                            Pending Auto-Approved
                          </span>
                          <span className="text-sm font-bold">
                            {csvUploadResult.stats.pendingClaimsAutoVerified}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-emerald-700 block uppercase">
                            Direct Certs Issued
                          </span>
                          <span className="text-sm font-bold">
                            {csvUploadResult.stats.directCertificatesIssued}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <form onSubmit={handleCsvUploadSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      1. Select Target Event for Roster Upload
                    </label>
                    <select
                      required
                      value={selectedCsvEventId}
                      onChange={(e) => setSelectedCsvEventId(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:border-slate-900"
                    >
                      {myEvents.length === 0 ? (
                        <option value="" disabled>
                          No events created by you yet
                        </option>
                      ) : (
                        myEvents.map((ev) => (
                          <option key={ev.id} value={ev.id}>
                            {ev.title} ({ev.category} • Sem {ev.semesterTag})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      2. Attach Official Participant CSV File (.csv)
                    </label>
                    <div className="border-2 border-dashed border-slate-300 rounded bg-slate-50 p-6 text-center">
                      <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        required
                        onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                        className="block w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer max-w-xs mx-auto"
                      />
                      <p className="text-[11px] text-slate-500 mt-2 font-mono">
                        Accepted columns: roll_no, student_name, participation_role (e.g.
                        WINNER_1ST, PARTICIPANT, ORGANIZER)
                      </p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={uploadingCsv || !csvFile}
                    className="bg-amber-500 hover:bg-amber-400 disabled:bg-slate-300 text-slate-950 font-bold py-2.5 px-6 rounded text-xs uppercase tracking-wider flex items-center gap-2 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    <span>
                      {uploadingCsv
                        ? 'Parsing CSV & Generating Signed Certificates...'
                        : 'Upload Master CSV & Auto-Issue Certificates'}
                    </span>
                  </button>
                </form>
              </div>
            )}

            {/* TAB 3: ALL INSTITUTIONAL EVENTS & ROSTER INSPECTOR */}
            {activeTab === 'EVENTS_REGISTRY' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 font-mono text-[11px] uppercase text-slate-600">
                      <th className="py-3 px-4">Event Title &amp; NAAC Tag</th>
                      <th className="py-3 px-4">Category &amp; Scope</th>
                      <th className="py-3 px-4 text-center">Claims / Certs</th>
                      <th className="py-3 px-4 text-right">Roster &amp; Audit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {myEvents.map((ev) => (
                      <tr key={ev.id} className="hover:bg-slate-50">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{ev.title}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {ev.organizerDept} • Sem {ev.semesterTag} •{' '}
                            {new Date(ev.eventDate).toLocaleDateString()}
                          </div>
                          {ev.naacCriteriaTag && (
                            <span className="inline-block mt-1 font-mono text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                              NAAC: {ev.naacCriteriaTag}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono">
                          <div className="text-slate-800 font-semibold">{ev.category}</div>
                          <div className="text-[11px] text-slate-500">
                            {ev.scope.replace('_', ' ')}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                            {ev._count?.certificates || 0} Certs
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleInspectEvent(ev.id)}
                            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-400" />
                            <span>Inspect Roster &amp; Certs</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* EVENT ROSTER & CERTIFICATES INSPECTOR MODAL */}
      {inspectedEvent && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-300 rounded shadow-xl max-w-4xl w-full overflow-hidden my-auto">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-amber-400 block">
                  Event Participation &amp; CSV Roster Audit
                </span>
                <h3 className="text-base font-bold text-white">
                  {inspectedEvent.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectedEvent(null)}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Claims & Issued Certificates Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Verified Student Claims &amp; Issued Certificates (
                  {inspectedEvent.claims?.length || 0})
                </h4>
                <div className="border border-slate-200 rounded overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 font-mono text-[11px] uppercase text-slate-600">
                        <th className="py-2.5 px-3">Roll No</th>
                        <th className="py-2.5 px-3">Student Name</th>
                        <th className="py-2.5 px-3">Role</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Certificate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(inspectedEvent.claims || []).map((cl) => (
                        <tr key={cl.id}>
                          <td className="py-2.5 px-3 font-mono font-semibold">
                            {cl.student?.rollNo}
                          </td>
                          <td className="py-2.5 px-3">{cl.student?.name}</td>
                          <td className="py-2.5 px-3 font-mono">{cl.claimedRole}</td>
                          <td className="py-2.5 px-3 font-mono text-[11px]">
                            {cl.status}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            {cl.certificate ? (
                              <span className="text-emerald-700 font-bold">
                                {cl.certificate.certificateNo}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Uploaded CSV Roster Entries */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Uploaded Master CSV Roster Entries (
                  {inspectedEvent.csvRoster?.length || 0})
                </h4>
                <div className="border border-slate-200 rounded overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 font-mono text-[11px] uppercase text-slate-600">
                        <th className="py-2 px-3">Student Roll No</th>
                        <th className="py-2 px-3">CSV Name</th>
                        <th className="py-2 px-3">Designated Role</th>
                        <th className="py-2 px-3">Claim / Issue Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(inspectedEvent.csvRoster || []).map((row) => (
                        <tr key={row.id}>
                          <td className="py-2 px-3 font-mono font-bold">
                            {row.studentRollNo}
                          </td>
                          <td className="py-2 px-3">{row.studentName || '—'}</td>
                          <td className="py-2 px-3 font-mono">
                            {row.participationRole}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px]">
                            {row.isClaimed ? (
                              <span className="text-emerald-700 font-semibold">
                                VERIFIED &amp; ISSUED
                              </span>
                            ) : (
                              <span className="text-amber-700">
                                AWAITING STUDENT LOGIN
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {previewCertModal && (
        <LiveCertificatePreview
          certificate={previewCertModal}
          onClose={() => setPreviewCertModal(null)}
        />
      )}
    </div>
  );
}