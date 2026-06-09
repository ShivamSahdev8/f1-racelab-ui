import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ElementRef, ViewChild, ChangeDetectionStrategy
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Landing implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('car') carRef!: ElementRef;
  @ViewChild('heroSection') heroRef!: ElementRef;
  @ViewChild('featuresSection') featuresRef!: ElementRef;

  private lightInterval: any;
  private ctx!: gsap.Context;
  private carEntered = false;

  features = [
    {
      pos: 'P1 · PREDICTOR',
      title: 'AI race predictor',
      desc: 'Win probability, expected finish and the optimal setup — generated from current season form and circuit history.',
      meta: [{ label: 'MODEL', val: 'Claude' }, { label: 'VIA', val: 'Bedrock' }],
      accent: '#E10600'
    },
    {
      pos: 'P2 · SIMULATOR',
      title: 'Strategy what-if',
      desc: 'Change tyre compound, weather, downforce and strategy — watch the predicted win chance update in real time.',
      meta: [{ label: 'INPUTS', val: '5' }, { label: 'OUTPUT', val: 'live' }],
      accent: '#A742FF'
    },
    {
      pos: 'P3 · LIVE',
      title: 'Live timing',
      desc: 'Positions, tyre compounds and gaps from real session data in a clean timing-tower layout.',
      meta: [{ label: 'SOURCE', val: 'OpenF1' }, { label: 'REFRESH', val: 'auto' }],
      accent: '#00D767'
    },
    {
      pos: 'P4 · STANDINGS',
      title: 'Championship',
      desc: 'Driver and constructor tables for the current season, always current via Ergast/Jolpica.',
      meta: [{ label: 'SOURCE', val: 'Ergast' }, { label: 'SEASON', val: '2026' }],
      accent: '#3B82F6'
    },
  ];

  techStack = [
    'Angular 21', 'Nx Monorepo', 'Module Federation',
    'Amazon Bedrock', 'AWS Lambda', 'API Gateway',
    'Cognito', 'CloudFront', 'AWS CDK', 'GitHub Actions'
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.runStartLights();
    this.lightInterval = setInterval(() => this.runStartLights(), 6500);
    this.setupScrollAnimations();
  }

  ngOnDestroy(): void {
    clearInterval(this.lightInterval);
    if (this.ctx) this.ctx.revert();
    ScrollTrigger.getAll().forEach(t => t.kill());
  }

  enterApp(): void {
    this.router.navigate(['/live']);
  }

  // ── Start lights ──────────────────────────────────────
  private runStartLights(): void {
    const cols = document.querySelectorAll<HTMLElement>('.light-col');
    cols.forEach(c => c.querySelectorAll('.bulb').forEach(b => b.classList.remove('lit')));
    cols.forEach((c, i) =>
      setTimeout(() => c.querySelectorAll('.bulb').forEach(b => b.classList.add('lit')), 500 + i * 420)
    );
    setTimeout(() =>
      cols.forEach(c => c.querySelectorAll('.bulb').forEach(b => b.classList.remove('lit'))),
      500 + 5 * 420 + 700
    );
  }

  // ── GSAP scroll animations ────────────────────────────
//   private setupScrollAnimations(): void {
//     this.ctx = gsap.context(() => {

// // Car enters from right on load
// gsap.fromTo('.hero-car',
//   { x: '100vw', opacity: 0 },
//   { x: 0, opacity: 1, duration: 1.4, ease: 'expo.out', delay: 0.5 }
// );

// // Nose-dip settle after entry
// gsap.to('.hero-car', {
//   rotateZ: -1.5,
//   duration: 0.25,
//   delay: 1.85,
//   yoyo: true,
//   repeat: 1,
//   ease: 'power2.inOut'
// });

// // Car drifts left + fades as you scroll DOWN past hero
// gsap.to('.hero-car', {
//   x: '-40vw',
//   opacity: 0,
//   ease: 'none',
//   scrollTrigger: {
//     trigger: '.hero',
//     start: 'bottom 80%',
//     end: 'bottom top',
//     scrub: 0.8,
//   }
// });

//       // Hero headline parallax
//    // Headline fades up as you scroll past hero
// gsap.to(['.eyebrow', '.hero h1', '.hero .sub', '.hero-cta'], {
//   opacity: 0,
//   y: -40,
//   ease: 'none',
//   scrollTrigger: {
//     trigger: '.hero',
//     start: 'bottom 85%',
//     end: 'bottom 20%',
//     scrub: 0.8,
//   }
// });

//       // Feature cards stagger reveal
//       gsap.from('.card', {
//         y: 50,
//         opacity: 0,
//         duration: 0.8,
//         stagger: 0.12,
//         ease: 'power3.out',
//         scrollTrigger: {
//           trigger: '.features-section',
//           start: 'top 75%',
//         }
//       });

