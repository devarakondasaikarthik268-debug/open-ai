import React, { useEffect, useState } from 'react';
import {
  Building2,
  CalendarPlus,
  Check,
  Megaphone,
  ShieldAlert,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { OperationType, db, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  ADITYA_DEPARTMENTS,
  Announcement,
  Assignment,
  CampusEvent,
  Course,
  Department,
  Exam,
  FacultyRequest,
  FeedbackRating,
  PublicProfile,
} from '../types';

interface AdminDashboardProps {
  directoryProfiles: PublicProfile[];
  liveDepartments: Department[];
  liveCourses: Course[];
  liveAssignments: Assignment[];
  liveExams: Exam[];
  liveAnnouncements: Announcement[];
  liveEvents: CampusEvent[];
  feedbackRatings: FeedbackRating[];
}

export function AdminDashboard({
  directoryProfiles,
  liveDepartments,
  liveCourses,
  liveAssignments,
  liveExams,
  liveAnnouncements,
  liveEvents,
  feedbackRatings,
}: AdminDashboardProps) {
  const { firebaseUser, profile } = useAuth();
  const [tab, setTab] = useState<'accounts' | 'academics' | 'exams' | 'notices' | 'usage'>('accounts');

  const [facultyRequests, setFacultyRequests] = useState<FacultyRequest[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteDept, setInviteDept] = useState('CSE');
  const [inviteDesig, setInviteDesig] = useState('Assistant Professor');

  // Department & Course forms
  const [deptCode, setDeptCode] = useState('');
  const [deptName, setDeptName] = useState('');
  const [deptHod, setDeptHod] = useState('');

  const [courseCode, setCourseCode] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDept, setCourseDept] = useState('CSE');
  const [courseSem, setCourseSem] = useState('Sem 4');
  const [courseCredits, setCourseCredits] = useState(3);
  const [courseInstructor, setCourseInstructor] = useState('');
  const [courseCategory, setCourseCategory] = useState<'Core' | 'Skill Track' | 'Lab' | 'Elective'>('Core');

  // Exam & Event forms
  const [exCourseCode, setExCourseCode] = useState('');
  const [exCourseName, setExCourseName] = useState('');
  const [exDept, setExDept] = useState('CSE');
  const [exYear, setExYear] = useState('3');
  const [exDate, setExDate] = useState('2026-12-12');
  const [exStart, setExStart] = useState('09:30 AM');
  const [exEnd, setExEnd] = useState('12:30 PM');
  const [exVenue, setExVenue] = useState('Main Exam Block · Hall 101');
  const [exType, setExType] = useState<'Mid-1' | 'Mid-2' | 'Semester' | 'Lab'>('Semester');

  const [evTitle, setEvTitle] = useState('');
  const [evDate, setEvDate] = useState('2026-12-18');
  const [evVenue, setEvVenue] = useState('Aditya Auditorium, Surampalem');
  const [evCat, setEvCat] = useState<'Academic' | 'Technical' | 'Cultural' | 'Holiday' | 'Exam'>('Academic');
  const [evDesc, setEvDesc] = useState('');

  // University-wide Notification
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticeCat, setNoticeCat] = useState<'Academic' | 'Exam' | 'Campus' | 'Placement' | 'General'>('Academic');
  const [noticeTarget, setNoticeTarget] = useState<'all' | 'student' | 'faculty'>('all');
  const [noticePinned, setNoticePinned] = useState(true);

  useEffect(() => {
    if (profile?.role !== 'admin') return;
    const unsub = onSnapshot(
      collection(db, 'faculty_requests'),
      (snap) => {
        setFacultyRequests(snap.docs.map((d) => d.data() as FacultyRequest));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'faculty_requests')
    );
    return () => unsub();
  }, [profile]);

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="p-6 rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-sm text-red-700 dark:text-red-300 flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span>
            Administrator Privileges Required: Students and Faculty cannot access Administrator controls.
          </span>
        </div>
      </div>
    );
  }

  const handleApproveFaculty = async (req: FacultyRequest) => {
    if (!firebaseUser) return;
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'faculty_requests', req.uid), {
        status: 'approved',
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'faculty_members', req.uid), {
        uid: req.uid,
        displayName: req.displayName,
        department: req.department,
        designation: req.designation,
        approvedBy: firebaseUser.uid,
        createdAt: serverTimestamp(),
      });
      batch.set(doc(db, 'profiles_public', req.uid), {
        uid: req.uid,
        displayName: req.displayName,
        role: 'faculty',
        department: req.department,
        designation: req.designation,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'users_private', req.uid), {
        uid: req.uid,
        email: req.email,
        facultyId: req.facultyId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `faculty_requests/${req.uid}`);
    }
  };

  const handleRejectFaculty = async (req: FacultyRequest) => {
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'faculty_requests', req.uid), {
        status: 'rejected',
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `faculty_requests/${req.uid}`);
    }
  };

  const handleInviteFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !inviteEmail.trim()) return;
    const email = inviteEmail.trim().toLowerCase();
    try {
      await setDoc(doc(db, 'faculty_invites', email), {
        email,
        department: inviteDept,
        designation: inviteDesig,
        invitedBy: firebaseUser.uid,
        createdAt: serverTimestamp(),
      });
      setInviteEmail('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `faculty_invites/${email}`);
    }
  };

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptCode.trim() || !deptName.trim()) return;
    try {
      const ref = doc(collection(db, 'departments'));
      await setDoc(ref, {
        code: deptCode.trim().toUpperCase(),
        name: deptName.trim(),
        hodName: deptHod.trim() || 'TBA',
        description: `${deptName.trim()} department at Aditya University, Surampalem.`,
        isDemoData: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setDeptCode('');
      setDeptName('');
      setDeptHod('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'departments');
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseCode.trim() || !courseTitle.trim()) return;
    try {
      const ref = doc(collection(db, 'courses'));
      await setDoc(ref, {
        code: courseCode.trim().toUpperCase(),
        title: courseTitle.trim(),
        department: courseDept,
        semester: courseSem,
        credits: Number(courseCredits) || 3,
        instructorName: courseInstructor.trim() || 'Faculty',
        description: `${courseTitle.trim()} curriculum & learning track.`,
        category: courseCategory,
        isDemoData: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setCourseCode('');
      setCourseTitle('');
      setCourseInstructor('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'courses');
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !exCourseCode.trim() || !exCourseName.trim()) return;
    try {
      const ref = doc(collection(db, 'exams'));
      await setDoc(ref, {
        title: `${exType} Exam: ${exCourseName.trim()}`,
        courseCode: exCourseCode.trim().toUpperCase(),
        courseName: exCourseName.trim(),
        department: exDept,
        year: exYear,
        examDate: exDate,
        startTime: exStart,
        endTime: exEnd,
        venue: exVenue,
        examType: exType,
        isDemoData: false,
        createdByUid: firebaseUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setExCourseCode('');
      setExCourseName('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'exams');
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !evTitle.trim()) return;
    try {
      const ref = doc(collection(db, 'events'));
      await setDoc(ref, {
        title: evTitle.trim(),
        description: evDesc.trim() || 'Official Aditya University academic calendar event.',
        eventDate: evDate,
        venue: evVenue,
        category: evCat,
        isDemoData: false,
        createdByUid: firebaseUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setEvTitle('');
      setEvDesc('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'events');
    }
  };

  const handlePublishNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !noticeTitle.trim() || !noticeContent.trim()) return;
    try {
      const ref = doc(collection(db, 'announcements'));
      await setDoc(ref, {
        title: noticeTitle.trim(),
        content: noticeContent.trim(),
        category: noticeCat,
        targetRole: noticeTarget,
        department: 'All Departments',
        authorUid: firebaseUser.uid,
        authorName: profile.displayName,
        authorRole: 'admin',
        isPinned: noticePinned,
        isDemoData: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setNoticeTitle('');
      setNoticeContent('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'announcements');
    }
  };

  const pendingFaculty = facultyRequests.filter((r) => r.status === 'pending');

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
          Aditya University, Surampalem · Administrator Control Plane
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
          Administrator Dashboard
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Manage Student & Faculty accounts, departments, courses, exams, official notices, and platform feedback.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl w-fit">
        {[
          { id: 'accounts', label: `Accounts & Faculty (${pendingFaculty.length})`, icon: <Users className="w-3.5 h-3.5" /> },
          { id: 'academics', label: 'Departments & Courses', icon: <Building2 className="w-3.5 h-3.5" /> },
          { id: 'exams', label: 'Exams & Calendar', icon: <CalendarPlus className="w-3.5 h-3.5" /> },
          { id: 'notices', label: 'University Notifications', icon: <Megaphone className="w-3.5 h-3.5" /> },
          { id: 'usage', label: 'Usage & Feedback', icon: <UserPlus className="w-3.5 h-3.5" /> },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id as typeof tab)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              tab === t.id
                ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: ACCOUNTS & FACULTY APPROVALS */}
      {tab === 'accounts' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form
              onSubmit={handleInviteFaculty}
              className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] p-6 space-y-4"
            >
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                Pre-Approve Faculty Email
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Invited emails can immediately activate Faculty Portal access upon Google Sign-In.
              </p>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="faculty@adityauniversity.in"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={inviteDept}
                  onChange={(e) => setInviteDept(e.target.value)}
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
                  value={inviteDesig}
                  onChange={(e) => setInviteDesig(e.target.value)}
                  placeholder="Designation"
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-violet-600 text-white text-sm font-semibold cursor-pointer"
              >
                Send Faculty Authorization
              </button>
            </form>

            <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] p-6 space-y-4">
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                Pending Faculty Verification Requests ({pendingFaculty.length})
              </h2>
              {pendingFaculty.length === 0 ? (
                <p className="text-sm text-slate-500">No pending faculty verification requests.</p>
              ) : (
                <div className="space-y-3">
                  {pendingFaculty.map((req) => (
                    <div
                      key={req.uid}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div>
                        <p className="font-semibold text-sm text-slate-900 dark:text-white">
                          {req.displayName} · {req.facultyId}
                        </p>
                        <p className="text-xs text-slate-500">
                          {req.email} · {req.department} · {req.designation}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleApproveFaculty(req)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleRejectFaculty(req)}
                          className="px-3 py-1.5 rounded-lg border border-red-300 text-red-600 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] overflow-x-auto">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800">
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                Registered University Accounts ({directoryProfiles.length})
              </h2>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {directoryProfiles.map((u) => (
                  <tr key={u.uid}>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                      {u.displayName}
                    </td>
                    <td className="py-3 px-4 uppercase text-xs font-semibold text-blue-700 dark:text-blue-300">
                      {u.role}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                      {u.department}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {u.year ? `${u.year} · Sec ${u.section || '-'}` : u.designation || 'Member'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DEPARTMENTS & COURSES */}
      {tab === 'academics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Add Department
            </h2>
            <form onSubmit={handleCreateDept} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value)}
                  placeholder="Code (CSE)"
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm uppercase"
                />
                <input
                  type="text"
                  required
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  placeholder="Full Department Name"
                  className="col-span-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                />
              </div>
              <input
                type="text"
                required
                value={deptHod}
                onChange={(e) => setDeptHod(e.target.value)}
                placeholder="Head of Department Name"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-violet-600 text-white text-sm font-semibold cursor-pointer"
              >
                Create Department
              </button>
            </form>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
              {liveDepartments.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-xs py-1.5">
                  <span>
                    <strong className="font-mono">{d.code}</strong> · {d.name} ({d.hodName})
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteDoc(doc(db, 'departments', d.id))}
                    className="text-slate-400 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Add Course / Skill Track
            </h2>
            <form onSubmit={handleCreateCourse} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  placeholder="CS405"
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-mono uppercase"
                />
                <input
                  type="text"
                  required
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  placeholder="Course Title"
                  className="col-span-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <select
                  value={courseDept}
                  onChange={(e) => setCourseDept(e.target.value)}
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
                  value={courseSem}
                  onChange={(e) => setCourseSem(e.target.value)}
                  placeholder="Sem 4"
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                />
                <select
                  value={courseCategory}
                  onChange={(e) => setCourseCategory(e.target.value as typeof courseCategory)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                >
                  <option>Core</option>
                  <option>Skill Track</option>
                  <option>Lab</option>
                  <option>Elective</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={courseCredits}
                  onChange={(e) => setCourseCredits(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                />
                <input
                  type="text"
                  required
                  value={courseInstructor}
                  onChange={(e) => setCourseInstructor(e.target.value)}
                  placeholder="Instructor Name"
                  className="col-span-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-violet-600 text-white text-sm font-semibold cursor-pointer"
              >
                Create Course
              </button>
            </form>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
              {liveCourses.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-xs py-1.5">
                  <span>
                    <strong className="font-mono">{c.code}</strong> · {c.title} ({c.department})
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteDoc(doc(db, 'courses', c.id))}
                    className="text-slate-400 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EXAMS & CALENDAR */}
      {tab === 'exams' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Schedule Official Examination
            </h2>
            <form onSubmit={handleCreateExam} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  value={exCourseCode}
                  onChange={(e) => setExCourseCode(e.target.value)}
                  placeholder="CS301"
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-mono uppercase"
                />
                <input
                  type="text"
                  required
                  value={exCourseName}
                  onChange={(e) => setExCourseName(e.target.value)}
                  placeholder="Course Name"
                  className="col-span-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <select
                  value={exDept}
                  onChange={(e) => setExDept(e.target.value)}
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
                  value={exYear}
                  onChange={(e) => setExYear(e.target.value)}
                  placeholder="Year"
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                />
                <select
                  value={exType}
                  onChange={(e) => setExType(e.target.value as typeof exType)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                >
                  <option>Mid-1</option>
                  <option>Mid-2</option>
                  <option>Semester</option>
                  <option>Lab</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="date"
                  required
                  value={exDate}
                  onChange={(e) => setExDate(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                />
                <input
                  type="text"
                  required
                  value={exStart}
                  onChange={(e) => setExStart(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                />
                <input
                  type="text"
                  required
                  value={exEnd}
                  onChange={(e) => setExEnd(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                />
              </div>
              <input
                type="text"
                required
                value={exVenue}
                onChange={(e) => setExVenue(e.target.value)}
                placeholder="Venue"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-violet-600 text-white text-sm font-semibold cursor-pointer"
              >
                Publish Exam Schedule
              </button>
            </form>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
              {liveExams.map((ex) => (
                <div key={ex.id} className="flex items-center justify-between text-xs py-1">
                  <span>
                    <strong className="font-mono">{ex.courseCode}</strong> · {ex.examDate} ({ex.examType})
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteDoc(doc(db, 'exams', ex.id))}
                    className="text-slate-400 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Add Academic Calendar / Campus Event
            </h2>
            <form onSubmit={handleCreateEvent} className="space-y-3">
              <input
                type="text"
                required
                value={evTitle}
                onChange={(e) => setEvTitle(e.target.value)}
                placeholder="Event Title"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  required
                  value={evDate}
                  onChange={(e) => setEvDate(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                />
                <select
                  value={evCat}
                  onChange={(e) => setEvCat(e.target.value as typeof evCat)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                >
                  <option>Academic</option>
                  <option>Technical</option>
                  <option>Cultural</option>
                  <option>Holiday</option>
                  <option>Exam</option>
                </select>
              </div>
              <input
                type="text"
                required
                value={evVenue}
                onChange={(e) => setEvVenue(e.target.value)}
                placeholder="Venue"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
              />
              <textarea
                rows={2}
                value={evDesc}
                onChange={(e) => setEvDesc(e.target.value)}
                placeholder="Description..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-violet-600 text-white text-sm font-semibold cursor-pointer"
              >
                Publish Calendar Event
              </button>
            </form>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
              {liveEvents.map((ev) => (
                <div key={ev.id} className="flex items-center justify-between text-xs py-1">
                  <span>
                    <strong className="font-mono">{ev.eventDate}</strong> · {ev.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteDoc(doc(db, 'events', ev.id))}
                    className="text-slate-400 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: UNIVERSITY NOTIFICATIONS */}
      {tab === 'notices' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handlePublishNotice}
            className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] p-6 space-y-4"
          >
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Publish University-Wide Notification
            </h2>
            <input
              type="text"
              required
              value={noticeTitle}
              onChange={(e) => setNoticeTitle(e.target.value)}
              placeholder="Official Circular Title"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={noticeCat}
                onChange={(e) => setNoticeCat(e.target.value as typeof noticeCat)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
              >
                <option>Academic</option>
                <option>Exam</option>
                <option>Campus</option>
                <option>Placement</option>
                <option>General</option>
              </select>
              <select
                value={noticeTarget}
                onChange={(e) => setNoticeTarget(e.target.value as typeof noticeTarget)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
              >
                <option value="all">All Campus Members</option>
                <option value="student">Students Only</option>
                <option value="faculty">Faculty Only</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={noticePinned}
                onChange={(e) => setNoticePinned(e.target.checked)}
              />
              <span>Pin to top of announcements</span>
            </label>
            <textarea
              rows={4}
              required
              value={noticeContent}
              onChange={(e) => setNoticeContent(e.target.value)}
              placeholder="Official notice text..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-violet-600 text-white text-sm font-semibold cursor-pointer"
            >
              Broadcast Notification
            </button>
          </form>

          <div className="lg:col-span-6 space-y-3">
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Live University Notices ({liveAnnouncements.length})
            </h2>
            {liveAnnouncements.map((a) => (
              <div
                key={a.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] p-4 flex items-start justify-between gap-3"
              >
                <div>
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    {a.category} · Target: {a.targetRole}
                  </p>
                  <p className="font-semibold text-sm text-slate-900 dark:text-white">{a.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteDoc(doc(db, 'announcements', a.id))}
                  className="text-slate-400 hover:text-red-600 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: USAGE & FEEDBACK */}
      {tab === 'usage' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B]">
              <p className="text-xs text-slate-500">Registered Users</p>
              <p className="font-display text-3xl font-bold mt-1 tabular-nums">
                {directoryProfiles.length}
              </p>
            </div>
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B]">
              <p className="text-xs text-slate-500">Live Courses</p>
              <p className="font-display text-3xl font-bold mt-1 tabular-nums">
                {liveCourses.length}
              </p>
            </div>
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B]">
              <p className="text-xs text-slate-500">Live Assignments</p>
              <p className="font-display text-3xl font-bold mt-1 tabular-nums">
                {liveAssignments.length}
              </p>
            </div>
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B]">
              <p className="text-xs text-slate-500">Submitted Ratings</p>
              <p className="font-display text-3xl font-bold mt-1 tabular-nums">
                {feedbackRatings.length}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] p-6 space-y-3">
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Recent Campus Feedback
            </h2>
            {feedbackRatings.length === 0 ? (
              <p className="text-sm text-slate-500">No feedback entries submitted yet.</p>
            ) : (
              feedbackRatings.map((f) => (
                <div
                  key={f.id}
                  className="py-3 border-b last:border-b-0 border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {f.targetTitle} · {f.rating}/5 Stars
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{f.comment}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {f.userName} ({f.userRole})
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteDoc(doc(db, 'feedback_ratings', f.id))}
                    className="text-slate-400 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
