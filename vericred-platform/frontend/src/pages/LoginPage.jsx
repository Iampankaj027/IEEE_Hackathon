import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Mail,
  UserCheck,
  Building2,
  Hash,
  ArrowRight,
  Search,
  AlertCircle,
  FileCheck2,
  Award,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DEPARTMENTS = [
  'Information Technology',
  'Computer Science & Engineering',
  'Electronics & Communication',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
];



export default function LoginPage() {
  const navigate = useNavigate();
  const { loginUser, registerUser, isAuthenticated, isStudent, isFaculty, isAdmin } = useAuth();

  // Mode: 'LOGIN' | 'REGISTER'
  const [mode, setMode] = useState('LOGIN');

  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Registration Additional State
  const [name, setName] = useState('');
  const [role, setRole] = useState('STUDENT');
  const [rollNo, setRollNo] = useState('');
  const [department, setDepartment] = useState('Information Technology');
  const [batchYear, setBatchYear] = useState('2023');
  const [currentSemester, setCurrentSemester] = useState('5');
  const [section, setSection] = useState('A');
  const [facultyPasscode, setFacultyPasscode] = useState('');

  // Public Certificate Quick-Lookup State (No Login Required)
  const [verifyInput, setVerifyInput] = useState('');
  const [portfolioRollInput, setPortfolioRollInput] = useState('');

  // UI Feedback
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      if (isStudent) {
        navigate('/student/dashboard', { replace: true });
      } else if (isAdmin) {
        navigate('/admin/dashboard', { replace: true });
      } else if (isFaculty) {
        navigate('/faculty/events', { replace: true });
      }
    }
  }, [isAuthenticated, isStudent, isFaculty, isAdmin, navigate]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      if (mode === 'LOGIN') {
        const result = await loginUser(email, password);
        if (!result.success) {
          setErrorMsg(result.message || 'Authentication failed. Check your credentials.');
        } else {
          if (result.user.role === 'STUDENT') {
            navigate('/student/dashboard');
          } else if (result.user.role === 'HOD_ADMIN') {
            navigate('/admin/dashboard');
          } else {
            navigate('/faculty/events');
          }
        }
      } else {
        // REGISTER Flow
        const payload = {
          name,
          email,
          password,
          role,
          rollNo: role === 'STUDENT' ? rollNo.toUpperCase() : undefined,
          facultyPasscode: role === 'FACULTY' ? facultyPasscode : undefined,
          department,
          batchYear: parseInt(batchYear, 10),
          currentSemester: parseInt(currentSemester, 10),
          section,
        };

        const result = await registerUser(payload);
        if (!result.success) {
          setErrorMsg(result.message || 'Registration failed.');
        } else {
          if (result.user.role === 'STUDENT') {
            navigate('/student/dashboard');
          } else if (result.user.role === 'HOD_ADMIN') {
            navigate('/admin/dashboard');
          } else {
            navigate('/faculty/events');
          }
        }
      }
    } catch (err) {
      setErrorMsg('An unexpected network error occurred.');
    } finally {
      setSubmitting(false);
    }
  };



  const handleQuickVerifySubmit = (e) => {
    e.preventDefault();
    const trimmed = verifyInput.trim();
    if (!trimmed) return;

    // Supports pasting either full verification URL or just Certificate No
    if (trimmed.includes('/verify/')) {
      try {
        const url = new URL(trimmed);
        navigate(`${url.pathname}${url.search}`);
        return;
      } catch (_) {
        // fallback if partial path
      }
    }
    navigate(`/verify/${encodeURIComponent(trimmed.toUpperCase())}`);
  };

  const handlePublicPortfolioLookup = (e) => {
    e.preventDefault();
    const cleanedRoll = portfolioRollInput.trim().toUpperCase();
    if (!cleanedRoll) return;
    navigate(`/u/${encodeURIComponent(cleanedRoll)}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* LEFT PANEL: Institutional Ledger & Public Verification Gateway */}
      <div className="lg:w-5/12 bg-slate-900 text-slate-100 flex flex-col justify-between p-8 lg:p-12 border-b lg:border-b-0 lg:border-r border-slate-800">
        <div>
          {/* Top Brand Bar */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-800 border border-slate-700 flex items-center justify-center rounded">
                <ShieldCheck className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <span className="font-mono text-xs uppercase tracking-widest text-slate-400 block">
                  Institutional Ledger
                </span>
                <h1 className="text-lg font-bold tracking-tight text-white">
                  VERICRED REGISTRY
                </h1>
              </div>
            </div>
            <span className="font-mono text-[11px] bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded">
              HMAC-SHA256
            </span>
          </div>

          {/* Core System Architecture Highlights */}
          <div className="mt-8 space-y-6">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-amber-500 mb-2">
                Centralized Academic & Co-Curricular Infrastructure
              </p>
              <h2 className="text-2xl lg:text-3xl font-semibold text-white tracking-tight leading-snug">
                Verified Student Participation, Cryptographic Credentials & Automated Grading.
              </h2>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                Eliminating unverified spreadsheets and physical paper trails. Every participation
                record is verified via Faculty Master CSV Rosters or 1-Click Approval, stamped with
                a cryptographic QR signature, and aggregated into semester assessment matrices.
              </p>
            </div>

            {/* 3 Technical Specs */}
            <div className="grid grid-cols-1 gap-3 pt-2">
              <div className="bg-slate-800/60 border border-slate-800 p-3.5 rounded flex items-start gap-3">
                <FileCheck2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                    Dual-Mode Verification Engine
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Automatic Roll-Number matching against Faculty CSV uploads or instant 1-Click
                    departmental approval.
                  </p>
                </div>
              </div>

              <div className="bg-slate-800/60 border border-slate-800 p-3.5 rounded flex items-start gap-3">
                <Lock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                    Tamper-Proof QR & PDF Issuance
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    On-platform A4 archival PDF generation embedded with constant-time HMAC-SHA256
                    verification links and 1-Click LinkedIn certification export.
                  </p>
                </div>
              </div>

              <div className="bg-slate-800/60 border border-slate-800 p-3.5 rounded flex items-start gap-3">
                <Award className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                    Faculty 360° Grading & NAAC Exporter
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Automated credit-to-marks scaling for SODECA / internal assessments with
                    single-click institutional Excel (.xlsx) reports.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Public Zero-Login Verification Tools (For Recruiters & External Auditors) */}
        <div className="mt-10 pt-6 border-t border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-slate-300 font-semibold">
              Public Third-Party Verification (No Login Required)
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              OPEN ACCESS
            </span>
          </div>

          {/* Verify Certificate Form */}
          <form onSubmit={handleQuickVerifySubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={verifyInput}
                onChange={(e) => setVerifyInput(e.target.value)}
                placeholder="Paste Verification URL or Cert ID (e.g. VC-2026-...)"
                className="w-full bg-slate-950 border border-slate-700 rounded pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
            <button
              type="submit"
              className="bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 px-3.5 py-2 rounded text-xs font-medium whitespace-nowrap transition-colors"
            >
              Verify Credential
            </button>
          </form>

          {/* Public Student Portfolio Lookup */}
          <form onSubmit={handlePublicPortfolioLookup} className="flex gap-2">
            <div className="relative flex-1">
              <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={portfolioRollInput}
                onChange={(e) => setPortfolioRollInput(e.target.value)}
                placeholder="Inspect Public Student Portfolio by Roll No (e.g. 23ESKIT001)"
                className="w-full bg-slate-950 border border-slate-700 rounded pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
            <button
              type="submit"
              className="bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 px-3.5 py-2 rounded text-xs font-medium whitespace-nowrap transition-colors"
            >
              Open Portfolio
            </button>
          </form>
        </div>
      </div>

      {/* RIGHT PANEL: Institutional Sign-In & Registration Workspace */}
      <div className="lg:w-7/12 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-16">
        <div className="w-full max-w-md">
          {/* Card Container */}
          <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  setMode('LOGIN');
                  setErrorMsg('');
                }}
                className={`py-3.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
                  mode === 'LOGIN'
                    ? 'bg-white text-slate-900 border-slate-900'
                    : 'text-slate-500 border-transparent hover:text-slate-700'
                }`}
              >
                Institutional Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('REGISTER');
                  setErrorMsg('');
                }}
                className={`py-3.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
                  mode === 'REGISTER'
                    ? 'bg-white text-slate-900 border-slate-900'
                    : 'text-slate-500 border-transparent hover:text-slate-700'
                }`}
              >
                New Account Enrollment
              </button>
            </div>

            <div className="p-6 sm:p-8">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  {mode === 'LOGIN'
                    ? 'Sign in to your portal'
                    : 'Register Institutional Account'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {mode === 'LOGIN'
                    ? 'Enter your institutional email and password to access your role workspace.'
                    : 'Enroll as a Student or Faculty member to claim and grade participation records.'}
                </p>
              </div>

              {errorMsg && (
                <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded flex items-start gap-2.5 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {mode === 'REGISTER' && (
                  <>
                    {/* Role Selector */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                        Account Role
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setRole('STUDENT')}
                          className={`py-2 px-3 text-xs font-medium rounded border text-center transition-colors ${
                            role === 'STUDENT'
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          Student
                        </button>
                        <button
                          type="button"
                          onClick={() => setRole('FACULTY')}
                          className={`py-2 px-3 text-xs font-medium rounded border text-center transition-colors ${
                            role === 'FACULTY'
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          Faculty
                        </button>
                      </div>
                    </div>

                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                        Full Legal Name (As printed on Certificates)
                      </label>
                      <div className="relative">
                        <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g., Aarav Sharma"
                          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:border-slate-900"
                        />
                      </div>
                    </div>

                    {/* Student Roll No */}
                    {role === 'STUDENT' && (
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                            University Roll No
                          </label>
                          <input
                            type="text"
                            required
                            value={rollNo}
                            onChange={(e) => setRollNo(e.target.value.toUpperCase())}
                            placeholder="e.g., 23ESKIT045"
                            className="w-full px-3 py-2 text-sm font-mono uppercase border border-slate-300 rounded focus:outline-none focus:border-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                            Semester
                          </label>
                          <select
                            value={currentSemester}
                            onChange={(e) => setCurrentSemester(e.target.value)}
                            className="w-full px-2.5 py-2 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:border-slate-900"
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                              <option key={sem} value={sem}>
                                Sem {sem}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Institutional passcode is required for Faculty accounts */}
                    {role === 'FACULTY' && (
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                          Institutional Registration Passcode
                        </label>
                        <div className="relative">
                          <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="password"
                            required
                            value={facultyPasscode}
                            onChange={(e) => setFacultyPasscode(e.target.value)}
                            placeholder="Enter the passcode issued for your selected role"
                            className="w-full pl-9 pr-3 py-2 text-sm font-mono border border-slate-300 rounded focus:outline-none focus:border-slate-900"
                          />
                        </div>
                        <p className="mt-1.5 text-[11px] text-amber-600 flex items-start gap-1">
                          <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                          <span>An HOD/Admin must issue a passcode for your selected role and department. Students do not need a passcode.</span>
                        </p>
                      </div>
                    )}

                    {/* Department & Section */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className={role === 'STUDENT' ? 'col-span-2' : 'col-span-3'}>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                          Department
                        </label>
                        <div className="relative">
                          <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <select
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:border-slate-900"
                          >
                            {DEPARTMENTS.map((dept) => (
                              <option key={dept} value={dept}>
                                {dept}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {role === 'STUDENT' && (
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                            Section
                          </label>
                          <select
                            value={section}
                            onChange={(e) => setSection(e.target.value)}
                            className="w-full px-2.5 py-2 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:border-slate-900"
                          >
                            {['A', 'B', 'C', 'D'].map((sec) => (
                              <option key={sec} value={sec}>
                                Sec {sec}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Email Input */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Institutional Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@skit.ac.in"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:border-slate-900"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:border-slate-900"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-medium py-2.5 px-4 rounded text-sm flex items-center justify-center gap-2 transition-colors mt-2"
                >
                  <span>
                    {submitting
                      ? 'Authenticating...'
                      : mode === 'LOGIN'
                      ? 'Access Institutional Portal'
                      : 'Complete Enrollment & Sign In'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>


          </div>

          {/* Footer Institutional Note */}
          <div className="mt-5 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>VERICRED CORE v1.0</span>
            <Link
              to="/u/23ESKIT001"
              className="text-slate-700 hover:text-slate-900 underline underline-offset-4"
            >
              View Sample Public Portfolio (23ESKIT001) →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}