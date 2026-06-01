import React, { useEffect, useRef } from 'react';

interface NeuralBackgroundProps {
  logoUrl?: string;
}

export default function NeuralBackground({ logoUrl }: NeuralBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const particles: Particle[] = [];
    const maxParticles = 40;
    const connectionDistance = 150;
    const mouse = { x: -1000, y: -1000, active: false };

    // Preload logo image if provided
    let logoImage: HTMLImageElement | null = null;
    if (logoUrl) {
      const img = new Image();
      img.src = logoUrl;
      img.crossOrigin = 'anonymous'; // try to prevent tainted canvas if possible
      img.onload = () => {
        logoImage = img;
      };
    }

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      baseVx: number;
      baseVy: number;
      radius: number;
      type: 'logo' | 'brand-blue' | 'brand-red' | 'brand-yellow';

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        
        // Random slow initial speeds
        this.baseVx = (Math.random() - 0.5) * 0.8;
        this.baseVy = (Math.random() - 0.5) * 0.8;
        this.vx = this.baseVx;
        this.vy = this.baseVy;
        
        // Sizing
        this.radius = Math.random() * 8 + 10; // radius between 10 and 18

        const types: ('logo' | 'brand-blue' | 'brand-red' | 'brand-yellow')[] = [
          'logo', 'brand-blue', 'brand-red', 'brand-yellow'
        ];
        this.type = types[Math.floor(Math.random() * types.length)];
      }

      update() {
        // Handle floating boundary collision
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        // Magnet attraction effect of mouse
        if (mouse.active) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          const attractionRange = 130; // Reduced from 280 to make it highly localized
          if (distance < attractionRange) {
            // Stronger pull when closer, acts like gravity attraction "magnetic"
            const force = (attractionRange - distance) / attractionRange;
            // Pull direction with moderate, comfortable force
            const pullX = (dx / distance) * force * 0.8;
            const pullY = (dy / distance) * force * 0.8;
            
            // Accel and smoothly transition speed
            this.vx += pullX;
            this.vy += pullY;

            // Apply friction/drag to prevent crazy speeds
            this.vx *= 0.90;
            this.vy *= 0.90;
          } else {
            // Float back to original base velocity faster once mouse moves out of range
            this.vx = this.vx * 0.88 + this.baseVx * 0.12;
            this.vy = this.vy * 0.88 + this.baseVy * 0.12;
          }
        } else {
          // Normal floating speed restoration
          this.vx = this.vx * 0.95 + this.baseVx * 0.05;
          this.vy = this.vy * 0.95 + this.baseVy * 0.05;
        }

        // Limit speed to prevent super speed jumps
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const maxSpeed = 3.5;
        if (speed > maxSpeed) {
          this.vx = (this.vx / speed) * maxSpeed;
          this.vy = (this.vy / speed) * maxSpeed;
        }

        this.x += this.vx;
        this.y += this.vy;

        // Ensure particles stay cleanly in screen bound safely
        if (this.x < -20) this.x = width + 20;
        if (this.x > width + 20) this.x = -20;
        if (this.y < -20) this.y = height + 20;
        if (this.y > height + 20) this.y = -20;
      }

      draw(context: CanvasRenderingContext2D) {
        if (this.type === 'logo' && logoImage) {
          // Draw the preloaded logo image!
          context.save();
          // Draw with subtle glowing aura
          context.shadowColor = 'rgba(0, 174, 239, 0.2)';
          context.shadowBlur = 10;
          context.drawImage(
            logoImage,
            this.x - this.radius,
            this.y - this.radius,
            this.radius * 2,
            this.radius * 2
          );
          context.restore();
        } else {
          // Colored branding nodes with beautiful glassmorphic glows
          context.save();
          let glowColor = 'rgba(0, 174, 239, 0.4)';
          let fillColor = '#00AEEF';

          if (this.type === 'brand-red') {
            glowColor = 'rgba(237, 28, 36, 0.4)';
            fillColor = '#ED1C24';
          } else if (this.type === 'brand-yellow') {
            glowColor = 'rgba(255, 242, 0, 0.4)';
            fillColor = '#FFF200';
          }

          context.beginPath();
          context.arc(this.x, this.y, this.radius * 0.4, 0, Math.PI * 2);
          context.fillStyle = fillColor;
          context.shadowColor = glowColor;
          context.shadowBlur = 8;
          context.fill();
          context.restore();
        }
      }
    }

    // Initialize particles
    for (let i = 0; i < maxParticles; i++) {
      particles.push(new Particle());
    }

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw Neural Network / Connecting Lines with fading based on distance
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDistance) {
            const alpha = (1 - dist / connectionDistance) * 0.12;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            
            // Generate a subtle gradient between connecting colors or default slate
            ctx.strokeStyle = `rgba(148, 163, 184, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      // Draw mouse node connections if active to enhance the physical "attracted" feeling
      if (mouse.active) {
        for (let i = 0; i < particles.length; i++) {
          const p1 = particles[i];
          const dx = mouse.x - p1.x;
          const dy = mouse.y - p1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const mouseConnectionRange = 130; // Matches physical attraction radius
          if (dist < mouseConnectionRange) {
            const alpha = (1 - dist / mouseConnectionRange) * 0.18;
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(p1.x, p1.y);
            // Soft colored blue lines towards mouse
            ctx.strokeStyle = `rgba(0, 174, 239, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      // Update and Draw Particles
      particles.forEach(p => {
        p.update();
        p.draw(ctx);
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [logoUrl]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0 bg-slate-50"
      style={{ mixBlendMode: 'normal' }}
    />
  );
}
