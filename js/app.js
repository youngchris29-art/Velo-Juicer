/* ============================================================
   KING Juicer — app.js
   Modules: Lenis · Preloader · Canvas · Frame-to-scroll
            Hero transition · Section animations · Dark overlay
            Marquee · Counters · Hero word reveal
   ============================================================ */

(function () {
  "use strict";

  /* ── Config ─────────────────────────────────────────────── */

  const FRAME_COUNT = 169;
  const FRAME_SPEED = 2.0;   // animation completes ~50% scroll
  const IMAGE_SCALE = 0.85;  // padded cover — product never clips edge
  const BG_COLOR = "#000000"; // hardcoded black to match site bg

  /* ── DOM refs ───────────────────────────────────────────── */

  const loader = document.getElementById("loader");
  const loaderBar = document.getElementById("loader-bar");
  const loaderPercent = document.getElementById("loader-percent");
  const heroSection = document.querySelector(".hero-standalone");
  const canvasWrap = document.getElementById("canvas-wrap");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const darkOverlay = document.getElementById("dark-overlay");
  const marqueeWrap = document.getElementById("marquee-wrap");
  const scrollContainer = document.getElementById("scroll-container");
  const sections = document.querySelectorAll(".scroll-section");

  /* ── State ──────────────────────────────────────────────── */

  const frames = new Array(FRAME_COUNT).fill(null);
  let currentFrame = 0;
  let allLoaded = false;

  /* ================================================================
     1. LENIS SMOOTH SCROLL
  ================================================================ */

  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });

  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  /* ================================================================
     2. CANVAS — devicePixelRatio + resize
  ================================================================ */

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.scale(dpr, dpr);
    if (frames[currentFrame]) drawFrame(currentFrame);
  }

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  /* ── Draw frame (padded cover, pure black fill) ──────────── */

  function drawFrame(index) {
    const img = frames[index];
    if (!img || !img.complete) return;

    const cw = window.innerWidth;
    const ch = window.innerHeight;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    const scale = Math.max(cw / iw, ch / ih) * IMAGE_SCALE;
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  /* ================================================================
     3. FRAME PRELOADER — two-phase
  ================================================================ */

  function loadFrame(index) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        frames[index] = img;
        resolve(img);
      };
      img.onerror = () => resolve(null);
      img.src = `frames/frame_${String(index + 1).padStart(4, "0")}.webp`;
    });
  }

  async function preload() {
    // Phase 1: first 10 frames (fast first paint)
    const phase1 = [];
    for (let i = 0; i < Math.min(10, FRAME_COUNT); i++) {
      phase1.push(loadFrame(i));
    }
    await Promise.all(phase1);

    // Show first frame immediately
    drawFrame(0);

    // Phase 2: remaining frames in background, update progress bar
    const phase2Indices = [];
    for (let i = 10; i < FRAME_COUNT; i++) phase2Indices.push(i);

    let done = 10; // already loaded
    const updateProgress = () => {
      done++;
      const pct = Math.round((done / FRAME_COUNT) * 100);
      loaderBar.style.width = pct + "%";
      loaderPercent.textContent = pct + "%";
    };

    // Set initial progress from phase 1
    loaderBar.style.width = Math.round((10 / FRAME_COUNT) * 100) + "%";
    loaderPercent.textContent = Math.round((10 / FRAME_COUNT) * 100) + "%";

    const loadTasks = phase2Indices.map((i) =>
      loadFrame(i).then(() => updateProgress())
    );

    await Promise.all(loadTasks);
    allLoaded = true;

    // Hide loader
    gsap.to(loader, {
      opacity: 0,
      duration: 0.7,
      ease: "power2.inOut",
      onComplete: () => {
        loader.style.display = "none";
        // Reveal hero elements after loader hides
        initHeroReveal();
      },
    });
  }

  preload();

  /* ================================================================
     4. HERO WORD REVEAL (after loader)
  ================================================================ */

  function initHeroReveal() {
    const words = heroSection.querySelectorAll(".word");
    const tagline = heroSection.querySelector(".hero-tagline");
    const scrollInd = heroSection.querySelector(".scroll-indicator");

    const tl = gsap.timeline();

    tl.to(words, {
      y: "0%",
      duration: 1.1,
      ease: "power4.out",
      stagger: 0.08,
    })
      .to(tagline, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power3.out",
      }, "-=0.4")
      .to(scrollInd, {
        opacity: 1,
        duration: 0.6,
        ease: "power2.out",
      }, "-=0.3");
  }

  /* ================================================================
     5. HERO TRANSITION — fade hero, circle-wipe canvas
  ================================================================ */

  function initHeroTransition() {
    ScrollTrigger.create({
      trigger: scrollContainer,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress;

        // Hero fades out in first 7% of scroll
        heroSection.style.opacity = Math.max(0, 1 - p * 14);

        // Canvas circle-wipe: 0% → 75% radius over 1–7% scroll
        const wipeProgress = Math.min(1, Math.max(0, (p - 0.005) / 0.07));
        const radius = wipeProgress * 75;
        canvasWrap.style.clipPath = `circle(${radius}% at 50% 50%)`;

        // Marquee appears once canvas is fully open
        marqueeWrap.style.opacity = wipeProgress > 0.9 ? 1 : 0;
      },
    });
  }

  /* ================================================================
     6. FRAME-TO-SCROLL BINDING
  ================================================================ */

  function initFrameScroll() {
    ScrollTrigger.create({
      trigger: scrollContainer,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        const accelerated = Math.min(self.progress * FRAME_SPEED, 1);
        const index = Math.min(
          Math.floor(accelerated * FRAME_COUNT),
          FRAME_COUNT - 1
        );
        if (index !== currentFrame) {
          currentFrame = index;
          requestAnimationFrame(() => drawFrame(currentFrame));
        }
      },
    });
  }

  /* ================================================================
     7. SECTION ANIMATION SYSTEM
  ================================================================ */

  function buildAnimation(type, children, tl) {
    switch (type) {
      case "fade-up":
        tl.from(children, {
          y: 50, opacity: 0,
          stagger: 0.12, duration: 0.9, ease: "power3.out",
        });
        break;
      case "slide-left":
        tl.from(children, {
          x: -80, opacity: 0,
          stagger: 0.14, duration: 0.9, ease: "power3.out",
        });
        break;
      case "slide-right":
        tl.from(children, {
          x: 80, opacity: 0,
          stagger: 0.14, duration: 0.9, ease: "power3.out",
        });
        break;
      case "scale-up":
        tl.from(children, {
          scale: 0.85, opacity: 0,
          stagger: 0.12, duration: 1.0, ease: "power2.out",
        });
        break;
      case "rotate-in":
        tl.from(children, {
          y: 40, rotation: 3, opacity: 0,
          stagger: 0.1, duration: 0.9, ease: "power3.out",
        });
        break;
      case "stagger-up":
        tl.from(children, {
          y: 60, opacity: 0,
          stagger: 0.15, duration: 0.8, ease: "power3.out",
        });
        break;
      case "clip-reveal":
        tl.from(children, {
          clipPath: "inset(100% 0 0 0)",
          opacity: 0,
          stagger: 0.15, duration: 1.2, ease: "power4.inOut",
        });
        break;
      default:
        tl.from(children, { opacity: 0, stagger: 0.1, duration: 0.8 });
    }
  }

  function setupSectionAnimation(section) {
    const type = section.dataset.animation || "fade-up";
    const persist = section.dataset.persist === "true";
    const enter = parseFloat(section.dataset.enter) / 100;
    const leave = parseFloat(section.dataset.leave) / 100;

    const children = section.querySelectorAll(
      ".section-label, .section-heading, .section-body, .section-note, .cta-button, .stat"
    );

    if (!children.length) return;

    const tl = gsap.timeline({ paused: true });
    buildAnimation(type, children, tl);

    let played = false;

    ScrollTrigger.create({
      trigger: scrollContainer,
      start: "top top",
      end: "bottom bottom",
      scrub: false,
      onUpdate: (self) => {
        const p = self.progress;

        if (p >= enter && p <= leave) {
          section.classList.add("is-visible");
          section.style.opacity = "1";
          section.style.visibility = "visible";

          if (!played) {
            played = true;
            tl.play(0);
          }
        } else {
          if (!persist) {
            section.classList.remove("is-visible");
            section.style.opacity = "0";
            section.style.visibility = "hidden";
            played = false;
            tl.pause(0);
          }
        }
      },
    });
  }

  sections.forEach(setupSectionAnimation);

  /* ================================================================
     8. DARK OVERLAY — fades in at 64%, out at 76%, and again for story
  ================================================================ */

  function initDarkOverlay() {
    const fadeRange = 0.04;
    const ranges = [
      { enter: 0.64, leave: 0.76 },
      { enter: 0.84, leave: 0.94 }
    ];

    ScrollTrigger.create({
      trigger: scrollContainer,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress;
        let opacity = 0;

        for (const range of ranges) {
          if (p >= range.enter - fadeRange && p <= range.leave + fadeRange) {
            if (p <= range.enter) {
              opacity = ((p - (range.enter - fadeRange)) / fadeRange) * 0.9;
            } else if (p < range.leave) {
              opacity = 0.9;
            } else {
              opacity = 0.9 * (1 - (p - range.leave) / fadeRange);
            }
            break;
          }
        }

        darkOverlay.style.opacity = opacity;
      },
    });
  }

  initDarkOverlay();

  /* ================================================================
     9. HORIZONTAL MARQUEE — driven by scroll
  ================================================================ */

  function initMarquee() {
    const speed = parseFloat(marqueeWrap.dataset.scrollSpeed) || -22;
    gsap.to(marqueeWrap.querySelector(".marquee-text"), {
      xPercent: speed,
      ease: "none",
      scrollTrigger: {
        trigger: scrollContainer,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
      },
    });
  }

  initMarquee();

  /* ================================================================
     10. COUNTER ANIMATIONS
  ================================================================ */

  function initCounters() {
    document.querySelectorAll(".stat-number").forEach((el) => {
      const target = parseFloat(el.dataset.value);
      const decimals = parseInt(el.dataset.decimals || "0");

      gsap.from(el, {
        textContent: 0,
        duration: 2,
        ease: "power1.out",
        snap: { textContent: decimals === 0 ? 1 : 0.01 },
        scrollTrigger: {
          trigger: el.closest(".scroll-section"),
          start: "top 80%",
          toggleActions: "play none none reverse",
          // We use the scroll container as proxy since section is absolute
          containerAnimation: undefined,
        },
        onUpdate: function () {
          const val = parseFloat(this.targets()[0].textContent);
          this.targets()[0].textContent =
            decimals === 0 ? Math.round(val) : val.toFixed(decimals);
        },
      });
    });
  }

  /* Counter visibility is handled by section system.
     We use a separate simple approach tied to dark overlay timing. */
  function initCountersOnOverlay() {
    let counted = false;

    ScrollTrigger.create({
      trigger: scrollContainer,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        const p = self.progress;
        if (p >= 0.64 && p <= 0.76 && !counted) {
          counted = true;
          document.querySelectorAll(".stat-number").forEach((el) => {
            const target = parseFloat(el.dataset.value);
            const decimals = parseInt(el.dataset.decimals || "0");
            gsap.fromTo(
              el,
              { textContent: 0 },
              {
                textContent: target,
                duration: 2.2,
                ease: "power2.out",
                snap: { textContent: decimals === 0 ? 1 : 0.01 },
                onUpdate: function () {
                  const val = parseFloat(this.targets()[0].textContent);
                  this.targets()[0].textContent =
                    decimals === 0 ? Math.round(val) : val.toFixed(decimals);
                },
              }
            );
          });
        } else if (p < 0.62 || p > 0.78) {
          counted = false;
          document.querySelectorAll(".stat-number").forEach((el) => {
            el.textContent = "0";
          });
        }
      },
    });
  }

  initCountersOnOverlay();

  /* ================================================================
     11. KICK OFF SCROLLTRIGGER-BASED SYSTEMS
         (must come after all ScrollTrigger.create calls)
  ================================================================ */

  initHeroTransition();
  initFrameScroll();

  ScrollTrigger.refresh();

  /* ================================================================
     12. NAVIGATION (SMOOTH SCROLL)
  ================================================================ */

  const linkFeatures = document.getElementById("link-features");
  const linkStory = document.getElementById("link-story");

  if (linkFeatures) {
    linkFeatures.addEventListener("click", (e) => {
      e.preventDefault();
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      lenis.scrollTo(maxScroll * 0.27, { duration: 1.5 });
    });
  }

  if (linkStory) {
    linkStory.addEventListener("click", (e) => {
      e.preventDefault();
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      lenis.scrollTo(maxScroll * 0.89, { duration: 1.5 });
    });
  }

})();
