import React, { useEffect, useState } from 'react';
import {
  BookPlus,
  CheckCircle2,
  ClipboardCheck,
  FileUp,
  Megaphone,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { OperationType, db, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  ADITYA_DEPARTMENTS,
  Announcement,
  Assignment,
  StudyMaterial,
  Submission,
} from '../types';

interface FacultyPortalProps {
  liveMaterials: StudyMaterial[];
  liveAssignments: Assignment[];
  liveAnnouncements: Announcement[];
}

export function FacultyPortal({
  liveMaterials,
  liveAssignments,
  liveAnnouncements,
}: FacultyPortalProps) {
  const { firebaseUser, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'materials' | 'assignments' | 'announcements' | 'submissions'>('materials');

  // Upload Material state
  const [matTitle, setMatTitle] = useState('');
  const [matDesc, setMatDesc] = useState('');
  const [matCourse, setMatCourse] = useState('CS301');
  const [matDept, setMatDept] = useState(profile?.department || 'CSE');
  const [matSem, setMatSem] = useState('Sem 3');
  const [matSummary, setMatSummary] = useState('');
  const [matFile, setMatFile] = useState<File | null>(null);
  const [matBusy, setMatBusy] = useState(false);
  const [aiSummarizing, setAiSummarizing] = useState(false);

  // Create Assignment state
  const [asTitle, setAsTitle] = useState('');
  const [asDesc, setAsDesc] = useState('');
  const [asCourse, setAsCourse] = useState('CS301');
  const [asDept, setAsDept] = useState(profile?.department || 'CSE');
  const [asYear, setAsYear] = useState('3rd Year');
  const [asSection, setAsSection] = useState('A');
  const [asDueDate, setAsDueDate] = useState('2026-12-10');
  const [asMaxMarks, setAsMaxMarks] = useState(25);
  const [asBusy, setAsBusy] = useState(false);

  // Publish Announcement state
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annCategory, setAnnCategory] = useState<'Academic' | 'Exam' | 'Campus' | 'Placement' | 'General'>('Academic');
  const [annDept, setAnnDept] = useState(profile?.department || 'CSE');
  const [annBusy, setAnnBusy] = useState(false);

  // Manage Submissions state
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [gradeInputs, setGradeInputs] = useState<Record<string, { marks: string; feedback: string }>>({});

  useEffect(() => {
    if (!selectedAssignmentId && liveAssignments.length > 0) {
      setSelectedAssignmentId(liveAssignments[0].id);
    }
  }, [liveAssignments, selectedAssignmentId]);

  useEffect(() => {
    if (!selectedAssignmentId) {
      setSubmissions([]);
      return;
    }
    const unsub = onSnapshot(
      collection(db, 'assignments', selectedAssignmentId, 'submissions'),
      (snap) => {
        setSubmissions(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Submission));
      },
      (err) =>
        handleFirestoreError(
          err,
          OperationType.LIST,
          `assignments/${selectedAssignmentId}/submissions`
        )
    );
    return () => unsub();
  }, [selectedAssignmentId]);

  if (!profile || (profile.role !== 'faculty' && profile.role !== 'admin')) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="p-6 rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-sm text-red-700 dark:text-red-300">
          Access Restricted: Only verified Faculty and Administrators can open the Faculty Portal.
        </div>
      </div>
    );
  }

  const handleSummarizeWithAI = async () => {
    if (!matFile) return;
    setAiSummarizing(true);
    try {
      const isText = matFile.type.startsWith('text/') || /\.(txt|md|csv)$/i.test(matFile.name);
      let payload: Record<string, string> = {
        title: matTitle || matFile.name,
        fileName: matFile.name,
        mimeType: matFile.type || 'application/pdf',
      };

      if (isText) {
        payload.textContent = await matFile.text();
      } else {
        const buf = await matFile.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        payload.base64Data = btoa(binary);
      }

      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.summary) {
        setMatSummary(data.summary);
      }
    } finally {
      setAiSummarizing(false);
    }
  };

  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !matTitle.trim()) return;
    setMatBusy(true);
    try {
      let fileUrl = '';
      let fileName = 'notes_reference.txt';
      let fileType = 'text/plain';

      if (matFile) {
        const buf = await matFile.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        const upRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: matFile.name,
            mimeType: matFile.type || 'application/pdf',
            base64Data: btoa(binary),
          }),
        });
        const uploaded = await upRes.json();
        if (upRes.ok) {
          fileUrl = uploaded.fileUrl;
          fileName = uploaded.fileName;
          fileType = uploaded.mimeType;
        }
      }

      const newRef = doc(collection(db, 'study_materials'));
      await setDoc(newRef, {
        title: matTitle.trim(),
        description: matDesc.trim() || 'Faculty study material',
        courseCode: matCourse.trim().toUpperCase(),
        department: matDept,
        semester: matSem,
        fileName,
        fileUrl,
        fileType,
        contentSummary: matSummary.trim(),
        uploadedByUid: firebaseUser.uid,
        uploadedByName: profile.displayName,
        isDemoData: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setMatTitle('');
      setMatDesc('');
      setMatSummary('');
      setMatFile(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'study_materials');
    } finally {
      setMatBusy(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !asTitle.trim()) return;
    setAsBusy(true);
    try {
      const newRef = doc(collection(db, 'assignments'));
      await setDoc(newRef, {
        title: asTitle.trim(),
        description: asDesc.trim() || 'Complete and submit before due date.',
        courseCode: asCourse.trim().toUpperCase(),
        department: asDept,
        year: asYear,
        section: asSection,
        dueDate: asDueDate,
        maxMarks: Number(asMaxMarks) || 25,
        createdByUid: firebaseUser.uid,
        createdByName: profile.displayName,
        isDemoData: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setAsTitle('');
      setAsDesc('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'assignments');
    } finally {
      setAsBusy(false);
    }
  };

  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !annTitle.trim() || !annContent.trim()) return;
    setAnnBusy(true);
    try {
      const newRef = doc(collection(db, 'announcements'));
      await setDoc(newRef, {
        title: annTitle.trim(),
        content: annContent.trim(),
        category: annCategory,
        targetRole: 'student',
        department: annDept,
        authorUid: firebaseUser.uid,
        authorName: profile.displayName,
        authorRole: profile.role === 'admin' ? 'admin' : 'faculty',
        isPinned: false,
        isDemoData: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setAnnTitle('');
      setAnnContent('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'announcements');
    } finally {
      setAnnBusy(false);
    }
  };

  const handleGradeSubmission = async (sub: Submission) => {
    if (!firebaseUser || !selectedAssignmentId) return;
    const entry = gradeInputs[sub.id];
    const marksNum = Number(entry?.marks ?? sub.marks ?? 0);
    try {
      await updateDoc(doc(db, 'assignments', selectedAssignmentId, 'submissions', sub.id), {
        status: 'graded',
        marks: marksNum,
        feedback: (entry?.feedback ?? sub.feedback ?? 'Reviewed').trim(),
        gradedByUid: firebaseUser.uid,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `assignments/${selectedAssignmentId}/submissions/${sub.id}`
      );
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
          Faculty Workspace · {profile.department}
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
          Faculty Portal
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Upload study PDFs with AI summaries, publish assignments, announce notices, and grade student submissions.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl w-fit">
        {[
          { id: 'materials', label: 'Study Materials & PDFs', icon: <FileUp className="w-3.5 h-3.5" /> },
          { id: 'assignments', label: 'Create Assignments', icon: <BookPlus className="w-3.5 h-3.5" /> },
          { id: 'submissions', label: 'Manage Submissions', icon: <ClipboardCheck className="w-3.5 h-3.5" /> },
          { id: 'announcements', label: 'Publish Announcements', icon: <Megaphone className="w-3.5 h-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: UPLOAD MATERIALS */}
      {activeTab === 'materials' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleUploadMaterial}
            className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] p-6 space-y-4"
          >
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Upload Study Material / PDF
            </h2>
            <input
              type="text"
              required
              value={matTitle}
              onChange={(e) => setMatTitle(e.target.value)}
              placeholder="Material Title (e.g. Unit 4: Dynamic Programming)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
            />
            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                required
                value={matCourse}
                onChange={(e) => setMatCourse(e.target.value)}
                placeholder="Course Code"
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-mono uppercase"
              />
              <select
                value={matDept}
                onChange={(e) => setMatDept(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
              >
                {ADITYA_DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <input
                type="text"
                required
                value={matSem}
                onChange={(e) => setMatSem(e.target.value)}
                placeholder="Sem 3"
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
              />
            </div>
            <textarea
              rows={2}
              value={matDesc}
              onChange={(e) => setMatDesc(e.target.value)}
              placeholder="Short description for students..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
            />
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
              <input
                type="file"
                accept=".pdf,.txt,.md,.doc,.docx"
                onChange={(e) => setMatFile(e.target.files?.[0] || null)}
                className="text-xs text-slate-600 dark:text-slate-300"
              />
              {matFile && (
                <button
                  type="button"
                  disabled={aiSummarizing}
                  onClick={handleSummarizeWithAI}
                  className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{aiSummarizing ? 'Summarizing...' : 'Auto-Summarize PDF'}</span>
                </button>
              )}
            </div>
            <textarea
              rows={3}
              value={matSummary}
              onChange={(e) => setMatSummary(e.target.value)}
              placeholder="AI-generated or manual key takeaways summary..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
            />
            <button
              type="submit"
              disabled={matBusy}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-violet-600 text-white text-sm font-semibold disabled:opacity-50 cursor-pointer"
            >
              {matBusy ? 'Publishing Material...' : 'Publish Study Material'}
            </button>
          </form>

          <div className="lg:col-span-6 space-y-3">
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Published Materials ({liveMaterials.length})
            </h2>
            {liveMaterials.length === 0 ? (
              <p className="text-sm text-slate-500">No live materials published yet.</p>
            ) : (
              liveMaterials.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] p-4 flex items-start justify-between gap-3"
                >
                  <div>
                    <p className="text-xs font-mono text-blue-700 dark:text-blue-300">
                      {m.courseCode} · {m.department}
                    </p>
                    <p className="font-semibold text-sm text-slate-900 dark:text-white mt-0.5">
                      {m.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{m.fileName}</p>
                  </div>
                  {(profile.role === 'admin' || m.uploadedByUid === firebaseUser?.uid) && (
                    <button
                      type="button"
                      onClick={() => deleteDoc(doc(db, 'study_materials', m.id))}
                      className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                      aria-label="Delete material"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CREATE ASSIGNMENTS */}
      {activeTab === 'assignments' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleCreateAssignment}
            className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] p-6 space-y-4"
          >
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Create New Assignment
            </h2>
            <input
              type="text"
              required
              value={asTitle}
              onChange={(e) => setAsTitle(e.target.value)}
              placeholder="Assignment Title"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
            />
            <textarea
              rows={3}
              required
              value={asDesc}
              onChange={(e) => setAsDesc(e.target.value)}
              placeholder="Instructions, deliverables, and rubric..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <input
                type="text"
                required
                value={asCourse}
                onChange={(e) => setAsCourse(e.target.value)}
                placeholder="CS301"
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-mono uppercase"
              />
              <select
                value={asDept}
                onChange={(e) => setAsDept(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
              >
                {ADITYA_DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <input
                type="text"
                required
                value={asYear}
                onChange={(e) => setAsYear(e.target.value)}
                placeholder="3rd Year"
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
              />
              <input
                type="text"
                required
                value={asSection}
                onChange={(e) => setAsSection(e.target.value)}
                placeholder="Sec A"
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Due Date</label>
                <input
                  type="date"
                  required
                  value={asDueDate}
                  onChange={(e) => setAsDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Max Marks</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  required
                  value={asMaxMarks}
                  onChange={(e) => setAsMaxMarks(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm tabular-nums"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={asBusy}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-violet-600 text-white text-sm font-semibold disabled:opacity-50 cursor-pointer"
            >
              {asBusy ? 'Creating Assignment...' : 'Publish Assignment'}
            </button>
          </form>

          <div className="lg:col-span-6 space-y-3">
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Live Assignments ({liveAssignments.length})
            </h2>
            {liveAssignments.length === 0 ? (
              <p className="text-sm text-slate-500">No live assignments created yet.</p>
            ) : (
              liveAssignments.map((a) => (
                <div
                  key={a.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] p-4 flex items-start justify-between gap-3"
                >
                  <div>
                    <p className="text-xs font-mono text-blue-700 dark:text-blue-300">
                      {a.courseCode} · Due {a.dueDate} · {a.maxMarks} Marks
                    </p>
                    <p className="font-semibold text-sm text-slate-900 dark:text-white mt-0.5">
                      {a.title}
                    </p>
                  </div>
                  {(profile.role === 'admin' || a.createdByUid === firebaseUser?.uid) && (
                    <button
                      type="button"
                      onClick={() => deleteDoc(doc(db, 'assignments', a.id))}
                      className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                      aria-label="Delete assignment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: MANAGE SUBMISSIONS */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Select Assignment:
            </label>
            <select
              value={selectedAssignmentId}
              onChange={(e) => setSelectedAssignmentId(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            >
              {liveAssignments.length === 0 && <option value="">No live assignments</option>}
              {liveAssignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.courseCode} – {a.title}
                </option>
              ))}
            </select>
          </div>

          {submissions.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] p-8 text-center text-sm text-slate-500">
              No student submissions received for this assignment yet.
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub) => {
                const draft = gradeInputs[sub.id] || {
                  marks: sub.marks !== undefined ? String(sub.marks) : '',
                  feedback: sub.feedback || '',
                };
                return (
                  <div
                    key={sub.id}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] p-5 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm text-slate-900 dark:text-white">
                          {sub.studentName} ({sub.studentRollNumber})
                        </p>
                        <p className="text-xs text-slate-500 uppercase">Status: {sub.status}</p>
                      </div>
                      {sub.fileUrl && (
                        <a
                          href={sub.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                        >
                          Download {sub.fileName}
                        </a>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl">
                      {sub.submissionText}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                      <input
                        type="number"
                        min={0}
                        max={500}
                        placeholder="Marks"
                        value={draft.marks}
                        onChange={(e) =>
                          setGradeInputs((prev) => ({
                            ...prev,
                            [sub.id]: { ...draft, marks: e.target.value },
                          }))
                        }
                        className="sm:col-span-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm tabular-nums"
                      />
                      <input
                        type="text"
                        placeholder="Faculty feedback..."
                        value={draft.feedback}
                        onChange={(e) =>
                          setGradeInputs((prev) => ({
                            ...prev,
                            [sub.id]: { ...draft, feedback: e.target.value },
                          }))
                        }
                        className="sm:col-span-8 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => void handleGradeSubmission(sub)}
                        className="sm:col-span-2 py-2 px-3 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Save Grade</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handlePublishAnnouncement}
            className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] p-6 space-y-4"
          >
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Publish Faculty Announcement
            </h2>
            <input
              type="text"
              required
              value={annTitle}
              onChange={(e) => setAnnTitle(e.target.value)}
              placeholder="Announcement Headline"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={annCategory}
                onChange={(e) => setAnnCategory(e.target.value as typeof annCategory)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
              >
                <option>Academic</option>
                <option>Exam</option>
                <option>Campus</option>
                <option>Placement</option>
                <option>General</option>
              </select>
              <select
                value={annDept}
                onChange={(e) => setAnnDept(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
              >
                <option value="All Departments">All Departments</option>
                {ADITYA_DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              rows={4}
              required
              value={annContent}
              onChange={(e) => setAnnContent(e.target.value)}
              placeholder="Write official announcement details..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
            />
            <button
              type="submit"
              disabled={annBusy}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-violet-600 text-white text-sm font-semibold disabled:opacity-50 cursor-pointer"
            >
              {annBusy ? 'Publishing...' : 'Publish Announcement'}
            </button>
          </form>

          <div className="lg:col-span-6 space-y-3">
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Published Announcements ({liveAnnouncements.length})
            </h2>
            {liveAnnouncements.map((ann) => (
              <div
                key={ann.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] p-4 flex items-start justify-between gap-3"
              >
                <div>
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    {ann.category} · {ann.department}
                  </p>
                  <p className="font-semibold text-sm text-slate-900 dark:text-white mt-0.5">
                    {ann.title}
                  </p>
                </div>
                {(profile.role === 'admin' || ann.authorUid === firebaseUser?.uid) && (
                  <button
                    type="button"
                    onClick={() => deleteDoc(doc(db, 'announcements', ann.id))}
                    className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                    aria-label="Delete announcement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
