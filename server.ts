import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const PORT = Number(process.env.PORT) || 3000;
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const MODE_INSTRUCTIONS: Record<string, string> = {
  general:
    'Provide clear, well-structured, step-by-step answers suitable for university students and faculty.',
  study_assistant:
    'Act as an AI Study Assistant: break down complex engineering, science, and management topics into intuitive steps, real-world analogies, key takeaways, and practice questions.',
  code_generator:
    'Act as an AI Code Generator & Debugger: write clean, well-commented programs in C, C++, Java, or Python (or requested language), explain time/space complexity, trace execution step-by-step, and highlight edge cases or compiler/runtime error fixes.',
  doubt_solver:
    'Act as an AI Doubt Solver: diagnose conceptual gaps directly, explain the underlying intuition step-by-step, show worked examples, and confirm understanding with a quick check question.',
  assignment_helper:
    'Act as an AI Assignment Helper: guide the student through problem decomposition, methodology, pseudocode/derivations, and formatting tips without encouraging blind copying—teach how to solve and verify each part.',
  exam_prep:
    'Act as an AI Exam Preparation Assistant: organize high-yield revision checklists, 2-mark short answers, 10-mark essay outlines, probable viva questions, and time-management strategies.',
  notes_generator:
    'Act as an AI Notes Generator: produce crisp, structured lecture notes with headings, bullet points, definitions, formulas, comparison tables, and a quick-revision summary box.',
  quiz_generator:
    'Act as an AI Quiz Generator: create challenging conceptual and application questions with clear options and detailed step-by-step answer keys.',
  resume_builder:
    'Act as an AI Resume Builder tailored for Indian university students and B.Tech/M.Tech/MBA graduates: craft ATS-friendly bullet points with action verbs, project impact framing, technical skills grouping, and campus placement readiness tips.',
  career_guidance:
    'Act as an AI Career Guidance Mentor: provide realistic roadmaps for software engineering, AI/ML, core engineering, GATE, higher studies, internships, and campus placements in India.',
};

