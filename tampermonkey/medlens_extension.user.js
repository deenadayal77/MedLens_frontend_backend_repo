// ==UserScript==
// @name         MedLens Analyzer
// @namespace    http://medlens.local/
// @version      3.0
// @description  Analyzes any text-selectable PDF open in Chrome using MedLens AI.
// @author       MedLens
// @match        *://*/*
// @match        *://*/*.pdf
// @match        *://*/*.pdf?*
// @match        file:///*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      medlensfrontendbackendrepo-production.up.railway.app
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  const BACKEND_URL = 'https://medlensfrontendbackendrepo-production.up.railway.app';

  GM_addStyle(`
    #ml-fab {
      position: fixed;
      bottom: 28px;
      right: 28px;
      z-index: 2147483646;
      background: linear-gradient(135deg, #2d9cad, #3cb8cc);
      color: #04111a;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-weight: 700;
      font-size: 13px;
      border: none;
      border-radius: 999px;
      padding: 13px 22px;
      cursor: pointer;
      box-shadow: 0 4px 24px rgba(45,156,173,0.45);
      display: flex;
      align-items: center;
      gap: 8px;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    #ml-fab:hover {
      transform: scale(1.06);
      box-shadow: 0 6px 36px rgba(45,156,173,0.65);
    }
    #ml-fab .ml-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #04111a;
      animation: ml-pulse 2s infinite;
    }
    @keyframes ml-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.8); }
    }

    #ml-panel {
      position: fixed;
      bottom: 90px;
      right: 28px;
      width: 420px;
      max-height: 80vh;
      z-index: 2147483647;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: rgba(7, 30, 46, 0.97);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(45, 156, 173, 0.25);
      border-radius: 20px;
      box-shadow: 0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      color: #f5f4ef;
    }
    #ml-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      border-bottom: 1px solid rgba(45,156,173,0.15);
      background: rgba(12,45,69,0.6);
      flex-shrink: 0;
    }
    #ml-header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    #ml-logo {
      width: 30px;
      height: 30px;
      border-radius: 8px;
      background: rgba(45,156,173,0.15);
      border: 1px solid rgba(45,156,173,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 800;
      color: #3cb8cc;
    }
    #ml-title {
      font-size: 16px;
      font-weight: 800;
      color: #f5f4ef;
      letter-spacing: -0.01em;
    }
    #ml-title span { color: #3cb8cc; }
    #ml-close {
      cursor: pointer;
      color: rgba(255,255,255,0.45);
      font-size: 18px;
      background: none;
      border: none;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, color 0.15s;
      line-height: 1;
    }
    #ml-close:hover {
      color: white;
      background: rgba(255,255,255,0.08);
    }

    #ml-body {
      overflow-y: auto;
      flex: 1;
      padding: 16px;
      scrollbar-width: thin;
      scrollbar-color: #2d9cad rgba(255,255,255,0.05);
    }
    #ml-body::-webkit-scrollbar { width: 4px; }
    #ml-body::-webkit-scrollbar-thumb { background: #2d9cad; border-radius: 2px; }

    #ml-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 32px 16px;
      text-align: center;
    }
    .ml-scan-bar {
      width: 100%;
      height: 3px;
      background: rgba(255,255,255,0.05);
      border-radius: 99px;
      overflow: hidden;
    }
    .ml-scan-fill {
      height: 100%;
      width: 35%;
      background: linear-gradient(90deg, transparent, #3cb8cc, transparent);
      border-radius: 99px;
      animation: ml-scan 1.8s ease-in-out infinite;
    }
    @keyframes ml-scan {
      0% { transform: translateX(-200%); }
      100% { transform: translateX(500%); }
    }
    .ml-loading-title {
      font-size: 17px;
      font-weight: 800;
      color: #f5f4ef;
    }
    .ml-loading-step {
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-size: 11px;
      color: rgba(45,156,173,0.65);
      min-height: 16px;
    }
    .ml-spinner {
      width: 28px;
      height: 28px;
      border: 2px solid rgba(45,156,173,0.2);
      border-top-color: #3cb8cc;
      border-radius: 50%;
      animation: ml-spin 0.7s linear infinite;
    }
    @keyframes ml-spin { to { transform: rotate(360deg); } }

    .ml-section { margin-bottom: 14px; }
    .ml-section-label {
      font-size: 10px;
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.35);
      margin-bottom: 8px;
    }
    .ml-summary-box {
      background: rgba(12,45,69,0.5);
      border: 1px solid rgba(45,156,173,0.12);
      border-radius: 12px;
      padding: 12px 14px;
      font-size: 12.5px;
      line-height: 1.75;
      color: rgba(204,230,236,0.85);
      max-height: 160px;
      overflow-y: auto;
    }
    .ml-urgency-card {
      border-radius: 12px;
      padding: 12px 14px;
      border: 1px solid;
    }
    .ml-urgency-level {
      font-size: 18px;
      font-weight: 800;
      margin-bottom: 4px;
    }
    .ml-urgency-label {
      font-size: 11px;
      opacity: 0.7;
      margin-bottom: 10px;
    }
    .ml-progress-track {
      width: 100%;
      height: 6px;
      background: rgba(255,255,255,0.08);
      border-radius: 99px;
      overflow: hidden;
    }
    .ml-progress-fill {
      height: 100%;
      border-radius: 99px;
      transition: width 1.2s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .ml-confidence {
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-size: 10px;
      color: rgba(255,255,255,0.35);
      margin-top: 6px;
    }
    .ml-reason-box {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 12px;
      padding: 10px 14px;
      font-size: 12px;
      color: rgba(255,255,255,0.62);
      line-height: 1.65;
    }
    .ml-override-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }
    .ml-kw-chip {
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-size: 10px;
      padding: 3px 8px;
      border-radius: 999px;
      background: rgba(214,48,49,0.15);
      border: 1px solid rgba(214,48,49,0.35);
      color: #ff7675;
    }
    .ml-disclaimer {
      background: rgba(253,203,110,0.07);
      border: 1px solid rgba(253,203,110,0.2);
      border-radius: 10px;
      padding: 9px 12px;
      font-size: 11px;
      color: rgba(253,203,110,0.72);
      line-height: 1.55;
    }
    .ml-chat-messages {
      max-height: 180px;
      overflow-y: auto;
      margin-bottom: 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .ml-msg-user {
      align-self: flex-end;
      background: rgba(45,156,173,0.18);
      border: 1px solid rgba(45,156,173,0.25);
      border-radius: 12px 12px 3px 12px;
      padding: 7px 11px;
      font-size: 12px;
      color: #e0f7fa;
      max-width: 85%;
      white-space: pre-wrap;
    }
    .ml-msg-bot {
      align-self: flex-start;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 12px 12px 12px 3px;
      padding: 7px 11px;
      font-size: 12px;
      color: rgba(204,230,236,0.84);
      max-width: 90%;
      line-height: 1.6;
      white-space: pre-wrap;
    }
    .ml-msg-typing {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 7px 11px;
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-size: 10px;
      color: rgba(45,156,173,0.65);
    }
    .ml-chat-input-row {
      display: flex;
      gap: 8px;
    }
    .ml-chat-input {
      flex: 1;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      padding: 9px 13px;
      color: #f5f4ef;
      font-family: inherit;
      font-size: 12px;
      outline: none;
      transition: border-color 0.2s;
    }
    .ml-chat-input:focus { border-color: rgba(45,156,173,0.45); }
    .ml-chat-input::placeholder { color: rgba(255,255,255,0.28); }
    .ml-send-btn {
      background: rgba(45,156,173,0.2);
      border: 1px solid rgba(45,156,173,0.35);
      border-radius: 10px;
      color: #3cb8cc;
      cursor: pointer;
      padding: 0 15px;
      font-size: 15px;
      transition: background 0.15s, color 0.15s;
      display: flex;
      align-items: center;
    }
    .ml-send-btn:hover { background: rgba(45,156,173,0.35); color: #fff; }
    .ml-send-btn:disabled { opacity: 0.35; cursor: not-allowed; }
    .ml-suggestions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 10px;
    }
    .ml-suggestion-btn {
      background: rgba(45,156,173,0.08);
      border: 1px solid rgba(45,156,173,0.22);
      border-radius: 999px;
      color: rgba(45,156,173,0.88);
      font-family: inherit;
      font-size: 11px;
      padding: 4px 11px;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    .ml-suggestion-btn:hover { background: rgba(45,156,173,0.2); color: #a8e8f0; }
    .ml-error {
      text-align: center;
      padding: 24px 16px;
      color: rgba(255,118,117,0.86);
      font-size: 13px;
      line-height: 1.6;
    }
    .ml-retry-btn {
      margin-top: 12px;
      background: rgba(214,48,49,0.15);
      border: 1px solid rgba(214,48,49,0.3);
      border-radius: 10px;
      color: #ff7675;
      font-family: inherit;
      font-size: 12px;
      padding: 8px 18px;
      cursor: pointer;
    }
    .ml-retry-btn:hover { background: rgba(214,48,49,0.25); }
    .ml-divider {
      height: 1px;
      background: rgba(255,255,255,0.06);
      margin: 4px 0 14px;
    }
  `);

  const URGENCY = {
    VERY_LOW: { color: '#00cec9', bg: 'rgba(0,206,201,0.1)', border: 'rgba(0,206,201,0.25)', label: 'No significant issue', progress: 5 },
    LOW: { color: '#00b894', bg: 'rgba(0,184,148,0.1)', border: 'rgba(0,184,148,0.25)', label: 'Manageable / routine care', progress: 25 },
    MODERATE: { color: '#fdcb6e', bg: 'rgba(253,203,110,0.1)', border: 'rgba(253,203,110,0.25)', label: 'Monitor condition', progress: 50 },
    HIGH: { color: '#e17055', bg: 'rgba(225,112,85,0.1)', border: 'rgba(225,112,85,0.25)', label: 'Visit doctor soon', progress: 75 },
    CRITICAL: { color: '#d63031', bg: 'rgba(214,48,49,0.1)', border: 'rgba(214,48,49,0.25)', label: 'Immediate medical attention needed', progress: 100 },
  };

  const SUGGESTED_QUESTIONS = [
    'Is this serious?',
    'What should I do next?',
    'What does this mean?',
    'Should I be worried?',
  ];

  let sessionId = null;
  let chatHistory = [];
  let isChatting = false;

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHTML(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function createPanel() {
    if ($('ml-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'ml-panel';
    panel.innerHTML = `
      <div id="ml-header">
        <div id="ml-header-left">
          <div id="ml-logo">ML</div>
          <span id="ml-title">Med<span>Lens</span></span>
        </div>
        <button id="ml-close" title="Close">x</button>
      </div>
      <div id="ml-body"></div>
    `;
    document.body.appendChild(panel);
    $('ml-close').onclick = () => {
      panel.remove();
      showFAB();
    };
  }

  function setBody(html) {
    if ($('ml-body')) $('ml-body').innerHTML = html;
  }

  function getPageText() {
    const text = document.body?.innerText || document.body?.textContent || '';
    return text.replace(/\s+/g, ' ').trim();
  }

  const STEPS = [
    'Reading report text...',
    'Sending to MedLens AI...',
    'Generating patient summary...',
    'Classifying urgency level...',
    'Almost done...',
  ];

  function showLoading(textLength) {
    setBody(`
      <div id="ml-loading">
        <div class="ml-scan-bar"><div class="ml-scan-fill"></div></div>
        <div class="ml-spinner"></div>
        <div class="ml-loading-title">Analyzing your report</div>
        <div class="ml-loading-step" id="ml-step">Reading ${textLength} characters...</div>
        <div style="font-size:10px;color:rgba(255,255,255,0.3);margin-top:4px;">This may take 15-30 seconds</div>
      </div>
    `);

    let i = 0;
    const interval = setInterval(() => {
      const el = $('ml-step');
      if (el && i < STEPS.length) {
        el.textContent = STEPS[i++];
      } else {
        clearInterval(interval);
      }
    }, 3500);

    return () => clearInterval(interval);
  }

  function showResult(data) {
    sessionId = data.session_id;
    chatHistory = [];

    const u = data.urgency;
    const cfg = URGENCY[u.level] || URGENCY.MODERATE;
    const conf = u.confidence !== null ? `Confidence: ${Math.round(u.confidence * 100)}%` : '';
    const overrideHTML = u.override_applied && u.override_keywords?.length
      ? `<div style="margin-top:6px;font-size:10px;color:rgba(255,118,117,0.7);">Safety override:</div>
         <div class="ml-override-row">${u.override_keywords.map((k) => `<span class="ml-kw-chip">${escapeHTML(k)}</span>`).join('')}</div>`
      : '';
    const suggestionsHTML = SUGGESTED_QUESTIONS
      .map((q) => `<button class="ml-suggestion-btn" data-q="${escapeHTML(q)}">${escapeHTML(q)}</button>`)
      .join('');

    setBody(`
      <div class="ml-section">
        <div class="ml-section-label">Report summary</div>
        <div class="ml-summary-box">${escapeHTML(data.summary).replace(/\n/g, '<br>')}</div>
      </div>

      <div class="ml-section">
        <div class="ml-section-label">Urgency level</div>
        <div class="ml-urgency-card" style="background:${cfg.bg};border-color:${cfg.border};">
          <div class="ml-urgency-level" style="color:${cfg.color};">${escapeHTML(u.level.replace('_', ' '))}</div>
          <div class="ml-urgency-label" style="color:${cfg.color};">${escapeHTML(cfg.label)}</div>
          <div class="ml-progress-track">
            <div class="ml-progress-fill" id="ml-prog" style="width:0%;background:${cfg.color};"></div>
          </div>
          ${conf ? `<div class="ml-confidence">${escapeHTML(conf)}</div>` : ''}
          ${overrideHTML}
        </div>
      </div>

      <div class="ml-section">
        <div class="ml-section-label">Why this urgency?</div>
        <div class="ml-reason-box">${escapeHTML(u.reason)}</div>
      </div>

      <div class="ml-section">
        <div class="ml-disclaimer">
          AI-generated analysis only. Not a medical diagnosis. Consult a qualified doctor.
        </div>
      </div>

      <div class="ml-divider"></div>

      <div class="ml-section">
        <div class="ml-section-label">Ask about this report</div>
        <div class="ml-suggestions" id="ml-suggestions">${suggestionsHTML}</div>
        <div class="ml-chat-messages" id="ml-chat-msgs"></div>
        <div class="ml-chat-input-row">
          <input class="ml-chat-input" id="ml-chat-inp" placeholder="Ask a follow-up question..." />
          <button class="ml-send-btn" id="ml-send-btn">Send</button>
        </div>
      </div>
    `);

    setTimeout(() => {
      const prog = $('ml-prog');
      if (prog) prog.style.width = cfg.progress + '%';
    }, 200);

    chatHistory.push({
      role: 'assistant',
      content: `Hi. Your report shows ${u.level.replace('_', ' ')} urgency. Ask me anything about it.`,
    });
    renderChat();

    document.querySelectorAll('.ml-suggestion-btn').forEach((btn) => {
      btn.onclick = () => doChat(btn.dataset.q);
    });

    $('ml-send-btn').onclick = () => {
      const val = $('ml-chat-inp').value.trim();
      if (val) doChat(val);
    };
    $('ml-chat-inp').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        const val = $('ml-chat-inp').value.trim();
        if (val) doChat(val);
      }
    });
  }

  function renderChat() {
    const box = $('ml-chat-msgs');
    if (!box) return;
    box.innerHTML = chatHistory.map((m) =>
      `<div class="${m.role === 'user' ? 'ml-msg-user' : 'ml-msg-bot'}">${escapeHTML(m.content)}</div>`,
    ).join('');
    box.scrollTop = box.scrollHeight;
  }

  function getAPIError(response) {
    try {
      const data = JSON.parse(response.responseText);
      return data.detail || data.message || `Request failed with status ${response.status}.`;
    } catch {
      return `Request failed with status ${response.status}.`;
    }
  }

  function doChat(question) {
    if (isChatting || !sessionId || !question) return;
    isChatting = true;

    const inp = $('ml-chat-inp');
    const btn = $('ml-send-btn');
    if (inp) inp.value = '';
    if (btn) btn.disabled = true;

    chatHistory.push({ role: 'user', content: question });
    renderChat();

    const box = $('ml-chat-msgs');
    if (box) {
      const typing = document.createElement('div');
      typing.className = 'ml-msg-typing';
      typing.id = 'ml-typing';
      typing.innerHTML = '<div class="ml-spinner" style="width:14px;height:14px;border-width:1.5px;"></div> Reviewing report...';
      box.appendChild(typing);
      box.scrollTop = box.scrollHeight;
    }

    GM_xmlhttpRequest({
      method: 'POST',
      url: `${BACKEND_URL}/api/chat`,
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ session_id: sessionId, message: question }),
      onload: (response) => {
        const typing = $('ml-typing');
        if (typing) typing.remove();

        if (response.status !== 200) {
          chatHistory.push({ role: 'assistant', content: getAPIError(response) });
        } else {
          try {
            const data = JSON.parse(response.responseText);
            chatHistory.push({ role: 'assistant', content: data.answer || 'No response received.' });
          } catch {
            chatHistory.push({ role: 'assistant', content: 'Could not parse response.' });
          }
        }

        renderChat();
        isChatting = false;
        if (btn) btn.disabled = false;
      },
      onerror: () => {
        const typing = $('ml-typing');
        if (typing) typing.remove();
        chatHistory.push({ role: 'assistant', content: 'Network error. Could not reach MedLens backend.' });
        renderChat();
        isChatting = false;
        if (btn) btn.disabled = false;
      },
    });
  }

  function showError(msg) {
    setBody(`
      <div class="ml-error">
        <div style="font-size:28px;margin-bottom:10px;">!</div>
        <div>${escapeHTML(msg)}</div>
        <button class="ml-retry-btn" id="ml-retry">Try Again</button>
      </div>
    `);
    $('ml-retry').onclick = () => startAnalysis();
  }

  function startAnalysis() {
    const text = getPageText();

    if (!text || text.length < 50) {
      showError('Could not read enough text from this PDF. Make sure the PDF has selectable text, not only a scanned image.');
      return;
    }

    const stopSteps = showLoading(text.length);

    GM_xmlhttpRequest({
      method: 'POST',
      url: `${BACKEND_URL}/api/analyze-text`,
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ text }),
      onload: (response) => {
        stopSteps();
        if (response.status !== 200) {
          showError(getAPIError(response));
          return;
        }

        try {
          const data = JSON.parse(response.responseText);
          showResult(data);
        } catch {
          showError('Unexpected response from backend.');
        }
      },
      onerror: () => {
        stopSteps();
        showError('Could not reach MedLens backend. Make sure Railway is running.');
      },
    });
  }

  function shouldShowOnThisPage() {
    const url = window.location.href.toLowerCase();
    const title = document.title.toLowerCase();
    const bodyText = (document.body?.innerText || '').slice(0, 3000).toLowerCase();

    return (
      url.includes('.pdf') ||
      title.includes('.pdf') ||
      bodyText.includes('patient:') ||
      bodyText.includes('findings') ||
      bodyText.includes('impression') ||
      bodyText.includes('clinical information')
    );
  }

  function showFAB() {
    if (!shouldShowOnThisPage()) return;
    if ($('ml-fab')) return;
    const fab = document.createElement('button');
    fab.id = 'ml-fab';
    fab.innerHTML = '<div class="ml-dot"></div> Analyze with MedLens';
    fab.onclick = () => {
      fab.remove();
      createPanel();
      startAnalysis();
    };
    document.body.appendChild(fab);
  }

  function boot() {
    if (document.body) showFAB();
  }

  boot();
  document.addEventListener('DOMContentLoaded', boot);
  window.addEventListener('load', boot);

  let attempts = 0;
  const bootTimer = setInterval(() => {
    attempts += 1;
    boot();
    if ($('ml-fab') || attempts >= 20) clearInterval(bootTimer);
  }, 500);
})();
