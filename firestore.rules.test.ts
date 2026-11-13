/**
 * Firestore Security Rules Verification Suite (Dirty Dozen Adversarial Payloads)
 * Reference specification for @firebase/rules-unit-testing validation.
 */

export interface AdversarialTestCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  actorRole: 'student' | 'faculty' | 'unauthenticated';
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_PAYLOADS: AdversarialTestCase[] = [
  {
    id: 1,
    name: 'Role Escalation on Profile Create',
    collectionPath: 'profiles_public/student_uid_1',
    operation: 'create',
    actorRole: 'student',
    payload: {
      uid: 'student_uid_1',
      displayName: 'Mallikharjuna Rao',
      role: 'admin',
      department: 'CSE',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Role Mutation on Profile Update',
    collectionPath: 'profiles_public/student_uid_1',
    operation: 'update',
    actorRole: 'student',
    payload: {
      role: 'faculty',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'PII Cross-Read on users_private',
    collectionPath: 'users_private/student_uid_2',
    operation: 'get',
    actorRole: 'student',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Chat Snooping on Another User Session',
    collectionPath: 'chats/chat_owned_by_uid_2',
    operation: 'get',
    actorRole: 'student',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Parent-Less or Hijacked Chat Message',
    collectionPath: 'chats/chat_owned_by_uid_2/messages/msg_1',
    operation: 'create',
    actorRole: 'student',
    payload: {
      chatId: 'chat_owned_by_uid_2',
      userId: 'student_uid_1',
      role: 'user',
      content: 'Injected message',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Student Creating Faculty Assignment',
    collectionPath: 'assignments/assign_fake_1',
    operation: 'create',
    actorRole: 'student',
    payload: {
      title: 'Unauthorized Assignment',
      courseCode: 'CS301',
      department: 'CSE',
      year: '3',
      section: 'A',
      dueDate: '2026-12-01',
      maxMarks: 100,
      createdByUid: 'student_uid_1',
      createdByName: 'Student',
      isDemoData: false,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Student Self-Grading Submission',
    collectionPath: 'assignments/assign_1/submissions/sub_1',
    operation: 'update',
    actorRole: 'student',
    payload: {
      status: 'graded',
      marks: 100,
      feedback: 'Self approved',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Post-Terminal Submission Tampering After Graded',
    collectionPath: 'assignments/assign_1/submissions/sub_graded_1',
    operation: 'update',
    actorRole: 'student',
    payload: {
      submissionText: 'Edited after grading',
      status: 'submitted',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Cross-Student Result Scraping',
    collectionPath: 'results/result_of_uid_2',
    operation: 'get',
    actorRole: 'student',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Shadow Field Injection on Feedback',
    collectionPath: 'feedback_ratings/fb_1',
    operation: 'create',
    actorRole: 'student',
    payload: {
      targetType: 'course',
      targetId: 'CS301',
      targetTitle: 'Data Structures',
      userId: 'student_uid_1',
      userName: 'Student',
      userRole: 'student',
      rating: 5,
      comment: 'Great course',
      isVerified: true,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Timestamp Forgery on Chat Creation',
    collectionPath: 'chats/chat_1',
    operation: 'create',
    actorRole: 'student',
    payload: {
      userId: 'student_uid_1',
      title: 'Forged Time',
      language: 'en',
      aiMode: 'general',
      isSaved: false,
      lastMessagePreview: '',
      messageCount: 0,
      createdAt: '2020-01-01T00:00:00Z',
      updatedAt: '2020-01-01T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'ID Poisoning Exceeding 128 Characters',
    collectionPath: `chats/${'a'.repeat(200)}`,
    operation: 'create',
    actorRole: 'student',
    payload: {
      userId: 'student_uid_1',
      title: 'Oversized ID',
      language: 'en',
      aiMode: 'general',
      isSaved: false,
      lastMessagePreview: '',
      messageCount: 0,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
];
