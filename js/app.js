/**
 * app.js - Main Application Orchestrator & Keyboard Ergonomics
 * Handles keyboard shortcuts (1-5, Space, Up/Down, G, L, Esc),
 * project card selection, inspection drawer, and tutorial overlay.
 */

const PROJECTS_DATA = [
  {
    id: 1,
    title: "Fraud Detection MLOps",
    primaryMetric: "<50ms latency",
    secondaryMetric: "99.2% AUC-ROC",
    throughput: "15k req/sec",
    stack: ["Python", "XGBoost", "Feast", "Kafka", "FastAPI", "Evidently AI", "MLflow"],
    oneLiner: "Yellow means fraud has noticed. Drop this pipeline on them before they reach production.",
    problem: "Real-time payment processors face catastrophic losses if fraudulent credit card transactions are not classified and blocked within sub-50ms latency before authorization, all while maintaining near-zero false positive rates on legitimate transactions.",
    architecture: "Streaming Kafka event topic -> Feast Feature Store (Redis online cache) -> XGBoost Classifier logged in MLflow Registry -> FastAPI asynchronous serving cluster -> Evidently AI data drift monitoring -> Prometheus/Grafana real-time telemetry.",
    results: "Sub-42ms P99 latency under 15,000 requests/second load. Automated retraining trigger when PSI (Population Stability Index) exceeds 0.15.",
    github: "https://github.com/AIZEN9370/FraudDetectionMLOps"
  },
  {
    id: 2,
    title: "Algorithmic Stock Predictor",
    primaryMetric: "Live Alpha",
    secondaryMetric: "2.41 Sharpe",
    throughput: "14 target equities",
    stack: ["Python", "PyTorch", "PPO/SAC/DDPG", "FinBERT", "FastAPI", "Streamlit"],
    oneLiner: "Keep your eye on the signal, not on the market noise.",
    problem: "Traditional portfolio optimization algorithms (Markowitz Mean-Variance) break down during extreme market volatility and sudden macroeconomic sentiment shifts.",
    architecture: "Three-Tier HARLF Architecture: Tier 1 Base RL Agents (PPO, SAC, DDPG) analyze quantitative OHLCV price dynamics while FinBERT extracts sentiment from live financial news; Tier 2 Meta-Agents synthesize quant and sentiment matrices; Tier 3 Super-Agent CIO generates final optimal portfolio allocation minimizing Maximum Drawdown.",
    results: "2.41 Sharpe Ratio over 5-year backtests, demonstrating a 38% reduction in maximum drawdown versus benchmark index buy-and-hold strategies.",
    github: "https://github.com/AIZEN9370/stock_predictionauto_pro.git"
  },
  {
    id: 3,
    title: "AI YouTube RAG Summarizer",
    primaryMetric: "95% compression",
    secondaryMetric: "<180ms retrieval",
    throughput: "128k context",
    stack: ["Python", "FastAPI", "FAISS", "LangChain", "Whisper", "Streamlit"],
    oneLiner: "Hours of unstructured video transcripts, distilled into clean vectors.",
    problem: "Financial analysts and researchers spend hours sifting through video earnings calls, technical lectures, and interviews to find a single pivotal data point.",
    architecture: "Automated audio extraction & Whisper transcript ingestion -> Semantic text chunking with metadata preservation -> High-dimensional embeddings in FAISS vector database -> Hybrid semantic & keyword reranking -> Multi-model LLM synthesizer with strict source timestamp citations.",
    results: "95% reduction in information extraction time with zero hallucinated timestamps. Instant executive summaries with clickable transcript jump points.",
    github: "https://github.com/AIZEN9370/youtube_ai_studio"
  },
  {
    id: 4,
    title: "365-Day Telemetry Tracker",
    primaryMetric: "13 KPIs / day",
    secondaryMetric: "100% verified",
    throughput: "365-day continuity",
    stack: ["Python", "Pandas", "Excel VBA", "XlsxWriter", "Audit Reconciliation"],
    oneLiner: "We count habits, not excuses. Automated daily telemetry across 365 days.",
    problem: "Personal habit tracking and financial journals are notoriously prone to user drop-off, manual calculation inconsistencies, and a lack of macro-level visual telemetry.",
    architecture: "Python automated generator using XlsxWriter and VBA macros -> 12 interconnected monthly ledger sheets -> Mathematical cross-reconciliation and conditional validation checks -> Real-time performance percentiles and automated habit streak telemetry.",
    results: "Zero discrepancy across 365 days of multi-variable metrics. Modeled after professional double-entry accounting reconciliation standards.",
    github: "https://github.com/AIZEN9370"
  },
  {
    id: 5,
    title: "MCP Server & BI Bridge",
    primaryMetric: "Zero-copy sync",
    secondaryMetric: "<30ms latency",
    throughput: "Real-time bridge",
    stack: ["Claude/Gemini MCP", "Python FastMCP", "Power BI", "PostgreSQL", "SQL"],
    oneLiner: "Connect frontier LLMs directly to semantic models without breaking governance.",
    problem: "Enterprise AI agents cannot safely query enterprise relational databases and BI semantic layers without leaking credentials or violating strict tenant security policies.",
    architecture: "Model Context Protocol (MCP) server daemon built with FastMCP Python -> Dynamic connection pooling to SQL databases & Power BI REST endpoints -> Strict AST SQL parameterization and schema introspection -> Real-time governance and token usage telemetry.",
    results: "Sub-30ms query translation latency with zero unauthorized schema leaks and 100% audited LLM-to-database transactions.",
    github: "https://github.com/AIZEN9370"
  }
];

