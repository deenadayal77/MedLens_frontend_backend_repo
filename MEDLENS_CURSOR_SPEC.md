# MedLens — Full-Stack Rebuild Spec
> Hand this document to Cursor. Build every section in order. Do not skip sections.

---

## 0. Project Vision

MedLens is an AI-powered medical report assistant. A patient uploads a radiology/medical PDF, gets a plain-language summary, an urgency classification, can translate it into regional Indian languages, hear it read aloud, and chat with an AI that answers questions strictly from the report context.

The evaluator will see the UI first. **UI quality is the top priority.** The aesthetic direction is: **clinical luxury** — deep navy/teal with warm off-white, sharp typography, glassmorphism cards, smooth Framer Motion transitions, and a dashboard feel that looks like a premium health-tech SaaS product.

---

## 1. Repository Structure

Create this exact folder structure from scratch:

```
medlens/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── analyze.py           # POST /api/analyze
│   │   └── chat.py              # POST /api/chat
│   ├── core/
│   │   ├── __init__.py
│   │   ├── ai.py                # All LLM logic (ported from Streamlit)
│   │   ├── config.py            # All prompts and constants
│   │   ├── models.py            # Pydantic + dataclass models
│   │   └── report_processing.py # PDF parsing logic
│   ├── session_store.py         # In-memory session management
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css            # Global styles + CSS variables
│       ├── api/
│       │   └── client.ts        # All API calls
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Navbar.tsx
│       │   │   └── PageShell.tsx
│       │   ├── upload/
│       │   │   ├── DropZone.tsx
│       │   │   └── AnalyzeButton.tsx
│       │   ├── results/
│       │   │   ├── SummaryCard.tsx
│       │   │   ├── UrgencyCard.tsx
│       │   │   ├── ReasonCard.tsx
│       │   │   └── Disclaimer.tsx
│       │   ├── translation/
│       │   │   └── TranslationPanel.tsx
│       │   ├── chat/
│       │   │   ├── ChatPanel.tsx
│       │   │   ├── MessageBubble.tsx
│       │   │   ├── SourceChips.tsx
│       │   │   └── SuggestedQuestions.tsx
│       │   └── ui/
│       │       ├── GlassCard.tsx
│       │       ├── Spinner.tsx
│       │       ├── Badge.tsx
│       │       └── ProgressBar.tsx
│       ├── hooks/
│       │   ├── useAnalysis.ts
│       │   └── useChat.ts
│       ├── store/
│       │   └── appStore.ts      # Zustand store
│       └── types/
│           └── index.ts
│
└── tampermonkey/
    └── medlens_extension.user.js
```

---

## 2. Backend

### 2.1 `backend/requirements.txt`

```
fastapi>=0.111.0
uvicorn[standard]>=0.29.0
python-multipart>=0.0.9
pydantic>=2.0.0
PyMuPDF>=1.22.0
langchain>=0.1.0
langchain-classic>=1.0.0
langchain-community>=0.0.10
langchain-core>=0.1.0
langchain-text-splitters>=0.0.1
langchain-google-genai>=2.0.0
chromadb>=0.4.0
google-genai>=1.0.0
deep-translator>=1.10.1
gTTS>=2.3.0
python-dotenv>=1.0.0
```

### 2.2 `backend/.env.example`

```
GEMINI_API_KEY=your_gemini_api_key_here
MEDLENS_GEMINI_MODEL=gemini-2.5-flash
MEDLENS_GEMINI_CHAT_MODEL=gemini-2.5-flash
MEDLENS_GEMINI_EMBEDDING_MODEL=models/gemini-embedding-001
```

### 2.3 `backend/core/config.py`

Copy exactly from the original `medlens_app/config.py`. No changes needed. All prompts, urgency styles, safety override keywords, and suggested questions live here.

### 2.4 `backend/core/models.py`

```python
from __future__ import annotations
from dataclasses import dataclass, field
from pydantic import BaseModel


# ---------- Internal dataclasses (used by AI layer) ----------

@dataclass
class UrgencyAssessment:
    level: str
    reason: str
    confidence: float | None = None
    override_applied: bool = False
    override_keywords: list[str] = field(default_factory=list)


@dataclass
class AnalysisResult:
    patient_name: str
    report_text: str
    primary_context: str
    summary: str
    urgency: UrgencyAssessment
    report_hash: str


@dataclass
class ChatReply:
    answer: str
    source_chunks: list[str] = field(default_factory=list)


# ---------- Pydantic response models (used by API layer) ----------

class UrgencyResponse(BaseModel):
    level: str
    reason: str
    confidence: float | None
    override_applied: bool
    override_keywords: list[str]


class AnalyzeResponse(BaseModel):
    session_id: str
    patient_name: str
    summary: str
    urgency: UrgencyResponse


class ChatRequest(BaseModel):
    session_id: str
    message: str


class ChatResponse(BaseModel):
    answer: str
    source_chunks: list[str]


class TranslateRequest(BaseModel):
    session_id: str
    text: str
    target_language_code: str  # e.g. "hi", "te", "ta"


class TranslateResponse(BaseModel):
    translated_text: str


class TTSRequest(BaseModel):
    text: str
    language_code: str


# Error response
class ErrorResponse(BaseModel):
    detail: str
```

### 2.5 `backend/core/report_processing.py`

Copy exactly from original `medlens_app/report_processing.py`. No changes needed.

### 2.6 `backend/core/ai.py`

Copy exactly from original `medlens_app/ai.py`. No changes needed. All LLM calls, vectorstore building, urgency classification, and chat chain creation are preserved.

### 2.7 `backend/session_store.py`

```python
"""
In-memory session store. Maps session_id -> AnalysisResult + chat_chain.
Sessions expire after 1 hour of inactivity.
"""
from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Any

SESSION_TTL_SECONDS = 3600  # 1 hour


@dataclass
class Session:
    analysis_result: Any  # AnalysisResult
    vectorstore: Any = None
    chat_chain: Any = None
    chat_ready: bool = False
    last_accessed: float = field(default_factory=time.time)


_store: dict[str, Session] = {}


def create_session(analysis_result) -> str:
    session_id = str(uuid.uuid4())
    _store[session_id] = Session(analysis_result=analysis_result)
    return session_id


def get_session(session_id: str) -> Session | None:
    session = _store.get(session_id)
    if session is None:
        return None
    # Refresh TTL
    session.last_accessed = time.time()
    return session


def update_session(session_id: str, **kwargs) -> None:
    session = _store.get(session_id)
    if session is None:
        return
    for key, value in kwargs.items():
        setattr(session, key, value)
    session.last_accessed = time.time()


def purge_expired() -> None:
    now = time.time()
    expired = [sid for sid, s in _store.items() if now - s.last_accessed > SESSION_TTL_SECONDS]
    for sid in expired:
        del _store[sid]
```

### 2.8 `backend/routers/analyze.py`

