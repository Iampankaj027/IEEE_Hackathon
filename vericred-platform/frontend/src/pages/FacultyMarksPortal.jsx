import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';

export default function FacultyMarksPortal() {
  const { user, logoutUser } = useAuth();
  const [department, setDepartment] = useState(user?.department || '');
  const [semester, setSemester] = useState(user?.currentSemester || 5);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadClass() {
    if (!department.trim()) {
      setError('Enter a department to load its grading matrix.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get('/faculty/grading/matrix', {
        params: { department: department.trim(), semester },
      });
      setStudents(response.data.studentRows || []);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          'Could not load the class grading matrix. Check the backend and try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (department.trim()) loadClass();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
              VeriCred Faculty
            </p>
            <h1 className="mt-1 text-3xl font-bold">Class marks portal</h1>
          </div>
          <button
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-white"
            onClick={logoutUser}
            type="button"
          >
            Sign out
          </button>
        </header>

        <form
          className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          onSubmit={(event) => {
            event.preventDefault();
            loadClass();
          }}
        >
          <label className="flex min-w-64 flex-1 flex-col gap-1 text-sm font-medium">
            Department
            <input
              className="rounded-lg border border-slate-300 px-3 py-2"
              onChange={(event) => setDepartment(event.target.value)}
              value={department}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Semester
            <input
              className="w-28 rounded-lg border border-slate-300 px-3 py-2"
              max="8"
              min="1"
              onChange={(event) => setSemester(event.target.value)}
              type="number"
              value={semester}
            />
          </label>
          <button
            className="rounded-lg bg-indigo-600 px-5 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? 'Loading…' : 'Load class'}
          </button>
        </form>

        {error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Roll number</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Certificates</th>
                <th className="px-4 py-3">Credit points</th>
                <th className="px-4 py-3">Recommended marks</th>
                <th className="px-4 py-3">Final marks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((student) => (
                <tr key={student.studentId}>
                  <td className="px-4 py-3 font-mono">{student.rollNo}</td>
                  <td className="px-4 py-3">{student.name}</td>
                  <td className="px-4 py-3">{student.verifiedCertsCount}</td>
                  <td className="px-4 py-3">{student.totalCreditPoints}</td>
                  <td className="px-4 py-3">{student.recommendedMarks}</td>
                  <td className="px-4 py-3">{student.finalMarksAllotted}</td>
                </tr>
              ))}
              {!loading && students.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan="6">
                    No student records found for this department and semester.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}