//       // Win gauge count up + fill
//       ScrollTrigger.create({
//         trigger: '.gauge-section',
//         start: 'top 65%',
//         once: true,
//         onEnter: () => this.animateGauge(72)
//       });

//       // Tech items drift in
//       gsap.from('.tech-item', {
//         opacity: 0,
//         y: 16,
//         stagger: 0.06,
//         duration: 0.6,
//         ease: 'power2.out',
//         scrollTrigger: {
//           trigger: '.tech-strip',
//           start: 'top 80%'
//         }
//       });

//       // Final CTA
//       gsap.from('.final h2, .final .creds, .final .hero-cta', {
//         y: 40,
//         opacity: 0,
//         stagger: 0.15,
//         duration: 1,
//         ease: 'power3.out',
//         scrollTrigger: {
//           trigger: '.final',
//           start: 'top 70%'
//         }
//       });

//       // Aurora parallax
//       ScrollTrigger.create({
//         onUpdate: (self) => {
//           gsap.set('.aurora-a', { y: self.progress * 120 });
//           gsap.set('.aurora-b', { y: self.progress * -80 });
//         }
//       });

//     });
//   }

private setupScrollAnimations(): void {
  this.ctx = gsap.context(() => {

    // ── Hero text stagger (load) ──
    gsap.from(['.eyebrow', '.hero h1', '.hero .sub', '.hero-cta', '.scrollcue'], {
      y: 30, opacity: 0, duration: 1, stagger: 0.12,
      ease: 'power3.out', delay: 0.3
    });

    // ── Feature cards ──
    gsap.from('.card', {
      y: 50, opacity: 0, duration: 0.8, stagger: 0.12,
      ease: 'power3.out',
      scrollTrigger: { trigger: '.features-section', start: 'top 75%' }
    });

    // ── Win gauge ──
    ScrollTrigger.create({
      trigger: '.gauge-section', start: 'top 65%', once: true,
      onEnter: () => this.animateGauge(72)
    });

    // ── Tech items ──
    gsap.from('.tech-item', {
      opacity: 0, y: 16, stagger: 0.06, duration: 0.6,
      ease: 'power2.out',
      scrollTrigger: { trigger: '.tech-strip', start: 'top 80%' }
    });

    // ── Final CTA ──
    gsap.from('.final h2, .final .creds, .final .hero-cta', {
  y: 40,
  opacity: 0,
  stagger: 0.15,
  duration: 1,
  ease: 'power3.out',
  immediateRender: false,
  scrollTrigger: {
    trigger: '.final',
    start: 'top 80%',
    toggleActions: 'play none none reverse'
  }
});

  });

  // ── Car: CSS entry + scroll listener ──
  this.setupCarScroll();
}

private setupCarScroll(): void {
  const car = document.querySelector<HTMLElement>('.hero-car');
  if (!car) return;

  // CSS handles entry — add class after short delay
  setTimeout(() => {
    car.classList.add('entered');
    setTimeout(() => {
      car.classList.add('settled');
      this.carEntered = true;
    }, 1400);
  }, 300);

  // Scroll handler — runs on scroll up AND down
  window.addEventListener('scroll', () => {
    if (!this.carEntered) return;
    const hero = document.querySelector<HTMLElement>('.hero');
    if (!hero || !car) return;

    const exitStart = hero.offsetHeight * 0.35;
    const exitEnd = hero.offsetHeight * 0.70;
    const scrollY = window.scrollY;

    if (scrollY <= exitStart) {
      // Fully visible
      car.style.transform = 'translateX(0) rotateZ(0deg)';
      car.style.opacity = '1';
    } else if (scrollY >= exitEnd) {
      // Fully gone
      car.style.transform = 'translateX(-55vw) rotateZ(-2deg)';
      car.style.opacity = '0';
    } else {
      // Transition
      const p = (scrollY - exitStart) / (exitEnd - exitStart);
      car.style.transform = `translateX(${-55 * p}vw) rotateZ(${-2 * p}deg)`;
      car.style.opacity = String(1 - p);
    }
  }, { passive: true });
}

  winValue = 0;
  gaugeOffset = 578;

  private animateGauge(target: number): void {
    gsap.to(this, {
      winValue: target,
      duration: 1.8,
      ease: 'power2.out',
      onUpdate: () => {
        this.winValue = Math.round(this.winValue);
        const el = document.querySelector('.gauge-pct');
        if (el) el.textContent = this.winValue + '%';
      }
    });
    gsap.to(this, {
      gaugeOffset: 578 * (1 - target / 100),
      duration: 1.8,
      ease: 'power2.out',
      onUpdate: () => {
        const fill = document.querySelector<SVGElement>('.gauge-fill');
        if (fill) fill.setAttribute('stroke-dashoffset', String(Math.round(this.gaugeOffset)));
      }
    });
  }
}