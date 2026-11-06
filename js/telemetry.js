/**
 * telemetry.js - Live Counters, Threshold Meter & Stack Complexity Coordinator
 * Strictly adheres to tabular monospace numbers, dynamic rates, and lowercase micro-labels.
 */

class TelemetryManager {
  constructor(simulation) {
    this.sim = simulation;

    // Live counter state
    // Starts at 429.0M records (429,000,000)
    this.baseRecords = 429000000;
    this.currentRecords = this.baseRecords;
    this.targetRecords = 1000000000; // 1.0B records

    // Threshold & Complexity state (default 35%)
    this.threshold = 35;
    this.minThreshold = 10;
    this.maxThreshold = 100;
    this.step = 5;

    // Dynamic rate calculation
    this.baseRatePerSec = 14200; // +14.2k / sec
    this.currentRatePerSec = this.baseRatePerSec;

    // Session Timer
    this.startTime = Date.now();
    this.elapsedSeconds = 0;

    // Active particle stats
    this.particleStats = { blue: 45, yellow: 60, red: 30, white: 115, total: 250 };

    // DOM Elements
    this.dom = {
      counterGiant: document.getElementById('telemetry-giant-counter'),
      counterMillions: document.getElementById('telemetry-millions-badge'),
      rateLabel: document.getElementById('telemetry-rate-readout'),
      elapsedLabel: document.getElementById('telemetry-elapsed-readout'),
      targetLabel: document.getElementById('telemetry-target-readout'),
      legendBlue: document.getElementById('legend-count-blue'),
      legendYellow: document.getElementById('legend-count-yellow'),
      legendRed: document.getElementById('legend-count-red'),
      legendWhite: document.getElementById('legend-count-white'),
      
      // Meter elements
      meterValue: document.getElementById('threshold-meter-val'),
      meterTierTitle: document.getElementById('threshold-tier-title'),
      meterAccuracy: document.getElementById('threshold-accuracy-val'),
      btnDec: document.getElementById('btn-threshold-dec'),
      btnInc: document.getElementById('btn-threshold-inc'),
      
      // Stack tags
      stackTags: document.querySelectorAll('.stack-chip')
    };

    this.init();
  }

