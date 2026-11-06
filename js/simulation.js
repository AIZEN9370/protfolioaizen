/**
 * simulation.js - 60fps Living Data Simulation & Telemetry Canvas
 * Implements autonomous flocking/drifting data nodes, analytical core,
 * shockwave deployment mechanics, and node state transitions.
 */

class DataSimulation {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d', { alpha: false });

    // Config & Visual Tokens
    this.COLORS = {
      bg: '#0A0B0E',
      white: '#F3F4F6',    // Raw data
      yellow: '#FACC15',   // Anomalies / High priority
      blue: '#3B82F6',     // Validated / Clustered
      red: '#EF4444',      // Outlier noise
      coreGrid: 'rgba(255, 255, 255, 0.04)',
      corePulse: 'rgba(59, 130, 246, 0.15)',
      radarSweep: 'rgba(250, 204, 21, 0.06)',
      lineBlue: 'rgba(59, 130, 246, 0.18)'
    };

    this.particleCount = 250;
    this.particles = [];
    this.shockwaves = [];
    this.floatingLabels = [];
    
    // Core focal point
    this.core = { x: 0, y: 0, radius: 48, pulse: 0, angle: 0 };
    
    // Mouse / Pointer State
    this.mouse = { x: -1000, y: -1000, isDown: false, hovered: false };
    this.placementMode = false;
    this.activeProjectIndex = null;
    this.onDeployCallback = null;
    this.onStatsUpdateCallback = null;

    // Simulation threshold multiplier (10% - 100%)
    this.speedMultiplier = 1.0;
    this.thresholdPercent = 35;

