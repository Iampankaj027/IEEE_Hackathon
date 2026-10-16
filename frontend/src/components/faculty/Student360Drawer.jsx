import React, { useState, useEffect } from 'react';
import {
  X,
  Award,
  ShieldCheck,
  ExternalLink,
  Download,
  Eye,
  Calendar,
  Building2,
  Lock,
  CheckCircle2,
  FileText,
  UserCheck,
} from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import LiveCertificatePreview from '../certificate/LiveCertificatePreview';

/**
 * Slide-over 360° Student Inspection Drawer for Faculty Grading Portal
 *
 * @param {Object} props
 * @param {string} props.studentId - UUID of the selected student
 * @param {number|string} [props.semester] - Optional semester filter
 * @param {Function} props.onClose - Callback to close the drawer
 */
export default function Student360Drawer({ studentId, semester, onClose }) {
  const [student, setStudent] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAllSemesters, setFilterAllSemesters] = useState(false);

  // Nested Certificate Preview Modal State
  const [selectedCertForPreview, setSelectedCertForPreview] = useState(null);

  const backendOrigin = (
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
  ).replace(/\/api\/?$/, '');

  useEffect(() => {
    if (!studentId) return;

    let isMounted = true;
    async function fetchStudentDetails() {
      setLoading(true);
      try {
        const queryParam =
          !filterAllSemesters && semester ? `?semester=${semester}` : '';
        const res = await axiosInstance.get(
          `/faculty/grading/student/${studentId}${queryParam}`
        );

        if (isMounted && res.data?.success) {
          setStudent(res.data.student);
          setCertificates(res.data.certificates || []);
        }
      } catch (error) {
        console.error('Failed to fetch student 360 details:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchStudentDetails();
    return () => {
      isMounted = false;
    };
  }, [studentId, semester, filterAllSemesters]);

  if (!studentId) return null;

  const totalDisplayedPoints = certificates.reduce(
    (sum, c) => sum + (c.creditPoints || 0),
    0
  );

  // Compute Category Counts
  const categoryBreakdown = certificates.reduce((acc, cert) => {
    const cat = cert.event?.category || 'OTHER';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-40 overflow-hidden bg-slate-950/60 flex justify-end">
      {/* Backdrop click to close */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Slide-Over Panel */}
      <div className="relative z-10 w-full max-w-2xl bg-white h-full shadow-2xl border-l border-slate-300 flex flex-col justify-between overflow-hidden">
        {/* TOP HEADER */}
        <div className="bg-slate-900 text-white px-6 py-5 border-b border-slate-800 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500 text-slate-950">
                360° STUDENT ACTIVITY RECORD
              </span>
              {student?.rollNo && (
                <span className="font-mono text-xs text-slate-300 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded">
                  {student.rollNo}
                </span>
              )}
            </div>

            <h2 className="text-lg font-bold text-white tracking-tight">
              {loading ? 'Loading Student Profile...' : student?.name}
            </h2>

            {student && (
              <p className="text-xs text-slate-400 mt-0.5">
                {student.department} • Batch {student.batchYear || '2023'} •
                Current Semester {student.currentSemester} (Sec{' '}
                {student.section || 'A'})
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* DRAWER BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
          {/* KPI & Filter Strip */}
          <div className="bg-white border border-slate-200 rounded p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-6">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 block">
                    Verified Certs
                  </span>
                  <span className="font-mono text-xl font-bold text-slate-900">
                    {certificates.length}
                  </span>
                </div>

                <div className="pl-6 border-l border-slate-200">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 block">
                    Verified Credit Points
                  </span>
                  <span className="font-mono text-xl font-bold text-emerald-700">
                    +{totalDisplayedPoints} PTS
                  </span>
                </div>
              </div>

              {/* Toggle Current Semester vs All Semesters */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilterAllSemesters(false)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-medium border transition-colors ${
                    !filterAllSemesters
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Sem {semester || student?.currentSemester || 5} Only
                </button>
                <button
                  type="button"
                  onClick={() => setFilterAllSemesters(true)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-medium border transition-colors ${
                    filterAllSemesters
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  All Semesters
                </button>
              </div>
            </div>

            {/* Category Pill Breakdown */}
            <div className="pt-3 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase text-slate-400 mr-1">
                Category Distribution:
              </span>
              {Object.keys(categoryBreakdown).length === 0 ? (
                <span className="text-xs text-slate-400 italic">
                  No verified certificates in this filter.
                </span>
              ) : (
                Object.entries(categoryBreakdown).map(([cat, count]) => (
                  <span
                    key={cat}
                    className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200"
                  >
                    {cat}: {count}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Certificates Proof List */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center justify-between">
              <span>Cryptographically Verified Certificates</span>
              <span className="font-mono text-[11px] text-slate-500 font-normal">
                Click any certificate to inspect QR &amp; signature
              </span>
            </h3>

            {loading ? (
              <div className="py-12 text-center font-mono text-xs text-slate-500">
                Retrieving verified student credentials...
              </div>
            ) : certificates.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded p-8 text-center">
                <Award className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-800">
                  No Verified Certificates Found
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  This student has no verified participation records for the selected
                  semester filter.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {certificates.map((cert) => {
                  const pdfHref = cert.pdfUrl
                    ? `${backendOrigin}${cert.pdfUrl}`
                    : null;

                  return (
                    <div
                      key={cert.id}
                      className="bg-white border border-slate-200 hover:border-slate-300 rounded p-4 shadow-sm transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-amber-400">
                              {cert.certificateNo}
                            </span>
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                              +{cert.creditPoints} PTS
                            </span>
                            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                              {cert.participationRole.replace(/_/g, ' ')}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-slate-900 pt-1">
                            {cert.event?.title}
                          </h4>

                          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
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
                            <span>Sem {cert.semester}</span>
                          </div>

                          {cert.event?.naacCriteriaTag && (
                            <div className="pt-1">
                              <span className="font-mono text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                                NAAC: {cert.event.naacCriteriaTag}
                              </span>
                            </div>
                          )}

                          <div className="pt-1 flex items-center gap-1 font-mono text-[10px] text-slate-400">
                            <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                            <span className="truncate max-w-sm">
                              SHA-256: {cert.cryptoSignature}
                            </span>
                          </div>
                        </div>

                        {/* Proof Inspection Buttons */}
                        <div className="flex sm:flex-col items-stretch gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setSelectedCertForPreview(cert)}
                            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-400" />
                            <span>Inspect Proof</span>
                          </button>

                          {pdfHref && (
                            <a
                              href={pdfHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>PDF</span>
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
        </div>

        {/* DRAWER FOOTER */}
        <div className="bg-white border-t border-slate-200 px-6 py-3.5 flex items-center justify-between text-xs">
          {student?.rollNo ? (
            <a
              href={`/u/${student.rollNo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-slate-700 hover:text-slate-900 underline underline-offset-4 flex items-center gap-1.5"
            >
              <span>Open Public Portfolio (/u/{student.rollNo})</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>

      {/* Nested Live Certificate Modal when faculty clicks "Inspect Proof" */}
      {selectedCertForPreview && (
        <LiveCertificatePreview
          certificate={selectedCertForPreview}
          student={student}
          onClose={() => setSelectedCertForPreview(null)}
        />
      )}
    </div>
  );
}