import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  GraduationCap,
  Megaphone,
  Send,
  Sparkles,
  Star,
  Upload,
} from 'lucide-react';
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { OperationType, db, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  AIModeId,
  AcademicResult,
  Announcement,
  AppSection,
  Assignment,
  AttendanceRecord,
  CampusEvent,
  Course,
  Exam,
  FeedbackRating,
  StudyMaterial,
  Submission,
} from '../types';

function DemoLabel({ isDemo }: { isDemo: boolean }) {
  if (!isDemo) {
    return (
      <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
        Published Record
      </span>
    );
  }
  return (
    <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
      Sample Data · Illustrative Only
    </span>
  );
}

function StarDisplay({ avg, count }: { avg: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 tabular-nums">
      <div className="flex items-center gap-0.5 text-amber-500">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className="w-3.5 h-3.5"
            fill={s <= Math.round(avg) ? 'currentColor' : 'none'}
          />
        ))}
      </div>
      <span>{count > 0 ? `${avg.toFixed(1)} (${count})` : 'No ratings yet'}</span>
    </div>
  );
}

interface UniversityViewsProps {
  section: AppSection;
  onNavigate: (sec: AppSection) => void;
  onAskAI: (mode: AIModeId, prompt: string) => void;
  courses: Course[];
  materials: StudyMaterial[];
  assignments: Assignment[];
  exams: Exam[];
  attendanceRecords: AttendanceRecord[];
  results: AcademicResult[];
  announcements: Announcement[];
  events: CampusEvent[];
  feedbackRatings: FeedbackRating[];
}

