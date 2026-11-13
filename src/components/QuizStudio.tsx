import React, { useState } from 'react';
import { CheckCircle2, HelpCircle, RotateCcw, Sparkles, XCircle } from 'lucide-react';
import { AIQuizPayload, LanguageCode } from '../types';

export function QuizStudio({ language }: { language: LanguageCode }) {
  const [topic, setTopic] = useState('Data Structures: Binary Trees & Heaps');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<AIQuizPayload | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const generateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    setQuiz(null);
    setAnswers({});
    setSubmitted(false);

    try {
      const res = await fetch('/api/ai/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, difficulty, count, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate quiz.');
      setQuiz(data as AIQuizPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Quiz generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const score = quiz
    ? quiz.questions.reduce((acc, q, idx) => (answers[idx] === q.correctIndex ? acc + 1 : acc), 0)
    : 0;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          AI Quiz Generator
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Generate custom multiple-choice practice quizzes on any engineering, programming, or university syllabus topic.
        </p>
      </div>

      <form
        onSubmit={generateQuiz}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] p-5 grid grid-cols-1 sm:grid-cols-12 gap-4 items-end"
      >
        <div className="sm:col-span-6">
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Topic or Syllabus Unit
          </label>
          <input
            type="text"
            required
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Python OOP, SQL Normalization, Digital Logic"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Difficulty
          </label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Questions
          </label>
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value={3}>3</option>
            <option value={5}>5</option>
            <option value={8}>8</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-700 to-violet-600 text-white text-sm font-semibold hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loading ? 'Creating...' : 'Generate'}</span>
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {quiz && quiz.questions.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                {quiz.topic}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {quiz.questions.length} Questions · {difficulty}
              </p>
            </div>
            {submitted && (
              <div className="flex items-center gap-4">
                <span className="font-display text-lg font-bold text-blue-700 dark:text-blue-300 tabular-nums">
                  Score: {score} / {quiz.questions.length}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAnswers({});
                    setSubmitted(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              </div>
            )}
          </div>

          {quiz.questions.map((q, qIdx) => {
            const chosen = answers[qIdx];
            return (
              <div
                key={qIdx}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] p-5 space-y-3"
              >
                <p className="font-medium text-sm sm:text-base text-slate-900 dark:text-white">
                  {qIdx + 1}. {q.question}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {q.options.map((opt, oIdx) => {
                    const isSelected = chosen === oIdx;
                    const isCorrect = oIdx === q.correctIndex;
                    let cls =
                      'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 hover:border-blue-400';

                    if (submitted) {
                      if (isCorrect) {
                        cls =
                          'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200';
                      } else if (isSelected && !isCorrect) {
                        cls =
                          'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200';
                      }
                    } else if (isSelected) {
                      cls =
                        'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200';
                    }

                    return (
                      <button
                        key={oIdx}
                        type="button"
                        disabled={submitted}
                        onClick={() => setAnswers((prev) => ({ ...prev, [qIdx]: oIdx }))}
                        className={`text-left px-4 py-2.5 rounded-xl border text-sm transition-colors flex items-center justify-between gap-2 cursor-pointer ${cls}`}
                      >
                        <span>{opt}</span>
                        {submitted && isCorrect && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                        {submitted && isSelected && !isCorrect && (
                          <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {submitted && (
                  <div className="pt-2 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                    <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <span>{q.explanation}</span>
                  </div>
                )}
              </div>
            );
          })}

          {!submitted && (
            <button
              type="button"
              onClick={() => setSubmitted(true)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-violet-600 text-white text-sm font-semibold hover:opacity-95 cursor-pointer"
            >
              Submit Quiz & View Explanations
            </button>
          )}
        </div>
      )}
    </div>
  );
}
