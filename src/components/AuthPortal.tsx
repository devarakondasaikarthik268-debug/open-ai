import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Lock,
  Moon,
  ShieldCheck,
  Sun,
  UserCheck,
} from 'lucide-react';
import { PortalIntent, useAuth } from '../contexts/AuthContext';
import { ADITYA_DEPARTMENTS } from '../types';
import { AdityaCrest } from './AdityaCrest';

interface AuthPortalProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

export function AuthPortal({ isDark, onToggleTheme }: AuthPortalProps) {
  const {
    firebaseUser,
    profile,
    facultyRequest,
    authError,
    portalIntent,
    setPortalIntent,
    signInWithGoogle,
    registerStudentProfile,
    submitFacultyRegistration,
    claimAdminProfile,
    logout,
    clearAuthError,
    isBootstrappedAdmin,
  } = useAuth();

  // Student registration fields
  const [studentName, setStudentName] = useState(firebaseUser?.displayName || '');
  const [rollNumber, setRollNumber] = useState('');
  const [department, setDepartment] = useState('CSE');
  const [year, setYear] = useState('3rd Year');
  const [section, setSection] = useState('A');

  // Faculty registration fields
  const [facultyName, setFacultyName] = useState(firebaseUser?.displayName || '');
  const [facultyId, setFacultyId] = useState('');
  const [facultyDept, setFacultyDept] = useState('CSE');
  const [designation, setDesignation] = useState('Assistant Professor');

  // Admin setup fields
  const [adminName, setAdminName] = useState(firebaseUser?.displayName || 'University Administrator');
  const [adminDept, setAdminDept] = useState('Administration');

  const [submitting, setSubmitting] = useState(false);

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !rollNumber.trim()) return;
    setSubmitting(true);
    try {
      await registerStudentProfile({
        displayName: studentName,
        rollNumber,
        department,
        year,
        section,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFacultySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facultyName.trim() || !facultyId.trim()) return;
    setSubmitting(true);
    try {
      await submitFacultyRegistration({
        displayName: facultyName,
        facultyId,
        department: facultyDept,
        designation,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await claimAdminProfile({
        displayName: adminName,
        department: adminDept,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const portals: Array<{ id: PortalIntent; label: string; icon: React.ReactNode; desc: string }> = [
    {
      id: 'student',
      label: 'Student Login',
      icon: <GraduationCap className="w-4 h-4" />,
      desc: 'AI Study Assistant, Assignments, Attendance, Exams & Grades',
    },
    {
      id: 'faculty',
      label: 'Faculty Login',
      icon: <BookOpen className="w-4 h-4" />,
      desc: 'Upload PDFs, Create Assignments, Announcements & Grading',
    },
    {
      id: 'admin',
      label: 'Admin Portal',
      icon: <ShieldCheck className="w-4 h-4" />,
      desc: 'Manage Accounts, Departments, Exams & University Notices',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070D1A] text-slate-900 dark:text-slate-100 flex flex-col">
      {/* 3-Zone Top Bar */}
      <header className="w-full border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-[#0B1324]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between gap-8">
          <div className="flex items-center gap-3 shrink-0">
            <AdityaCrest className="w-9 h-9" />
            <span className="font-display text-lg font-bold tracking-tight whitespace-nowrap">
              Aditya AI
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <span className="whitespace-nowrap shrink-0">Aditya University · Surampalem</span>
            <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">|</span>
            <span className="whitespace-nowrap shrink-0">English & తెలుగు</span>
            <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">|</span>
            <span className="whitespace-nowrap shrink-0">Academic Ecosystem</span>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Split Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
        {/* Left: Campus Showcase & Capabilities */}
        <section className="lg:col-span-7 flex flex-col justify-between gap-8">
          <div className="space-y-4">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
              Aditya University · Surampalem, Andhra Pradesh
            </p>
            <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight [text-wrap:balance]">
              Aditya AI – Your University Assistant
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              An intelligent conversational AI and academic command center engineered for Aditya University students, faculty, and administrators—supporting English, Telugu, code generation, PDF summarization, and live academic workflows.
            </p>
          </div>

          {/* Campus Visual */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 aspect-[16/9]">
            <img
              src="/src/assets/images/aditya_campus_clean_1794543729978.jpg"
              alt="Aditya University Surampalem Campus Architecture"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070D1A]/85 via-[#070D1A]/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-wrap items-end justify-between gap-4 text-white">
              <div>
                <p className="text-xs font-medium text-blue-200">
                  Surampalem Campus · Academic AI Platform
                </p>
                <p className="font-display text-lg font-semibold mt-0.5">
                  Conversational AI + Student, Faculty & Admin Portals
                </p>
              </div>
              <div className="text-xs text-slate-200 font-mono">
                C · C++ · Java · Python · PDF Analysis
              </div>
            </div>
          </div>

          {/* Key Feature Grid (Clean typography, no card-within-card nesting) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                9 Specialized AI Modes
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Study Assistant, Code Generator, Doubt Solver, Exam Prep, Notes, Quizzes, Resume Builder & Career Mentor.
              </p>
            </div>
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                Role-Separated Security
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Verified Google Authentication with isolated Student, Faculty, and Administrator permissions.
              </p>
            </div>
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                English & Telugu Voice
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Ask questions by text, voice, or uploaded PDFs and get step-by-step explanations in English or తెలుగు.
              </p>
            </div>
          </div>
        </section>

        {/* Right: Role-Based Login & Onboarding Card */}
        <section className="lg:col-span-5 flex flex-col justify-center">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] p-6 sm:p-8 shadow-sm">
            {!firebaseUser ? (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                    Sign in to Aditya AI
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Select your university portal to continue with verified authentication.
                  </p>
                </div>

                {/* Portal Selector Tabs */}
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
                  {portals.map((p) => {
                    const active = portalIntent === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          clearAuthError();
                          setPortalIntent(p.id);
                        }}
                        className={`flex items-center justify-center gap-1.5 px-2.5 py-2.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                          active
                            ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {p.icon}
                        <span>{p.label.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {portals.find((p) => p.id === portalIntent)?.icon}
                    <span>{portals.find((p) => p.id === portalIntent)?.label}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {portals.find((p) => p.id === portalIntent)?.desc}
                  </p>
                </div>

                {authError && (
                  <div className="p-3.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300">
                    {authError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => signInWithGoogle(portalIntent)}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-700 via-indigo-600 to-violet-600 hover:from-blue-600 hover:to-violet-500 text-white font-semibold text-sm flex items-center justify-center gap-2.5 shadow-sm transition-all cursor-pointer"
                >
                  <span>Continue with Google ({portals.find((p) => p.id === portalIntent)?.label.split(' ')[0]})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400">
                  <Lock className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                  <p>
                    Students cannot access Faculty or Administrator portals. Faculty accounts require an admin invitation or administrator approval.
                  </p>
                </div>
              </div>
            ) : !profile ? (
              // Authenticated via Google, completing Role Registration
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                      {portalIntent === 'student'
                        ? 'Complete Student Registration'
                        : portalIntent === 'faculty'
                        ? 'Faculty Verification'
                        : 'Administrator Setup'}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Signed in as {firebaseUser.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={logout}
                    className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline shrink-0"
                  >
                    Sign out
                  </button>
                </div>

                {authError && (
                  <div className="p-3 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300">
                    {authError}
                  </div>
                )}

                {portalIntent === 'admin' && isBootstrappedAdmin ? (
                  <form onSubmit={handleAdminSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Administrator Name
                      </label>
                      <input
                        type="text"
                        required
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Office / Department
                      </label>
                      <input
                        type="text"
                        required
                        value={adminDept}
                        onChange={(e) => setAdminDept(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-700 to-violet-600 text-white text-sm font-semibold hover:opacity-95 disabled:opacity-50"
                    >
                      {submitting ? 'Activating Administrator Account...' : 'Activate Administrator Dashboard'}
                    </button>
                  </form>
                ) : portalIntent === 'faculty' ? (
                  facultyRequest?.status === 'pending' ? (
                    <div className="p-5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/30 space-y-3">
                      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-sm">
                        <Clock className="w-4 h-4" />
                        <span>Faculty Verification Pending</span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        Your faculty request ({facultyRequest.facultyId} · {facultyRequest.department}) has been submitted to the Aditya University Administrator. Once approved, your Faculty Portal will unlock automatically.
                      </p>
                      <button
                        type="button"
                        onClick={() => setPortalIntent('student')}
                        className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                      >
                        Or register as a Student instead
                      </button>
                    </div>
                  ) : facultyRequest?.status === 'approved' ? (
                    <div className="p-5 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/70 dark:bg-emerald-950/30 space-y-3">
                      <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Faculty Access Approved</span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300">
                        Click below to finalize your faculty profile.
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          submitFacultyRegistration({
                            displayName: facultyRequest.displayName,
                            facultyId: facultyRequest.facultyId,
                            department: facultyRequest.department,
                            designation: facultyRequest.designation,
                          })
                        }
                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 text-white text-sm font-semibold"
                      >
                        Enter Faculty Portal
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleFacultySubmit} className="space-y-3.5">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Faculty Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={facultyName}
                          onChange={(e) => setFacultyName(e.target.value)}
                          placeholder="Dr. / Prof. Full Name"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Faculty ID
                          </label>
                          <input
                            type="text"
                            required
                            value={facultyId}
                            onChange={(e) => setFacultyId(e.target.value)}
                            placeholder="AU-FAC-102"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Designation
                          </label>
                          <select
                            value={designation}
                            onChange={(e) => setDesignation(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                          >
                            <option>Assistant Professor</option>
                            <option>Associate Professor</option>
                            <option>Professor</option>
                            <option>Head of Department</option>
                            <option>Lab Instructor</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Department
                        </label>
                        <select
                          value={facultyDept}
                          onChange={(e) => setFacultyDept(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                          {ADITYA_DEPARTMENTS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-700 to-violet-600 text-white text-sm font-semibold hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>{submitting ? 'Submitting...' : 'Submit Faculty Verification'}</span>
                      </button>
                    </form>
                  )
                ) : (
                  // Student Registration Form
                  <form onSubmit={handleStudentSubmit} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Student Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Roll Number
                        </label>
                        <input
                          type="text"
                          required
                          value={rollNumber}
                          onChange={(e) => setRollNumber(e.target.value)}
                          placeholder="e.g. 22A91A0501"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Department
                        </label>
                        <select
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                          {ADITYA_DEPARTMENTS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Year
                        </label>
                        <select
                          value={year}
                          onChange={(e) => setYear(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                          <option>1st Year</option>
                          <option>2nd Year</option>
                          <option>3rd Year</option>
                          <option>4th Year</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Section
                        </label>
                        <select
                          value={section}
                          onChange={(e) => setSection(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                          <option>A</option>
                          <option>B</option>
                          <option>C</option>
                          <option>D</option>
                        </select>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-700 via-indigo-600 to-violet-600 text-white text-sm font-semibold hover:opacity-95 disabled:opacity-50"
                    >
                      {submitting ? 'Creating Student Dashboard...' : 'Create Student Account'}
                    </button>
                  </form>
                )}
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
