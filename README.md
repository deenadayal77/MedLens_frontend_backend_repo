# MedLens

MedLens is an AI-powered medical report assistant for radiology and clinical PDFs. It extracts report text, summarizes findings in patient-friendly language, classifies urgency, translates summaries, generates audio, and supports report-grounded follow-up chat.

## Features

- PDF upload and text extraction with PyMuPDF
- Gemini-powered report summary and urgency classification
- Report-grounded chatbot with structured, scannable answers
- Translation support for Indian languages
- Text-to-speech for translated or original summaries
- Polished React dashboard with responsive chat, PDF evidence UI, and upload states
- Optional Tampermonkey helper for analyzing PDF links from the browser

## Project Structure

```text
MedLens/
  backend/        FastAPI API, AI pipeline, chat, translation, and TTS routes
  frontend/       React + Vite + Tailwind dashboard
  medlens_app/    Original Streamlit app
  tampermonkey/   Browser userscript helper
```

## Environment Variables

Create `backend/.env` from the example file:

```bash
cd backend
copy .env.example .env
```

Set your Gemini key in `backend/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
MEDLENS_GEMINI_MODEL=gemini-2.5-flash
MEDLENS_GEMINI_CHAT_MODEL=gemini-2.5-flash
MEDLENS_GEMINI_EMBEDDING_MODEL=models/gemini-embedding-001
```

Real `.env` files are ignored by Git so API keys are not committed.

## Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Health check:

```bash
curl http://127.0.0.1:8000/health
```

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

Production build:

```bash
npm run build
```

## Tampermonkey Helper

1. Install the Tampermonkey browser extension.
2. Create a new script.
3. Paste `tampermonkey/medlens_extension.user.js`.
4. Keep the backend running on port `8000`.
5. Open any page with a `.pdf` link and use the MedLens floating button.

## Safety Note

MedLens provides AI-generated report assistance only. It is not a diagnosis, prescription, or replacement for a qualified medical professional.
