import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Award,
  ExternalLink,
  Eye,
  Lock,
  Building2,
  GraduationCap,
  Calendar,
  ArrowLeft,
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import LiveCertificatePreview from '../components/certificate/LiveCertificatePreview';
import axiosInstance from '../api/axiosInstance';

export default function PublicStudentPortfolio() {
  const { rollNo } = useParams();
  const [student, setStudent] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedCert, setSelectedCert] = useState(null);

  useEffect(() => {
    async function loadPortfolio() {
      setLoading(true);
      setErrorMsg('');
      try {
        const res = await axiosInstance.get(
          `/certificates/portfolio/${encodeURIComponent(rollNo.trim().toUpperCase())}`
        );
        if (res.data?.success) {
          setStudent(res.data.student);
          setCertificates(res.data.certificates || []);
        }
      } catch (error) {
        setErrorMsg(
          error.response?.data?.message ||
            `No public portfolio found for Roll Number "${rollNo}".`
        );
      } finally {
        setLoading(false);
      }
    }

    if (rollNo) loadPortfolio();
  }, [rollNo]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="bg-white border border-slate-200 rounded p-12 text-center font-mono text-xs text-slate-500">
            Loading verified student portfolio...
          </div>
        ) : errorMsg || !student ? (
          <div className="bg-white border border-slate-200 rounded p-8 text-center">
            <h2 className="text-base font-bold text-slate-900">{errorMsg}</h2>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded bg-slate-900 text-white text-xs font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Portal</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Student Public Identity Header */}
            <div className="bg-slate-900 text-white border border-slate-800 rounded p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-amber-500 text-slate-950">
                      {student.rollNo}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-xs text-emerald-400 bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Public Institutional Portfolio
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    {student.name}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1">
                    Department of {student.department} • Batch {student.batchYear || 2023} •
                    Semester {student.currentSemester || 5}
                  </p>
                </div>

                <div className="flex items-center gap-4 bg-slate-800/90 border border-slate-700 rounded p-4 shrink-0">
                  <div className="text-center px-3">
                    <span className="font-mono text-[10px] uppercase text-slate-400 block">
                      Verified Certs
                    </span>
                    <span className="font-mono text-2xl font-bold text-white">
                      {certificates.length}
                    </span>
                  </div>
                  <div className="h-8 w-[1px] bg-slate-700" />
                  <div className="text-center px-3">
                    <span className="font-mono text-[10px] uppercase text-slate-400 block">
                      Verified Credits
                    </span>
                    <span className="font-mono text-2xl font-bold text-amber-400">
                      {student.totalCreditPoints} PTS
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Verified Credentials Grid */}
            <div className="bg-white border border-slate-200 rounded p-6 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4 font-mono">
                Cryptographically Verified Participation Timeline ({certificates.length})
              </h2>

              {certificates.length === 0 ? (
                <p className="text-xs text-slate-500 py-8 text-center">
                  No verified certificates published yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {certificates.map((cert) => (
                    <div
                      key={cert.id}
                      className="border border-slate-200 hover:border-slate-400 rounded p-5 flex flex-col justify-between transition-colors"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-amber-400">
                            {cert.certificateNo}
                          </span>
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                            +{cert.creditPoints} PTS
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-slate-900">
                          {cert.event?.title}
                        </h3>
                        <p className="text-xs text-slate-600 mt-1">
                          Role:{' '}
                          <strong className="text-slate-900">
                            {cert.participationRole.replace(/_/g, ' ')}
                          </strong>{' '}
                          • Scope: {cert.event?.scope?.replace('_', ' ')}
                        </p>

                        <div className="mt-3 pt-3 border-t border-slate-100 font-mono text-[10px] text-slate-400 truncate">
                          HMAC-SHA256: {cert.cryptoSignature}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedCert(cert)}
                          className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-400" />
                          <span>Inspect Certificate</span>
                        </button>

                        <Link
                          to={`/verify/${cert.certificateNo}?sig=${cert.cryptoSignature}`}
                          className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-medium flex items-center gap-1"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Verify Hash</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {selectedCert && (
        <LiveCertificatePreview
          certificate={selectedCert}
          student={student}
          onClose={() => setSelectedCert(null)}
        />
      )}
    </div>
  );
}