function buildSystemInstruction(
  aiMode: string,
  language: string,
  userContext?: { name?: string; role?: string; department?: string; year?: string }
): string {
  const modeGuidance = MODE_INSTRUCTIONS[aiMode] || MODE_INSTRUCTIONS.general;
  const langRule =
    language === 'te'
      ? 'Respond primarily in clear, natural Telugu (తెలుగు) using Telugu script, while keeping technical terms, programming keywords, and code snippets in English for clarity. If the user explicitly asks in English, include helpful Telugu explanations alongside.'
      : 'Respond in clear English by default. If the user writes in Telugu or asks for a Telugu explanation, respond naturally in Telugu (తెలుగు) with technical/code terms kept readable.';

  const profileLine = userContext?.name
    ? `Current user: ${userContext.name} (Role: ${userContext.role || 'student'}, Department: ${userContext.department || 'General'}${userContext.year ? `, Year: ${userContext.year}` : ''}).`
    : 'Current user: Aditya University member.';

  return [
    'You are Aditya AI, the Smart University Assistant for Aditya University, Surampalem, Andhra Pradesh, India.',
    profileLine,
    modeGuidance,
    langRule,
    'STRICT ACCURACY POLICY: Never fabricate or invent official Aditya University exam dates, official semester results, fee schedules, official circulars, or unverified administrative announcements. If asked about live official university dates, grades, or policies not present in the conversation, clearly state that you do not have access to live official university records for that query and advise checking the official Aditya University portal or faculty announcements.',
    'When summarizing uploaded PDFs or documents, extract key sections, core concepts, formulas, and actionable study points faithfully from the provided attachment.',
  ].join('\n\n');
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '16mb' }));
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'aditya-ai-server' });
  });

  // Safe file upload for faculty study materials & student submissions
  app.post('/api/upload', (req, res) => {
    try {
      const { fileName, mimeType, base64Data } = req.body as {
        fileName?: string;
        mimeType?: string;
        base64Data?: string;
      };

      if (!fileName || !base64Data) {
        res.status(400).json({ error: 'fileName and base64Data are required.' });
        return;
      }

      const buffer = Buffer.from(base64Data, 'base64');
      if (buffer.byteLength > 10 * 1024 * 1024) {
        res.status(413).json({ error: 'File exceeds 10 MB limit.' });
        return;
      }

      const ext = path.extname(fileName).replace(/[^a-zA-Z0-9.]/g, '').slice(0, 12);
      const base = path
        .basename(fileName, path.extname(fileName))
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 48);
      const uniqueName = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}_${base || 'file'}${ext}`;
      const targetPath = path.join(UPLOADS_DIR, uniqueName);
      fs.writeFileSync(targetPath, buffer);

      res.json({
        fileUrl: `/uploads/${uniqueName}`,
        fileName,
        mimeType: mimeType || 'application/octet-stream',
        size: buffer.byteLength,
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Failed to store uploaded file.' });
    }
  });

  // Streaming AI Chat Endpoint
  app.post('/api/ai/chat', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const {
        messages,
        aiMode = 'general',
        language = 'en',
        userContext,
        attachment,
      } = req.body as {
        messages: Array<{ role: 'user' | 'assistant'; content: string }>;
        aiMode?: string;
        language?: string;
        userContext?: { name?: string; role?: string; department?: string; year?: string };
        attachment?: {
          name: string;
          mimeType: string;
          base64Data?: string;
          textContent?: string;
        };
      };

      if (!Array.isArray(messages) || messages.length === 0) {
        res.write(`data: ${JSON.stringify({ error: 'At least one message is required.' })}\n\n`);
        res.end();
        return;
      }

      const ai = getGenAI();
      const systemInstruction = buildSystemInstruction(aiMode, language, userContext);

      const contents = messages.map((msg, idx) => {
        const isLastUserMessage = idx === messages.length - 1 && msg.role === 'user';
        const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

        if (isLastUserMessage && attachment) {
          if (attachment.textContent) {
            parts.push({
              text: `[Attached Document: ${attachment.name}]\n\n${attachment.textContent.slice(0, 45000)}`,
            });
          } else if (attachment.base64Data && attachment.mimeType) {
            parts.push({
              inlineData: {
                mimeType: attachment.mimeType,
                data: attachment.base64Data,
              },
            });
          }
        }

        parts.push({ text: msg.content });
        return {
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts,
        };
      });

      const stream = await ai.models.generateContentStream({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction,
        },
      });

      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI generation failed.';
      console.error('Gemini chat error:', error);
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      res.end();
    }
  });

  // Document/PDF Summarizer for Study Materials
  app.post('/api/ai/summarize', async (req, res) => {
    try {
      const { title, fileName, mimeType, base64Data, textContent } = req.body as {
        title?: string;
        fileName?: string;
        mimeType?: string;
        base64Data?: string;
        textContent?: string;
      };

      const ai = getGenAI();
      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

      if (textContent) {
        parts.push({ text: `Document (${fileName || title || 'Material'}):\n${textContent.slice(0, 45000)}` });
      } else if (base64Data && mimeType) {
        parts.push({
          inlineData: {
            mimeType,
            data: base64Data,
          },
        });
      }

      parts.push({
        text: `Summarize this university study material titled "${title || fileName || 'Study Resource'}" into concise key concepts, definitions, and exam-relevant takeaways (under 300 words).`,
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: { parts },
      });

      res.json({ summary: response.text || 'Summary unavailable.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Summarization failed.';
      console.error('Summarize error:', error);
      res.status(500).json({ error: message });
    }
  });

  // Interactive Quiz Generator (Structured JSON)
  app.post('/api/ai/quiz', async (req, res) => {
    try {
      const { topic, difficulty = 'Intermediate', count = 5, language = 'en' } = req.body as {
        topic: string;
        difficulty?: string;
        count?: number;
        language?: string;
      };

      if (!topic || !topic.trim()) {
        res.status(400).json({ error: 'Quiz topic is required.' });
        return;
      }

      const safeCount = Math.min(Math.max(Number(count) || 5, 3), 10);
      const ai = getGenAI();

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Generate ${safeCount} multiple-choice questions for university students on the topic "${topic}" at ${difficulty} difficulty. Language: ${language === 'te' ? 'Telugu (keep technical terms in English)' : 'English'}. Each question must have exactly 4 options, a 0-based correctIndex (0-3), and a brief step-by-step explanation.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              topic: { type: Type.STRING },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    correctIndex: { type: Type.INTEGER },
                    explanation: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      });

      const parsed = JSON.parse(response.text || '{"topic":"","questions":[]}');
      res.json(parsed);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Quiz generation failed.';
      console.error('Quiz error:', error);
      res.status(500).json({ error: message });
    }
  });

  // Vite dev middleware or production static build
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aditya AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Aditya AI server:', err);
  process.exit(1);
});
