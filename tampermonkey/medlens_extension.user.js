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