```python
from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile

from backend.core.ai import classify_urgency, generate_summary_from_context
from backend.core.models import AnalyzeResponse, UrgencyResponse
from backend.core.report_processing import (
    derive_primary_context,
    extract_patient_name,
    extract_text_from_pdf,
    report_hash_from_bytes,
)
from backend.session_store import create_session, get_session
from backend.core.ai import build_vectorstore, build_chat_chain

router = APIRouter(prefix="/api", tags=["analyze"])


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_report(file: UploadFile = File(...)):
    """
    Accept a PDF upload. Extract text, generate summary, classify urgency.
    Returns session_id for subsequent chat requests.
    """
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    pdf_bytes = await file.read()
    if len(pdf_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        report_hash = report_hash_from_bytes(pdf_bytes)
        report_text = extract_text_from_pdf(pdf_bytes)
        patient_name = extract_patient_name(report_text)
        primary_context = derive_primary_context(report_text)
        summary = generate_summary_from_context(primary_context)
        urgency = classify_urgency(summary=summary, full_report_text=report_text)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}")

    from backend.core.models import AnalysisResult as _AR
    result = _AR(
        patient_name=patient_name,
        report_text=report_text,
        primary_context=primary_context,
        summary=summary,
        urgency=urgency,
        report_hash=report_hash,
    )

    session_id = create_session(result)

    return AnalyzeResponse(
        session_id=session_id,
        patient_name=patient_name,
        summary=summary,
        urgency=UrgencyResponse(
            level=urgency.level,
            reason=urgency.reason,
            confidence=urgency.confidence,
            override_applied=urgency.override_applied,
            override_keywords=urgency.override_keywords,
        ),
    )
```

### 2.9 `backend/routers/chat.py`

```python
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from deep_translator import GoogleTranslator
from gtts import gTTS
from io import BytesIO
from fastapi.responses import StreamingResponse

from backend.core.ai import build_vectorstore, build_chat_chain, chatbot_response
from backend.core.models import (
    ChatRequest, ChatResponse,
    TranslateRequest, TranslateResponse,
    TTSRequest,
)
from backend.session_store import get_session, update_session

router = APIRouter(prefix="/api", tags=["chat"])


def _ensure_chat_ready(session_id: str):
    session = get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found or expired.")

    if session.chat_ready and session.chat_chain is not None:
        return session

    vectorstore = build_vectorstore(
        report_text=session.analysis_result.primary_context,
        report_hash=session.analysis_result.report_hash,
    )
    chat_chain = build_chat_chain(
        vectorstore=vectorstore,
        urgency=session.analysis_result.urgency,
    )
    update_session(session_id, vectorstore=vectorstore, chat_chain=chat_chain, chat_ready=True)
    return get_session(session_id)


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Send a follow-up question about the report."""
    try:
        session = _ensure_chat_ready(request.session_id)
        reply = chatbot_response(session.chat_chain, request.message)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Chat failed: {exc}")

    return ChatResponse(answer=reply.answer, source_chunks=reply.source_chunks)


@router.post("/translate", response_model=TranslateResponse)
async def translate(request: TranslateRequest):
    """Translate a summary text into a target language."""
    try:
        translated = GoogleTranslator(
            source="auto",
            target=request.target_language_code,
        ).translate(request.text)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Translation failed: {exc}")
    return TranslateResponse(translated_text=translated)


@router.post("/tts")
async def text_to_speech(request: TTSRequest):
    """Convert text to MP3 audio and stream it back."""
    try:
        tts = gTTS(text=request.text, lang=request.language_code)
        buffer = BytesIO()
        tts.write_to_fp(buffer)
        buffer.seek(0)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"TTS failed: {exc}")
    return StreamingResponse(buffer, media_type="audio/mpeg")
```

### 2.10 `backend/main.py`

```python
from __future__ import annotations

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from backend.routers.analyze import router as analyze_router
from backend.routers.chat import router as chat_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: nothing needed currently
    yield
    # Shutdown: nothing needed


app = FastAPI(
    title="MedLens API",
    description="AI-powered medical report analysis",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze_router)
app.include_router(chat_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
```

**To run the backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## 3. Frontend

### 3.1 `frontend/package.json`

```json
{
  "name": "medlens-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "framer-motion": "^11.2.10",
    "zustand": "^4.5.2",
    "axios": "^1.7.2",
    "react-dropzone": "^14.2.3",
    "react-markdown": "^9.0.1",
    "lucide-react": "^0.383.0",
    "clsx": "^2.1.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.4.5",
    "vite": "^5.3.1"
  }
}
```