export function UniversityViews({
  section,
  onNavigate,
  onAskAI,
  courses,
  materials,
  assignments,
  exams,
  attendanceRecords,
  results,
  announcements,
  events,
  feedbackRatings,
}: UniversityViewsProps) {
  const { firebaseUser, profile, privateInfo } = useAuth();

  // Track current student's submissions per assignment
  const [mySubmissions, setMySubmissions] = useState<Record<string, Submission>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [submissionBusy, setSubmissionBusy] = useState(false);

  // Course filter
  const [courseFilter, setCourseFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Feedback form state
  const [fbTargetType, setFbTargetType] = useState<'course' | 'material' | 'faculty' | 'platform'>('course');
  const [fbTargetTitle, setFbTargetTitle] = useState('Data Structures & Algorithms (CS301)');
  const [fbRating, setFbRating] = useState(5);
  const [fbComment, setFbComment] = useState('');
  const [fbSubmitting, setFbSubmitting] = useState(false);
  const [fbSuccess, setFbSuccess] = useState(false);

  useEffect(() => {
    if (!firebaseUser || assignments.length === 0) return;
    const unsubs: Array<() => void> = [];

    assignments
      .filter((a) => !a.isDemoData)
      .forEach((a) => {
        const subRef = doc(db, 'assignments', a.id, 'submissions', firebaseUser.uid);
        unsubs.push(
          onSnapshot(
            subRef,
            (snap) => {
              if (snap.exists()) {
                setMySubmissions((prev) => ({
                  ...prev,
                  [a.id]: { id: snap.id, ...snap.data() } as Submission,
                }));
              }
            },
            (err) =>
              handleFirestoreError(
                err,
                OperationType.GET,
                `assignments/${a.id}/submissions/${firebaseUser.uid}`
              )
          )
        );
      });

    return () => unsubs.forEach((u) => u());
  }, [firebaseUser, assignments]);

  const overallAttendance = useMemo(() => {
    const total = attendanceRecords.reduce((acc, r) => acc + r.totalClasses, 0);
    const attended = attendanceRecords.reduce((acc, r) => acc + r.attendedClasses, 0);
    return total > 0 ? Math.round((attended / total) * 1000) / 10 : 0;
  }, [attendanceRecords]);

  const sgpa = useMemo(() => {
    const totalCredits = results.reduce((acc, r) => acc + r.credits, 0);
    const weighted = results.reduce((acc, r) => acc + r.credits * r.gradePoints, 0);
    return totalCredits > 0 ? (weighted / totalCredits).toFixed(2) : '0.00';
  }, [results]);

  const ratingStatsFor = (titleOrCode: string) => {
    const matching = feedbackRatings.filter(
      (f) =>
        f.targetId.toLowerCase() === titleOrCode.toLowerCase() ||
        f.targetTitle.toLowerCase().includes(titleOrCode.toLowerCase())
    );
    if (matching.length === 0) return { avg: 0, count: 0 };
    const sum = matching.reduce((acc, m) => acc + m.rating, 0);
    return { avg: sum / matching.length, count: matching.length };
  };

  const handleAssignmentSubmit = async (assignment: Assignment) => {
    if (!firebaseUser || !profile || !submissionText.trim()) return;
    setSubmissionBusy(true);
    try {
      let fileUrl = '';
      let fileName = '';
      if (submissionFile) {
        const buf = await submissionFile.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: submissionFile.name,
            mimeType: submissionFile.type,
            base64Data: btoa(binary),
          }),
        });
        const uploaded = await res.json();
        if (res.ok) {
          fileUrl = uploaded.fileUrl;
          fileName = uploaded.fileName;
        }
      }

      const subRef = doc(db, 'assignments', assignment.id, 'submissions', firebaseUser.uid);
      const payload: Record<string, unknown> = {
        assignmentId: assignment.id,
        studentId: firebaseUser.uid,
        studentName: profile.displayName,
        studentRollNumber: privateInfo?.rollNumber || 'STUDENT',
        submissionText: submissionText.trim(),
        status: 'submitted',
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (fileName) payload.fileName = fileName;
      if (fileUrl) payload.fileUrl = fileUrl;

      await setDoc(subRef, payload);
      setSubmittingId(null);
      setSubmissionText('');
      setSubmissionFile(null);
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.WRITE,
        `assignments/${assignment.id}/submissions/${firebaseUser.uid}`
      );
    } finally {
      setSubmissionBusy(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !profile || !fbComment.trim() || !fbTargetTitle.trim()) return;
    setFbSubmitting(true);
    setFbSuccess(false);
    try {
      const targetId = fbTargetTitle
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_')
        .slice(0, 60);
      const newRef = doc(collection(db, 'feedback_ratings'));
      await setDoc(newRef, {
        targetType: fbTargetType,
        targetId: targetId || 'general',
        targetTitle: fbTargetTitle.trim(),
        userId: firebaseUser.uid,
        userName: profile.displayName,
        userRole: profile.role,
        rating: fbRating,
        comment: fbComment.trim(),
        createdAt: serverTimestamp(),
      });
      setFbComment('');
      setFbSuccess(true);
      setTimeout(() => setFbSuccess(false), 2500);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'feedback_ratings');
    } finally {
      setFbSubmitting(false);
    }
  };

  // 1. STUDENT DASHBOARD OVERVIEW
  if (section === 'student_dashboard') {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
              Aditya University, Surampalem · Student Workspace
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
              Welcome, {profile?.displayName}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {privateInfo?.rollNumber ? `${privateInfo.rollNumber} · ` : ''}
              {profile?.department}
              {profile?.year ? ` · ${profile.year}` : ''}
              {profile?.section ? ` · Section ${profile.section}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              onAskAI(
                'study_assistant',
                `Create a personalized weekly study plan for a ${profile?.year || ''} ${profile?.department || 'CSE'} student covering upcoming assignments and exams.`
              )
            }
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-violet-600 text-white text-xs font-semibold flex items-center gap-2 hover:opacity-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Ask Aditya AI Study Planner</span>
          </button>
        </div>

        {/* 4-column KPI strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => onNavigate('attendance')}
            className="text-left p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] hover:border-blue-400 transition-colors cursor-pointer"
          >
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Overall Attendance</p>
            <p className="font-display text-3xl font-bold text-slate-900 dark:text-white mt-2 tabular-nums">
              {overallAttendance}%
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {attendanceRecords.some((a) => a.isDemoData) ? 'Includes Sample Data' : 'Live Records'}
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('results')}
            className="text-left p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] hover:border-blue-400 transition-colors cursor-pointer"
          >
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Recorded SGPA</p>
            <p className="font-display text-3xl font-bold text-slate-900 dark:text-white mt-2 tabular-nums">
              {sgpa}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {results.length} Course Grades
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('assignments')}
            className="text-left p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] hover:border-blue-400 transition-colors cursor-pointer"
          >
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Assignments</p>
            <p className="font-display text-3xl font-bold text-slate-900 dark:text-white mt-2 tabular-nums">
              {assignments.length}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              View deadlines & submissions
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('exams')}
            className="text-left p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] hover:border-blue-400 transition-colors cursor-pointer"
          >
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Scheduled Exams</p>
            <p className="font-display text-3xl font-bold text-slate-900 dark:text-white mt-2 tabular-nums">
              {exams.length}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Timetable & AI Exam Prep
            </p>
          </button>
        </div>

        {/* Announcements & Upcoming Deadlines */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                Recent Notifications & Notices
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('announcements')}
                className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {announcements.slice(0, 3).map((ann) => (
                <div key={ann.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {ann.category} · {ann.department}
                    </span>
                    <DemoLabel isDemo={ann.isDemoData} />
                  </div>
                  <p className="font-medium text-sm text-slate-900 dark:text-white">{ann.title}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    {ann.content}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                Upcoming Assignments & Exams
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('assignments')}
                className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Open Tracker
              </button>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {assignments.slice(0, 3).map((a) => (
                <div key={a.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
                      {a.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                      {a.courseCode} · Due {a.dueDate} · {a.maxMarks} Marks
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onAskAI(
                        'assignment_helper',
                        `Help me understand and structure this assignment (${a.courseCode}): ${a.title}. Description: ${a.description}`
                      )
                    }
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 cursor-pointer"
                  >
                    AI Helper
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. ASSIGNMENTS
  if (section === 'assignments') {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              Assignments & Submission Deadlines
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Track faculty-published coursework, submit your work, and inspect graded feedback.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {assignments.map((a) => {
            const sub = mySubmissions[a.id];
            const isOpen = submittingId === a.id;
            return (
              <div
                key={a.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] p-6 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono font-semibold text-blue-700 dark:text-blue-300">
                        {a.courseCode}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{a.department} · Year {a.year} · Sec {a.section}</span>
                      <span aria-hidden="true">·</span>
                      <DemoLabel isDemo={a.isDemoData} />
                    </div>
                    <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                      {a.title}
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{a.description}</p>
                  </div>

                  <div className="text-right shrink-0 space-y-1 tabular-nums">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">
                      Due: {a.dueDate}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Max Marks: {a.maxMarks} · By {a.createdByName}
                    </p>
                  </div>
                </div>

                {sub && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700 dark:text-emerald-400 uppercase">
                          Status: {sub.status}
                        </span>
                        {sub.marks !== undefined && (
                          <span className="text-slate-900 dark:text-white tabular-nums">
                            · Score: {sub.marks} / {a.maxMarks}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {sub.submissionText}
                      </p>
                      {sub.feedback && (
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          Faculty Feedback: {sub.feedback}
                        </p>
                      )}
                    </div>
                    {sub.fileUrl && (
                      <a
                        href={sub.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1 hover:underline"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{sub.fileName || 'Attachment'}</span>
                      </a>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {!a.isDemoData && (!sub || sub.status !== 'graded') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSubmittingId(isOpen ? null : a.id);
                        setSubmissionText(sub?.submissionText || '');
                      }}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-700 to-violet-600 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{sub ? 'Update Submission' : 'Submit Assignment'}</span>
                    </button>
                  )}

                  {a.isDemoData && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Sample assignment (publish a live assignment in Faculty Portal to enable submissions).
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      onAskAI(
                        'assignment_helper',
                        `Guide me step by step on how to solve this assignment for ${a.courseCode}: "${a.title}". Details: ${a.description}`
                      )
                    }
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Ask AI Assignment Helper</span>
                  </button>
                </div>

                {isOpen && (
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                    <textarea
                      rows={3}
                      value={submissionText}
                      onChange={(e) => setSubmissionText(e.target.value)}
                      placeholder="Write your solution summary, repository link, or notes..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <input
                        type="file"
                        onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)}
                        className="text-xs text-slate-600 dark:text-slate-300"
                      />
                      <button
                        type="button"
                        disabled={submissionBusy || !submissionText.trim()}
                        onClick={() => void handleAssignmentSubmit(a)}
                        className="px-4 py-2 rounded-xl bg-blue-700 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
                      >
                        {submissionBusy ? 'Uploading...' : 'Confirm Submission'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 3. EXAMS
  if (section === 'exams') {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              Upcoming Examinations & Timetables
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              View scheduled mid-term, lab, and semester exams. Sample entries are clearly marked as illustrative.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              onAskAI(
                'exam_prep',
                'Create a high-yield exam preparation schedule and important questions checklist for my upcoming semester examinations.'
              )
            }
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-700 to-violet-600 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Exam Prep Assistant</span>
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <th className="py-3.5 px-4">Course</th>
                <th className="py-3.5 px-4">Examination</th>
                <th className="py-3.5 px-4">Dept / Year</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Venue</th>
                <th className="py-3.5 px-4">Source</th>
                <th className="py-3.5 px-4 text-right">Prep</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {exams.map((ex) => (
                <tr key={ex.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                  <td className="py-3.5 px-4 font-mono font-semibold text-blue-700 dark:text-blue-300">
                    {ex.courseCode}
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-medium text-slate-900 dark:text-white">{ex.courseName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{ex.examType}</p>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                    {ex.department} · Year {ex.year}
                  </td>
                  <td className="py-3.5 px-4 tabular-nums text-xs">
                    <p className="font-medium text-slate-900 dark:text-white">{ex.examDate}</p>
                    <p className="text-slate-500 dark:text-slate-400">
                      {ex.startTime} – {ex.endTime}
                    </p>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                    {ex.venue}
                  </td>
                  <td className="py-3.5 px-4">
                    <DemoLabel isDemo={ex.isDemoData} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        onAskAI(
                          'exam_prep',
                          `Give me key topics, 2-mark questions, and 10-mark essay questions to prepare for ${ex.courseCode} (${ex.courseName}).`
                        )
                      }
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Prep Guide
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 4. ATTENDANCE
  if (section === 'attendance') {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              Attendance Tracking
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Subject-wise class attendance breakdown. Maintain at least 75.0% for semester eligibility.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 dark:text-slate-400">Aggregate Attendance</p>
            <p className="font-display text-3xl font-bold text-blue-700 dark:text-blue-300 tabular-nums">
              {overallAttendance}%
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <th className="py-3.5 px-4">Course</th>
                <th className="py-3.5 px-4">Semester</th>
                <th className="py-3.5 px-4 text-right">Attended</th>
                <th className="py-3.5 px-4 text-right">Total</th>
                <th className="py-3.5 px-4 text-right">Percentage</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {attendanceRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-slate-500">
                    No attendance records available yet.
                  </td>
                </tr>
              ) : (
                attendanceRecords.map((rec) => {
                  const pct =
                    rec.totalClasses > 0
                      ? (rec.attendedClasses / rec.totalClasses) * 100
                      : 0;
                  const nominal = pct >= 75;
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-slate-900 dark:text-white">{rec.courseName}</p>
                        <p className="text-xs font-mono text-slate-500">{rec.courseCode}</p>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                        {rec.semester}
                      </td>
                      <td className="py-3.5 px-4 text-right tabular-nums font-mono">
                        {rec.attendedClasses}
                      </td>
                      <td className="py-3.5 px-4 text-right tabular-nums font-mono">
                        {rec.totalClasses}
                      </td>
                      <td className="py-3.5 px-4 text-right tabular-nums font-semibold">
                        {pct.toFixed(1)}%
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium">
                        {nominal ? (
                          <span className="text-emerald-700 dark:text-emerald-400">
                            ● Eligible (≥ 75%)
                          </span>
                        ) : (
                          <span className="text-amber-700 dark:text-amber-400">
                            ▲ Below 75% Target
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <DemoLabel isDemo={rec.isDemoData} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 5. RESULTS & GRADES
  if (section === 'results') {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              Academic Results & Grades
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Course-wise grade card and SGPA calculation. Sample records are explicitly labeled.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 dark:text-slate-400">Computed SGPA</p>
            <p className="font-display text-3xl font-bold text-blue-700 dark:text-blue-300 tabular-nums">
              {sgpa}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <th className="py-3.5 px-4">Semester</th>
                <th className="py-3.5 px-4">Course Code</th>
                <th className="py-3.5 px-4">Course Title</th>
                <th className="py-3.5 px-4 text-right">Credits</th>
                <th className="py-3.5 px-4 text-right">Grade</th>
                <th className="py-3.5 px-4 text-right">Points</th>
                <th className="py-3.5 px-4">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {results.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-slate-500">
                    No published semester results yet.
                  </td>
                </tr>
              ) : (
                results.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                      {r.semester}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-blue-700 dark:text-blue-300">
                      {r.courseCode}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                      {r.courseName}
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums">{r.credits}</td>
                    <td className="py-3.5 px-4 text-right font-semibold text-emerald-700 dark:text-emerald-400">
                      {r.grade}
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums font-mono">
                      {r.gradePoints.toFixed(1)}
                    </td>
                    <td className="py-3.5 px-4">
                      <DemoLabel isDemo={r.isDemoData} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 6. STUDY MATERIALS & NOTES
  if (section === 'materials') {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] overflow-hidden">
          <div className="lg:col-span-7 p-6 space-y-2">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
              Study Materials & Digital Notes
            </p>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              Faculty Notes, PDFs & AI Summaries
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Access lecture PDFs and unit notes uploaded by Aditya University faculty, or ask Aditya AI Notes Generator to synthesize custom study guides.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() =>
                  onAskAI(
                    'notes_generator',
                    'Generate structured, exam-ready lecture notes for a subject of my choice.'
                  )
                }
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-700 to-violet-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Launch AI Notes Generator</span>
              </button>
            </div>
          </div>
          <div className="lg:col-span-5 h-48 lg:h-full">
            <img
              src="/src/assets/images/study_workspace_banner_1794543511065.jpg"
              alt="Aditya University Digital Study Studio"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {materials.map((m) => {
            const stats = ratingStatsFor(m.title);
            return (
              <div
                key={m.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] p-6 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      {m.courseCode} · {m.department} · {m.semester}
                    </span>
                    <DemoLabel isDemo={m.isDemoData} />
                  </div>
                  <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                    {m.title}
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{m.description}</p>
                  {m.contentSummary && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Key Summary:{' '}
                      </span>
                      {m.contentSummary}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <StarDisplay avg={stats.avg} count={stats.count} />
                  <div className="flex items-center gap-2">
                    {m.fileUrl && (
                      <a
                        href={m.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open PDF/File</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setFbTargetType('material');
                        setFbTargetTitle(m.title);
                        onNavigate('feedback');
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Rate
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 7. LEARNING SKILLS & COURSES
  if (section === 'courses') {
    const categories = ['All', 'Core', 'Skill Track', 'Lab', 'Elective'];
    const filtered = courses.filter((c) => {
      const catOk = courseFilter === 'All' || c.category === courseFilter;
      const qOk =
        !searchQuery.trim() ||
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.department.toLowerCase().includes(searchQuery.toLowerCase());
      return catOk && qOk;
    });

    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              Courses & Learning Skill Tracks
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Explore department courses, placement skill tracks, and 5-star student ratings.
            </p>
          </div>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search code, title, department..."
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl w-fit">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCourseFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                courseFilter === cat
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((c) => {
            const stats = ratingStatsFor(c.title);
            return (
              <div
                key={c.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] p-6 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono font-semibold text-blue-700 dark:text-blue-300">
                      {c.code} · {c.category}
                    </span>
                    <DemoLabel isDemo={c.isDemoData} />
                  </div>
                  <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                    {c.title}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {c.department} · {c.semester} · {c.credits} Credits · {c.instructorName}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {c.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <StarDisplay avg={stats.avg} count={stats.count} />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onAskAI(
                          'study_assistant',
                          `Teach me the foundational syllabus topics and career applications of ${c.code}: ${c.title}.`
                        )
                      }
                      className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-blue-700 to-violet-600 text-white text-xs font-semibold cursor-pointer"
                    >
                      Study with AI
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFbTargetType('course');
                        setFbTargetTitle(`${c.title} (${c.code})`);
                        onNavigate('feedback');
                      }}
                      className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Rate 5★
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 8. ANNOUNCEMENTS
  if (section === 'announcements') {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            University Announcements & Circulars
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Official notices published by Aditya University faculty and administration. Illustrative placeholders are clearly labeled.
          </p>
        </div>

        <div className="space-y-4">
          {announcements.map((ann) => (
            <article
              key={ann.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] p-6 space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {ann.category} · {ann.department} · For: {ann.targetRole.toUpperCase()}
                  {ann.isPinned ? ' · Pinned Notice' : ''}
                </span>
                <DemoLabel isDemo={ann.isDemoData} />
              </div>
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                {ann.title}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {ann.content}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                Published by {ann.authorName} ({ann.authorRole})
              </p>
            </article>
          ))}
        </div>
      </div>
    );
  }

  // 9. EVENTS & ACADEMIC CALENDAR
  if (section === 'calendar') {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            University Events & Academic Calendar
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Key academic milestones, symposiums, workshops, and calendar dates at Aditya University, Surampalem.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] p-6 space-y-2"
            >
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-mono font-semibold text-blue-700 dark:text-blue-300">
                  {ev.eventDate} · {ev.category}
                </span>
                <DemoLabel isDemo={ev.isDemoData} />
              </div>
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                {ev.title}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">{ev.description}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                Venue: {ev.venue}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 10. FEEDBACK & 5-STAR RATING SYSTEM
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Faculty & Student Feedback · 5-Star Ratings
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Rate courses, learning resources, faculty sessions, and Aditya AI to continuously improve academic quality.
        </p>
      </div>

      <form
        onSubmit={handleFeedbackSubmit}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] p-6 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Rating Category
            </label>
            <select
              value={fbTargetType}
              onChange={(e) =>
                setFbTargetType(e.target.value as 'course' | 'material' | 'faculty' | 'platform')
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="course">Course</option>
              <option value="material">Study Material / Notes</option>
              <option value="faculty">Faculty Teaching</option>
              <option value="platform">Aditya AI Platform</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Course, Resource, or Subject Name
            </label>
            <input
              type="text"
              required
              value={fbTargetTitle}
              onChange={(e) => setFbTargetTitle(e.target.value)}
              placeholder="e.g. Data Structures (CS301)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Five-Star Rating ({fbRating} / 5)
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setFbRating(star)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  star <= fbRating
                    ? 'text-amber-500'
                    : 'text-slate-300 dark:text-slate-700 hover:text-amber-400'
                }`}
                aria-label={`Rate ${star} stars`}
              >
                <Star className="w-6 h-6" fill={star <= fbRating ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Constructive Feedback
          </label>
          <textarea
            rows={3}
            required
            value={fbComment}
            onChange={(e) => setFbComment(e.target.value)}
            placeholder="Share what worked well or what can be improved..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <button
            type="submit"
            disabled={fbSubmitting}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-violet-600 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{fbSubmitting ? 'Submitting...' : 'Submit Rating'}</span>
          </button>
          {fbSuccess && (
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Rating saved to university feedback ledger.
            </span>
          )}
        </div>
      </form>

      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
          Submitted Ratings ({feedbackRatings.length})
        </h2>
        {feedbackRatings.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No ratings submitted yet. Be the first to rate a course or study resource.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {feedbackRatings.map((fb) => (
              <div
                key={fb.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] p-5 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-400 uppercase">
                    {fb.targetType}
                  </span>
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className="w-3.5 h-3.5"
                        fill={s <= fb.rating ? 'currentColor' : 'none'}
                      />
                    ))}
                  </div>
                </div>
                <p className="font-medium text-sm text-slate-900 dark:text-white">
                  {fb.targetTitle}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">{fb.comment}</p>
                <p className="text-xs text-slate-400">
                  By {fb.userName} ({fb.userRole})
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
