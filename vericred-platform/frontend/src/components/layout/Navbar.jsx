import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Award,
  FileSpreadsheet,
  GraduationCap,
  ExternalLink,
  LogOut,
  Search,
  User,
  CheckCircle2,
  FolderKanban,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, isAuthenticated, isStudent, isFaculty, isAdmin, logoutUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [quickCertId, setQuickCertId] = useState('');

  const handleQuickVerify = (e) => {
    e.preventDefault();
    const cleaned = quickCertId.trim().toUpperCase();
    if (!cleaned) return;
    setQuickCertId('');
    navigate(`/verify/${encodeURIComponent(cleaned)}`);
  };

  const isActiveRoute = (path) => location.pathname.startsWith(path);

  return (
    <header className="bg-slate-900 text-slate-100 border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* LEFT: Institutional Brand & Primary Navigation */}
          <div className="flex items-center gap-8">
            <Link
              to={
                !isAuthenticated
                  ? '/login'
                  : isStudent
                  ? '/student/dashboard'
                  : '/faculty/events'
              }
              className="flex items-center gap-2.5 group"
            >
              <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center group-hover:border-amber-500 transition-colors">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight text-white leading-none">
                  VERICRED
                </span>
                <span className="font-mono text-[10px] text-slate-400 tracking-wider uppercase mt-0.5">
                  Institutional Ledger
                </span>
              </div>
            </Link>

            {/* Navigation Links for Authenticated Users */}
            {isAuthenticated && (
              <nav className="hidden md:flex items-center gap-1">
                {isStudent && (
                  <>
                    <Link
                      to="/student/dashboard"
                      className={`px-3 py-2 rounded text-xs font-medium flex items-center gap-2 transition-colors ${
                        isActiveRoute('/student/dashboard')
                          ? 'bg-slate-800 text-white border border-slate-700'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      <span>My Credentials & Claims</span>
                    </Link>

                    {user?.rollNo && (
                      <Link
                        to={`/u/${user.rollNo}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 rounded text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 flex items-center gap-1.5 transition-colors"
                      >
                        <span>Public Portfolio</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </Link>
                    )}
                  </>
                )}

                {isFaculty && (
                  <>
                    <Link
                      to="/faculty/events"
                      className={`px-3 py-2 rounded text-xs font-medium flex items-center gap-2 transition-colors ${
                        isActiveRoute('/faculty/events')
                          ? 'bg-slate-800 text-white border border-slate-700'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      <FolderKanban className="w-3.5 h-3.5 text-amber-500" />
                      <span>Events, CSV Roster & Claims</span>
                    </Link>

                    <Link
                      to="/faculty/grading"
                      className={`px-3 py-2 rounded text-xs font-medium flex items-center gap-2 transition-colors ${
                        isActiveRoute('/faculty/grading')
                          ? 'bg-slate-800 text-white border border-slate-700'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                      <span>360° Student Grading & Marks</span>
                    </Link>

                    {isAdmin && (
                      <Link
                        to="/admin/dashboard"
                        className={`px-3 py-2 rounded text-xs font-medium flex items-center gap-2 transition-colors ${
                          isActiveRoute('/admin/dashboard')
                            ? 'bg-slate-800 text-white border border-slate-700'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                        }`}
                      >
                        <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                        <span>Admin Console</span>
                      </Link>
                    )}
                  </>
                )}
              </nav>
            )}
          </div>

          {/* RIGHT: Quick Verify Input + User Metadata Badge + Logout */}
          <div className="flex items-center gap-3">
            {/* Quick Certificate Verification Bar */}
            <form onSubmit={handleQuickVerify} className="hidden lg:flex items-center">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={quickCertId}
                  onChange={(e) => setQuickCertId(e.target.value)}
                  placeholder="Verify Cert ID (VC-2026-...)"
                  className="bg-slate-950 border border-slate-700 rounded pl-8 pr-2.5 py-1.5 text-xs font-mono text-slate-100 placeholder-slate-500 w-52 focus:outline-none focus:border-amber-500"
                />
              </div>
            </form>

            {isAuthenticated && user ? (
              <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
                {/* Student Verified Credit Points Counter */}
                {isStudent && (
                  <div className="hidden sm:flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-mono text-xs font-semibold text-white">
                      {user.totalCreditPoints || 0} PTS
                    </span>
                  </div>
                )}

                {/* User Identity & Role Block */}
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-mono font-bold text-amber-400">
                    {user.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-white leading-none">
                        {user.name}
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {user.role === 'STUDENT' ? user.rollNo : user.role}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      {user.department}
                      {user.role === 'STUDENT' && user.currentSemester
                        ? ` • Sem ${user.currentSemester} (${user.section || 'A'})`
                        : ''}
                    </span>
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  type="button"
                  onClick={logoutUser}
                  title="Sign Out"
                  className="p-2 rounded bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-3.5 py-1.5 rounded text-xs transition-colors"
              >
                Institutional Sign In
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        {isAuthenticated && (
          <div className="flex md:hidden items-center gap-2 pb-2.5 pt-1 border-t border-slate-800/80 overflow-x-auto">
            {isStudent && (
              <>
                <Link
                  to="/student/dashboard"
                  className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap ${
                    isActiveRoute('/student/dashboard')
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400'
                  }`}
                >
                  My Credentials
                </Link>
                {user?.rollNo && (
                  <Link
                    to={`/u/${user.rollNo}`}
                    className="px-2.5 py-1 rounded text-xs font-medium text-slate-400 whitespace-nowrap"
                  >
                    Public Portfolio ({user.rollNo})
                  </Link>
                )}
              </>
            )}

            {isFaculty && (
              <>
                <Link
                  to="/faculty/events"
                  className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap ${
                    isActiveRoute('/faculty/events')
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400'
                  }`}
                >
                  Events & CSV Roster
                </Link>
                <Link
                  to="/faculty/grading"
                  className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap ${
                    isActiveRoute('/faculty/grading')
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400'
                  }`}
                >
                  360° Class Grading
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin/dashboard"
                    className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap ${
                      isActiveRoute('/admin/dashboard')
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400'
                    }`}
                  >
                    Admin Console
                  </Link>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}