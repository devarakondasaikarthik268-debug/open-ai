import { Globe, LogOut, Moon, Sun, User, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LanguageCode } from '../types';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  language: LanguageCode;
  onChangeLanguage: (lang: LanguageCode) => void;
}

export function SettingsModal({
  open,
  onClose,
  isDark,
  onToggleTheme,
  language,
  onChangeLanguage,
}: SettingsModalProps) {
  const { profile, privateInfo, logout } = useAuth();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Settings & Profile
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Account Summary */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                {profile?.displayName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {privateInfo?.email}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-1 uppercase font-semibold">
                {profile?.role} · {profile?.department}
                {privateInfo?.rollNumber ? ` · ${privateInfo.rollNumber}` : ''}
                {privateInfo?.facultyId ? ` · ${privateInfo.facultyId}` : ''}
              </p>
            </div>
          </div>

          {/* Theme Toggle */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              {isDark ? <Moon className="w-4 h-4 text-blue-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Appearance</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isDark ? 'Dark Navy Theme' : 'Clean Light Theme'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleTheme}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Switch to {isDark ? 'Light' : 'Dark'}
            </button>
          </div>

          {/* Language Preference */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">AI Language</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  English & Telugu (తెలుగు)
                </p>
              </div>
            </div>
            <select
              value={language}
              onChange={(e) => onChangeLanguage(e.target.value as LanguageCode)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
            >
              <option value="en">English</option>
              <option value="te">తెలుగు (Telugu)</option>
            </select>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={async () => {
                onClose();
                await logout();
              }}
              className="px-4 py-2 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-700 to-violet-600 text-white text-xs font-semibold cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