### 3.2 `frontend/vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
```

### 3.3 `frontend/tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        navy: {
          950: '#04111a',
          900: '#071e2e',
          800: '#0c2d45',
          700: '#133d5e',
          600: '#1a4e78',
        },
        teal: {
          500: '#2d9cad',
          400: '#3cb8cc',
          300: '#6fd3e0',
          200: '#a8e8f0',
          100: '#e0f7fa',
        },
        cream: {
          50:  '#fafaf7',
          100: '#f5f4ef',
          200: '#ece9df',
        },
        urgency: {
          critical: '#d63031',
          high:     '#e17055',
          moderate: '#fdcb6e',
          low:      '#00b894',
          veryLow:  '#00cec9',
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(4, 17, 26, 0.25), inset 0 1px 0 rgba(255,255,255,0.1)',
        glow: '0 0 40px rgba(45, 156, 173, 0.18)',
        'glow-lg': '0 0 80px rgba(45, 156, 173, 0.25)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'scan': 'scan 2.5s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        scan: {
          '0%, 100%': { transform: 'translateY(0%)', opacity: '0.6' },
          '50%': { transform: 'translateY(100%)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
```

### 3.4 `frontend/src/index.css`

```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --navy-950: #04111a;
  --navy-900: #071e2e;
  --navy-800: #0c2d45;
  --teal-500: #2d9cad;
  --teal-400: #3cb8cc;
  --cream-50: #fafaf7;
  --glass-bg: rgba(12, 45, 69, 0.55);
  --glass-border: rgba(45, 156, 173, 0.2);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  scroll-behavior: smooth;
}

body {
  background-color: var(--navy-950);
  color: var(--cream-50);
  font-family: 'DM Sans', sans-serif;
  min-height: 100vh;
  /* Subtle grid texture */
  background-image:
    linear-gradient(rgba(45, 156, 173, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(45, 156, 173, 0.03) 1px, transparent 1px);
  background-size: 40px 40px;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: var(--navy-900);
}
::-webkit-scrollbar-thumb {
  background: var(--teal-500);
  border-radius: 3px;
}

/* Glassmorphism card base */
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
}

/* Ambient glow behind hero */
.ambient-glow {
  position: fixed;
  top: -20%;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(45, 156, 173, 0.12) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

/* Markdown prose styles inside summary */
.prose-medlens h1,
.prose-medlens h2,
.prose-medlens h3 {
  font-family: 'Playfair Display', serif;
  color: var(--teal-300, #6fd3e0);
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
}
.prose-medlens p {
  line-height: 1.75;
  color: #cce6ec;
}
.prose-medlens ul {
  list-style: disc;
  padding-left: 1.5rem;
  color: #cce6ec;
}
.prose-medlens strong {
  color: #e0f7fa;
}
```

### 3.5 `frontend/src/types/index.ts`

```typescript
export type UrgencyLevel = 'VERY_LOW' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface UrgencyData {
  level: UrgencyLevel;
  reason: string;
  confidence: number | null;
  override_applied: boolean;
  override_keywords: string[];
}

export interface AnalyzeResponse {
  session_id: string;
  patient_name: string;
  summary: string;
  urgency: UrgencyData;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  timestamp: Date;
}

export interface ChatResponse {
  answer: string;
  source_chunks: string[];
}

export interface TranslateResponse {
  translated_text: string;
}

export type AppPhase = 'idle' | 'uploading' | 'analyzing' | 'results' | 'error';

export interface UrgencyStyle {
  label: string;
  color: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  icon: string;
  progress: number;
}

export const URGENCY_STYLES: Record<UrgencyLevel, UrgencyStyle> = {
  VERY_LOW: {
    label: 'No significant issue',
    color: '#00cec9',
    bgClass: 'bg-teal-900/30',
    borderClass: 'border-teal-400/40',
    textClass: 'text-teal-300',
    icon: '🟢',
    progress: 5,
  },
  LOW: {
    label: 'Manageable / routine care',
    color: '#00b894',
    bgClass: 'bg-green-900/30',
    borderClass: 'border-green-400/40',
    textClass: 'text-green-300',
    icon: '🟢',
    progress: 25,
  },
  MODERATE: {
    label: 'Monitor condition',
    color: '#fdcb6e',
    bgClass: 'bg-yellow-900/30',
    borderClass: 'border-yellow-400/40',
    textClass: 'text-yellow-300',
    icon: '🟡',
    progress: 50,
  },
  HIGH: {
    label: 'Visit doctor soon',
    color: '#e17055',
    bgClass: 'bg-orange-900/30',
    borderClass: 'border-orange-400/40',
    textClass: 'text-orange-300',
    icon: '🟠',
    progress: 75,
  },
  CRITICAL: {
    label: 'Immediate medical attention required',
    color: '#d63031',
    bgClass: 'bg-red-900/30',
    borderClass: 'border-red-400/40',
    textClass: 'text-red-300',
    icon: '🔴',
    progress: 100,
  },
};

export const LANGUAGE_MAP: Record<string, string> = {
  English: 'en',
  Hindi: 'hi',
  Telugu: 'te',
  Tamil: 'ta',
  Kannada: 'kn',
  Malayalam: 'ml',
  Bengali: 'bn',
};

export const SUGGESTED_QUESTIONS = [
  'Is this serious?',
  'What does this condition mean?',
  'What should I do next?',
  'Should I be worried?',
];
```

### 3.6 `frontend/src/api/client.ts`

```typescript
import axios from 'axios';
import type { AnalyzeResponse, ChatResponse, TranslateResponse } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 120_000, // AI calls can be slow
});

export async function analyzeReport(file: File): Promise<AnalyzeResponse> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<AnalyzeResponse>('/analyze', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function sendChat(sessionId: string, message: string): Promise<ChatResponse> {
  const { data } = await api.post<ChatResponse>('/chat', {
    session_id: sessionId,
    message,
  });
  return data;
}

export async function translateText(
  sessionId: string,
  text: string,
  targetLanguageCode: string,
): Promise<TranslateResponse> {
  const { data } = await api.post<TranslateResponse>('/translate', {
    session_id: sessionId,
    text,
    target_language_code: targetLanguageCode,
  });
  return data;
}

export function getTTSUrl(text: string, languageCode: string): string {
  const params = new URLSearchParams({ text, language_code: languageCode });
  return `/api/tts?${params}`;
}

export async function fetchTTSBlob(text: string, languageCode: string): Promise<Blob> {
  const { data } = await api.post('/tts', { text, language_code: languageCode }, {
    responseType: 'blob',
  });
  return data;
}
```

### 3.7 `frontend/src/store/appStore.ts`

```typescript
import { create } from 'zustand';
import type { AnalyzeResponse, ChatMessage, AppPhase } from '../types';

interface AppState {
  phase: AppPhase;
  analysisResult: AnalyzeResponse | null;
  messages: ChatMessage[];
  translatedSummary: string;
  selectedLanguage: string;
  error: string | null;

  setPhase: (phase: AppPhase) => void;
  setAnalysisResult: (result: AnalyzeResponse) => void;
  addMessage: (message: ChatMessage) => void;
  setTranslatedSummary: (text: string) => void;
  setSelectedLanguage: (lang: string) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  phase: 'idle' as AppPhase,
  analysisResult: null,
  messages: [],
  translatedSummary: '',
  selectedLanguage: 'English',
  error: null,
};

export const useAppStore = create<AppState>((set) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),
  setAnalysisResult: (result) => set({
    analysisResult: result,
    phase: 'results',
    messages: [{
      role: 'assistant',
      content: `Based on your report, this falls under **${result.urgency.level}** urgency. Ask me follow-up questions about your report in simple language.`,
      sources: [],
      timestamp: new Date(),
    }],
  }),
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message],
  })),
  setTranslatedSummary: (text) => set({ translatedSummary: text }),
  setSelectedLanguage: (lang) => set({ selectedLanguage: lang }),
  setError: (error) => set({ error, phase: 'error' }),
  reset: () => set(initialState),
}));
```

### 3.8 `frontend/src/hooks/useAnalysis.ts`

```typescript
import { useCallback } from 'react';
import { analyzeReport } from '../api/client';
import { useAppStore } from '../store/appStore';

export function useAnalysis() {
  const { setPhase, setAnalysisResult, setError, reset } = useAppStore();

  const analyze = useCallback(async (file: File) => {
    reset();
    setPhase('analyzing');
    try {
      const result = await analyzeReport(file);
      setAnalysisResult(result);
    } catch (err: any) {
      const message = err?.response?.data?.detail ?? err?.message ?? 'Analysis failed. Check your API key and try again.';
      setError(message);
    }
  }, [reset, setPhase, setAnalysisResult, setError]);

  return { analyze };
}
```

### 3.9 `frontend/src/hooks/useChat.ts`

```typescript
import { useCallback, useState } from 'react';
import { sendChat } from '../api/client';
import { useAppStore } from '../store/appStore';
import type { ChatMessage } from '../types';

export function useChat() {
  const { analysisResult, addMessage } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (content: string) => {
    if (!analysisResult || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content, sources: [], timestamp: new Date() };
    addMessage(userMsg);
    setIsLoading(true);

    try {
      const reply = await sendChat(analysisResult.session_id, content);
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: reply.answer,
        sources: reply.source_chunks,
        timestamp: new Date(),
      };
      addMessage(assistantMsg);
    } catch (err: any) {
      const errMsg: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I could not process that question. Please try again.',
        sources: [],
        timestamp: new Date(),
      };
      addMessage(errMsg);
    } finally {
      setIsLoading(false);
    }
  }, [analysisResult, addMessage, isLoading]);

  return { sendMessage, isLoading };
}
```

---

## 4. Frontend Components — Full Implementations

### 4.1 `frontend/src/components/ui/GlassCard.tsx`

```tsx
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
  delay?: number;
}

export function GlassCard({ children, className, animate = true, delay = 0 }: GlassCardProps) {
  const base = 'glass p-6 relative overflow-hidden';

  if (!animate) {
    return <div className={clsx(base, className)}>{children}</div>;
  }

  return (
    <motion.div
      className={clsx(base, className)}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Subtle shimmer edge */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(45,156,173,0.06) 0%, transparent 60%)',
        }}
      />
      {children}
    </motion.div>
  );
}
```

### 4.2 `frontend/src/components/ui/Spinner.tsx`

```tsx
export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
      style={{ color: '#3cb8cc' }}
    >
      <circle
        cx="12" cy="12" r="10"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.25"
      />
      <path
        d="M12 2 A10 10 0 0 1 22 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
```

### 4.3 `frontend/src/components/ui/ProgressBar.tsx`

```tsx
import { motion } from 'framer-motion';

interface ProgressBarProps {
  value: number;       // 0–100
  color: string;       // CSS color string
  height?: number;
}

