import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Bookmark,
  Calendar,
  CheckSquare,
  ClipboardList,
  FileText,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  Megaphone,
  Menu,
  MessageSquare,
  Moon,
  Plus,
  Settings,
  ShieldCheck,
  Star,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from './lib/firebase';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useUniversityData } from './hooks/useUniversityData';
import { AIModeId, AppSection, LanguageCode } from './types';
import { AdityaCrest } from './components/AdityaCrest';
import { AuthPortal } from './components/AuthPortal';
import { ChatWorkspace } from './components/ChatWorkspace';
import { QuizStudio } from './components/QuizStudio';
import { UniversityViews } from './components/UniversityViews';
import { FacultyPortal } from './components/FacultyPortal';
import { AdminDashboard } from './components/AdminDashboard';
import { SettingsModal } from './components/SettingsModal';

function AdityaWorkspace() {
  const { firebaseUser, profile, loading } = useAuth();
  const data = useUniversityData();

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('aditya_theme');
    return saved ? saved === 'dark' : true;
  });

  const [section, setSection] = useState<AppSection>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [historyTab, setHistoryTab] = useState<'all' | 'saved'>('all');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<AIModeId>('general');
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prefillPrompt, setPrefillPrompt] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('aditya_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('aditya_theme', 'light');
    }
  }, [isDark]);

  const activeChat = useMemo(
    () => data.chats.find((c) => c.id === activeChatId) || null,
    [data.chats, activeChatId]
  );

  const visibleChats = useMemo(
    () => (historyTab === 'saved' ? data.chats.filter((c) => c.isSaved) : data.chats),
    [data.chats, historyTab]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-[#070D1A]">
        <AdityaCrest className="w-12 h-12" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Loading Aditya AI...
        </p>
      </div>
    );
  }

  if (!firebaseUser || !profile) {
    return <AuthPortal isDark={isDark} onToggleTheme={() => setIsDark((d) => !d)} />;
  }

  const startNewChat = (mode: AIModeId = 'general') => {
    setActiveChatId(null);
    setSelectedMode(mode);
    setSection('chat');
    setSidebarOpen(false);
  };

  const handleAskAI = (mode: AIModeId, prompt: string) => {
    setActiveChatId(null);
    setSelectedMode(mode);
    setPrefillPrompt(prompt);
    setSection('chat');
  };

  const navigate = (sec: AppSection) => {
    // Enforce client-side role guards matching Firestore security rules
    if (sec === 'admin_dashboard' && profile.role !== 'admin') return;
    if (sec === 'faculty_portal' && profile.role !== 'faculty' && profile.role !== 'admin') return;
    setSection(sec);
    setSidebarOpen(false);
  };

  const universityNav: Array<{ id: AppSection; label: string; icon: React.ReactNode }> = [
    { id: 'assignments', label: 'Assignments', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'exams', label: 'Exams & Timetable', icon: <FileText className="w-4 h-4" /> },
    { id: 'attendance', label: 'Attendance', icon: <CheckSquare className="w-4 h-4" /> },
    { id: 'results', label: 'Results & Grades', icon: <Award className="w-4 h-4" /> },
    { id: 'materials', label: 'Study Materials', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'courses', label: 'Skills & Courses', icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'announcements', label: 'Announcements', icon: <Megaphone className="w-4 h-4" /> },
    { id: 'calendar', label: 'Events & Calendar', icon: <Calendar className="w-4 h-4" /> },
    { id: 'feedback', label: '5-Star Feedback', icon: <Star className="w-4 h-4" /> },
  ];

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-slate-50 dark:bg-[#070D1A] text-slate-900 dark:text-slate-100">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1324] transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <AdityaCrest className="w-8 h-8 shrink-0" />
            <div className="min-w-0">
              <p className="font-display text-sm font-bold text-slate-900 dark:text-white truncate">
                Aditya AI
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Aditya University · Surampalem
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg text-slate-500 md:hidden"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            type="button"
            onClick={() => startNewChat('general')}
            className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-blue-700 via-indigo-600 to-violet-600 text-white text-xs font-semibold flex items-center justify-center gap-2 hover:opacity-95 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Scrollable Sidebar Body */}
        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-5">
          {/* Role-Gated Portals */}
          <div className="space-y-1">
            <p className="px-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Portals
            </p>
            <button
              type="button"
              onClick={() => navigate('chat')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                section === 'chat'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span>AI Chat Assistant</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('quiz_studio')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                section === 'quiz_studio'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span>AI Quiz Generator</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('student_dashboard')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                section === 'student_dashboard'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Student Dashboard</span>
            </button>

            {(profile.role === 'faculty' || profile.role === 'admin') && (
              <button
                type="button"
                onClick={() => navigate('faculty_portal')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  section === 'faculty_portal'
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>Faculty Portal</span>
              </button>
            )}

            {profile.role === 'admin' && (
              <button
                type="button"
                onClick={() => navigate('admin_dashboard')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  section === 'admin_dashboard'
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Admin Dashboard</span>
              </button>
            )}
          </div>

          {/* University Hub */}
          <div className="space-y-1">
            <p className="px-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              University Hub
            </p>
            {universityNav.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  section === item.id
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Chat History & Saved Chats */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {historyTab === 'saved' ? 'Saved Chats' : 'Chat History'}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setHistoryTab('all')}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-medium cursor-pointer ${
                    historyTab === 'all'
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white'
                      : 'text-slate-500'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTab('saved')}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-medium cursor-pointer ${
                    historyTab === 'saved'
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white'
                      : 'text-slate-500'
                  }`}
                >
                  Saved
                </button>
              </div>
            </div>

            {visibleChats.length === 0 ? (
              <p className="px-2 text-xs text-slate-400">
                {historyTab === 'saved' ? 'No saved chats yet.' : 'Start a conversation above.'}
              </p>
            ) : (
              <div className="space-y-1">
                {visibleChats.map((c) => (
                  <div
                    key={c.id}
                    className={`group flex items-center justify-between gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                      activeChatId === c.id && section === 'chat'
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveChatId(c.id);
                        setSelectedMode(c.aiMode);
                        setLanguage(c.language);
                        setSection('chat');
                        setSidebarOpen(false);
                      }}
                      className="flex-1 flex items-center gap-2 text-left min-w-0 cursor-pointer"
                    >
                      {c.isSaved && <Bookmark className="w-3 h-3 text-blue-600 shrink-0" />}
                      <span className="truncate">{c.title}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (activeChatId === c.id) setActiveChatId(null);
                        void deleteDoc(doc(db, 'chats', c.id));
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                      aria-label="Delete chat"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Footer: Settings & Theme */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="flex-1 flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left min-w-0 transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4 text-slate-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {profile.displayName}
              </p>
              <p className="text-[11px] text-slate-500 uppercase truncate">
                {profile.role} · Settings
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setIsDark((d) => !d)}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1324] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800"
            aria-label="Open menu"
          >
            <Menu className="w-4 h-4" />
          </button>
          <span className="font-display text-sm font-bold truncate">
            Aditya AI – Your University Assistant
          </span>
          <button
            type="button"
            onClick={() => startNewChat('general')}
            className="p-2 rounded-lg bg-blue-700 text-white"
            aria-label="New Chat"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto">
          {section === 'chat' ? (
            <ChatWorkspace
              activeChatId={activeChatId}
              activeChat={activeChat}
              selectedMode={selectedMode}
              onSelectMode={setSelectedMode}
              language={language}
              onChangeLanguage={setLanguage}
              onChatCreated={(id) => setActiveChatId(id)}
              onOpenQuizStudio={() => navigate('quiz_studio')}
              prefillPrompt={prefillPrompt}
              onClearPrefill={() => setPrefillPrompt(null)}
            />
          ) : section === 'quiz_studio' ? (
            <QuizStudio language={language} />
          ) : section === 'faculty_portal' ? (
            <FacultyPortal
              liveMaterials={data.liveMaterials}
              liveAssignments={data.liveAssignments}
              liveAnnouncements={data.liveAnnouncements}
            />
          ) : section === 'admin_dashboard' ? (
            <AdminDashboard
              directoryProfiles={data.directoryProfiles}
              liveDepartments={data.liveDepartments}
              liveCourses={data.liveCourses}
              liveAssignments={data.liveAssignments}
              liveExams={data.liveExams}
              liveAnnouncements={data.liveAnnouncements}
              liveEvents={data.liveEvents}
              feedbackRatings={data.feedbackRatings}
            />
          ) : (
            <UniversityViews
              section={section}
              onNavigate={navigate}
              onAskAI={handleAskAI}
              courses={data.courses}
              materials={data.materials}
              assignments={data.assignments}
              exams={data.exams}
              attendanceRecords={data.attendanceRecords}
              results={data.results}
              announcements={data.announcements}
              events={data.events}
              feedbackRatings={data.feedbackRatings}
            />
          )}
        </main>
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        isDark={isDark}
        onToggleTheme={() => setIsDark((d) => !d)}
        language={language}
        onChangeLanguage={setLanguage}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AdityaWorkspace />
    </AuthProvider>
  );
}