class PortfolioApp {
  constructor() {
    this.sim = null;
    this.telemetry = null;
    this.activeCardIndex = null;
    this.isPlacementMode = false;

    // Modals
    this.introModal = document.getElementById('intro-modal');
    this.dossierModal = document.getElementById('dossier-modal');
    this.drawer = document.getElementById('inspection-drawer');
    this.soundToggleBtn = document.getElementById('btn-sound-toggle');
    this.reticleTooltip = document.getElementById('reticle-tooltip');

    this.init();
  }

  init() {
    // 1. Initialize Simulation Canvas
    this.sim = new window.DataSimulation('sim-canvas');

    // 2. Initialize Telemetry & Threshold Manager
    this.telemetry = new window.TelemetryManager(this.sim);

    // 3. Setup hooks
    this.sim.onDeployCallback = (projectIndex, x, y) => {
      this.handleCanvasModelDeployed(projectIndex, x, y);
    };

    // 4. Bind UI and Keyboards
    this.bindEvents();
    this.renderProjectCards();
  }

  bindEvents() {
    // Keyboard listeners
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));

    // Sound toggle
    if (this.soundToggleBtn) {
      this.soundToggleBtn.addEventListener('click', () => {
        const isMuted = window.soundEngine.toggleMute();
        this.updateSoundButtonUI(isMuted);
      });
      this.updateSoundButtonUI(window.soundEngine.isMuted);
    }

    // Dismiss Intro Modal
    const startSimBtn = document.getElementById('btn-start-sim');
    if (startSimBtn) {
      startSimBtn.addEventListener('click', () => this.dismissIntroModal());
    }

    // Dossier Modal close buttons
    const closeDossierBtn = document.getElementById('btn-close-dossier');
    if (closeDossierBtn) {
      closeDossierBtn.addEventListener('click', () => this.toggleDossier(false));
    }

    // Drawer close buttons
    const closeDrawerBtn = document.getElementById('btn-close-drawer');
    if (closeDrawerBtn) {
      closeDrawerBtn.addEventListener('click', () => this.closeDrawer());
    }

    // Modal background click to close
    if (this.dossierModal) {
      this.dossierModal.addEventListener('click', (e) => {
        if (e.target === this.dossierModal) this.toggleDossier(false);
      });
    }

    // Mousemove for reticle tooltip
    window.addEventListener('mousemove', (e) => {
      if (this.isPlacementMode && this.reticleTooltip) {
        this.reticleTooltip.style.left = `${e.clientX + 16}px`;
        this.reticleTooltip.style.top = `${e.clientY + 16}px`;
      }
    }, { passive: true });
  }

  handleKeyDown(e) {
    // If typing in an input (none exist, but safe guard)
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // ESC: Cancel placement mode or close open modals
    if (e.key === 'Escape') {
      e.preventDefault();
      if (this.isPlacementMode) {
        this.cancelPlacementMode();
        return;
      }
      if (this.drawer && this.drawer.classList.contains('open')) {
        this.closeDrawer();
        return;
      }
      if (this.dossierModal && !this.dossierModal.classList.contains('hidden')) {
        this.toggleDossier(false);
        return;
      }
      if (this.introModal && !this.introModal.classList.contains('hidden')) {
        this.dismissIntroModal();
        return;
      }
      return;
    }

    // SPACE: Toggle Dossier Modal
    if (e.code === 'Space') {
      e.preventDefault();
      // Ensure intro modal is closed first
      if (this.introModal && !this.introModal.classList.contains('hidden')) {
        this.dismissIntroModal();
      }
      this.toggleDossier();
      return;
    }

    // 1-5: Select project card and enter canvas placement mode
    if (e.key >= '1' && e.key <= '5') {
      e.preventDefault();
      const projectIndex = parseInt(e.key, 10) - 1;
      this.selectProjectForDeployment(projectIndex);
      return;
    }

    // ArrowUp / +: Increase Threshold
    if (e.key === 'ArrowUp' || e.key === '+' || e.key === '=') {
      e.preventDefault();
      this.telemetry.adjustThreshold(5);
      return;
    }

    // ArrowDown / -: Decrease Threshold
    if (e.key === 'ArrowDown' || e.key === '-' || e.key === '_') {
      e.preventDefault();
      this.telemetry.adjustThreshold(-5);
      return;
    }

    // G: Open GitHub profile
    if (e.key === 'g' || e.key === 'G') {
      e.preventDefault();
      if (window.soundEngine) window.soundEngine.playBlip(720, 0.05);
      window.open('https://github.com/AIZEN9370', '_blank', 'noopener,noreferrer');
      return;
    }

    // L: Open LinkedIn profile
    if (e.key === 'l' || e.key === 'L') {
      e.preventDefault();
      if (window.soundEngine) window.soundEngine.playBlip(680, 0.05);
      window.open('https://www.linkedin.com/in/gaurav-shinde-064977344', '_blank', 'noopener,noreferrer');
      return;
    }

    // Enter: Dismiss intro if visible
    if (e.key === 'Enter') {
      if (this.introModal && !this.introModal.classList.contains('hidden')) {
        this.dismissIntroModal();
      }
    }
  }

  selectProjectForDeployment(projectIndex) {
    if (projectIndex < 0 || projectIndex >= PROJECTS_DATA.length) return;

    this.activeCardIndex = projectIndex;
    this.isPlacementMode = true;

    // Inform simulation canvas
    this.sim.setPlacementMode(true, projectIndex);

    // Audio cue
    if (window.soundEngine) {
      window.soundEngine.playBlip(620 + projectIndex * 60, 0.06);
    }

    // Update Project Cards UI
    this.highlightActiveCard(projectIndex);

    // Show reticle tooltip
    if (this.reticleTooltip) {
      const proj = PROJECTS_DATA[projectIndex];
      this.reticleTooltip.textContent = `[tap canvas to deploy ${proj.title}]`;
      this.reticleTooltip.classList.remove('hidden');
    }
  }

  cancelPlacementMode() {
    this.isPlacementMode = false;
    this.activeCardIndex = null;
    this.sim.setPlacementMode(false, null);
    this.highlightActiveCard(null);

    if (this.reticleTooltip) {
      this.reticleTooltip.classList.add('hidden');
    }

    if (window.soundEngine) {
      window.soundEngine.playBlip(320, 0.04);
    }
  }

  handleCanvasModelDeployed(projectIndex, x, y) {
    const proj = PROJECTS_DATA[projectIndex];
    if (!proj) return;

    // Boost live telemetry rows
    this.telemetry.addShockwaveBoost(1850000);

    // Exit placement mode
    this.cancelPlacementMode();

    // Open project inspection drawer
    this.openDrawer(proj);
  }

  highlightActiveCard(activeIndex) {
    const cards = document.querySelectorAll('.project-card');
    cards.forEach((card, idx) => {
      if (idx === activeIndex) {
        card.classList.add('card-active');
      } else {
        card.classList.remove('card-active');
      }
    });
  }

  renderProjectCards() {
    const container = document.getElementById('project-cards-dock');
    if (!container) return;

    container.innerHTML = '';

    PROJECTS_DATA.forEach((proj, idx) => {
      const card = document.createElement('div');
      card.className = 'project-card hud-glass';
      card.setAttribute('data-index', idx);

      const stackHtml = proj.stack.slice(0, 4).map(s => `<span class="card-tag">${s.toLowerCase()}</span>`).join('');

      card.innerHTML = `
        <div class="card-top-row">
          <div class="card-keybind-badge">${idx + 1}</div>
          <div class="card-title">${proj.title}</div>
          <div class="card-metric">${proj.primaryMetric}</div>
        </div>

        <div class="card-middle-row">
          <p class="card-copy">"${proj.oneLiner}"</p>
          <div class="card-tags-list">${stackHtml}</div>
        </div>

        <div class="card-bottom-row">
          <button class="btn-deploy-model" type="button" data-index="${idx}">
            <span class="deploy-radar-icon"></span>
            <span>deploy on canvas</span>
          </button>
          <a href="${proj.github}" target="_blank" rel="noopener noreferrer" class="btn-card-gh" title="View Source on GitHub">
            github ↗
          </a>
        </div>
      `;

      // Click on card body to select for placement or inspect
      card.addEventListener('click', (e) => {
        // Prevent if user clicked github link directly
        if (e.target.closest('.btn-card-gh')) return;

        this.selectProjectForDeployment(idx);
      });

      // Explicit deploy button
      const deployBtn = card.querySelector('.btn-deploy-model');
      if (deployBtn) {
        deployBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.selectProjectForDeployment(idx);
        });
      }

      container.appendChild(card);
    });
  }

  openDrawer(proj) {
    if (!this.drawer) return;

    const titleEl = document.getElementById('drawer-proj-title');
    const badgeEl = document.getElementById('drawer-proj-key');
    const metricPrimaryEl = document.getElementById('drawer-metric-primary');
    const metricSecondaryEl = document.getElementById('drawer-metric-secondary');
    const throughputEl = document.getElementById('drawer-throughput');
    const problemEl = document.getElementById('drawer-problem');
    const archEl = document.getElementById('drawer-architecture');
    const resultsEl = document.getElementById('drawer-results');
    const stackContainer = document.getElementById('drawer-stack-list');
    const ghLinkEl = document.getElementById('drawer-gh-link');

    if (titleEl) titleEl.textContent = proj.title;
    if (badgeEl) badgeEl.textContent = `PIPELINE [0${proj.id}]`;
    if (metricPrimaryEl) metricPrimaryEl.textContent = proj.primaryMetric;
    if (metricSecondaryEl) metricSecondaryEl.textContent = proj.secondaryMetric;
    if (throughputEl) throughputEl.textContent = proj.throughput;
    if (problemEl) problemEl.textContent = proj.problem;
    if (archEl) archEl.textContent = proj.architecture;
    if (resultsEl) resultsEl.textContent = proj.results;

    if (stackContainer) {
      stackContainer.innerHTML = proj.stack.map(tag => `<span class="drawer-tech-tag">${tag}</span>`).join('');
    }

    if (ghLinkEl) {
      ghLinkEl.href = proj.github;
      ghLinkEl.textContent = `inspect repository on github (${proj.github.replace('https://github.com/', '')}) ↗`;
    }

    this.drawer.classList.add('open');

    if (window.soundEngine) {
      window.soundEngine.playModal(true);
    }
  }

  closeDrawer() {
    if (!this.drawer) return;
    this.drawer.classList.remove('open');
    if (window.soundEngine) {
      window.soundEngine.playModal(false);
    }
  }

  toggleDossier(forceState = null) {
    if (!this.dossierModal) return;

    const isCurrentlyHidden = this.dossierModal.classList.contains('hidden');
    const shouldShow = forceState !== null ? forceState : isCurrentlyHidden;

    if (shouldShow) {
      this.dossierModal.classList.remove('hidden');
      if (window.soundEngine) window.soundEngine.playModal(true);
    } else {
      this.dossierModal.classList.add('hidden');
      if (window.soundEngine) window.soundEngine.playModal(false);
    }
  }

  dismissIntroModal() {
    if (!this.introModal) return;
    this.introModal.classList.add('hidden');
    if (window.soundEngine) {
      window.soundEngine.ensureContext();
      window.soundEngine.playBlip(540, 0.08);
    }
  }

  updateSoundButtonUI(isMuted) {
    if (!this.soundToggleBtn) return;
    const label = this.soundToggleBtn.querySelector('.sound-label');
    if (label) {
      label.textContent = isMuted ? 'audio: off' : 'audio: on';
    }
    if (isMuted) {
      this.soundToggleBtn.classList.add('muted');
    } else {
      this.soundToggleBtn.classList.remove('muted');
    }
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new PortfolioApp();
});