  init() {
    this.bindEvents();
    this.updateThresholdUI();
    this.updateStackHighlighting();

    // Hook simulation callback
    if (this.sim) {
      this.sim.onStatsUpdateCallback = (stats) => this.handleStatsUpdate(stats);
    }

    // High frequency counter update loop
    this.lastTickTime = performance.now();
    requestAnimationFrame((t) => this.tick(t));

    // Session timer ticker (every 1s)
    setInterval(() => {
      this.elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
      const minutes = Math.floor(this.elapsedSeconds / 60);
      const seconds = this.elapsedSeconds % 60;
      if (this.dom.elapsedLabel) {
        this.dom.elapsedLabel.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds} elapsed`;
      }
    }, 1000);
  }

  bindEvents() {
    if (this.dom.btnDec) {
      this.dom.btnDec.addEventListener('click', (e) => {
        e.stopPropagation();
        this.adjustThreshold(-this.step);
      });
    }

    if (this.dom.btnInc) {
      this.dom.btnInc.addEventListener('click', (e) => {
        e.stopPropagation();
        this.adjustThreshold(this.step);
      });
    }
  }

  adjustThreshold(delta) {
    const prev = this.threshold;
    this.threshold = Math.max(this.minThreshold, Math.min(this.maxThreshold, this.threshold + delta));
    
    if (this.threshold !== prev) {
      if (window.soundEngine) {
        window.soundEngine.playThresholdTick(delta > 0 ? 1 : -1, this.threshold);
      }
      this.updateThresholdUI();
      this.updateStackHighlighting();
      if (this.sim) {
        this.sim.setThreshold(this.threshold);
      }
    }
  }

  setThreshold(val) {
    this.threshold = Math.max(this.minThreshold, Math.min(this.maxThreshold, val));
    this.updateThresholdUI();
    this.updateStackHighlighting();
    if (this.sim) {
      this.sim.setThreshold(this.threshold);
    }
  }

  handleStatsUpdate(stats) {
    this.particleStats = stats;
    if (this.dom.legendBlue) this.dom.legendBlue.textContent = stats.blue;
    if (this.dom.legendYellow) this.dom.legendYellow.textContent = stats.yellow;
    if (this.dom.legendRed) this.dom.legendRed.textContent = stats.red;
    if (this.dom.legendWhite) this.dom.legendWhite.textContent = stats.white;

    // Rate scales with blue validated particles and threshold percentage
    // Normal base +14.2k, scaling up to ~68k/sec when fully validated & 100% threshold
    const validationMultiplier = 0.6 + (stats.blue / (stats.total || 250)) * 2.2;
    const thresholdMultiplier = 0.5 + (this.threshold / 100) * 1.5;
    this.currentRatePerSec = Math.round(this.baseRatePerSec * validationMultiplier * thresholdMultiplier);

    if (this.dom.rateLabel) {
      const rateK = (this.currentRatePerSec / 1000).toFixed(1);
      this.dom.rateLabel.textContent = `+${rateK}k rows per second`;
    }
  }

  addShockwaveBoost(rows = 1850000) {
    this.currentRecords += rows;
    this.renderCounter();
  }

  tick(currentTime) {
    const dt = (currentTime - this.lastTickTime) / 1000;
    this.lastTickTime = currentTime;

    // Increment records according to rate per second
    if (dt > 0 && dt < 1) {
      this.currentRecords += this.currentRatePerSec * dt;
    }

    this.renderCounter();
    requestAnimationFrame((t) => this.tick(t));
  }

  renderCounter() {
    if (this.dom.counterGiant) {
      // Formatted with commas and tabular numerals
      const integerPart = Math.floor(this.currentRecords);
      this.dom.counterGiant.textContent = integerPart.toLocaleString();
    }
    if (this.dom.counterMillions) {
      const inMillions = (this.currentRecords / 1000000).toFixed(1);
      this.dom.counterMillions.textContent = `${inMillions}M`;
    }
  }

  updateThresholdUI() {
    if (this.dom.meterValue) {
      this.dom.meterValue.textContent = `${this.threshold}%`;
    }

    let tier = 'core analytics';
    let accuracy = '94.2%';

    if (this.threshold <= 30) {
      tier = 'core analytics';
      accuracy = '94.8%';
    } else if (this.threshold <= 65) {
      tier = 'bi & statistical modeling';
      accuracy = '98.1%';
    } else {
      tier = 'big data & ai/mlops';
      accuracy = '99.4%';
    }

    if (this.dom.meterTierTitle) {
      this.dom.meterTierTitle.textContent = tier;
    }
    if (this.dom.meterAccuracy) {
      this.dom.meterAccuracy.textContent = accuracy;
    }
  }

  updateStackHighlighting() {
    // Determine active tier level
    // 10% - 30%: tier 1
    // 35% - 65%: tier 1 + tier 2
    // 70% - 100%: tier 1 + tier 2 + tier 3
    let activeLevel = 1;
    if (this.threshold > 65) {
      activeLevel = 3;
    } else if (this.threshold >= 35) {
      activeLevel = 2;
    } else {
      activeLevel = 1;
    }

    this.dom.stackTags.forEach((chip) => {
      const chipTier = parseInt(chip.getAttribute('data-tier') || '1', 10);
      if (chipTier <= activeLevel) {
        chip.classList.add('active');
        if (chipTier === activeLevel) {
          chip.classList.add('highlight-tier');
        } else {
          chip.classList.remove('highlight-tier');
        }
      } else {
        chip.classList.remove('active', 'highlight-tier');
      }
    });
  }
}

window.TelemetryManager = TelemetryManager;

