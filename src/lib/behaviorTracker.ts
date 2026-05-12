export interface BehavioralFeatures {
  mouseSpeed: number;
  mouseJitter: number;
  clickRate: number;
  typingSpeed: number;
}

export class BehaviorTracker {
  private mouseEvents: { x: number; y: number; t: number }[] = [];
  private clicks: number[] = [];
  private keystrokes: number[] = [];
  private startTime: number | null = null;
  private isTracking = false;

  start() {
    this.mouseEvents = [];
    this.clicks = [];
    this.keystrokes = [];
    this.startTime = Date.now();
    this.isTracking = true;

    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('keydown', this.handleKeyDown);
  }

  stop(): BehavioralFeatures {
    this.isTracking = false;
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('keydown', this.handleKeyDown);

    return this.extractFeatures();
  }

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.isTracking) return;
    this.mouseEvents.push({ x: e.clientX, y: e.clientY, t: Date.now() });
  };

  private handleMouseDown = () => {
    if (!this.isTracking) return;
    this.clicks.push(Date.now());
  };

  private handleKeyDown = () => {
    if (!this.isTracking) return;
    this.keystrokes.push(Date.now());
  };

  private extractFeatures(): BehavioralFeatures {
    const duration = (Date.now() - (this.startTime || Date.now())) / 1000;
    if (duration <= 0) return { mouseSpeed: 0, mouseJitter: 0, clickRate: 0, typingSpeed: 0 };

    // Mouse Speed & Jitter
    let totalDist = 0;
    const velocities: number[] = [];
    for (let i = 1; i < this.mouseEvents.length; i++) {
      const p1 = this.mouseEvents[i - 1];
      const p2 = this.mouseEvents[i];
      const dist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
      const dt = (p2.t - p1.t) / 1000;
      if (dt > 0) {
        totalDist += dist;
        velocities.push(dist / dt);
      }
    }

    const mouseSpeed = totalDist / duration;
    
    // Jitter as standard deviation of velocities
    const avgVel = velocities.reduce((a, b) => a + b, 0) / (velocities.length || 1);
    const variance = velocities.reduce((a, b) => a + Math.pow(b - avgVel, 2), 0) / (velocities.length || 1);
    const mouseJitter = Math.sqrt(variance);

    const clickRate = this.clicks.length / duration;
    const typingSpeed = (this.keystrokes.length / duration) * 60; // KPM

    return {
      mouseSpeed,
      mouseJitter,
      clickRate,
      typingSpeed
    };
  }
}