export function ProgressBar({ value, color, height = 8 }: ProgressBarProps) {
  return (
    <div
      className="w-full rounded-full overflow-hidden"
      style={{ height, background: 'rgba(255,255,255,0.08)' }}
    >
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
      />
    </div>
  );
}
```

### 4.4 `frontend/src/components/ui/Badge.tsx`

```tsx
import { clsx } from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'teal' | 'warn' | 'error' | 'neutral';
}

const variants = {
  teal: 'bg-teal-500/15 text-teal-300 border border-teal-500/30',
  warn: 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30',
  error: 'bg-red-500/15 text-red-300 border border-red-500/30',
  neutral: 'bg-white/5 text-cream-200 border border-white/10',
};

export function Badge({ children, variant = 'neutral' }: BadgeProps) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium font-mono tracking-wide',
      variants[variant],
    )}>
      {children}
    </span>
  );
}
```

### 4.5 `frontend/src/components/layout/Navbar.tsx`

```tsx
import { motion } from 'framer-motion';

export function Navbar() {
  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4"
      style={{
        background: 'rgba(4, 17, 26, 0.7)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(45, 156, 173, 0.12)',
      }}
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex items-center gap-3">
        {/* Logo mark */}
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 rounded-lg bg-teal-500/20 border border-teal-400/30" />
          <span className="absolute inset-0 flex items-center justify-center text-lg">🩺</span>
        </div>
        <span className="font-display font-semibold text-xl tracking-tight text-cream-50">
          Med<span className="text-teal-400">Lens</span>
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-teal-300/60 font-mono">AI Medical Assistant</span>
        <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse-slow" />
      </div>
    </motion.nav>
  );
}
```

### 4.6 `frontend/src/components/upload/DropZone.tsx`

Build a drop zone with these exact behaviors and visual design:

```tsx
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface DropZoneProps {
  onFileAccepted: (file: File) => void;
  disabled?: boolean;
}

