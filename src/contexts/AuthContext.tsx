import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  OperationType,
  auth,
  db,
  googleProvider,
  handleFirestoreError,
} from '../lib/firebase';
import {
  FacultyRequest,
  PrivateUserInfo,
  PublicProfile,
  UserRole,
} from '../types';

export type PortalIntent = 'student' | 'faculty' | 'admin';

interface AuthContextValue {
  firebaseUser: User | null;
  profile: PublicProfile | null;
  privateInfo: PrivateUserInfo | null;
  facultyRequest: FacultyRequest | null;
  loading: boolean;
  authError: string | null;
  portalIntent: PortalIntent;
  setPortalIntent: (intent: PortalIntent) => void;
  signInWithGoogle: (intent: PortalIntent) => Promise<void>;
  registerStudentProfile: (input: {
    displayName: string;
    rollNumber: string;
    department: string;
    year: string;
    section: string;
  }) => Promise<void>;
  submitFacultyRegistration: (input: {
    displayName: string;
    facultyId: string;
    department: string;
    designation: string;
  }) => Promise<void>;
  claimAdminProfile: (input: {
    displayName: string;
    department: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
  isBootstrappedAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [privateInfo, setPrivateInfo] = useState<PrivateUserInfo | null>(null);
  const [facultyRequest, setFacultyRequest] = useState<FacultyRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [portalIntent, setPortalIntent] = useState<PortalIntent>(() => {
    const saved = localStorage.getItem('aditya_portal_intent');
    if (saved === 'student' || saved === 'faculty' || saved === 'admin') return saved;
    return 'student';
  });

  const handleSetPortalIntent = (intent: PortalIntent) => {
    setPortalIntent(intent);
    localStorage.setItem('aditya_portal_intent', intent);
  };

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    let unsubPrivate: (() => void) | null = null;
    let unsubFacReq: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubProfile) unsubProfile();
      if (unsubPrivate) unsubPrivate();
      if (unsubFacReq) unsubFacReq();

      setFirebaseUser(user);

      if (!user) {
        setProfile(null);
        setPrivateInfo(null);
        setFacultyRequest(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      let initialResolved = false;

      const finishInitial = () => {
        if (!initialResolved) {
          initialResolved = true;
          setLoading(false);
        }
      };

      unsubProfile = onSnapshot(
        doc(db, 'profiles_public', user.uid),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as PublicProfile;
            setProfile(data);
          } else {
            setProfile(null);
          }
          finishInitial();
        },
        (err) => {
          handleFirestoreError(err, OperationType.GET, `profiles_public/${user.uid}`);
        }
      );

      unsubPrivate = onSnapshot(
        doc(db, 'users_private', user.uid),
        (snap) => {
          setPrivateInfo(snap.exists() ? (snap.data() as PrivateUserInfo) : null);
        },
        (err) => {
          handleFirestoreError(err, OperationType.GET, `users_private/${user.uid}`);
        }
      );

      unsubFacReq = onSnapshot(
        doc(db, 'faculty_requests', user.uid),
        (snap) => {
          setFacultyRequest(snap.exists() ? (snap.data() as FacultyRequest) : null);
        },
        (err) => {
          handleFirestoreError(err, OperationType.GET, `faculty_requests/${user.uid}`);
        }
      );
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
      if (unsubPrivate) unsubPrivate();
      if (unsubFacReq) unsubFacReq();
    };
  }, []);

  const isBootstrappedAdmin = Boolean(
    firebaseUser?.email && firebaseUser.email.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()
  );

  const signInWithGoogle = async (intent: PortalIntent) => {
    setAuthError(null);
    handleSetPortalIntent(intent);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const user = cred.user;
      const profileSnap = await getDoc(doc(db, 'profiles_public', user.uid));
      const adminSnap = await getDoc(doc(db, 'admins', user.uid));
      const userIsAdmin =
        user.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase() || adminSnap.exists();

      if (profileSnap.exists()) {
        const existingRole = (profileSnap.data() as PublicProfile).role as UserRole;
        if (intent === 'admin' && !userIsAdmin && existingRole !== 'admin') {
          await signOut(auth);
          setAuthError('Access denied: Student and Faculty accounts cannot access the Administrator portal.');
          return;
        }
        if (intent === 'faculty' && existingRole === 'student' && !userIsAdmin) {
          await signOut(auth);
          setAuthError('Access denied: This account is registered as a Student and cannot access the Faculty portal.');
          return;
        }
      } else if (intent === 'admin' && !userIsAdmin) {
        await signOut(auth);
        setAuthError('Access denied: This Google account does not have Administrator authorization.');
        return;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-in failed.';
      setAuthError(message);
    }
  };

  const registerStudentProfile = async (input: {
    displayName: string;
    rollNumber: string;
    department: string;
    year: string;
    section: string;
  }) => {
    if (!firebaseUser || !firebaseUser.email) return;
    setAuthError(null);

    const uid = firebaseUser.uid;
    const batch = writeBatch(db);

    batch.set(doc(db, 'profiles_public', uid), {
      uid,
      displayName: input.displayName.trim(),
      role: 'student',
      department: input.department.trim(),
      year: input.year.trim(),
      section: input.section.trim().toUpperCase(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'users_private', uid), {
      uid,
      email: firebaseUser.email,
      rollNumber: input.rollNumber.trim().toUpperCase(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Create illustrative sample attendance & semester results clearly marked as demo data
    const sampleAttendance = [
      {
        id: `${uid}_cs301`,
        courseCode: 'CS301',
        courseName: 'Data Structures & Algorithms',
        attendedClasses: 34,
        totalClasses: 40,
        semester: 'Sem 3',
      },
      {
        id: `${uid}_cs304`,
        courseCode: 'CS304',
        courseName: 'Database Management Systems',
        attendedClasses: 31,
        totalClasses: 38,
        semester: 'Sem 3',
      },
      {
        id: `${uid}_cs307`,
        courseCode: 'CS307',
        courseName: 'Operating Systems',
        attendedClasses: 27,
        totalClasses: 35,
        semester: 'Sem 3',
      },
    ];

    for (const rec of sampleAttendance) {
      batch.set(doc(db, 'attendance_records', rec.id), {
        studentId: uid,
        studentRollNumber: input.rollNumber.trim().toUpperCase(),
        courseCode: rec.courseCode,
        courseName: rec.courseName,
        attendedClasses: rec.attendedClasses,
        totalClasses: rec.totalClasses,
        semester: rec.semester,
        isDemoData: true,
        updatedByUid: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const sampleResults = [
      {
        id: `${uid}_res_1`,
        semester: 'Sem 2',
        courseCode: 'CS201',
        courseName: 'Object-Oriented Programming with Java',
        credits: 4,
        grade: 'A+',
        gradePoints: 9.0,
      },
      {
        id: `${uid}_res_2`,
        semester: 'Sem 2',
        courseCode: 'MA202',
        courseName: 'Discrete Mathematics',
        credits: 3,
        grade: 'O',
        gradePoints: 10.0,
      },
      {
        id: `${uid}_res_3`,
        semester: 'Sem 2',
        courseCode: 'EC204',
        courseName: 'Digital Logic Design',
        credits: 3,
        grade: 'A',
        gradePoints: 8.0,
      },
    ];

    for (const r of sampleResults) {
      batch.set(doc(db, 'results', r.id), {
        studentId: uid,
        studentRollNumber: input.rollNumber.trim().toUpperCase(),
        semester: r.semester,
        courseCode: r.courseCode,
        courseName: r.courseName,
        credits: r.credits,
        grade: r.grade,
        gradePoints: r.gradePoints,
        isDemoData: true,
        publishedByUid: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `profiles_public/${uid}`);
    }
  };

  const submitFacultyRegistration = async (input: {
    displayName: string;
    facultyId: string;
    department: string;
    designation: string;
  }) => {
    if (!firebaseUser || !firebaseUser.email) return;
    setAuthError(null);
    const uid = firebaseUser.uid;
    const email = firebaseUser.email;

    try {
      const inviteSnap = await getDoc(doc(db, 'faculty_invites', email));
      const adminSnap = await getDoc(doc(db, 'admins', uid));
      const canAutoActivate = inviteSnap.exists() || isBootstrappedAdmin || adminSnap.exists();

      if (canAutoActivate) {
        const batch = writeBatch(db);
        batch.set(doc(db, 'faculty_members', uid), {
          uid,
          displayName: input.displayName.trim(),
          department: input.department.trim(),
          designation: input.designation.trim(),
          approvedBy: uid,
          createdAt: serverTimestamp(),
        });
        batch.set(doc(db, 'profiles_public', uid), {
          uid,
          displayName: input.displayName.trim(),
          role: 'faculty',
          department: input.department.trim(),
          designation: input.designation.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        batch.set(doc(db, 'users_private', uid), {
          uid,
          email,
          facultyId: input.facultyId.trim().toUpperCase(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await batch.commit();
        return;
      }

      // Otherwise create a pending verification request for Administrator approval
      await setDoc(doc(db, 'faculty_requests', uid), {
        uid,
        displayName: input.displayName.trim(),
        email,
        facultyId: input.facultyId.trim().toUpperCase(),
        department: input.department.trim(),
        designation: input.designation.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `faculty_requests/${uid}`);
    }
  };

  const claimAdminProfile = async (input: { displayName: string; department: string }) => {
    if (!firebaseUser || !firebaseUser.email) return;
    const uid = firebaseUser.uid;
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'admins', uid), {
        uid,
        email: firebaseUser.email,
        grantedBy: uid,
        createdAt: serverTimestamp(),
      });
      batch.set(doc(db, 'profiles_public', uid), {
        uid,
        displayName: input.displayName.trim(),
        role: 'admin',
        department: input.department.trim(),
        designation: 'University Administrator',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'users_private', uid), {
        uid,
        email: firebaseUser.email,
        facultyId: 'ADMIN-01',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `admins/${uid}`);
    }
  };

  const logout = async () => {
    setAuthError(null);
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        privateInfo,
        facultyRequest,
        loading,
        authError,
        portalIntent,
        setPortalIntent: handleSetPortalIntent,
        signInWithGoogle,
        registerStudentProfile,
        submitFacultyRegistration,
        claimAdminProfile,
        logout,
        clearAuthError: () => setAuthError(null),
        isBootstrappedAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
