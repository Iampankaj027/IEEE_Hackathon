import React, { useState } from 'react';
import {
  BarChart3, ChevronUp, ChevronDown, FileSpreadsheet, FileText,
  Lock, Unlock, RefreshCw, Users, CheckCircle2,
  AlertTriangle, Eye, Zap, X, Filter, TrendingUp, Award,
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Student360Drawer from '../components/faculty/Student360Drawer';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESETS = [
  {
    id: 'SODECA',
    label: 'SODECA / Co-Curricular',
    sub: '50 Marks · Target 100 Pts · Min 10',
    evaluationTitle: 'SODECA / Co-Curricular Assessment',
    maxMarks: 50, targetPoints: 100, baseMinMarks: 10,
  },
  {
    id: 'INTERNAL',
    label: 'Internal Activity Sessional',
    sub: '20 Marks · Target 60 Pts · Min 0',
    evaluationTitle: 'Internal Activity Sessional',
    maxMarks: 20, targetPoints: 60, baseMinMarks: 0,
  },
  {
    id: 'AICTE',
    label: 'AICTE 100-Point Mandate',
    sub: '100 Marks · Target 100 Pts · Min 0',
    evaluationTitle: 'AICTE 100-Point Mandate Assessment',
    maxMarks: 100, targetPoints: 100, baseMinMarks: 0,
  },
];

const BASE_DEPARTMENTS = [
  'Information Technology',
  'Computer Science & Engineering',
  'Electronics & Communication',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
];

const CAT_PILL = {
  TECHNICAL:        { label: 'Technical',   bg: 'bg-blue-50',   text: 'text-blue-800',   border: 'border-blue-200'    },
  HACKATHON:        { label: 'Hackathon',   bg: 'bg-violet-50', text: 'text-violet-800', border: 'border-violet-200'  },
  SPORTS:           { label: 'Sports',      bg: 'bg-emerald-50',text: 'text-emerald-800',border: 'border-emerald-200' },
  CULTURAL:         { label: 'Cultural',    bg: 'bg-amber-50',  text: 'text-amber-800',  border: 'border-amber-200'   },
  NSS_SOCIAL:       { label: 'NSS/Social',  bg: 'bg-rose-50',   text: 'text-rose-800',   border: 'border-rose-200'    },
  WORKSHOP_SEMINAR: { label: 'Workshops',   bg: 'bg-cyan-50',   text: 'text-cyan-800',   border: 'border-cyan-200'    },
};

const CAT_BAR_COLOR = {
  TECHNICAL: 'bg-blue-500',
  HACKATHON: 'bg-violet-500',
  SPORTS: 'bg-emerald-500',
  CULTURAL: 'bg-amber-500',
  NSS_SOCIAL: 'bg-rose-500',
  WORKSHOP_SEMINAR: 'bg-cyan-500',
};

const CAT_LABEL = {
  TECHNICAL: 'Technical & Engineering',
  HACKATHON: 'Hackathons & Innovation',
  SPORTS: 'Athletics & Sports',
  CULTURAL: 'Cultural & Literary',
  NSS_SOCIAL: 'NSS & Social Outreach',
  WORKSHOP_SEMINAR: 'Workshops & Seminars',
};

const SCOPE_CONFIG = [
  { key: 'INTERNATIONAL', label: 'International',    color: 'bg-violet-500', tag: 'bg-violet-100 text-violet-800 border-violet-200'  },
  { key: 'NATIONAL',      label: 'National',          color: 'bg-blue-500',   tag: 'bg-blue-100 text-blue-800 border-blue-200'        },
  { key: 'STATE',         label: 'State / Regional',  color: 'bg-amber-500',  tag: 'bg-amber-100 text-amber-800 border-amber-200'     },
  { key: 'INTER_COLLEGE', label: 'Inter-College',     color: 'bg-emerald-500',tag: 'bg-emerald-100 text-emerald-800 border-emerald-200'},
  { key: 'INTRA_COLLEGE', label: 'Intra-College',     color: 'bg-slate-400',  tag: 'bg-slate-100 text-slate-700 border-slate-200'     },
];

const RANK_STYLE = [
  { rank: '#1', bg: 'bg-amber-50',  border: 'border-amber-200',  textColor: 'text-amber-900', ringColor: 'bg-amber-400'  },
  { rank: '#2', bg: 'bg-slate-50',  border: 'border-slate-200',  textColor: 'text-slate-700', ringColor: 'bg-slate-400'  },
  { rank: '#3', bg: 'bg-orange-50', border: 'border-orange-200', textColor: 'text-orange-900',ringColor: 'bg-orange-500' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function FacultyMarksPortal() {
  const { user } = useAuth();

  // Filter state
  const [department, setDepartment] = useState('ALL');
  const [semester, setSemester]     = useState('ALL');
  const [section, setSection]       = useState('ALL');

  // Assessment configuration
  const [evaluationTitle, setEvaluationTitle] = useState('SODECA / Co-Curricular Assessment');
  const [maxMarks, setMaxMarks]               = useState(50);
  const [targetPoints, setTargetPoints]       = useState(100);
  const [baseMinMarks, setBaseMinMarks]       = useState(10);

  // Client-side filters
  const [activityDomain, setActivityDomain] = useState('ALL');
  const [cohortFilter, setCohortFilter]     = useState('ALL');

  // Sort
  const [sortBy, setSortBy]   = useState('rollNo');
  const [sortDir, setSortDir] = useState('asc');

  // Data
  const [students, setStudents]       = useState([]);
  const [analytics, setAnalytics]     = useState(null);
  const [localMarks, setLocalMarks]   = useState({});
  const [unlockedIds, setUnlockedIds] = useState(new Set());

  // UI panels
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [showNaac, setShowNaac]           = useState(false);
  const [drawer360Student, setDrawer360Student] = useState(null);

  // Status
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [savingIds, setSavingIds]   = useState(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const getLocalMark   = (id, fallback)      => localMarks[id]?.finalMarksAllotted ?? fallback;
  const getLocalRemark = (id, fallback = '') => localMarks[id]?.remarks ?? fallback;

  const calcRecommended = (pts) => {
    if (pts <= 0) return baseMinMarks;
    return Math.min(maxMarks, Math.max(baseMinMarks, Math.ceil((pts / targetPoints) * maxMarks)));
  };

  const flashSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const handleSort = (col) => {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortDir('asc'); }
  };

  const applyPreset = (p) => {
    setEvaluationTitle(p.evaluationTitle);
    setMaxMarks(p.maxMarks);
    setTargetPoints(p.targetPoints);
    setBaseMinMarks(p.baseMinMarks);
  };

  // ─── Computed display rows ─────────────────────────────────────────────────

  let displayRows = [...students];

  if (activityDomain !== 'ALL') {
    displayRows = displayRows.filter((s) => (s.categoryCounts[activityDomain] || 0) > 0);
  }

  switch (cohortFilter) {
    case 'ACTIVE':  displayRows = displayRows.filter((s) => s.verifiedCertsCount > 0); break;
    case 'ZERO':    displayRows = displayRows.filter((s) => s.verifiedCertsCount === 0); break;
    case 'TOP':     displayRows = displayRows.filter((s) => s.totalCreditPoints >= targetPoints); break;
    case 'PENDING': displayRows = displayRows.filter((s) => !(s.isLocked && !unlockedIds.has(s.studentId))); break;
    case 'LOCKED':  displayRows = displayRows.filter((s) => s.isLocked && !unlockedIds.has(s.studentId)); break;
    default: break;
  }

  displayRows.sort((a, b) => {
    let av, bv;
    if      (sortBy === 'rollNo') { av = a.rollNo; bv = b.rollNo; }
    else if (sortBy === 'name')   { av = a.name;   bv = b.name;   }
    else if (sortBy === 'certs')  { av = a.verifiedCertsCount; bv = b.verifiedCertsCount; }
    else if (sortBy === 'points') { av = a.totalCreditPoints;  bv = b.totalCreditPoints;  }
    else {
      av = getLocalMark(a.studentId, a.finalMarksAllotted);
      bv = getLocalMark(b.studentId, b.finalMarksAllotted);
    }
    if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortDir === 'asc' ? av - bv : bv - av;
  });

  // Derived counts
  const lockedCount   = students.filter((s) => s.isLocked && !unlockedIds.has(s.studentId)).length;
  const topCount      = students.filter((s) => s.totalCreditPoints >= targetPoints).length;
  const totalPtsSum   = students.reduce((sum, s) => sum + s.totalCreditPoints, 0);
  const totalCatSum   = analytics ? Object.values(analytics.categoryTotals || {}).reduce((a, b) => a + b, 0) : 0;
  const totalScopeSum = analytics ? Object.values(analytics.scopeTotals || {}).reduce((a, b) => a + b, 0) : 0;

  const availableDepartments = [
    ...new Set([...BASE_DEPARTMENTS, ...(analytics?.distinctDepartments || [])]),
  ].sort();

  const activePreset = PRESETS.find(
    (p) => p.evaluationTitle === evaluationTitle && p.maxMarks === maxMarks && p.targetPoints === targetPoints
  ) || null;

  // ─── Data loading ──────────────────────────────────────────────────────────

  const loadMatrix = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError('');
    try {
      const res = await axiosInstance.get('/faculty/grading/matrix', {
        params: { department, semester, section, maxMarks, targetPoints, baseMinMarks },
      });
      const rows = res.data.studentRows || [];
      setStudents(rows);
      setAnalytics(res.data.analyticsSummary || null);

      const marks = {};
      rows.forEach((s) => {
        marks[s.studentId] = { finalMarksAllotted: s.finalMarksAllotted, remarks: s.remarks || '' };
      });
      setLocalMarks(marks);
      setUnlockedIds(new Set());
      setCohortFilter('ALL');
      setActivityDomain('ALL');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load grading matrix.');
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  // ─── Save handlers ─────────────────────────────────────────────────────────

  const handleSaveSingle = async (student) => {
    const semToSave = semester === 'ALL' ? student.currentSemester : parseInt(semester, 10);
    const mark      = getLocalMark(student.studentId, student.finalMarksAllotted);
    const remark    = getLocalRemark(student.studentId, student.remarks);

    setSavingIds((prev) => new Set([...prev, student.studentId]));
    try {
      await axiosInstance.post('/faculty/grading/save', {
        studentId: student.studentId,
        semester: semToSave,
        evaluationTitle, maxMarks, targetPoints, baseMinMarks,
        finalMarksAllotted: mark,
        remarks: remark,
      });
      setStudents((prev) =>
        prev.map((s) =>
          s.studentId === student.studentId
            ? { ...s, isLocked: true, finalMarksAllotted: mark, remarks: remark }
            : s
        )
      );
      setUnlockedIds((prev) => { const n = new Set(prev); n.delete(student.studentId); return n; });
      flashSuccess('Assessment locked successfully.');
    } catch (e) {
      setError(e.response?.data?.message || 'Save failed. Try again.');
    } finally {
      setSavingIds((prev) => { const n = new Set(prev); n.delete(student.studentId); return n; });
    }
  };

  const handleSyncToFormula = () => {
    setLocalMarks((prev) => {
      const upd = { ...prev };
      displayRows.forEach((s) => {
        upd[s.studentId] = { ...upd[s.studentId], finalMarksAllotted: calcRecommended(s.totalCreditPoints) };
      });
      return upd;
    });
    flashSuccess(`Synced ${displayRows.length} rows to formula.`);
  };

  const handleLockAll = async () => {
    const toSave = displayRows.map((s) => ({
      studentId: s.studentId,
      semester: semester === 'ALL' ? s.currentSemester : parseInt(semester, 10),
      finalMarksAllotted: getLocalMark(s.studentId, s.finalMarksAllotted),
      remarks: getLocalRemark(s.studentId, s.remarks),
    }));

    setBulkSaving(true);
    try {
      const res = await axiosInstance.post('/faculty/grading/bulk-save', {
        assessments: toSave, evaluationTitle, maxMarks, targetPoints, baseMinMarks,
      });
      await loadMatrix(false);
      flashSuccess(`${res.data.saved} assessments locked.`);
    } catch (e) {
      setError(e.response?.data?.message || 'Bulk lock failed.');
    } finally {
      setBulkSaving(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Roll No', 'Name', 'Department', 'Semester', 'Section',
      'Verified Certs', 'Credit Points', 'Recommended', 'Final Marks', 'Remarks', 'Status',
    ];
    const rows = displayRows.map((s) => [
      s.rollNo, s.name, s.department, s.currentSemester, s.section || 'A',
      s.verifiedCertsCount, s.totalCreditPoints, calcRecommended(s.totalCreditPoints),
      getLocalMark(s.studentId, s.finalMarksAllotted),
      getLocalRemark(s.studentId, s.remarks),
      s.isLocked && !unlockedIds.has(s.studentId) ? 'Locked' : 'Pending',
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VeriCred_Grades_${department}_Sem${semester}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    const params = new URLSearchParams({
      department, semester, section, maxMarks, targetPoints, baseMinMarks, evaluationTitle,
    }).toString();
    const token = localStorage.getItem('vericred_token');
    const base  = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    fetch(`${base}/faculty/grading/export-excel?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `VeriCred_Assessment_${department}_Sem${semester}.xlsx`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      })
      .catch(() => setError('Excel export failed. Ensure the backend server is running.'));
  };

  // ─── Sort header renderer ──────────────────────────────────────────────────

  const renderSortTh = (col, label) => (
    <th key={col} className="px-3 py-3 text-left cursor-pointer select-none group"
      onClick={() => handleSort(col)}>
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 group-hover:text-white transition-colors">
        <span>{label}</span>
        {sortBy === col
          ? (sortDir === 'asc'
            ? <ChevronUp   className="w-3.5 h-3.5 text-amber-400" />
            : <ChevronDown className="w-3.5 h-3.5 text-amber-400" />)
          : <ChevronDown className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40" />}
      </div>
    </th>
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <div className="max-w-screen-2xl mx-auto px-4 py-6 space-y-4">

        {/* Page Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-slate-400">
              VERICRED · INSTITUTIONAL INTELLIGENCE ENGINE · SKIT021
            </p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
              Centralized Grading, Analytics & NAAC Reporting Portal
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Cross-departmental participation analytics, accreditation-ready NAAC/IQAC reporting, and smart formula-driven grading.
            </p>
          </div>
          {successMsg && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded text-xs font-medium shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              {successMsg}
            </div>
          )}
        </div>

        {/* ── 1. Assessment Preset Bar ── */}
        <div className="bg-white border border-slate-200 rounded p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 shrink-0">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Assessment Preset
            </div>
            {PRESETS.map((p) => (
              <button key={p.id} type="button" onClick={() => applyPreset(p)}
                className={`px-3.5 py-2 rounded border text-xs font-medium transition-all flex flex-col items-start ${
                  activePreset?.id === p.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-300 hover:border-slate-500 hover:bg-slate-50'
                }`}>
                <span className="font-semibold">{p.label}</span>
                <span className={`font-mono text-[10px] mt-0.5 ${activePreset?.id === p.id ? 'text-slate-400' : 'text-slate-400'}`}>
                  {p.sub}
                </span>
              </button>
            ))}
            <div className="ml-auto flex items-center gap-3 text-xs font-mono text-slate-500 shrink-0">
              <span>Max <strong className="text-slate-900">{maxMarks}</strong></span>
              <span className="text-slate-300">|</span>
              <span>Target <strong className="text-slate-900">{targetPoints} pts</strong></span>
              <span className="text-slate-300">|</span>
              <span>Min <strong className="text-slate-900">{baseMinMarks}</strong></span>
            </div>
          </div>
        </div>

        {/* ── 2. Multi-Filter Control Deck ── */}
        <div className="bg-white border border-slate-200 rounded p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Multi-Department & Cross-Silo Filter Control Deck
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Department</label>
              <select value={department} onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:border-slate-900">
                <option value="ALL">All Departments — Institution Wide</option>
                {availableDepartments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Semester</label>
              <select value={semester} onChange={(e) => setSemester(e.target.value)}
                className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:border-slate-900">
                <option value="ALL">All Semesters — Cumulative</option>
                {[1,2,3,4,5,6,7,8].map((n) => <option key={n} value={String(n)}>Semester {n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Section</label>
              <select value={section} onChange={(e) => setSection(e.target.value)}
                className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:border-slate-900">
                <option value="ALL">All Sections</option>
                {['A','B','C','D'].map((s) => <option key={s} value={s}>Section {s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Activity Domain Filter</label>
              <select value={activityDomain} onChange={(e) => setActivityDomain(e.target.value)}
                className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:border-slate-900">
                <option value="ALL">All Domains</option>
                <option value="TECHNICAL">Technical & Engineering</option>
                <option value="HACKATHON">Hackathons & Innovation</option>
                <option value="SPORTS">Athletics & Sports</option>
                <option value="CULTURAL">Cultural & Literary</option>
                <option value="NSS_SOCIAL">NSS / Social Outreach</option>
                <option value="WORKSHOP_SEMINAR">Workshops & Seminars</option>
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <button type="button" onClick={() => loadMatrix()} disabled={loading}
                className="w-full px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs font-semibold rounded transition-colors flex items-center justify-center gap-2">
                {loading
                  ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Loading...</>
                  : <><Users className="w-3.5 h-3.5" />Load Class Matrix</>}
              </button>
            </div>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => setError('')}>
              <X className="w-4 h-4 text-red-400 hover:text-red-700" />
            </button>
          </div>
        )}

        {/* ── Data-dependant sections ── */}
        {students.length > 0 && analytics && (
          <>

            {/* ═══════════════════════════════════════════════════════════
                3. INSTITUTIONAL ANALYTICS & NAAC INTELLIGENCE DASHBOARD
            ═══════════════════════════════════════════════════════════ */}
            <div className="bg-white border border-slate-200 rounded overflow-hidden">
              <button type="button" onClick={() => setShowAnalytics((v) => !v)}
                className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-900 hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <BarChart3 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-white">
                    Institutional Participation Analytics & NAAC Intelligence
                  </span>
                  <span className="font-mono text-[10px] bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded">
                    {analytics.totalStudents} enrolled · {analytics.totalVerifiedCertificates} certs · {analytics.participationCoveragePercent}% coverage
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${showAnalytics ? 'rotate-180' : ''}`} />
              </button>

              {showAnalytics && (
                <div className="p-5 space-y-5">

                  {/* 3A. 4 Executive KPI Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

                    {/* KPI 1: Participation Coverage Rate */}
                    <div className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Participation Coverage</p>
                        <Users className="w-3.5 h-3.5 text-slate-300" />
                      </div>
                      <div className="text-3xl font-bold font-mono text-slate-900 leading-none">
                        {analytics.participationCoveragePercent}
                        <span className="text-lg font-normal text-slate-400">%</span>
                      </div>
                      <div className="mt-2.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${analytics.participationCoveragePercent}%` }} />
                      </div>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                          <span className="text-slate-500">{analytics.activeParticipantsCount} active students</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                          <span className="text-rose-600 font-medium">{analytics.zeroActivityCount} at-risk / zero records</span>
                        </div>
                      </div>
                    </div>

                    {/* KPI 2: Verified Activity Volume */}
                    <div className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Verified Activity Volume</p>
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-300" />
                      </div>
                      <div className="text-3xl font-bold font-mono text-slate-900 leading-none">
                        {analytics.totalVerifiedCertificates}
                        <span className="text-base font-normal text-slate-400 ml-1">certs</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-2 space-y-0.5">
                        <div>
                          <span className="font-mono font-bold text-slate-800">{totalPtsSum.toLocaleString()}</span>
                          {' '}total institutional credit points
                        </div>
                        <div>Avg <span className="font-mono font-bold text-slate-800">{analytics.averageCreditPoints}</span> pts / student</div>
                      </div>
                    </div>

                    {/* KPI 3: Credit Score Distribution */}
                    <div className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Credit Score Distribution</p>
                        <TrendingUp className="w-3.5 h-3.5 text-slate-300" />
                      </div>
                      <div className="text-3xl font-bold font-mono text-emerald-700 leading-none">
                        {analytics.averageCreditPoints}
                        <span className="text-base font-normal text-slate-400 ml-1">avg pts</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-2 space-y-0.5">
                        <div>Top score: <span className="font-mono font-bold text-slate-800">{analytics.highestCreditPoints} pts</span></div>
                        <div>
                          Target achievers: <span className="font-mono font-bold text-amber-700">{analytics.targetAchievementRate}%</span>
                          <span className="text-slate-400"> ({analytics.targetAchieversCount}/{analytics.totalStudents})</span>
                        </div>
                      </div>
                    </div>

                    {/* KPI 4: Assessment Lock Status */}
                    <div className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Assessment Lock Status</p>
                        <Lock className="w-3.5 h-3.5 text-slate-300" />
                      </div>
                      <div className="text-3xl font-bold font-mono text-slate-900 leading-none">
                        {lockedCount}
                        <span className="text-base font-normal text-slate-400">/{students.length}</span>
                      </div>
                      <div className="mt-2.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-800 rounded-full transition-all"
                          style={{ width: students.length > 0 ? `${(lockedCount / students.length) * 100}%` : '0%' }} />
                      </div>
                      <div className="text-[11px] text-slate-500 mt-2">
                        {students.length - lockedCount} students pending evaluation
                      </div>
                    </div>
                  </div>

                  {/* 3B. Visual Category Distribution Bar */}
                  {totalCatSum > 0 && (
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-2">
                        Activity Category Distribution — {totalCatSum} total certificates across 6 institutional pillars
                      </p>
                      <div className="h-5 rounded-full overflow-hidden flex bg-slate-100">
                        {Object.entries(analytics.categoryTotals).map(([cat, count]) => {
                          const pct = (count / totalCatSum) * 100;
                          return pct > 0 ? (
                            <div key={cat} style={{ width: `${pct}%` }}
                              className={`h-full ${CAT_BAR_COLOR[cat]} transition-all`}
                              title={`${CAT_LABEL[cat]}: ${count} (${pct.toFixed(1)}%)`} />
                          ) : null;
                        })}
                      </div>
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                        {Object.entries(analytics.categoryTotals).map(([cat, count]) => {
                          const pct = totalCatSum > 0 ? ((count / totalCatSum) * 100).toFixed(0) : 0;
                          const cfg = CAT_PILL[cat];
                          const isActive = activityDomain === cat;
                          return (
                            <button key={cat} type="button"
                              onClick={() => setActivityDomain(isActive ? 'ALL' : cat)}
                              className={`flex items-center gap-2 p-2.5 rounded border text-left transition-all ${
                                isActive
                                  ? `${cfg.bg} ${cfg.border} ring-1 ring-inset ring-current`
                                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                              }`}>
                              <div className={`w-2.5 h-2.5 rounded-sm shrink-0 ${CAT_BAR_COLOR[cat]}`} />
                              <div>
                                <div className={`text-[10px] font-semibold leading-tight ${isActive ? cfg.text : 'text-slate-700'}`}>
                                  {cfg.label}
                                </div>
                                <div className="font-mono text-[10px] text-slate-500">{count} ({pct}%)</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 3C + 3D. Scope Breakdown + Top Performers + At-Risk Alert */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                    {/* 3C. Scope & Level Breakdown — NIRF / NBA Accreditation Impact View */}
                    <div className="lg:col-span-2 border border-slate-200 rounded-lg p-4">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-3">
                        Achievement Scope & Level Breakdown — NIRF / NBA Accreditation Impact View
                      </p>
                      {totalScopeSum === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4">No scope data available yet.</p>
                      ) : (
                        <div className="space-y-2.5">
                          {SCOPE_CONFIG.map(({ key, label, color, tag }) => {
                            const count = analytics.scopeTotals?.[key] || 0;
                            const pct   = totalScopeSum > 0 ? (count / totalScopeSum) * 100 : 0;
                            return (
                              <div key={key} className="flex items-center gap-3">
                                <div className="w-32 shrink-0">
                                  <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border ${tag}`}>
                                    {label}
                                  </span>
                                </div>
                                <div className="flex-1 h-3.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className={`h-full ${color} rounded-full transition-all`}
                                    style={{ width: `${pct}%` }} />
                                </div>
                                <div className="w-28 text-right font-mono text-[10px] text-slate-600 shrink-0">
                                  {count} certs · <span className="text-slate-400">{pct.toFixed(1)}%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div className="mt-3 text-[10px] text-slate-400 font-mono">
                        <span className="font-bold text-slate-600">{totalScopeSum}</span> total verified certificates tracked across all achievement levels
                      </div>
                    </div>

                    {/* 3D. Top 3 Performers + At-Risk Alert */}
                    <div className="space-y-3">

                      {/* Top 3 Performers Leaderboard */}
                      <div className="border border-slate-200 rounded-lg p-4">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-2.5">
                          Top 3 Performers — Most Active Students
                        </p>
                        <div className="space-y-2">
                          {(analytics.topPerformers || []).length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-3">No active students yet.</p>
                          ) : (
                            (analytics.topPerformers || []).map((performer, idx) => {
                              const style = RANK_STYLE[idx] || RANK_STYLE[2];
                              const fullStudent = students.find((s) => s.studentId === performer.studentId);
                              return (
                                <div key={performer.studentId}
                                  className={`flex items-center gap-2.5 p-2.5 rounded border ${style.bg} ${style.border}`}>
                                  <div className={`w-7 h-7 rounded-full ${style.ringColor} flex items-center justify-center shrink-0`}>
                                    <span className="font-mono text-[9px] font-bold text-white">{style.rank}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className={`text-[11px] font-semibold truncate ${style.textColor}`}>
                                      {performer.name}
                                    </div>
                                    <div className="font-mono text-[10px] text-slate-500 flex items-center gap-1.5">
                                      <span>{performer.rollNo}</span>
                                      <span className="text-slate-300">·</span>
                                      <span className="font-bold text-slate-700">{performer.totalCreditPoints} pts</span>
                                      <span className="text-slate-300">·</span>
                                      <span>{performer.verifiedCertsCount} certs</span>
                                    </div>
                                  </div>
                                  {fullStudent && (
                                    <button type="button"
                                      onClick={() => setDrawer360Student(fullStudent)}
                                      className="shrink-0 p-1 rounded hover:bg-white/70 transition-colors"
                                      title="Open 360° Activity Record">
                                      <Eye className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700" />
                                    </button>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* At-Risk Alert Strip */}
                      {analytics.zeroActivityCount > 0 && (
                        <div className="border border-rose-200 rounded-lg p-4 bg-rose-50">
                          <div className="flex items-start gap-2.5">
                            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-[11px] font-bold text-rose-800">At-Risk Students Alert</p>
                              <p className="text-[11px] text-rose-600 mt-1 leading-relaxed">
                                <span className="font-mono font-bold">{analytics.zeroActivityCount}</span> students
                                have zero verified activity — counselling or mentorship recommended.
                              </p>
                              <button type="button" onClick={() => setCohortFilter('ZERO')}
                                className="mt-2.5 text-[11px] font-semibold text-rose-700 hover:text-rose-900 underline underline-offset-2 transition-colors">
                                → Filter At-Risk Students in Table
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ═══════════════════════════════════════════════════════════
                4. NAAC / IQAC ACCREDITATION CRITERIA SUMMARY MATRIX
            ═══════════════════════════════════════════════════════════ */}
            <div className="bg-white border border-slate-200 rounded overflow-hidden">
              <button type="button" onClick={() => setShowNaac((v) => !v)}
                className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-900 hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-2.5">
                  <Award className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-white">
                    NAAC / IQAC Accreditation Criteria Summary Matrix
                  </span>
                  {(analytics.naacCriteriaSummary || []).length > 0 && (
                    <span className="font-mono text-[10px] bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded">
                      {(analytics.naacCriteriaSummary || []).length} criteria mapped
                    </span>
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${showNaac ? 'rotate-180' : ''}`} />
              </button>

              {showNaac && (
                <div className="p-5">
                  {(analytics.naacCriteriaSummary || []).length === 0 ? (
                    <div className="text-center py-8">
                      <Award className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      <p className="text-sm text-slate-500 font-medium">No NAAC Criteria Tags Found</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        Set <code className="bg-slate-100 px-1 rounded text-slate-600">naacCriteriaTag</code> when creating events
                        (e.g., "5.3.1 - Sports/Cultural", "3.2.2 - Workshops") to populate this matrix.
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-slate-500 mb-3">
                        Verified student participation records mapped to NAAC/NBA accreditation criteria —
                        for use by your IQAC coordinator in annual self-study reports.
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs min-w-[500px]">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-200">
                              <th className="px-3 py-2.5 text-left font-semibold text-slate-600 uppercase tracking-wider text-[10px]">
                                NAAC Criterion / Category Tag
                              </th>
                              <th className="px-3 py-2.5 text-center font-semibold text-slate-600 uppercase tracking-wider text-[10px] w-28">
                                Verified Records
                              </th>
                              <th className="px-3 py-2.5 text-center font-semibold text-slate-600 uppercase tracking-wider text-[10px] w-20">
                                % Share
                              </th>
                              <th className="px-3 py-2.5 text-left font-semibold text-slate-600 uppercase tracking-wider text-[10px]">
                                Coverage
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(analytics.naacCriteriaSummary || []).map(({ tag, count }, idx) => {
                              const pct = analytics.totalVerifiedCertificates > 0
                                ? (count / analytics.totalVerifiedCertificates) * 100
                                : 0;
                              const isUncategorized = tag === 'Uncategorized / Not Mapped';
                              return (
                                <tr key={tag} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                                  <td className="px-3 py-2.5">
                                    <span className={`font-mono text-xs font-medium ${isUncategorized ? 'text-slate-400 italic' : 'text-slate-800'}`}>
                                      {tag}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5 text-center">
                                    <span className="font-mono font-bold text-slate-900">{count}</span>
                                  </td>
                                  <td className="px-3 py-2.5 text-center">
                                    <span className={`font-mono text-xs ${isUncategorized ? 'text-slate-400' : 'text-slate-600'}`}>
                                      {pct.toFixed(1)}%
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[200px]">
                                      <div className={`h-full rounded-full transition-all ${isUncategorized ? 'bg-slate-300' : 'bg-slate-700'}`}
                                        style={{ width: `${pct}%` }} />
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="bg-slate-100 border-t border-slate-200">
                              <td className="px-3 py-2.5 font-semibold text-slate-700 text-xs">Total</td>
                              <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-900">{analytics.totalVerifiedCertificates}</td>
                              <td className="px-3 py-2.5 text-center font-mono text-slate-600 text-xs">100%</td>
                              <td className="px-3 py-2.5" />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ═══════════════════════════════════════════════════════════
                5. COHORT FILTER PILLS + BULK ACTION TOOLBAR
            ═══════════════════════════════════════════════════════════ */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              {/* Quick Cohort Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'ALL',     label: `All Students (${students.length})` },
                  { id: 'ACTIVE',  label: `Active ≥1 Cert (${analytics.activeParticipantsCount})` },
                  { id: 'ZERO',    label: `At-Risk / Zero (${analytics.zeroActivityCount})`, danger: true },
                  { id: 'TOP',     label: `Met Target (${topCount})`, highlight: true },
                  { id: 'PENDING', label: `Pending Lock (${students.length - lockedCount})` },
                  { id: 'LOCKED',  label: `Locked (${lockedCount})` },
                ].map((f) => (
                  <button key={f.id} type="button" onClick={() => setCohortFilter(f.id)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                      cohortFilter === f.id
                        ? f.danger    ? 'bg-rose-700   text-white border-rose-700'
                        : f.highlight ? 'bg-amber-600  text-white border-amber-600'
                        :               'bg-slate-900  text-white border-slate-900'
                        : f.danger    ? 'bg-white text-rose-600  border-rose-200  hover:bg-rose-50'
                        : f.highlight ? 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
                        :               'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    }`}>
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Bulk Action Toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                <button type="button" onClick={handleSyncToFormula}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-700 transition-colors">
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                  Sync All to Formula
                </button>
                <button type="button" onClick={handleLockAll} disabled={bulkSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded transition-colors">
                  <Lock className="w-3.5 h-3.5" />
                  {bulkSaving ? 'Locking...' : `Lock All Filtered (${displayRows.length})`}
                </button>
                <button type="button" onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-700 transition-colors">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  Instant Filtered CSV
                </button>
                <button type="button" onClick={handleExportExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded transition-colors">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Institutional Excel (.xlsx)
                </button>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════
                6. SORTABLE HIGH-DENSITY GRADING TABLE
            ═══════════════════════════════════════════════════════════ */}
            <div className="bg-white border border-slate-200 rounded overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[920px]">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800">
                      {renderSortTh('rollNo', 'Roll No')}
                      {renderSortTh('name',   'Student')}
                      {renderSortTh('certs',  'Certs')}
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Activity Breakdown
                      </th>
                      {renderSortTh('points', 'Credits')}
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Rec.
                      </th>
                      {renderSortTh('marks', 'Final Marks')}
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Remarks
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayRows.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="px-4 py-10 text-center text-sm text-slate-400">
                          No students match the current filters.
                        </td>
                      </tr>
                    ) : (
                      displayRows.map((student, idx) => {
                        const isLocked    = student.isLocked && !unlockedIds.has(student.studentId);
                        const isSaving    = savingIds.has(student.studentId);
                        const currentMark = getLocalMark(student.studentId, student.finalMarksAllotted);
                        const currentRem  = getLocalRemark(student.studentId, student.remarks);
                        const recMark     = calcRecommended(student.totalCreditPoints);
                        const isTopPerfm  = student.totalCreditPoints >= targetPoints;

                        const deptAbbr = student.department
                          .split(/[\s&]+/)
                          .filter((w) => w.length > 2)
                          .map((w) => w[0])
                          .join('')
                          .substring(0, 3)
                          .toUpperCase();

                        return (
                          <tr key={student.studentId}
                            className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-slate-50 transition-colors ${isTopPerfm ? 'border-l-2 border-l-amber-400' : ''}`}>

                            {/* Roll No + badges */}
                            <td className="px-3 py-3 align-top">
                              <div className="font-mono text-xs font-bold text-slate-900">{student.rollNo}</div>
                              <div className="flex items-center gap-1 mt-1 flex-wrap">
                                <span className="font-mono text-[9px] bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded">{deptAbbr}</span>
                                <span className="font-mono text-[9px] bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded">S{student.currentSemester}</span>
                                {student.section && (
                                  <span className="font-mono text-[9px] bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded">{student.section}</span>
                                )}
                                {isTopPerfm && (
                                  <span className="font-mono text-[9px] bg-amber-100 border border-amber-300 text-amber-800 px-1.5 py-0.5 rounded font-bold">★ TOP</span>
                                )}
                              </div>
                            </td>

                            {/* Name + Email */}
                            <td className="px-3 py-3 align-top">
                              <div className="text-xs font-semibold text-slate-900 leading-snug">{student.name}</div>
                              <div className="font-mono text-[10px] text-slate-400 truncate max-w-[160px] mt-0.5">{student.email}</div>
                            </td>

                            {/* Cert count */}
                            <td className="px-3 py-3 align-top">
                              <span className={`font-mono text-sm font-bold ${student.verifiedCertsCount > 0 ? 'text-slate-900' : 'text-rose-400'}`}>
                                {student.verifiedCertsCount}
                              </span>
                            </td>

                            {/* Category pills */}
                            <td className="px-3 py-3 align-top">
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {Object.entries(CAT_PILL)
                                  .filter(([cat]) => (student.categoryCounts[cat] || 0) > 0)
                                  .map(([cat, cfg]) => (
                                    <span key={cat}
                                      className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                                      {cfg.label}:{student.categoryCounts[cat]}
                                    </span>
                                  ))}
                                {student.verifiedCertsCount === 0 && (
                                  <span className="font-mono text-[9px] text-rose-500 bg-rose-50 border border-dashed border-rose-200 px-1.5 py-0.5 rounded">
                                    No Records
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Credit points */}
                            <td className="px-3 py-3 align-top">
                              <span className={`font-mono text-xs font-bold ${student.totalCreditPoints > 0 ? 'text-emerald-700' : 'text-slate-300'}`}>
                                +{student.totalCreditPoints}
                              </span>
                            </td>

                            {/* Recommended marks */}
                            <td className="px-3 py-3 align-top">
                              <span className="font-mono text-xs text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded whitespace-nowrap">
                                {recMark}/{maxMarks}
                              </span>
                            </td>

                            {/* Final marks */}
                            <td className="px-3 py-3 align-top">
                              {isLocked ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-xs font-bold text-slate-900 bg-amber-50 border border-amber-200 px-2 py-1 rounded whitespace-nowrap">
                                    {Number(currentMark).toFixed(1)}/{maxMarks}
                                  </span>
                                  <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <input type="number" min={baseMinMarks} max={maxMarks} step="0.5"
                                    value={currentMark}
                                    onChange={(e) =>
                                      setLocalMarks((p) => ({
                                        ...p,
                                        [student.studentId]: { ...p[student.studentId], finalMarksAllotted: parseFloat(e.target.value) || 0 },
                                      }))
                                    }
                                    className="w-16 font-mono text-xs border border-slate-300 rounded px-2 py-1 focus:outline-none focus:border-slate-900 text-center"
                                  />
                                  <span className="text-[10px] text-slate-400 font-mono">/{maxMarks}</span>
                                  <button type="button" title="Reset to recommended"
                                    onClick={() =>
                                      setLocalMarks((p) => ({
                                        ...p,
                                        [student.studentId]: { ...p[student.studentId], finalMarksAllotted: recMark },
                                      }))
                                    }
                                    className="font-mono text-[10px] text-slate-500 hover:text-slate-900 px-1 py-0.5 rounded hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors">
                                    ↺Rec
                                  </button>
                                </div>
                              )}
                            </td>

                            {/* Remarks */}
                            <td className="px-3 py-3 align-top">
                              {isLocked ? (
                                <span className="text-[11px] text-slate-500 italic">{currentRem || '—'}</span>
                              ) : (
                                <input type="text" value={currentRem}
                                  onChange={(e) =>
                                    setLocalMarks((p) => ({
                                      ...p,
                                      [student.studentId]: { ...p[student.studentId], remarks: e.target.value },
                                    }))
                                  }
                                  placeholder="Optional remark..."
                                  className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-slate-400 min-w-[120px] text-slate-700"
                                />
                              )}
                            </td>

                            {/* Actions */}
                            <td className="px-3 py-3 align-top">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {isLocked ? (
                                  <button type="button"
                                    onClick={() => setUnlockedIds((prev) => new Set([...prev, student.studentId]))}
                                    className="flex items-center gap-1 px-2 py-1 rounded bg-white border border-slate-300 hover:border-amber-400 hover:bg-amber-50 text-slate-700 hover:text-amber-800 text-[11px] font-medium transition-colors whitespace-nowrap">
                                    <Unlock className="w-3 h-3" />
                                    Unlock
                                  </button>
                                ) : (
                                  <button type="button" onClick={() => handleSaveSingle(student)} disabled={isSaving}
                                    className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-[11px] font-semibold transition-colors whitespace-nowrap">
                                    {isSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Lock className="w-3 h-3" />}
                                    {isSaving ? 'Saving...' : 'Lock'}
                                  </button>
                                )}
                                <button type="button" onClick={() => setDrawer360Student(student)}
                                  title="Open 360° Activity Record"
                                  className="flex items-center gap-1 px-2 py-1 rounded bg-white border border-slate-300 hover:border-slate-500 hover:bg-slate-50 text-slate-700 text-[11px] font-medium transition-colors whitespace-nowrap">
                                  <Eye className="w-3 h-3 text-amber-500" />
                                  360°
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table footer */}
              <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>
                  Showing <strong className="text-slate-800">{displayRows.length}</strong> of {students.length} students
                  {cohortFilter   !== 'ALL' && ` · Cohort: ${cohortFilter}`}
                  {activityDomain !== 'ALL' && ` · Domain: ${CAT_PILL[activityDomain]?.label}`}
                </span>
                <span>{lockedCount} locked · {students.length - lockedCount} pending · {evaluationTitle}</span>
              </div>
            </div>
          </>
        )}

        {/* Empty state */}
        {!loading && students.length === 0 && (
          <div className="bg-white border border-dashed border-slate-300 rounded p-16 text-center">
            <BarChart3 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600">No Institutional Data Loaded</p>
            <p className="text-xs text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
              Select an assessment preset, configure department and semester filters,
              then click <strong>Load Class Matrix</strong> to activate the analytics engine.
            </p>
          </div>
        )}
      </div>

      {/* 360° Student Activity Drawer */}
      {drawer360Student && (
        <Student360Drawer
          studentId={drawer360Student.studentId}
          semester={semester === 'ALL' ? drawer360Student.currentSemester : parseInt(semester, 10)}
          onClose={() => setDrawer360Student(null)}
        />
      )}
    </div>
  );
}
