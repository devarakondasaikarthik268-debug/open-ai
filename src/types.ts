export type UserRole = 'student' | 'faculty' | 'admin';

export type AIModeId =
  | 'general'
  | 'study_assistant'
  | 'code_generator'
  | 'doubt_solver'
  | 'assignment_helper'
  | 'exam_prep'
  | 'notes_generator'
  | 'quiz_generator'
  | 'resume_builder'
  | 'career_guidance';

export type LanguageCode = 'en' | 'te';

export interface PublicProfile {
  uid: string;
  displayName: string;
  role: UserRole;
  department: string;
  year?: string;
  section?: string;
  designation?: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface PrivateUserInfo {
  uid: string;
  email: string;
  rollNumber?: string;
  facultyId?: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface FacultyRequest {
  uid: string;
  displayName: string;
  email: string;
  facultyId: string;
  department: string;
  designation: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: unknown;
  updatedAt: unknown;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  language: LanguageCode;
  aiMode: AIModeId;
  isSaved: boolean;
  lastMessagePreview: string;
  messageCount: number;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  attachmentName?: string;
  attachmentType?: string;
  createdAt: unknown;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  hodName: string;
  description: string;
  isDemoData: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  department: string;
  semester: string;
  credits: number;
  instructorName: string;
  description: string;
  category: 'Core' | 'Skill Track' | 'Lab' | 'Elective';
  isDemoData: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StudyMaterial {
  id: string;
  title: string;
  description: string;
  courseCode: string;
  department: string;
  semester: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  contentSummary: string;
  uploadedByUid: string;
  uploadedByName: string;
  isDemoData: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  courseCode: string;
  department: string;
  year: string;
  section: string;
  dueDate: string;
  maxMarks: number;
  createdByUid: string;
  createdByName: string;
  isDemoData: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  studentRollNumber: string;
  submissionText: string;
  fileName?: string;
  fileUrl?: string;
  status: 'submitted' | 'graded';
  marks?: number;
  feedback?: string;
  gradedByUid?: string;
  submittedAt?: unknown;
  updatedAt?: unknown;
}

export interface Exam {
  id: string;
  title: string;
  courseCode: string;
  courseName: string;
  department: string;
  year: string;
  examDate: string;
  startTime: string;
  endTime: string;
  venue: string;
  examType: 'Mid-1' | 'Mid-2' | 'Semester' | 'Lab';
  isDemoData: boolean;
  createdByUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentRollNumber: string;
  courseCode: string;
  courseName: string;
  attendedClasses: number;
  totalClasses: number;
  semester: string;
  isDemoData: boolean;
  updatedByUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AcademicResult {
  id: string;
  studentId: string;
  studentRollNumber: string;
  semester: string;
  courseCode: string;
  courseName: string;
  credits: number;
  grade: string;
  gradePoints: number;
  isDemoData: boolean;
  publishedByUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: 'Academic' | 'Exam' | 'Campus' | 'Placement' | 'General';
  targetRole: 'all' | 'student' | 'faculty';
  department: string;
  authorUid: string;
  authorName: string;
  authorRole: 'faculty' | 'admin';
  isPinned: boolean;
  isDemoData: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CampusEvent {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  venue: string;
  category: 'Academic' | 'Technical' | 'Cultural' | 'Holiday' | 'Exam';
  isDemoData: boolean;
  createdByUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface FeedbackRating {
  id: string;
  targetType: 'course' | 'material' | 'faculty' | 'platform';
  targetId: string;
  targetTitle: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  rating: number;
  comment: string;
  createdAt?: unknown;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface AIQuizPayload {
  topic: string;
  questions: QuizQuestion[];
}

export type AppSection =
  | 'chat'
  | 'student_dashboard'
  | 'faculty_portal'
  | 'admin_dashboard'
  | 'assignments'
  | 'exams'
  | 'attendance'
  | 'results'
  | 'materials'
  | 'courses'
  | 'announcements'
  | 'calendar'
  | 'feedback'
  | 'quiz_studio';

export const AI_MODES: Array<{
  id: AIModeId;
  label: string;
  shortDesc: string;
  starterPrompt: string;
}> = [
  {
    id: 'general',
    label: 'General Assistant',
    shortDesc: 'Academic Q&A, English & Telugu',
    starterPrompt: 'Explain how B-Trees work in Database Management Systems with a step-by-step example.',
  },
  {
    id: 'study_assistant',
    label: 'AI Study Assistant',
    shortDesc: 'Step-by-step concept mastery',
    starterPrompt: 'Teach me Dijkstra’s shortest path algorithm step by step with a small graph.',
  },
  {
    id: 'code_generator',
    label: 'AI Code Generator',
    shortDesc: 'C, C++, Java & Python + debug',
    starterPrompt: 'Write a clean C++ program for Merge Sort and explain its time complexity.',
  },
  {
    id: 'doubt_solver',
    label: 'AI Doubt Solver',
    shortDesc: 'Clear conceptual blockers fast',
    starterPrompt: 'Why is Deadlock avoidance different from Deadlock prevention in Operating Systems?',
  },
  {
    id: 'assignment_helper',
    label: 'AI Assignment Helper',
    shortDesc: 'Structured guidance & verification',
    starterPrompt: 'Help me structure my Computer Networks assignment on TCP congestion control.',
  },
  {
    id: 'exam_prep',
    label: 'AI Exam Prep Assistant',
    shortDesc: '2-mark, 10-mark & viva readiness',
    starterPrompt: 'Create a high-yield revision plan and important 10-mark questions for Theory of Computation.',
  },
  {
    id: 'notes_generator',
    label: 'AI Notes Generator',
    shortDesc: 'Structured lecture & unit notes',
    starterPrompt: 'Generate concise exam-ready unit notes on Normalization (1NF to BCNF) in DBMS.',
  },
  {
    id: 'quiz_generator',
    label: 'AI Quiz Generator',
    shortDesc: 'Practice MCQs with explanations',
    starterPrompt: 'Create 5 challenging MCQs on Python Object-Oriented Programming with answer explanations.',
  },
  {
    id: 'resume_builder',
    label: 'AI Resume Builder',
    shortDesc: 'Placement-ready B.Tech resumes',
    starterPrompt: 'Help me build an ATS-friendly campus placement resume for a 3rd year CSE student.',
  },
  {
    id: 'career_guidance',
    label: 'AI Career Guidance',
    shortDesc: 'Placements, GATE & skill tracks',
    starterPrompt: 'Give me a 6-month roadmap to prepare for full-stack software engineering placements.',
  },
];

export const ADITYA_DEPARTMENTS = [
  'CSE',
  'CSE (AI & ML)',
  'CSE (Data Science)',
  'IT',
  'ECE',
  'EEE',
  'Mechanical Engineering',
  'Civil Engineering',
  'MBA',
  'MCA',
];
