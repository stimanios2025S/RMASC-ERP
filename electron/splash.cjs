// ─── RMASC FACTORY — Professional Splash Screen ───────────────────────────
// Displayed while the backend starts and the app initializes.
// Inline HTML — no external dependencies.

const SPLASH_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      font-family: 'Segoe UI', -apple-system, sans-serif;
      user-select: none;
      overflow: hidden;
    }
    .splash-container {
      text-align: center;
      position: relative;
    }
    .logo-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 20px;
      position: relative;
    }
    .logo-icon svg {
      width: 100%;
      height: 100%;
    }
    .logo-text {
      margin-bottom: 8px;
    }
    .logo-text .rm { color: #f59e0b; text-shadow: 0 0 20px rgba(251,146,60,0.5); }
    .logo-text .asc { color: #60a5fa; text-shadow: 0 0 20px rgba(96,165,250,0.5); }
    .logo-text .factory { color: #f59e0b; }
    h1 {
      font-size: 36px;
      font-weight: 800;
      letter-spacing: -1px;
    }
    .subtitle {
      color: #64748b;
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 3px;
      text-transform: uppercase;
      margin-bottom: 40px;
    }
    .loader {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 16px;
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #f59e0b;
      animation: bounce 1.4s infinite ease-in-out both;
    }
    .dot:nth-child(1) { animation-delay: -0.32s; }
    .dot:nth-child(2) { animation-delay: -0.16s; }
    .dot:nth-child(3) { animation-delay: 0s; }
    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
      40% { transform: scale(1); opacity: 1; }
    }
    .status-text {
      color: #475569;
      font-size: 12px;
      font-weight: 500;
    }
    .version {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      color: #334155;
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.5px;
    }
    .bg-grid {
      position: fixed;
      inset: 0;
      pointer-events: none;
      opacity: 0.04;
      background-image: radial-gradient(circle, #f59e0b 1px, transparent 1px);
      background-size: 40px 40px;
    }
  </style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="splash-container">
    <div class="logo-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 20V8a2 2 0 0 1 2-2h2v12" stroke="#f59e0b"/>
        <path d="M6 20V6a2 2 0 0 1 2-2h2v16" stroke="#f59e0b"/>
        <path d="M10 20V4a2 2 0 0 1 2-2h2v18" stroke="#60a5fa"/>
        <path d="M14 20v-8a2 2 0 0 1 2-2h4v10" stroke="#60a5fa"/>
        <path d="M2 20h20" stroke="#f59e0b"/>
      </svg>
    </div>
    <div class="logo-text">
      <h1><span class="rm">RM</span><span class="asc">ASC</span> <span class="factory">FACTORY</span></h1>
    </div>
    <p class="subtitle">Progiciel de Gestion Intégré</p>
    <div class="loader">
      <div class="dot"></div>
      <div class="dot"></div>
      <div class="dot"></div>
    </div>
    <p class="status-text" id="status">Initialisation du système...</p>
    <p class="version">v2.5.3 — RMASC FACTORY</p>
  </div>
</body>
</html>`;

module.exports = SPLASH_HTML;
