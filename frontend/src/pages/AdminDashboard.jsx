import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  KeyRound,
  Plus,
  Copy,
  Check,
  XCircle,
  Trash2,
  RefreshCw,
  ChevronDown,
  Building2,
  Clock,
  Users,
  BarChart3,
  AlertCircle,
  LogOut,
  ArrowLeft,
  Eye,
  EyeOff,
  Ban,
  CheckCircle2,
  Timer,
  Hash,
  Filter,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';

const DEPARTMENTS = [
  'Information Technology',
  'Computer Science & Engineering',
  'Electronics & Communication',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
];

const STATUS_CONFIG = {
  ACTIVE: {
    label: 'Active',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    icon: CheckCircle2,
  },
  EXPIRED: {
    label: 'Expired',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    icon: Timer,
  },
  REVOKED: {
    label: 'Revoked',
    color: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
    icon: Ban,
  },
  EXHAUSTED: {
    label: 'Fully Used',
    color: 'bg-slate-100 text-slate-600 border-slate-300',
    dot: 'bg-slate-400',
    icon: Users,
  },
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logoutUser } = useAuth();

  // ─── State ──────────────────────────────────────────────────────────────
  const [passcodes, setPasscodes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filter
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Generate Passcode Form
  const [showGenerator, setShowGenerator] = useState(false);
  const [genDept, setGenDept] = useState(user?.department || DEPARTMENTS[0]);
  const [genRole, setGenRole] = useState('FACULTY');
  const [genLabel, setGenLabel] = useState('');
  const [genMaxUses, setGenMaxUses] = useState('1');
  const [genExpiresHours, setGenExpiresHours] = useState('168');
  const [genCount, setGenCount] = useState('1');

  // Copy feedback
  const [copiedId, setCopiedId] = useState(null);

  // Reveal codes
  const [revealedCodes, setRevealedCodes] = useState({});

  // ─── Data Fetching ──────────────────────────────────────────────────────
  const fetchPasscodes = useCallback(async () => {
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (deptFilter) params.department = deptFilter;

      const res = await axiosInstance.get('/admin/passcodes', { params });
      if (res.data.success) {
        setPasscodes(res.data.passcodes);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load passcodes.');
    }
  }, [statusFilter, deptFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/admin/passcodes/stats');
      if (res.data.success) {
        setStats(res.data.stats);
      }
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      await Promise.all([fetchPasscodes(), fetchStats()]);
      setLoading(false);
    }
    loadAll();
  }, [fetchPasscodes, fetchStats]);

  // ─── Handlers ───────────────────────────────────────────────────────────
  const clearMessages = () => {
    setError('');
    setSuccessMsg('');
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    clearMessages();
    setActionLoading(true);

    try {
      const payload = {
        department: genDept,
        targetRole: genRole,
        label: genLabel || null,
        maxUses: parseInt(genMaxUses, 10) || 1,
        expiresInHours: parseFloat(genExpiresHours) || 168,
        count: parseInt(genCount, 10) || 1,
      };

      const res = await axiosInstance.post('/admin/passcodes', payload);
      if (res.data.success) {
        setSuccessMsg(`✅ Generated ${res.data.passcodes.length} passcode(s) successfully.`);
        setShowGenerator(false);
        setGenLabel('');
        setGenMaxUses('1');
        setGenExpiresHours('168');
        setGenCount('1');

        // Auto-reveal new codes
        const newRevealed = { ...revealedCodes };
        res.data.passcodes.forEach((p) => {
          newRevealed[p.id] = true;
        });
        setRevealedCodes(newRevealed);

        await Promise.all([fetchPasscodes(), fetchStats()]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate passcodes.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevoke = async (id) => {
    clearMessages();
    setActionLoading(true);
    try {
      const res = await axiosInstance.patch(`/admin/passcodes/${id}/revoke`);
      if (res.data.success) {
        setSuccessMsg(res.data.message);
        await Promise.all([fetchPasscodes(), fetchStats()]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Revocation failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    clearMessages();
    setActionLoading(true);
    try {
      const res = await axiosInstance.delete(`/admin/passcodes/${id}`);
      if (res.data.success) {
        setSuccessMsg(res.data.message);
        await Promise.all([fetchPasscodes(), fetchStats()]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Deletion failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (code, id) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const toggleReveal = (id) => {
    setRevealedCodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const maskCode = (code) => {
    if (code.length <= 8) return '•'.repeat(code.length);
    return code.substring(0, 5) + '•'.repeat(code.length - 8) + code.substring(code.length - 3);
  };

  const formatExpiry = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = d - now;
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h remaining`;
    if (hours > 0) return `${hours}h remaining`;
    return `${Math.floor(diff / (1000 * 60))}m remaining`;
  };

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* ─── Top Nav ─────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/faculty/events')}
              className="p-1.5 rounded hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700"
              title="Back to Faculty Portal"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-slate-900 flex items-center justify-center rounded">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-slate-900 leading-none">
                  VeriCred Admin Console
                </h1>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  Faculty Passcode Management
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-slate-700">{user?.name}</p>
              <p className="text-[10px] font-mono text-slate-400 uppercase">
                {user?.role} · {user?.department}
              </p>
            </div>
            <button
              onClick={logoutUser}
              className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ─── Stats Cards ─────────────────────────────────────────────── */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total Issued', value: stats.total, icon: Hash, color: 'text-slate-700' },
              { label: 'Active', value: stats.active, icon: CheckCircle2, color: 'text-emerald-600' },
              { label: 'Consumed', value: stats.totalConsumed, icon: Users, color: 'text-blue-600' },
              { label: 'Exhausted', value: stats.exhausted, icon: Ban, color: 'text-slate-500' },
              { label: 'Expired', value: stats.expired, icon: Timer, color: 'text-amber-600' },
              { label: 'Revoked', value: stats.revoked, icon: XCircle, color: 'text-red-600' },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex items-start gap-3"
              >
                <s.icon className={`w-4 h-4 mt-0.5 ${s.color}`} />
                <div>
                  <p className="text-lg font-bold text-slate-900 leading-none">{s.value}</p>
                  <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mt-0.5">
                    {s.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── Messages ────────────────────────────────────────────────── */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">
              <XCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2.5 text-xs text-emerald-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
            <button
              onClick={() => setSuccessMsg('')}
              className="ml-auto text-emerald-500 hover:text-emerald-700"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ─── Toolbar: Generate + Filters ─────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowGenerator(!showGenerator);
                clearMessages();
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Generate Passcode
            </button>
            <button
              onClick={() => {
                clearMessages();
                fetchPasscodes();
                fetchStats();
              }}
              disabled={loading}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Filter className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-7 pr-6 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-slate-400 appearance-none"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="revoked">Revoked</option>
                <option value="exhausted">Exhausted</option>
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <div className="relative">
              <Building2 className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="pl-7 pr-6 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-slate-400 appearance-none"
              >
                <option value="">All Departments</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* ─── Passcode Generator Form ─────────────────────────────────── */}
        {showGenerator && (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Generate New Faculty Registration Passcode
              </h3>
            </div>
            <form onSubmit={handleGenerate} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Department */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Department Scope
                  </label>
                  <select
                    value={genDept}
                    onChange={(e) => setGenDept(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-slate-900"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Role */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Target Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['FACULTY', 'HOD_ADMIN'].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setGenRole(r)}
                        className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-colors ${
                          genRole === r
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {r === 'FACULTY' ? 'Faculty' : 'HOD Admin'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Label */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Label (Optional)
                  </label>
                  <input
                    type="text"
                    value={genLabel}
                    onChange={(e) => setGenLabel(e.target.value)}
                    placeholder="e.g., Sem 5 Faculty Batch"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                  />
                </div>

                {/* Max Uses */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Max Uses per Code
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={genMaxUses}
                    onChange={(e) => setGenMaxUses(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 font-mono"
                  />
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    1 = single-use invite token
                  </p>
                </div>

                {/* Expiry */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Expires In (Hours)
                  </label>
                  <select
                    value={genExpiresHours}
                    onChange={(e) => setGenExpiresHours(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-slate-900"
                  >
                    <option value="1">1 hour</option>
                    <option value="6">6 hours</option>
                    <option value="24">24 hours (1 day)</option>
                    <option value="72">72 hours (3 days)</option>
                    <option value="168">168 hours (7 days)</option>
                    <option value="720">720 hours (30 days)</option>
                    <option value="2160">2160 hours (90 days)</option>
                  </select>
                </div>

                {/* Count */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Batch Count
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={genCount}
                    onChange={(e) => setGenCount(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 font-mono"
                  />
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    Generate multiple unique codes at once (max 50)
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowGenerator(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs font-medium px-5 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  {actionLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" />
                      Generate {parseInt(genCount, 10) > 1 ? `${genCount} Passcodes` : 'Passcode'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ─── Passcodes Table ────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Issued Passcodes Registry
              </h3>
            </div>
            <span className="font-mono text-[11px] text-slate-500">
              {passcodes.length} record{passcodes.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500 font-mono">
              <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-slate-400" />
              Loading passcode registry...
            </div>
          ) : passcodes.length === 0 ? (
            <div className="p-12 text-center">
              <KeyRound className="w-8 h-8 mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">No passcodes found</p>
              <p className="text-xs text-slate-400 mt-1">
                {statusFilter || deptFilter
                  ? 'Try adjusting your filters.'
                  : 'Generate your first faculty registration passcode to get started.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50">
                    <th className="text-left font-semibold uppercase tracking-wider text-slate-500 px-4 py-2.5">
                      Passcode
                    </th>
                    <th className="text-left font-semibold uppercase tracking-wider text-slate-500 px-4 py-2.5">
                      Status
                    </th>
                    <th className="text-left font-semibold uppercase tracking-wider text-slate-500 px-4 py-2.5">
                      Role
                    </th>
                    <th className="text-left font-semibold uppercase tracking-wider text-slate-500 px-4 py-2.5">
                      Department
                    </th>
                    <th className="text-left font-semibold uppercase tracking-wider text-slate-500 px-4 py-2.5">
                      Usage
                    </th>
                    <th className="text-left font-semibold uppercase tracking-wider text-slate-500 px-4 py-2.5">
                      Expiry
                    </th>
                    <th className="text-left font-semibold uppercase tracking-wider text-slate-500 px-4 py-2.5">
                      Consumers
                    </th>
                    <th className="text-right font-semibold uppercase tracking-wider text-slate-500 px-4 py-2.5">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {passcodes.map((p) => {
                    const statusCfg = STATUS_CONFIG[p.derivedStatus] || STATUS_CONFIG.ACTIVE;
                    const StatusIcon = statusCfg.icon;
                    const isRevealed = revealedCodes[p.id];
                    const isActive = p.derivedStatus === 'ACTIVE';

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50/50 transition-colors group"
                      >
                        {/* Passcode */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <code className="font-mono text-xs font-medium text-slate-900 bg-slate-100 px-2 py-1 rounded select-all">
                              {isRevealed ? p.code : maskCode(p.code)}
                            </code>
                            <button
                              onClick={() => toggleReveal(p.id)}
                              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                              title={isRevealed ? 'Hide' : 'Reveal'}
                            >
                              {isRevealed ? (
                                <EyeOff className="w-3 h-3" />
                              ) : (
                                <Eye className="w-3 h-3" />
                              )}
                            </button>
                            <button
                              onClick={() => copyToClipboard(p.code, p.id)}
                              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                              title="Copy to clipboard"
                            >
                              {copiedId === p.id ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          {p.label && (
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[180px]">
                              {p.label}
                            </p>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border ${statusCfg.color}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                            {statusCfg.label}
                          </span>
                        </td>

                        {/* Role */}
                        <td className="px-4 py-3">
                          <span className="font-mono text-[11px] text-slate-600">
                            {p.targetRole}
                          </span>
                        </td>

                        {/* Department */}
                        <td className="px-4 py-3">
                          <span className="text-slate-700 text-xs">{p.department}</span>
                        </td>

                        {/* Usage */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-medium text-slate-700">
                              {p.usedCount}
                            </span>
                            <span className="text-slate-400">/</span>
                            <span className="font-mono text-slate-500">{p.maxUses}</span>
                          </div>
                          <div className="w-16 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                            <div
                              className="h-full bg-slate-400 rounded-full transition-all"
                              style={{
                                width: `${Math.min((p.usedCount / p.maxUses) * 100, 100)}%`,
                              }}
                            />
                          </div>
                        </td>

                        {/* Expiry */}
                        <td className="px-4 py-3">
                          <span className="text-[11px] text-slate-600 font-mono">
                            {formatExpiry(p.expiresAt)}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {new Date(p.expiresAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </td>

                        {/* Consumers */}
                        <td className="px-4 py-3">
                          {p.consumedBy && p.consumedBy.length > 0 ? (
                            <div className="space-y-0.5">
                              {p.consumedBy.map((u) => (
                                <div key={u.id} className="text-[11px]">
                                  <span className="font-medium text-slate-700">{u.name}</span>
                                  <span className="text-slate-400 ml-1">({u.email})</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              No consumers
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isActive && (
                              <button
                                onClick={() => handleRevoke(p.id)}
                                disabled={actionLoading}
                                className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                                title="Revoke Passcode"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {p.usedCount === 0 && (
                              <button
                                onClick={() => handleDelete(p.id)}
                                disabled={actionLoading}
                                className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                                title="Delete Passcode"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
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

        {/* ─── Department Breakdown ────────────────────────────────────── */}
        {stats && stats.departmentBreakdown && Object.keys(stats.departmentBreakdown).length > 0 && (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Department Breakdown
              </h3>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(stats.departmentBreakdown).map(([dept, data]) => (
                  <div
                    key={dept}
                    className="border border-slate-200 rounded-lg p-3 flex items-start gap-3"
                  >
                    <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-slate-800 truncate">{dept}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-mono text-slate-500">
                          {data.total} issued
                        </span>
                        <span className="text-[10px] font-mono text-emerald-600">
                          {data.active} active
                        </span>
                        <span className="text-[10px] font-mono text-blue-600">
                          {data.consumed} used
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Footer ─────────────────────────────────────────────────── */}
        <div className="text-center py-4">
          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            VeriCred Admin Console · Passcode Lifecycle Management · Institutional Use Only
          </p>
        </div>
      </main>
    </div>
  );
}