    // Canvas scaling
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // Animation loop handles
    this.lastTime = performance.now();
    this.statsTimer = 0;

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize(), { passive: true });

    // Spawn initial 250 particles
    this.spawnParticles();

    // Setup input listeners
    this.bindEvents();

    // Start loop
    requestAnimationFrame((t) => this.render(t));
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.scale(this.dpr, this.dpr);

    // Keep core slightly centered or responsive
    this.core.x = this.width * 0.5;
    this.core.y = this.height * 0.44; // Slightly above bottom dock
  }

  setThreshold(percent) {
    this.thresholdPercent = Math.max(10, Math.min(100, percent));
    // Speed multiplier scales from 0.6x at 10% to 2.4x at 100%
    this.speedMultiplier = 0.5 + (this.thresholdPercent / 100) * 1.8;
  }

  setPlacementMode(active, projectIdx = null) {
    this.placementMode = active;
    this.activeProjectIndex = projectIdx;
    if (active) {
      document.body.classList.add('cursor-crosshair');
    } else {
      document.body.classList.remove('cursor-crosshair');
    }
  }

  spawnParticles() {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push(this.createParticle(false));
    }
  }

  createParticle(fromEdge = true) {
    let x, y;
    if (fromEdge) {
      // Spawn from viewport edges
      const edge = Math.floor(Math.random() * 4);
      const margin = 20;
      if (edge === 0) { x = Math.random() * this.width; y = -margin; }
      else if (edge === 1) { x = this.width + margin; y = Math.random() * this.height; }
      else if (edge === 2) { x = Math.random() * this.width; y = this.height + margin; }
      else { x = -margin; y = Math.random() * this.height; }
    } else {
      // Initial random distribution across screen
      x = Math.random() * this.width;
      y = Math.random() * this.height;
    }

    // Determine initial state:
    // ~45% White (raw), ~25% Yellow (anomalies), ~18% Blue (validated), ~12% Red (noise)
    const roll = Math.random();
    let state = 'white';
    if (roll < 0.25) state = 'yellow';
    else if (roll < 0.45) state = 'blue';
    else if (roll < 0.57) state = 'red';
    else state = 'white';

    const angle = Math.random() * Math.PI * 2;
    const baseSpeed = (0.35 + Math.random() * 0.85);

    return {
      x,
      y,
      vx: Math.cos(angle) * baseSpeed,
      vy: Math.sin(angle) * baseSpeed,
      state,
      baseSpeed,
      radius: state === 'yellow' ? 2.8 : (state === 'blue' ? 2.5 : 1.8 + Math.random() * 0.8),
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.03 + Math.random() * 0.05,
      alpha: 0.4 + Math.random() * 0.55,
      convertedTime: 0,
      orbitOffset: (Math.random() - 0.5) * 80
    };
  }

  bindEvents() {
    // Mouse movement
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.hovered = true;
    }, { passive: true });

    window.addEventListener('mouseleave', () => {
      this.mouse.hovered = false;
      this.mouse.x = -1000;
      this.mouse.y = -1000;
    });

    // Canvas click / tap
    this.canvas.addEventListener('click', (e) => {
      this.handlePointerDown(e.clientX, e.clientY);
    });

    // Touch support
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches[0]) {
        const touch = e.touches[0];
        this.mouse.x = touch.clientX;
        this.mouse.y = touch.clientY;
        this.handlePointerDown(touch.clientX, touch.clientY);
      }
    }, { passive: true });
  }

  handlePointerDown(clientX, clientY) {
    if (this.placementMode && this.activeProjectIndex !== null) {
      // Deploy model shockwave at clicked position
      this.triggerShockwave(clientX, clientY, this.activeProjectIndex);
      if (this.onDeployCallback) {
        this.onDeployCallback(this.activeProjectIndex, clientX, clientY);
      }
    } else {
      // Normal interactive pulse on canvas click
      this.triggerShockwave(clientX, clientY, null);
    }
  }

  triggerShockwave(x, y, projectIndex = null) {
    const isModelDeploy = projectIndex !== null;
    const shockwave = {
      x,
      y,
      radius: 8,
      maxRadius: isModelDeploy ? 220 : 130,
      speed: isModelDeploy ? 6.2 : 4.8,
      alpha: 1.0,
      color: isModelDeploy ? '#3B82F6' : '#FACC15',
      secondaryColor: isModelDeploy ? '#FACC15' : '#3B82F6',
      projectIndex
    };

    this.shockwaves.push(shockwave);

    if (window.soundEngine) {
      if (isModelDeploy) {
        window.soundEngine.playDeploy();
      } else {
        window.soundEngine.playShockwaveHit();
      }
    }

    // Convert nearby anomalies & noise into validated blue nodes
    let convertedCount = 0;
    this.particles.forEach((p) => {
      const dx = p.x - x;
      const dy = p.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= shockwave.maxRadius * 0.95) {
        if (p.state === 'yellow' || p.state === 'red' || p.state === 'white') {
          p.state = 'blue';
          p.radius = 3.0;
          p.convertedTime = 1.0; // Glow flash duration
          convertedCount++;
        }
      }
    });

    // Add floating feedback label
    const labelText = isModelDeploy
      ? `+${(convertedCount * 128 + 1240).toLocaleString()} ROWS VALIDATED`
      : `RADAR PULSE // ${convertedCount} NODES PROCESSED`;

    this.floatingLabels.push({
      x,
      y: y - 16,
      text: labelText,
      alpha: 1.0,
      color: isModelDeploy ? '#FACC15' : '#3B82F6',
      vy: -0.85
    });

    return convertedCount;
  }

  update(dt) {
    // Pulse analytical core
    this.core.pulse += 0.035;
    this.core.angle += 0.012 * this.speedMultiplier;

    // Update Particles
    const targetX = this.core.x;
    const targetY = this.core.y;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.pulse += p.pulseSpeed;

      // Distance and angle to central core
      const dx = targetX - p.x;
      const dy = targetY - p.y;
      const distToCore = Math.sqrt(dx * dx + dy * dy) || 1;

      // Gravitational pull towards analytical core
      let pullStrength = 0.045 * this.speedMultiplier;
      if (p.state === 'yellow') {
        pullStrength *= 1.8; // Anomalies gravitate faster
      } else if (p.state === 'red') {
        pullStrength *= -0.25; // Outliers drift away
      }

      const nx = dx / distToCore;
      const ny = dy / distToCore;

      // Orbital / swirl tangential component
      const perpX = -ny;
      const perpY = nx;
      const swirlFactor = p.state === 'blue' ? 0.35 : 0.15;

      p.vx += (nx * pullStrength + perpX * swirlFactor * (p.orbitOffset > 0 ? 1 : -1)) * 0.15;
      p.vy += (ny * pullStrength + perpY * swirlFactor * (p.orbitOffset > 0 ? 1 : -1)) * 0.15;

      // Mouse repulsion/attraction if mouse is inside canvas
      if (this.mouse.hovered) {
        const mdx = this.mouse.x - p.x;
        const mdy = this.mouse.y - p.y;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy) || 1;

        if (mdist < 140) {
          const force = (1 - mdist / 140) * 0.8;
          // Repel white/red, attract blue/yellow
          const sign = (p.state === 'blue') ? 0.4 : -1.2;
          p.vx += (mdx / mdist) * force * sign;
          p.vy += (mdy / mdist) * force * sign;
        }
      }

      // Max velocity clamping
      const maxSpeed = (p.state === 'yellow' ? 2.8 : 2.0) * this.speedMultiplier;
      const curSpeed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (curSpeed > maxSpeed) {
        p.vx = (p.vx / curSpeed) * maxSpeed;
        p.vy = (p.vy / curSpeed) * maxSpeed;
      }

      // Apply movement
      p.x += p.vx;
      p.y += p.vy;

      // Damping / drag
      p.vx *= 0.985;
      p.vy *= 0.985;

      // Flash decay if recently converted
      if (p.convertedTime > 0) {
        p.convertedTime -= 0.03;
      }

      // Absorption or recycling at core / bounds
      if (distToCore < 18) {
        // Recycle particle to screen boundary
        Object.assign(p, this.createParticle(true));
      } else if (
        p.x < -60 || p.x > this.width + 60 ||
        p.y < -60 || p.y > this.height + 60
      ) {
        Object.assign(p, this.createParticle(true));
      }
    }

    // Update Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += sw.speed * this.speedMultiplier;
      sw.alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);

      if (sw.radius >= sw.maxRadius || sw.alpha <= 0.01) {
        this.shockwaves.splice(i, 1);
      }
    }

    // Update Floating Labels
    for (let i = this.floatingLabels.length - 1; i >= 0; i--) {
      const fl = this.floatingLabels[i];
      fl.y += fl.vy;
      fl.alpha -= 0.018;
      if (fl.alpha <= 0) {
        this.floatingLabels.splice(i, 1);
      }
    }

    // Tally stats every 250ms
    this.statsTimer += dt;
    if (this.statsTimer > 250) {
      this.statsTimer = 0;
      this.tallyStats();
    }
  }

  tallyStats() {
    let blue = 0, yellow = 0, red = 0, white = 0;
    for (let i = 0; i < this.particles.length; i++) {
      const s = this.particles[i].state;
      if (s === 'blue') blue++;
      else if (s === 'yellow') yellow++;
      else if (s === 'red') red++;
      else white++;
    }

    if (this.onStatsUpdateCallback) {
      this.onStatsUpdateCallback({ blue, yellow, red, white, total: this.particles.length });
    }
  }

  render(currentTime) {
    const dt = Math.min(currentTime - this.lastTime, 100);
    this.lastTime = currentTime;

    this.update(dt);

    const ctx = this.ctx;

    // Clear background with deep slate black
    ctx.fillStyle = this.COLORS.bg;
    ctx.fillRect(0, 0, this.width, this.height);

    // 1. Draw subtle background coordinate grid
    this.drawBackgroundGrid(ctx);

    // 2. Draw Analytical Core (Focal Point)
    this.drawAnalyticalCore(ctx);

    // 3. Draw inter-node proximity lines for blue validated clusters
    this.drawBlueClusterLines(ctx);

    // 4. Draw Particles
    this.drawParticles(ctx);

    // 5. Draw Active Shockwaves
    this.drawShockwaves(ctx);

    // 6. Draw Floating Telemetry Labels
    this.drawFloatingLabels(ctx);

    // 7. Draw Targeting Reticle if in placement mode
    if (this.placementMode && this.mouse.hovered) {
      this.drawTargetingReticle(ctx, this.mouse.x, this.mouse.y);
    }

    requestAnimationFrame((t) => this.render(t));
  }

  drawBackgroundGrid(ctx) {
    const gridSize = 80;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;

    // Center crosshairs
    ctx.beginPath();
    ctx.moveTo(this.core.x, 0);
    ctx.lineTo(this.core.x, this.height);
    ctx.moveTo(0, this.core.y);
    ctx.lineTo(this.width, this.core.y);
    ctx.stroke();

    // Subtle dots at grid intersections
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    const startX = this.core.x % gridSize;
    const startY = this.core.y % gridSize;

    for (let x = startX; x < this.width; x += gridSize) {
      for (let y = startY; y < this.height; y += gridSize) {
        ctx.fillRect(x - 0.5, y - 0.5, 1.5, 1.5);
      }
    }
    ctx.restore();
  }

  drawAnalyticalCore(ctx) {
    const cx = this.core.x;
    const cy = this.core.y;
    const pulseScale = 1 + Math.sin(this.core.pulse) * 0.08;

    ctx.save();

    // Concentric orbital rings
    const rings = [36, 75, 130, 210];
    rings.forEach((r, idx) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r * (idx === 0 ? pulseScale : 1), 0, Math.PI * 2);
      ctx.strokeStyle = idx === 0 
        ? 'rgba(59, 130, 246, 0.35)' 
        : `rgba(255, 255, 255, ${0.05 - idx * 0.01})`;
      ctx.lineWidth = 1;
      if (idx === 1) {
        ctx.setLineDash([4, 6]);
      } else if (idx === 2) {
        ctx.setLineDash([2, 12]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.stroke();
    });

    // Rotating Radar Sweep Line
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.core.angle);

    const grad = ctx.createLinearGradient(0, 0, 180, 0);
    grad.addColorStop(0, 'rgba(250, 204, 21, 0.35)');
    grad.addColorStop(1, 'rgba(250, 204, 21, 0)');

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 190, 0, Math.PI * 0.28);
    ctx.lineTo(0, 0);
    ctx.fillStyle = 'rgba(250, 204, 21, 0.04)';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(190, 0);
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.28)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    // Core central nucleus
    ctx.beginPath();
    ctx.arc(cx, cy, 5 * pulseScale, 0, Math.PI * 2);
    ctx.fillStyle = '#3B82F6';
    ctx.shadowColor = '#3B82F6';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Core micro-label
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#6B7280';
    ctx.textAlign = 'center';
    ctx.fillText('ANALYTICAL CORE // ACTIVE', cx, cy + 28);

    ctx.restore();
  }

  drawBlueClusterLines(ctx) {
    // Only connect blue nodes that are close to show graph clustering
    const maxDist = 65;
    const blueParticles = this.particles.filter(p => p.state === 'blue');

    ctx.save();
    ctx.strokeStyle = this.COLORS.lineBlue;
    ctx.lineWidth = 0.8;

    for (let i = 0; i < blueParticles.length; i++) {
      const p1 = blueParticles[i];
      for (let j = i + 1; j < Math.min(i + 8, blueParticles.length); j++) {
        const p2 = blueParticles[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.35;
          ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  drawParticles(ctx) {
    ctx.save();

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      let color = this.COLORS.white;
      let shadowColor = null;
      let shadowBlur = 0;

      if (p.state === 'yellow') {
        color = this.COLORS.yellow;
        shadowColor = '#FACC15';
        shadowBlur = 6;
      } else if (p.state === 'blue') {
        color = this.COLORS.blue;
        shadowColor = '#3B82F6';
        shadowBlur = 8;
      } else if (p.state === 'red') {
        color = this.COLORS.red;
        shadowColor = '#EF4444';
        shadowBlur = 4;
      }

      // Flash white if recently converted
      if (p.convertedTime > 0) {
        color = '#FFFFFF';
        shadowColor = '#60A5FA';
        shadowBlur = 14;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);

      if (shadowColor && shadowBlur > 0) {
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = shadowBlur;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = color;
      ctx.globalAlpha = p.alpha;
      ctx.fill();

      // Velocity trail for yellow anomalies
      if (p.state === 'yellow') {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 3.5, p.y - p.vy * 3.5);
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  drawShockwaves(ctx) {
    if (this.shockwaves.length === 0) return;

    ctx.save();
    for (let i = 0; i < this.shockwaves.length; i++) {
      const sw = this.shockwaves[i];

      // Primary shockwave ring
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = 2.2;
      ctx.globalAlpha = sw.alpha * 0.85;
      ctx.shadowColor = sw.color;
      ctx.shadowBlur = 14;
      ctx.stroke();

      // Secondary trailing ripple
      if (sw.radius > 25) {
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius * 0.72, 0, Math.PI * 2);
        ctx.strokeStyle = sw.secondaryColor;
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = sw.alpha * 0.5;
        ctx.shadowBlur = 6;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  drawFloatingLabels(ctx) {
    if (this.floatingLabels.length === 0) return;

    ctx.save();
    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';

    for (let i = 0; i < this.floatingLabels.length; i++) {
      const fl = this.floatingLabels[i];
      ctx.globalAlpha = Math.max(0, fl.alpha);
      ctx.fillStyle = fl.color;
      ctx.shadowColor = fl.color;
      ctx.shadowBlur = 8;
      ctx.fillText(fl.text, fl.x, fl.y);
    }
    ctx.restore();
  }

  drawTargetingReticle(ctx, x, y) {
    ctx.save();
    const size = 26;
    const pulse = Math.sin(this.core.pulse * 2) * 2;

    // Crosshair lines
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 1.4;
    ctx.shadowColor = '#FACC15';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    // Top
    ctx.moveTo(x, y - size - pulse);
    ctx.lineTo(x, y - 7);
    // Bottom
    ctx.moveTo(x, y + 7);
    ctx.lineTo(x, y + size + pulse);
    // Left
    ctx.moveTo(x - size - pulse, y);
    ctx.lineTo(x - 7, y);
    // Right
    ctx.moveTo(x + 7, y);
    ctx.lineTo(x + size + pulse, y);
    ctx.stroke();

    // Inner targeting circle
    ctx.beginPath();
    ctx.arc(x, y, 12 + pulse, 0, Math.PI * 2);
    ctx.setLineDash([3, 4]);
    ctx.stroke();

    // Floating micro-label below reticle
    ctx.setLineDash([]);
    ctx.font = '500 10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#FACC15';
    ctx.textAlign = 'center';
    ctx.fillText('tap anywhere to deploy model', x, y + size + 20);

    ctx.restore();
  }
}

window.DataSimulation = DataSimulation;