export function DropZone({ onFileAccepted, disabled }: DropZoneProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rejected, setRejected] = useState(false);

  const onDrop = useCallback((accepted: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      setRejected(true);
      setTimeout(() => setRejected(false), 2500);
      return;
    }
    if (accepted.length > 0) {
      setSelectedFile(accepted[0]);
      setRejected(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled,
  });

  return (
    <div className="space-y-4">
      <motion.div
        {...getRootProps()}
        className={clsx(
          'relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 p-12 text-center select-none',
          isDragActive
            ? 'border-teal-400 bg-teal-500/10 shadow-glow'
            : rejected
            ? 'border-red-400/60 bg-red-500/5'
            : selectedFile
            ? 'border-teal-500/60 bg-teal-500/5'
            : 'border-white/10 bg-white/2 hover:border-teal-500/40 hover:bg-teal-500/5',
          disabled && 'opacity-40 cursor-not-allowed',
        )}
        whileHover={!disabled ? { scale: 1.005 } : {}}
        whileTap={!disabled ? { scale: 0.998 } : {}}
      >
        <input {...getInputProps()} />

        <AnimatePresence mode="wait">
          {rejected ? (
            <motion.div key="rejected"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3"
            >
              <AlertCircle className="w-12 h-12 text-red-400" />
              <p className="text-red-300 font-medium">Only PDF files are accepted</p>
            </motion.div>
          ) : selectedFile ? (
            <motion.div key="selected"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="w-14 h-14 rounded-xl bg-teal-500/15 border border-teal-400/30 flex items-center justify-center">
                <FileText className="w-7 h-7 text-teal-300" />
              </div>
              <div>
                <p className="font-medium text-cream-50">{selectedFile.name}</p>
                <p className="text-sm text-teal-400/70 mt-1">
                  {(selectedFile.size / 1024).toFixed(1)} KB · PDF
                </p>
              </div>
              <p className="text-xs text-white/30">Drop another file to replace</p>
            </motion.div>
          ) : (
            <motion.div key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <motion.div
                className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-400/20 flex items-center justify-center"
                animate={isDragActive ? { scale: 1.15, rotate: 5 } : { scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <Upload className="w-8 h-8 text-teal-400" />
              </motion.div>
              <div>
                <p className="font-medium text-cream-50 text-lg">
                  {isDragActive ? 'Drop your report here' : 'Upload medical report'}
                </p>
                <p className="text-sm text-white/40 mt-1">
                  Drag & drop or click to browse · PDF only
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Analyze button — only shown when file selected */}
      <AnimatePresence>
        {selectedFile && !disabled && (
          <motion.button
            key="analyze-btn"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onClick={() => onFileAccepted(selectedFile)}
            className="w-full py-4 rounded-xl font-semibold text-base tracking-wide transition-all duration-200
              bg-gradient-to-r from-teal-500 to-teal-400 text-navy-950
              hover:shadow-glow-lg hover:scale-[1.01] active:scale-[0.99]"
          >
            Analyze Report →
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
```

### 4.7 `frontend/src/components/upload/AnalyzeButton.tsx`

This component shows the animated analysis progress state. Display it while `phase === 'analyzing'`:

```tsx
import { motion } from 'framer-motion';
import { Spinner } from '../ui/Spinner';

const STEPS = [
  'Extracting text from PDF…',
  'Reading report structure…',
  'Generating patient summary…',
  'Classifying urgency level…',
  'Finalizing analysis…',
];

export function AnalyzingState() {
  return (
    <motion.div
      className="glass p-10 text-center space-y-6"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Animated scan bar */}
      <div className="relative w-full h-1 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(90deg, transparent, #3cb8cc, transparent)',
            width: '40%',
          }}
          animate={{ x: ['-100%', '300%'] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="flex items-center justify-center gap-3">
        <Spinner size={28} />
        <span className="font-display text-xl text-cream-50">Analyzing your report</span>
      </div>

      {/* Step cycle */}
      <motion.div
        key="steps"
        className="text-sm text-teal-400/70 font-mono"
      >
        {STEPS.map((step, i) => (
          <motion.p
            key={step}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 1.2, duration: 0.6 }}
          >
            {step}
          </motion.p>
        ))}
      </motion.div>

      <p className="text-xs text-white/25">This may take 15–30 seconds</p>
    </motion.div>
  );
}
```

### 4.8 `frontend/src/components/results/SummaryCard.tsx`

```tsx
import ReactMarkdown from 'react-markdown';
import { GlassCard } from '../ui/GlassCard';
import { motion } from 'framer-motion';

interface SummaryCardProps {
  summary: string;
  patientName: string;
}

export function SummaryCard({ summary, patientName }: SummaryCardProps) {
  return (
    <GlassCard delay={0.1}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-2xl font-semibold text-cream-50">
          📄 Report Summary
        </h2>
        {patientName !== 'Not available' && (
          <span className="text-sm text-teal-400/70 font-mono">
            Patient: {patientName}
          </span>
        )}
      </div>
      <div className="prose-medlens">
        <ReactMarkdown>{summary}</ReactMarkdown>
      </div>
    </GlassCard>
  );
}
```

### 4.9 `frontend/src/components/results/UrgencyCard.tsx`

```tsx
import { motion } from 'framer-motion';
import { GlassCard } from '../ui/GlassCard';
import { ProgressBar } from '../ui/ProgressBar';
import { Badge } from '../ui/Badge';
import { URGENCY_STYLES } from '../../types';
import type { UrgencyData } from '../../types';

interface UrgencyCardProps {
  urgency: UrgencyData;
}

export function UrgencyCard({ urgency }: UrgencyCardProps) {
  const style = URGENCY_STYLES[urgency.level];

  return (
    <GlassCard
      delay={0.2}
      className={`border ${style.borderClass} ${style.bgClass}`}
    >
      <h2 className="font-display text-2xl font-semibold text-cream-50 mb-4">
        🚨 Urgency Level
      </h2>

      <div className="flex items-center justify-between mb-4">
        <div>
          <div className={`text-2xl font-bold font-display ${style.textClass}`}>
            {style.icon} {urgency.level.replace('_', ' ')}
          </div>
          <div className="text-sm text-white/50 mt-1">{style.label}</div>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-mono font-bold ${style.textClass}`}>
            {style.progress}
          </div>
          <div className="text-xs text-white/30 font-mono">/ 100</div>
        </div>
      </div>

      <ProgressBar value={style.progress} color={style.color} height={10} />

      {urgency.confidence !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-3 text-xs text-white/40 font-mono"
        >
          Confidence: {Math.round(urgency.confidence * 100)}%
        </motion.div>
      )}

      {urgency.override_applied && urgency.override_keywords.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-4 flex flex-wrap gap-2"
        >
          <span className="text-xs text-red-400/70">Safety override triggered by:</span>
          {urgency.override_keywords.map((kw) => (
            <Badge key={kw} variant="error">{kw}</Badge>
          ))}
        </motion.div>
      )}
    </GlassCard>
  );
}
```

### 4.10 `frontend/src/components/results/ReasonCard.tsx`

```tsx
import { GlassCard } from '../ui/GlassCard';

export function ReasonCard({ reason }: { reason: string }) {
  return (
    <GlassCard delay={0.3}>
      <h2 className="font-display text-2xl font-semibold text-cream-50 mb-3">
        💡 Why this urgency?
      </h2>
      <p className="text-white/70 leading-relaxed">{reason}</p>
    </GlassCard>
  );
}
```

### 4.11 `frontend/src/components/results/Disclaimer.tsx`

```tsx
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

export function Disclaimer() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/8 border border-yellow-400/20"
    >
      <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
      <p className="text-sm text-yellow-200/70 leading-relaxed">
        This is an AI-generated analysis and not a medical diagnosis.
        Please consult a qualified doctor.
      </p>
    </motion.div>
  );
}
```

### 4.12 `frontend/src/components/translation/TranslationPanel.tsx`

```tsx
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Languages, ChevronDown } from 'lucide-react';
import { Spinner } from '../ui/Spinner';
import { GlassCard } from '../ui/GlassCard';
import { translateText, fetchTTSBlob } from '../../api/client';
import { useAppStore } from '../../store/appStore';
import { LANGUAGE_MAP } from '../../types';

interface TranslationPanelProps {
  summary: string;
  sessionId: string;
}

export function TranslationPanel({ summary, sessionId }: TranslationPanelProps) {
  const [open, setOpen] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [playingTTS, setPlayingTTS] = useState(false);
  const { translatedSummary, selectedLanguage, setTranslatedSummary, setSelectedLanguage } = useAppStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleTranslate = async () => {
    const code = LANGUAGE_MAP[selectedLanguage];
    if (code === 'en') {
      setTranslatedSummary(summary);
      return;
    }
    setTranslating(true);
    try {
      const result = await translateText(sessionId, summary, code);
      setTranslatedSummary(result.translated_text);
    } catch {
      alert('Translation failed. Please try again.');
    } finally {
      setTranslating(false);
    }
  };

  const handleReadAloud = async () => {
    const text = translatedSummary || summary;
    const code = LANGUAGE_MAP[selectedLanguage];
    setPlayingTTS(true);
    try {
      const blob = await fetchTTSBlob(text, code);
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.src = url;
        await audioRef.current.play();
      }
    } catch {
      alert('Audio generation failed.');
    } finally {
      setPlayingTTS(false);
    }
  };

  return (
    <GlassCard delay={0.4} className="overflow-visible">
      <audio ref={audioRef} className="hidden" onEnded={() => setPlayingTTS(false)} />
      
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Languages className="w-5 h-5 text-teal-400" />
          <span className="font-display text-lg font-semibold text-cream-50">
            Translation & Audio
          </span>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown className="w-5 h-5 text-white/40" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-5 space-y-4">
              {/* Language selector */}
              <div className="flex gap-3">
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="flex-1 bg-navy-800/60 border border-white/10 rounded-xl px-4 py-2.5
                    text-cream-50 font-body text-sm focus:outline-none focus:border-teal-400/50
                    transition-colors cursor-pointer"
                >
                  {Object.keys(LANGUAGE_MAP).map((lang) => (
                    <option key={lang} value={lang} className="bg-navy-900">{lang}</option>
                  ))}
                </select>

                <button
                  onClick={handleTranslate}
                  disabled={translating}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500/15 border
                    border-teal-400/30 text-teal-300 text-sm font-medium transition-all
                    hover:bg-teal-500/25 disabled:opacity-50"
                >
                  {translating ? <Spinner size={16} /> : <Languages className="w-4 h-4" />}
                  Translate
                </button>

                <button
                  onClick={handleReadAloud}
                  disabled={playingTTS}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-navy-700/60 border
                    border-white/10 text-white/70 text-sm font-medium transition-all
                    hover:bg-navy-700 hover:text-white disabled:opacity-50"
                >
                  {playingTTS ? <Spinner size={16} /> : <Volume2 className="w-4 h-4" />}
                  Read
                </button>
              </div>

              {/* Translated output */}
              <AnimatePresence>
                {translatedSummary && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-navy-800/50 border border-white/8 text-white/70 text-sm leading-relaxed"
                  >
                    {translatedSummary}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}
```

### 4.13 `frontend/src/components/chat/SuggestedQuestions.tsx`

```tsx
import { motion } from 'framer-motion';
import { SUGGESTED_QUESTIONS } from '../../types';

interface SuggestedQuestionsProps {
  onSelect: (q: string) => void;
  disabled?: boolean;
}

export function SuggestedQuestions({ onSelect, disabled }: SuggestedQuestionsProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {SUGGESTED_QUESTIONS.map((q, i) => (
        <motion.button
          key={q}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }}
          onClick={() => !disabled && onSelect(q)}
          disabled={disabled}
          className="px-3 py-1.5 rounded-full text-xs font-medium border border-teal-400/25
            text-teal-300/80 bg-teal-500/8 hover:bg-teal-500/18 hover:text-teal-200
            transition-all duration-150 disabled:opacity-40 cursor-pointer"
        >
          {q}
        </motion.button>
      ))}
    </div>
  );
}
```

### 4.14 `frontend/src/components/chat/SourceChips.tsx`

```tsx
import { motion } from 'framer-motion';

export function SourceChips({ chunks }: { chunks: string[] }) {
  if (!chunks || chunks.length === 0) return null;
  return (
    <div className="mt-2 space-y-1.5">
      <p className="text-xs text-white/25 font-mono uppercase tracking-widest">
        Source chunks
      </p>
      {chunks.map((chunk, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="text-xs text-teal-400/60 bg-teal-500/5 border border-teal-500/15
            rounded-lg px-3 py-2 font-mono leading-relaxed"
        >
          {chunk}
        </motion.div>
      ))}
    </div>
  );
}
```

### 4.15 `frontend/src/components/chat/MessageBubble.tsx`

```tsx
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import { SourceChips } from './SourceChips';
import type { ChatMessage } from '../../types';

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`max-w-[82%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Role label */}
        <span className="text-xs text-white/25 font-mono mb-1 px-1">
          {isUser ? 'You' : 'MedLens AI'}
        </span>

        {/* Bubble */}
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed
          ${isUser
            ? 'bg-teal-500/20 border border-teal-400/25 text-cream-50 rounded-br-sm'
            : 'bg-navy-800/60 border border-white/8 text-white/80 rounded-bl-sm'
          }`}
        >
          {isUser ? (
            <p>{message.content}</p>
          ) : (
            <div className="prose-medlens prose-sm">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Sources */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <SourceChips chunks={message.sources} />
        )}
      </div>
    </motion.div>
  );
}
```

### 4.16 `frontend/src/components/chat/ChatPanel.tsx`

```tsx
import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { MessageBubble } from './MessageBubble';
import { SuggestedQuestions } from './SuggestedQuestions';
import { Spinner } from '../ui/Spinner';
import { useAppStore } from '../../store/appStore';
import { useChat } from '../../hooks/useChat';

export function ChatPanel() {
  const { messages } = useAppStore();
  const { sendMessage, isLoading } = useChat();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (content?: string) => {
    const text = content ?? input.trim();
    if (!text || isLoading) return;
    setInput('');
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <GlassCard delay={0.5} className="flex flex-col" style={{ minHeight: '520px' }}>
      <h2 className="font-display text-2xl font-semibold text-cream-50 mb-4">
        💬 Report Chatbot
      </h2>

      <SuggestedQuestions onSelect={handleSend} disabled={isLoading} />

      {/* Message list */}
      <div className="flex-1 overflow-y-auto max-h-96 pr-1 space-y-1 mb-4">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-sm text-teal-400/60 px-1"
            >
              <Spinner size={14} />
              <span className="font-mono text-xs">Reviewing report context…</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div className="flex gap-3 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a follow-up question about this report…"
          rows={1}
          disabled={isLoading}
          className="flex-1 resize-none rounded-xl bg-navy-800/50 border border-white/10 px-4 py-3
            text-sm text-cream-50 placeholder:text-white/25 focus:outline-none
            focus:border-teal-400/40 transition-colors font-body leading-relaxed
            disabled:opacity-50"
          style={{ maxHeight: '120px' }}
        />
        <motion.button
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading}
          whileTap={{ scale: 0.93 }}
          className="shrink-0 w-11 h-11 rounded-xl bg-teal-500/20 border border-teal-400/30
            flex items-center justify-center text-teal-300 hover:bg-teal-500/35
            transition-all disabled:opacity-30"
        >
          <Send className="w-4 h-4" />
        </motion.button>
      </div>
    </GlassCard>
  );
}
```

### 4.17 `frontend/src/App.tsx`

```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from './components/layout/Navbar';
import { DropZone } from './components/upload/DropZone';
import { AnalyzingState } from './components/upload/AnalyzeButton';
import { SummaryCard } from './components/results/SummaryCard';
import { UrgencyCard } from './components/results/UrgencyCard';
import { ReasonCard } from './components/results/ReasonCard';
import { Disclaimer } from './components/results/Disclaimer';
import { TranslationPanel } from './components/translation/TranslationPanel';
import { ChatPanel } from './components/chat/ChatPanel';
import { useAppStore } from './store/appStore';
import { useAnalysis } from './hooks/useAnalysis';
import { RefreshCw, AlertCircle } from 'lucide-react';

function HeroSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="text-center mb-12"
    >
      <motion.div
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6
          bg-teal-500/10 border border-teal-400/20 text-teal-300 text-sm font-mono"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse-slow" />
        Powered by Gemini 2.5 Flash
      </motion.div>

      <h1 className="font-display text-5xl md:text-6xl font-bold text-cream-50 leading-tight">
        Understand your
        <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-teal-200">
          medical report
        </span>
      </h1>
      <p className="mt-4 text-lg text-white/45 max-w-xl mx-auto leading-relaxed">
        Upload any radiology or clinical PDF. MedLens generates a plain-language summary,
        urgency classification, and lets you ask follow-up questions — all grounded strictly
        in your report.
      </p>
    </motion.div>
  );
}

export default function App() {
  const { phase, analysisResult, error, reset } = useAppStore();
  const { analyze } = useAnalysis();

  return (
    <div className="min-h-screen relative">
      {/* Ambient glow */}
      <div className="ambient-glow" />

      <Navbar />

      <main className="relative z-10 max-w-3xl mx-auto px-4 pt-28 pb-20">
        <AnimatePresence mode="wait">

          {/* IDLE — upload screen */}
          {(phase === 'idle' || phase === 'uploading') && (
            <motion.div key="idle" exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
              <HeroSection />
              <DropZone onFileAccepted={analyze} disabled={phase === 'uploading'} />
            </motion.div>
          )}

          {/* ANALYZING */}
          {phase === 'analyzing' && (
            <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AnalyzingState />
            </motion.div>
          )}

          {/* ERROR */}
          {phase === 'error' && (
            <motion.div key="error" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-5">
              <div className="glass p-8 space-y-4">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
                <h2 className="font-display text-2xl text-cream-50">Analysis failed</h2>
                <p className="text-white/50 text-sm">{error}</p>
                <button
                  onClick={reset}
                  className="flex items-center gap-2 mx-auto px-6 py-2.5 rounded-xl
                    bg-teal-500/15 border border-teal-400/30 text-teal-300 text-sm
                    hover:bg-teal-500/25 transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try again
                </button>
              </div>
            </motion.div>
          )}

          {/* RESULTS */}
          {phase === 'results' && analysisResult && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex items-center justify-between mb-8">
                <motion.h2
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="font-display text-3xl font-semibold text-cream-50"
                >
                  Analysis Complete
                </motion.h2>
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  onClick={reset}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm
                    text-white/40 hover:text-white/70 border border-white/8 hover:border-white/20
                    transition-all bg-white/3"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  New report
                </motion.button>
              </div>

              <div className="space-y-5">
                <SummaryCard summary={analysisResult.summary} patientName={analysisResult.patient_name} />
                <UrgencyCard urgency={analysisResult.urgency} />
                <ReasonCard reason={analysisResult.urgency.reason} />
                <Disclaimer />
                <TranslationPanel summary={analysisResult.summary} sessionId={analysisResult.session_id} />
                <ChatPanel />
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
```

### 4.18 `frontend/src/main.tsx`

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

### 4.19 `frontend/index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MedLens — AI Medical Report Assistant</title>
    <meta name="description" content="Upload a radiology or clinical PDF and get an instant patient-friendly summary, urgency classification, and follow-up chat." />
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'><text y='32' font-size='32'>🩺</text></svg>" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## 5. Tampermonkey Extension

### 5.1 `tampermonkey/medlens_extension.user.js`

```javascript
// ==UserScript==
// @name         MedLens Analyzer
// @namespace    http://medlens.local/
// @version      1.0
// @description  Adds a "Analyze with MedLens" button to any page containing a PDF link. Sends the PDF to a local MedLens backend and shows results in a floating panel.
// @author       MedLens
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      localhost
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const BACKEND_URL = 'http://localhost:8000';

  // ── Styles ──────────────────────────────────────────────────────────────────

  GM_addStyle(`
    #medlens-panel {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 400px;
      max-height: 85vh;
      overflow-y: auto;
      z-index: 999999;
      font-family: 'DM Sans', system-ui, sans-serif;
      background: rgba(7, 30, 46, 0.95);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(45, 156, 173, 0.3);
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      color: #f5f4ef;
      transition: all 0.3s ease;
    }
    #medlens-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      border-bottom: 1px solid rgba(45, 156, 173, 0.15);
    }
    #medlens-panel-title {
      font-weight: 700;
      font-size: 15px;
      color: #3cb8cc;
    }
    #medlens-panel-close {
      cursor: pointer;
      color: rgba(255,255,255,0.4);
      font-size: 18px;
      line-height: 1;
      border: none;
      background: none;
      padding: 2px 6px;
      border-radius: 6px;
    }
    #medlens-panel-close:hover { color: white; background: rgba(255,255,255,0.08); }
    #medlens-panel-body { padding: 16px; }
    .ml-section { margin-bottom: 14px; }
    .ml-section-title {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.35);
      margin-bottom: 6px;
    }
    .ml-summary {
      font-size: 13px;
      line-height: 1.75;
      color: rgba(204, 230, 236, 0.85);
    }
    .ml-urgency-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      border: 1px solid;
    }
    .ml-reason {
      font-size: 12px;
      color: rgba(255,255,255,0.5);
      line-height: 1.6;
    }
    .ml-chat-input-row {
      display: flex;
      gap: 8px;
      margin-top: 10px;
    }
    .ml-chat-input {
      flex: 1;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      padding: 8px 12px;
      color: white;
      font-size: 12px;
      outline: none;
    }
    .ml-chat-input:focus { border-color: rgba(45,156,173,0.5); }
    .ml-send-btn {
      background: rgba(45,156,173,0.2);
      border: 1px solid rgba(45,156,173,0.4);
      border-radius: 10px;
      color: #3cb8cc;
      cursor: pointer;
      padding: 0 14px;
      font-size: 13px;
    }
    .ml-send-btn:hover { background: rgba(45,156,173,0.35); }
    .ml-msg-user {
      text-align: right;
      background: rgba(45,156,173,0.15);
      border-radius: 10px 10px 2px 10px;
      padding: 7px 11px;
      font-size: 12px;
      margin-bottom: 6px;
    }
    .ml-msg-bot {
      background: rgba(255,255,255,0.05);
      border-radius: 10px 10px 10px 2px;
      padding: 7px 11px;
      font-size: 12px;
      line-height: 1.6;
      color: rgba(204,230,236,0.85);
      margin-bottom: 6px;
    }
    .ml-spinner {
      display: inline-block;
      width: 14px; height: 14px;
      border: 2px solid rgba(45,156,173,0.25);
      border-top-color: #3cb8cc;
      border-radius: 50%;
      animation: ml-spin 0.7s linear infinite;
    }
    @keyframes ml-spin { to { transform: rotate(360deg); } }
    .ml-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999998;
      background: linear-gradient(135deg, #2d9cad, #3cb8cc);
      color: #04111a;
      font-weight: 700;
      font-size: 13px;
      border: none;
      border-radius: 999px;
      padding: 12px 20px;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(45,156,173,0.4);
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
    }
    .ml-fab:hover { transform: scale(1.05); box-shadow: 0 6px 30px rgba(45,156,173,0.6); }
    .ml-pdf-select {
      width: 100%;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      padding: 8px 12px;
      color: white;
      font-size: 12px;
      outline: none;
      margin-bottom: 10px;
    }
    .ml-analyze-btn {
      width: 100%;
      background: linear-gradient(135deg, #2d9cad, #3cb8cc);
      border: none;
      border-radius: 10px;
      color: #04111a;
      font-weight: 700;
      font-size: 13px;
      padding: 10px;
      cursor: pointer;
    }
    .ml-analyze-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `);

  // ── State ────────────────────────────────────────────────────────────────────

  let sessionId = null;
  let panelEl = null;
  let chatMessages = [];

  // ── Urgency color helper ─────────────────────────────────────────────────────

  const URGENCY_COLORS = {
    VERY_LOW: { color: '#00cec9', bg: 'rgba(0,206,201,0.12)' },
    LOW:      { color: '#00b894', bg: 'rgba(0,184,148,0.12)' },
    MODERATE: { color: '#fdcb6e', bg: 'rgba(253,203,110,0.12)' },
    HIGH:     { color: '#e17055', bg: 'rgba(225,112,85,0.12)' },
    CRITICAL: { color: '#d63031', bg: 'rgba(214,48,49,0.12)' },
  };

  // ── Find PDF links on page ───────────────────────────────────────────────────

  function findPDFLinks() {
    const links = [...document.querySelectorAll('a[href]')];
    return links
      .filter(a => a.href && (a.href.endsWith('.pdf') || a.href.includes('.pdf?')))
      .map(a => ({ label: a.textContent.trim() || a.href, url: a.href }))
      .slice(0, 8);
  }

  // ── Fetch PDF bytes then POST to backend ─────────────────────────────────────

  function fetchAndAnalyze(pdfUrl, onProgress, onResult, onError) {
    onProgress('Fetching PDF…');
    GM_xmlhttpRequest({
      method: 'GET',
      url: pdfUrl,
      responseType: 'arraybuffer',
      onload: (res) => {
        const blob = new Blob([res.response], { type: 'application/pdf' });
        const filename = pdfUrl.split('/').pop().split('?')[0] || 'report.pdf';
        const file = new File([blob], filename, { type: 'application/pdf' });
        const form = new FormData();
        form.append('file', file);

        onProgress('Analyzing with MedLens AI…');

        GM_xmlhttpRequest({
          method: 'POST',
          url: `${BACKEND_URL}/api/analyze`,
          data: form,
          onload: (r) => {
            try {
              const data = JSON.parse(r.responseText);
              if (r.status !== 200) throw new Error(data.detail || 'Analysis failed');
              onResult(data);
            } catch (e) { onError(e.message); }
          },
          onerror: () => onError('Could not reach MedLens backend. Is it running?'),
        });
      },
      onerror: () => onError('Could not fetch PDF from this page.'),
    });
  }

  // ── Chat ─────────────────────────────────────────────────────────────────────

  function sendChatMessage(question, chatBody) {
    chatMessages.push({ role: 'user', content: question });
    renderChatMessages(chatBody);

    const loadingEl = document.createElement('div');
    loadingEl.className = 'ml-msg-bot';
    loadingEl.innerHTML = '<span class="ml-spinner"></span>';
    chatBody.appendChild(loadingEl);

    GM_xmlhttpRequest({
      method: 'POST',
      url: `${BACKEND_URL}/api/chat`,
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ session_id: sessionId, message: question }),
      onload: (r) => {
        loadingEl.remove();
        try {
          const data = JSON.parse(r.responseText);
          chatMessages.push({ role: 'assistant', content: data.answer || 'No response.' });
        } catch {
          chatMessages.push({ role: 'assistant', content: 'Error parsing response.' });
        }
        renderChatMessages(chatBody);
      },
      onerror: () => {
        loadingEl.remove();
        chatMessages.push({ role: 'assistant', content: 'Network error.' });
        renderChatMessages(chatBody);
      },
    });
  }

  function renderChatMessages(chatBody) {
    chatBody.innerHTML = '';
    chatMessages.forEach(msg => {
      const el = document.createElement('div');
      el.className = msg.role === 'user' ? 'ml-msg-user' : 'ml-msg-bot';
      el.textContent = msg.content;
      chatBody.appendChild(el);
    });
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  // ── Panel builder ─────────────────────────────────────────────────────────────

  function buildPanel() {
    const panel = document.createElement('div');
    panel.id = 'medlens-panel';
    panel.innerHTML = `
      <div id="medlens-panel-header">
        <span id="medlens-panel-title">🩺 MedLens</span>
        <button id="medlens-panel-close">✕</button>
      </div>
      <div id="medlens-panel-body"></div>
    `;
    document.body.appendChild(panel);
    panel.querySelector('#medlens-panel-close').onclick = () => {
      panel.remove();
      panelEl = null;
      showFAB();
    };
    return panel;
  }

  function showSelectScreen(panel) {
    const pdfs = findPDFLinks();
    const body = panel.querySelector('#medlens-panel-body');

    if (pdfs.length === 0) {
      body.innerHTML = `
        <div class="ml-section">
          <p style="color:rgba(255,255,255,0.4);font-size:12px;">
            No PDF links found on this page.<br>
            Navigate to a page with a medical PDF link.
          </p>
        </div>`;
      return;
    }

    const opts = pdfs.map((p, i) => `<option value="${i}">${p.label.slice(0, 50)}</option>`).join('');
    body.innerHTML = `
      <div class="ml-section">
        <div class="ml-section-title">Select PDF to analyze</div>
        <select class="ml-pdf-select" id="ml-pdf-sel">${opts}</select>
        <button class="ml-analyze-btn" id="ml-do-analyze">Analyze with MedLens</button>
      </div>
      <div id="ml-status" style="font-size:12px;color:rgba(45,156,173,0.7);margin-top:8px;"></div>
    `;

    const btn = body.querySelector('#ml-do-analyze');
    const sel = body.querySelector('#ml-pdf-sel');
    const status = body.querySelector('#ml-status');

    btn.onclick = () => {
      const pdf = pdfs[parseInt(sel.value)];
      btn.disabled = true;
      fetchAndAnalyze(
        pdf.url,
        (msg) => { status.textContent = msg; },
        (data) => showResultScreen(panel, data),
        (err) => { status.textContent = `Error: ${err}`; btn.disabled = false; },
      );
    };
  }

  function showResultScreen(panel, data) {
    sessionId = data.session_id;
    chatMessages = [{
      role: 'assistant',
      content: `Urgency: ${data.urgency.level}. Ask me anything about this report.`,
    }];

    const uc = URGENCY_COLORS[data.urgency.level] || URGENCY_COLORS.MODERATE;
    const body = panel.querySelector('#medlens-panel-body');

    body.innerHTML = `
      <div class="ml-section">
        <div class="ml-section-title">Summary</div>
        <div class="ml-summary" id="ml-sum">${data.summary.replace(/\n/g, '<br>')}</div>
      </div>
      <div class="ml-section">
        <div class="ml-section-title">Urgency</div>
        <span class="ml-urgency-badge" style="color:${uc.color};background:${uc.bg};border-color:${uc.color}55;">
          ${data.urgency.level.replace('_', ' ')}
        </span>
        <div class="ml-reason" style="margin-top:6px;">${data.urgency.reason}</div>
      </div>
      <div class="ml-section">
        <div class="ml-section-title">Ask a question</div>
        <div id="ml-chat-messages" style="max-height:160px;overflow-y:auto;margin-bottom:6px;"></div>
        <div class="ml-chat-input-row">
          <input class="ml-chat-input" id="ml-chat-inp" placeholder="Ask about this report…" />
          <button class="ml-send-btn" id="ml-chat-send">→</button>
        </div>
      </div>
    `;

    const chatBody = body.querySelector('#ml-chat-messages');
    renderChatMessages(chatBody);

    const inp = body.querySelector('#ml-chat-inp');
    const sendBtn = body.querySelector('#ml-chat-send');

    const doSend = () => {
      const q = inp.value.trim();
      if (!q) return;
      inp.value = '';
      sendChatMessage(q, chatBody);
    };

    sendBtn.onclick = doSend;
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') doSend(); });
  }

  // ── FAB ───────────────────────────────────────────────────────────────────────

  function showFAB() {
    if (document.querySelector('.ml-fab')) return;
    const fab = document.createElement('button');
    fab.className = 'ml-fab';
    fab.innerHTML = '🩺 MedLens';
    fab.onclick = () => {
      fab.remove();
      panelEl = buildPanel();
      showSelectScreen(panelEl);
    };
    document.body.appendChild(fab);
  }

  // ── Init ──────────────────────────────────────────────────────────────────────

  window.addEventListener('load', showFAB);

})();
```

---

## 6. Environment Setup

### 6.1 Running locally

**Backend:**
```bash
cd backend
cp .env.example .env
# edit .env and set GEMINI_API_KEY
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# opens at http://localhost:5173
```

**Tampermonkey:**
1. Install Tampermonkey browser extension.
2. Create a new script and paste the contents of `tampermonkey/medlens_extension.user.js`.
3. Make sure the backend is running on port 8000.
4. Navigate to any page with a `.pdf` link — the MedLens FAB will appear.

---

## 7. Design Token Summary for Cursor

When Cursor builds any UI element not explicitly specified above, apply these rules:

| Token | Value |
|---|---|
| Page background | `#04111a` |
| Card background | `rgba(12, 45, 69, 0.55)` with `backdrop-filter: blur(16px)` |
| Card border | `rgba(45, 156, 173, 0.2)` |
| Accent color | `#3cb8cc` (teal-400) |
| Display font | Playfair Display (serif) — all headings |
| Body font | DM Sans — all body text |
| Mono font | JetBrains Mono — labels, badges, timestamps |
| Border radius | 16px for cards, 12px for inputs/buttons, 999px for pills |
| Primary button | `bg-gradient-to-r from-teal-500 to-teal-400`, text `#04111a` |
| Hover glow | `box-shadow: 0 0 40px rgba(45, 156, 173, 0.18)` |
| All animations | Framer Motion, `ease: [0.22, 1, 0.36, 1]`, duration 0.4–0.6s |
| Text hierarchy | cream-50 (primary) → white/70 (secondary) → white/40 (tertiary) → white/25 (placeholder) |

---

## 8. Key Invariants — Do Not Change

1. The `backend/core/` files (`ai.py`, `report_processing.py`, `config.py`) are a direct port from the original Streamlit app. The AI pipeline logic is unchanged.
2. The safety override (keyword → CRITICAL) lives in `ai.py → classify_urgency()` and must not be removed.
3. The chatbot only answers from report context. The prompt in `config.py → CHATBOT_SYSTEM_PROMPT` enforces this. Do not modify it.
4. Session state is per-session-id, not per-user. No auth is required for this college project scope.
5. The Tampermonkey script uses `GM_xmlhttpRequest` to bypass CORS. Do not switch to `fetch()` — it will fail cross-origin.
6. The vectorstore is built lazily (on first chat message), not during analysis. This keeps the analyze endpoint fast.
7. Never use `localStorage` or `sessionStorage` in the React frontend — use Zustand only.

---

## 9. What Cursor Should Build (Checklist)

- [ ] `/backend` — FastAPI app with `/api/analyze`, `/api/chat`, `/api/translate`, `/api/tts`
- [ ] `/backend/core` — port of all original Python AI logic
- [ ] `/backend/session_store.py` — in-memory session management
- [ ] `/frontend` — React + Vite + Tailwind app
- [ ] `/frontend/src/components` — all components as specified
- [ ] `/frontend/src/store/appStore.ts` — Zustand store
- [ ] `/frontend/src/hooks` — useAnalysis, useChat
- [ ] `/frontend/src/api/client.ts` — all API calls via axios
- [ ] Full dark clinical-luxury UI as described in Section 4
- [ ] `/tampermonkey/medlens_extension.user.js` — fully working extension
- [ ] Both `README`-level instructions for running locally
