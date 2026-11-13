import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { OperationType, db, handleFirestoreError } from '../lib/firebase';
import {
  SAMPLE_ANNOUNCEMENTS,
  SAMPLE_ASSIGNMENTS,
  SAMPLE_COURSES,
  SAMPLE_DEPARTMENTS,
  SAMPLE_EVENTS,
  SAMPLE_EXAMS,
  SAMPLE_MATERIALS,
} from '../lib/sampleData';
import {
  AcademicResult,
  Announcement,
  Assignment,
  AttendanceRecord,
  CampusEvent,
  ChatSession,
  Course,
  Department,
  Exam,
  FeedbackRating,
  PublicProfile,
  StudyMaterial,
} from '../types';
import { useAuth } from '../contexts/AuthContext';

export function useUniversityData() {
  const { firebaseUser, profile } = useAuth();

  const [chats, setChats] = useState<ChatSession[]>([]);
  const [liveDepartments, setLiveDepartments] = useState<Department[]>([]);
  const [liveCourses, setLiveCourses] = useState<Course[]>([]);
  const [liveMaterials, setLiveMaterials] = useState<StudyMaterial[]>([]);
  const [liveAssignments, setLiveAssignments] = useState<Assignment[]>([]);
  const [liveExams, setLiveExams] = useState<Exam[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [results, setResults] = useState<AcademicResult[]>([]);
  const [liveAnnouncements, setLiveAnnouncements] = useState<Announcement[]>([]);
  const [liveEvents, setLiveEvents] = useState<CampusEvent[]>([]);
  const [feedbackRatings, setFeedbackRatings] = useState<FeedbackRating[]>([]);
  const [directoryProfiles, setDirectoryProfiles] = useState<PublicProfile[]>([]);

  useEffect(() => {
    if (!firebaseUser || !profile) {
      setChats([]);
      setLiveDepartments([]);
      setLiveCourses([]);
      setLiveMaterials([]);
      setLiveAssignments([]);
      setLiveExams([]);
      setAttendanceRecords([]);
      setResults([]);
      setLiveAnnouncements([]);
      setLiveEvents([]);
      setFeedbackRatings([]);
      setDirectoryProfiles([]);
      return;
    }

    const unsubs: Array<() => void> = [];

    // 1. User's AI Chats
    unsubs.push(
      onSnapshot(
        query(collection(db, 'chats'), where('userId', '==', firebaseUser.uid)),
        (snap) => {
          const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChatSession);
          items.sort((a, b) => {
            const ta = (a.updatedAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
            const tb = (b.updatedAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
            return tb - ta;
          });
          setChats(items);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'chats')
      )
    );

    // 2. Departments
    unsubs.push(
      onSnapshot(
        collection(db, 'departments'),
        (snap) => {
          setLiveDepartments(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Department));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'departments')
      )
    );

    // 3. Courses
    unsubs.push(
      onSnapshot(
        collection(db, 'courses'),
        (snap) => {
          setLiveCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Course));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'courses')
      )
    );

    // 4. Study Materials
    unsubs.push(
      onSnapshot(
        collection(db, 'study_materials'),
        (snap) => {
          setLiveMaterials(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as StudyMaterial));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'study_materials')
      )
    );

    // 5. Assignments
    unsubs.push(
      onSnapshot(
        collection(db, 'assignments'),
        (snap) => {
          setLiveAssignments(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Assignment));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'assignments')
      )
    );

    // 6. Exams
    unsubs.push(
      onSnapshot(
        collection(db, 'exams'),
        (snap) => {
          setLiveExams(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Exam));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'exams')
      )
    );

    // 7. Attendance (students query strictly their own records; faculty/admin can view all)
    const attendanceQuery =
      profile.role === 'student'
        ? query(collection(db, 'attendance_records'), where('studentId', '==', firebaseUser.uid))
        : collection(db, 'attendance_records');
    unsubs.push(
      onSnapshot(
        attendanceQuery,
        (snap) => {
          setAttendanceRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AttendanceRecord));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'attendance_records')
      )
    );

    // 8. Academic Results (students query strictly their own records; faculty/admin can view all)
    const resultsQuery =
      profile.role === 'student'
        ? query(collection(db, 'results'), where('studentId', '==', firebaseUser.uid))
        : collection(db, 'results');
    unsubs.push(
      onSnapshot(
        resultsQuery,
        (snap) => {
          setResults(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AcademicResult));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'results')
      )
    );

    // 9. Announcements
    unsubs.push(
      onSnapshot(
        query(collection(db, 'announcements'), orderBy('createdAt', 'desc')),
        (snap) => {
          setLiveAnnouncements(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Announcement));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'announcements')
      )
    );

    // 10. Events
    unsubs.push(
      onSnapshot(
        collection(db, 'events'),
        (snap) => {
          setLiveEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CampusEvent));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'events')
      )
    );

    // 11. Feedback & 5-Star Ratings
    unsubs.push(
      onSnapshot(
        collection(db, 'feedback_ratings'),
        (snap) => {
          setFeedbackRatings(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FeedbackRating));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'feedback_ratings')
      )
    );

    // 12. User Directory (Admin or Faculty only per rules)
    if (profile.role === 'admin' || profile.role === 'faculty') {
      unsubs.push(
        onSnapshot(
          collection(db, 'profiles_public'),
          (snap) => {
            setDirectoryProfiles(snap.docs.map((d) => d.data() as PublicProfile));
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'profiles_public')
        )
      );
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [firebaseUser, profile]);

  const departments = useMemo(
    () => (liveDepartments.length > 0 ? liveDepartments : SAMPLE_DEPARTMENTS),
    [liveDepartments]
  );

  const courses = useMemo(
    () => (liveCourses.length > 0 ? liveCourses : SAMPLE_COURSES),
    [liveCourses]
  );

  const materials = useMemo(
    () => [...liveMaterials, ...(liveMaterials.length === 0 ? SAMPLE_MATERIALS : [])],
    [liveMaterials]
  );

  const assignments = useMemo(
    () => [...liveAssignments, ...(liveAssignments.length === 0 ? SAMPLE_ASSIGNMENTS : [])],
    [liveAssignments]
  );

  const exams = useMemo(
    () => [...liveExams, ...(liveExams.length === 0 ? SAMPLE_EXAMS : [])],
    [liveExams]
  );

  const announcements = useMemo(
    () => [...liveAnnouncements, ...(liveAnnouncements.length === 0 ? SAMPLE_ANNOUNCEMENTS : [])],
    [liveAnnouncements]
  );

  const events = useMemo(
    () => [...liveEvents, ...(liveEvents.length === 0 ? SAMPLE_EVENTS : [])],
    [liveEvents]
  );

  return {
    chats,
    departments,
    liveDepartments,
    courses,
    liveCourses,
    materials,
    liveMaterials,
    assignments,
    liveAssignments,
    exams,
    liveExams,
    attendanceRecords,
    results,
    announcements,
    liveAnnouncements,
    events,
    liveEvents,
    feedbackRatings,
    directoryProfiles,
  };
}
