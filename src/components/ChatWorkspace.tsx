import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Bookmark,
  Check,
  Copy,
  FileText,
  Languages,
  Mic,
  MicOff,
  Paperclip,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { OperationType, db, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  AI_MODES,
  AIModeId,
  ChatMessage,
  ChatSession,
  LanguageCode,
} from '../types';
import { AdityaCrest } from './AdityaCrest';

interface ChatWorkspaceProps {
  activeChatId: string | null;
  activeChat: ChatSession | null;
  selectedMode: AIModeId;
  onSelectMode: (mode: AIModeId) => void;
  language: LanguageCode;
  onChangeLanguage: (lang: LanguageCode) => void;
  onChatCreated: (chatId: string) => void;
  onOpenQuizStudio: () => void;
  prefillPrompt?: string | null;
  onClearPrefill?: () => void;
}

interface AttachmentDraft {
  name: string;
  mimeType: string;
  base64Data?: string;
  textContent?: string;
  sizeLabel: string;
}

function CodeBlock({ className, children }: { className?: string; children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const codeText = String(children || '').replace(/\n$/, '');
  const langMatch = /language-(\w+)/.exec(className || '');
  const lang = langMatch?.[1] || 'code';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (!className) {
    return (
      <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[0.85em] text-blue-700 dark:text-blue-300">
        {children}
      </code>
    );
  }

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-[#0B1220] text-slate-100">
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900/90 border-b border-slate-800 text-xs text-slate-400">
        <span className="font-mono uppercase tracking-wider">{lang}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed">
        <code>{codeText}</code>
      </pre>
    </div>
  );
}

export function ChatWorkspace({
  activeChatId,
  activeChat,
  selectedMode,
  onSelectMode,
  language,
  onChangeLanguage,
  onChatCreated,
  onOpenQuizStudio,
  prefillPrompt,
  onClearPrefill,
}: ChatWorkspaceProps) {
  const { firebaseUser, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    if (prefillPrompt) {
      setInput(prefillPrompt);
      onClearPrefill?.();
    }
  }, [prefillPrompt, onClearPrefill]);
  const [streamingContent, setStreamingContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<AttachmentDraft | null>(null);
  const [isListening, setIsListening] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    if (!activeChatId || !firebaseUser) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'chats', activeChatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChatMessage));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `chats/${activeChatId}/messages`)
    );

    return () => unsub();
  }, [activeChatId, firebaseUser]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const toggleSaveChat = async () => {
    if (!activeChatId || !activeChat) return;
    try {
      await updateDoc(doc(db, 'chats', activeChatId), {
        isSaved: !activeChat.isSaved,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `chats/${activeChatId}`);
    }
  };

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('Please select a file under 8 MB.');
      return;
    }
    setErrorMsg(null);

    const isTextLike =
      file.type.startsWith('text/') ||
      /\.(txt|md|csv|c|cpp|h|hpp|java|py|js|ts|tsx|json|sql|html|css)$/i.test(file.name);

    const sizeLabel =
      file.size < 1024
        ? `${file.size} B`
        : file.size < 1024 * 1024
        ? `${(file.size / 1024).toFixed(1)} KB`
        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

    if (isTextLike) {
      const textContent = await file.text();
      setAttachment({
        name: file.name,
        mimeType: file.type || 'text/plain',
        textContent,
        sizeLabel,
      });
    } else {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Data = btoa(binary);
      setAttachment({
        name: file.name,
        mimeType: file.type || 'application/pdf',
        base64Data,
        sizeLabel,
      });
    }
    e.target.value = '';
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRec =
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

    if (!SpeechRec) {
      setErrorMsg('Voice input is not supported in this browser. Please try Chrome or Edge.');
      return;
    }

    const recognition = new (SpeechRec as new () => {
      lang: string;
      interimResults: boolean;
      continuous: boolean;
      onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
      onerror: () => void;
      onend: () => void;
      start: () => void;
      stop: () => void;
    })();

    recognition.lang = language === 'te' ? 'te-IN' : 'en-IN';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join(' ');
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  };

  const sendMessage = async (overridePrompt?: string) => {
    const promptText = (overridePrompt ?? input).trim();
    if ((!promptText && !attachment) || isSending || !firebaseUser || !profile) return;

    const finalPrompt =
      promptText ||
      (attachment ? `Please analyze and summarize the attached file: ${attachment.name}` : '');

    setErrorMsg(null);
    setIsSending(true);
    setInput('');
    const currentAttachment = attachment;
    setAttachment(null);

    let chatId = activeChatId;
    try {
      if (!chatId) {
        const newChatRef = doc(collection(db, 'chats'));
        chatId = newChatRef.id;
        await setDoc(newChatRef, {
          userId: firebaseUser.uid,
          title: finalPrompt.slice(0, 64) || 'New Chat',
          language,
          aiMode: selectedMode,
          isSaved: false,
          lastMessagePreview: finalPrompt.slice(0, 120),
          messageCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        onChatCreated(chatId);
      }

      const userMsgRef = doc(collection(db, 'chats', chatId, 'messages'));
      const userMsgPayload: Record<string, unknown> = {
        chatId,
        userId: firebaseUser.uid,
        role: 'user',
        content: finalPrompt,
        createdAt: serverTimestamp(),
      };
      if (currentAttachment) {
        userMsgPayload.attachmentName = currentAttachment.name;
        userMsgPayload.attachmentType = currentAttachment.mimeType;
      }
      await setDoc(userMsgRef, userMsgPayload);

      const historyPayload = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: finalPrompt },
      ];

      setStreamingContent('');
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyPayload,
          aiMode: selectedMode,
          language,
          userContext: {
            name: profile.displayName,
            role: profile.role,
            department: profile.department,
            year: profile.year,
          },
          attachment: currentAttachment
            ? {
                name: currentAttachment.name,
                mimeType: currentAttachment.mimeType,
                base64Data: currentAttachment.base64Data,
                textContent: currentAttachment.textContent,
              }
            : undefined,
        }),
      });

      if (!response.body) {
        throw new Error('No response stream from Aditya AI server.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullReply = '';
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonText = line.slice(6).trim();
          if (!jsonText) continue;
          const parsed = JSON.parse(jsonText) as { text?: string; error?: string; done?: boolean };
          if (parsed.error) {
            throw new Error(parsed.error);
          }
          if (parsed.text) {
            fullReply += parsed.text;
            setStreamingContent(fullReply);
          }
        }
      }

      const assistantReply = fullReply.trim() || 'I could not generate a response. Please try again.';
      const aiMsgRef = doc(collection(db, 'chats', chatId, 'messages'));
      await setDoc(aiMsgRef, {
        chatId,
        userId: firebaseUser.uid,
        role: 'assistant',
        content: assistantReply.slice(0, 31900),
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'chats', chatId), {
        lastMessagePreview: assistantReply.slice(0, 140),
        messageCount: messages.length + 2,
        aiMode: selectedMode,
        language,
        updatedAt: serverTimestamp(),
      });
      setStreamingContent('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to reach Aditya AI.';
      setErrorMsg(msg);
      setStreamingContent('');
    } finally {
      setIsSending(false);
    }
  };

  const activeModeObj = AI_MODES.find((m) => m.id === selectedMode) || AI_MODES[0];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#091020]">
      {/* Chat Top Sub-bar */}
      <div className="px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-white/80 dark:bg-[#0B1324]/80 backdrop-blur">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="font-display text-base sm:text-lg font-semibold text-slate-900 dark:text-white truncate">
            Aditya AI – Your University Assistant
          </h1>
          <span className="hidden sm:inline text-xs text-slate-400" aria-hidden="true">·</span>
          <span className="hidden sm:inline text-xs font-medium text-blue-700 dark:text-blue-300 truncate">
            {activeModeObj.label}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => onChangeLanguage('en')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                language === 'en'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => onChangeLanguage('te')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                language === 'te'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              తెలుగు
            </button>
          </div>

          {activeChatId && activeChat && (
            <button
              type="button"
              onClick={toggleSaveChat}
              title={activeChat.isSaved ? 'Remove from Saved Chats' : 'Save this chat'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                activeChat.isSaved
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>{activeChat.isSaved ? 'Saved' : 'Save'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages Viewport */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 && !streamingContent ? (
            <div className="py-6 sm:py-10 space-y-8">
              <div className="flex flex-col items-center text-center space-y-3">
                <AdityaCrest className="w-12 h-12" />
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                  {language === 'te'
                    ? 'నమస్కారం! ఆదిత్య AI మీకు ఎలా సహాయం చేయగలదు?'
                    : `Hello${profile ? `, ${profile.displayName.split(' ')[0]}` : ''}. How can Aditya AI help today?`}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl">
                  Ask academic, coding (C, C++, Java, Python), mathematics, or placement questions in English or Telugu, or upload a PDF/code file for step-by-step explanations.
                </p>
              </div>

              {/* 10 AI Modes Picker */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Select AI Assistant Mode
                  </h3>
                  <button
                    type="button"
                    onClick={onOpenQuizStudio}
                    className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Open Interactive Quiz Generator →
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {AI_MODES.map((mode) => {
                    const isSelected = selectedMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => {
                          onSelectMode(mode.id);
                          setInput(mode.starterPrompt);
                        }}
                        className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 dark:border-blue-500'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                            {mode.label}
                          </span>
                          <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {mode.shortDesc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3.5 ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <AdityaCrest className="w-8 h-8 shrink-0 mt-0.5" />
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-blue-700 to-indigo-600 text-white'
                        : 'bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {msg.attachmentName && (
                      <div className="flex items-center gap-1.5 text-xs opacity-90 mb-2 pb-1.5 border-b border-white/20">
                        <FileText className="w-3.5 h-3.5" />
                        <span>{msg.attachmentName}</span>
                      </div>
                    )}
                    {msg.role === 'user' ? (
                      <p className="text-sm sm:text-[15px] whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                      </p>
                    ) : (
                      <div className="aditya-prose">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code: ({ className, children }) => (
                              <CodeBlock className={className}>{children}</CodeBlock>
                            ),
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {streamingContent && (
                <div className="flex gap-3.5 justify-start">
                  <AdityaCrest className="w-8 h-8 shrink-0 mt-0.5" />
                  <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                    <div className="aditya-prose">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code: ({ className, children }) => (
                            <CodeBlock className={className}>{children}</CodeBlock>
                          ),
                        }}
                      >
                        {streamingContent}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </>
          )}
        </div>
      </div>

      {/* Message Composer */}
      <div className="px-4 sm:px-6 pb-5 pt-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#091020]">
        <div className="max-w-3xl mx-auto space-y-2.5">
          {errorMsg && (
            <div className="px-3.5 py-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300 flex items-center justify-between gap-2">
              <span>{errorMsg}</span>
              <button type="button" onClick={() => setErrorMsg(null)} className="p-0.5">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {attachment && (
            <div className="flex items-center justify-between px-3.5 py-2 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 text-xs">
              <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 truncate">
                <FileText className="w-4 h-4 shrink-0" />
                <span className="font-medium truncate">{attachment.name}</span>
                <span className="text-blue-600/80 dark:text-blue-300/80 shrink-0">
                  · {attachment.sizeLabel}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAttachment(null)}
                className="text-blue-700 dark:text-blue-300 hover:opacity-80 p-1"
                aria-label="Remove attachment"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0E172B] p-2.5 focus-within:ring-2 focus-within:ring-blue-600 transition-shadow">
            <textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder={
                language === 'te'
                  ? 'మీ ప్రశ్నను ఇక్కడ టైప్ చేయండి లేదా PDF అప్‌లోడ్ చేయండి...'
                  : `Ask ${activeModeObj.label} anything (English or తెలుగు)...`
              }
              className="w-full resize-none bg-transparent px-2 py-1 text-sm sm:text-[15px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
            />

            <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-800 mt-1">
              <div className="flex items-center gap-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.md,.csv,.c,.cpp,.h,.java,.py,.js,.ts,.json,image/*"
                  onChange={handleFilePick}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Upload PDF, code, or image"
                >
                  <Paperclip className="w-4 h-4" />
                  <span className="hidden sm:inline">Upload File</span>
                </button>

                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    isListening
                      ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                  }`}
                  title="Voice input (English / Telugu)"
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  <span className="hidden sm:inline">{isListening ? 'Listening...' : 'Voice'}</span>
                </button>

                <div className="hidden md:flex items-center gap-1 px-2 text-xs text-slate-400">
                  <Languages className="w-3.5 h-3.5" />
                  <select
                    value={selectedMode}
                    onChange={(e) => onSelectMode(e.target.value as AIModeId)}
                    aria-label="Select AI Mode"
                    className="bg-transparent text-xs font-medium text-slate-600 dark:text-slate-300 focus:outline-none cursor-pointer"
                  >
                    {AI_MODES.map((m) => (
                      <option key={m.id} value={m.id} className="bg-white dark:bg-slate-900">
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                disabled={isSending || (!input.trim() && !attachment)}
                onClick={() => void sendMessage()}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-700 to-violet-600 text-white text-xs font-semibold hover:opacity-95 disabled:opacity-40 transition-opacity cursor-pointer"
              >
                <span>{isSending ? 'Thinking...' : 'Send'}</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
