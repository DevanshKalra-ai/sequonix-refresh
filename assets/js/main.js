/* ============================================================
   SEQUONIX — motion system
   Lenis smooth scroll + GSAP ScrollTrigger
   Buttery, GPU-friendly, prefers-reduced-motion aware.
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGSAP = typeof window.gsap !== "undefined";
  var hasLenis = typeof window.Lenis !== "undefined";

  /* If scroll-driven motion can't run, fall back to a readable static layout
     (otherwise horizontal panels / manifesto would stay hidden or dim). */
  if (reduceMotion || !hasGSAP || typeof window.ScrollTrigger === "undefined") {
    document.body.classList.add("motion-off");
  }

  /* ---------- YEAR ---------- */
  var y = document.querySelector("[data-year]");
  if (y) y.textContent = new Date().getFullYear();

  /* ---------- NAV: scrolled state + hide on scroll down ---------- */
  var nav = document.querySelector(".nav");
  var lastY = 0;
  function onNav(scrollY) {
    if (!nav) return;
    nav.classList.toggle("scrolled", scrollY > 24);
    if (scrollY > lastY && scrollY > 420 && !document.body.classList.contains("menu-open")) {
      nav.classList.add("hide");
    } else {
      nav.classList.remove("hide");
    }
    lastY = scrollY;
  }

  /* ---------- MOBILE MENU ---------- */
  var burger = document.querySelector(".hamburger");
  if (burger) {
    burger.addEventListener("click", function () {
      document.body.classList.toggle("menu-open");
    });
    document.querySelectorAll(".nav-links a").forEach(function (a) {
      a.addEventListener("click", function () { document.body.classList.remove("menu-open"); });
    });
  }

  /* ---------- LENIS SMOOTH SCROLL ---------- */
  var lenis = null;
  if (hasLenis && !reduceMotion) {
    lenis = new Lenis({
      duration: 1.1,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      lerp: 0.1
    });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    lenis.on("scroll", function (e) { onNav(e.scroll); });
    if (hasGSAP && window.ScrollTrigger) {
      lenis.on("scroll", ScrollTrigger.update);
    }
  } else {
    window.addEventListener("scroll", function () { onNav(window.scrollY); }, { passive: true });
  }

  /* anchor links via lenis */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (id.length < 2) return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(el, { offset: -80 });
      else el.scrollIntoView({ behavior: "smooth" });
    });
  });

  /* ---------- SCROLL REVEALS (IntersectionObserver fallback) ---------- */
  function ioReveal() {
    var els = document.querySelectorAll("[data-reveal], [data-reveal-stagger]");
    if (reduceMotion) { els.forEach(function (el) { el.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var el = en.target;
          var kids = el.matches("[data-reveal-stagger]") ? el.children : [el];
          var i = 0;
          Array.prototype.forEach.call(kids, function (k) {
            setTimeout(function () { /* noop, handled by CSS via .in */ }, 0);
          });
          // stagger via transition-delay
          if (el.matches("[data-reveal-stagger]")) {
            Array.prototype.forEach.call(el.children, function (k, idx) {
              k.style.transitionDelay = (idx * 0.09) + "s";
            });
          }
          el.classList.add("in");
          io.unobserve(el);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (el) { io.observe(el); });
  }
  ioReveal();

  /* ---------- HERO word stagger ---------- */
  function heroWords() {
    if (reduceMotion) return;
    var lines = document.querySelectorAll(".reveal-line > span");
    lines.forEach(function (span, i) {
      span.style.transform = "translateY(110%)";
      span.style.transition = "transform 1s cubic-bezier(0.16,1,0.3,1)";
      span.style.transitionDelay = (0.15 + i * 0.09) + "s";
    });
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        lines.forEach(function (span) { span.style.transform = "translateY(0)"; });
      });
    });
  }
  heroWords();

  /* ---------- COUNTERS ---------- */
  function counters() {
    var nums = document.querySelectorAll("[data-count]");
    if (!nums.length) return;
    /* pre-set to the start value so there's no "200+ -> 0" snap when it triggers */
    if (!reduceMotion) {
      nums.forEach(function (el) { el.textContent = "0" + (el.getAttribute("data-suffix") || ""); });
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var target = parseFloat(el.getAttribute("data-count"));
        var suffix = el.getAttribute("data-suffix") || "";
        var dur = 2000, start = performance.now();
        function tick(now) {
          var p = Math.min(1, (now - start) / dur);
          /* easeOutExpo — fast start, long gentle settle (never feels abrupt) */
          var eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
          var val = target * eased;
          el.textContent = (target % 1 === 0 ? Math.round(val) : val.toFixed(0)) + suffix;
          if (p < 1) requestAnimationFrame(tick);
          else el.textContent = target + suffix;
        }
        if (reduceMotion) { el.textContent = target + suffix; }
        else requestAnimationFrame(tick);
        io.unobserve(el);
      });
    }, { threshold: 0, rootMargin: "0px 0px -12% 0px" });
    nums.forEach(function (n) { io.observe(n); });
  }
  counters();

  /* ---------- MAGNETIC BUTTONS ---------- */
  function magnetic() {
    if (reduceMotion || window.matchMedia("(pointer: coarse)").matches) return;
    document.querySelectorAll("[data-magnetic]").forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var mx = e.clientX - r.left - r.width / 2;
        var my = e.clientY - r.top - r.height / 2;
        el.style.transform = "translate(" + mx * 0.25 + "px," + my * 0.35 + "px)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = "translate(0,0)"; });
    });
  }
  magnetic();

  /* ---------- GSAP scroll-driven pieces ---------- */
  if (hasGSAP && window.ScrollTrigger && !reduceMotion) {
    gsap.registerPlugin(ScrollTrigger);

    /* top scroll-progress bar */
    var bar = document.querySelector(".scroll-progress");
    if (bar) {
      gsap.to(bar, {
        scaleX: 1, ease: "none",
        scrollTrigger: { start: 0, end: "max", scrub: 0.3 }
      });
    }

    /* parallax — elements drift at their own speed while passing the viewport */
    gsap.utils.toArray("[data-parallax]").forEach(function (el) {
      var speed = parseFloat(el.getAttribute("data-parallax")) || 0.2;
      gsap.fromTo(el,
        { yPercent: -speed * 50 },
        { yPercent: speed * 50, ease: "none",
          scrollTrigger: { trigger: el.closest("section") || el, start: "top bottom", end: "bottom top", scrub: true } }
      );
    });

    /* hero content "dissolves" upward into the next section — continuity */
    var heroInner = document.querySelector(".hero-inner");
    if (heroInner) {
      gsap.to(heroInner, {
        yPercent: -14, opacity: 0.12, scale: 0.97, ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom 35%", scrub: 0.4 }
      });
    }

    /* ===== HORIZONTAL PINNED SERVICE PANELS (desktop) ===== */
    var mm = gsap.matchMedia();
    mm.add("(min-width: 901px)", function () {
      var section = document.querySelector("[data-hpanels]");
      var track = section && section.querySelector(".hpanels-track");
      if (!track) return;
      var panels = gsap.utils.toArray(".hpanel", track);
      var distance = function () { return track.scrollWidth - document.documentElement.clientWidth + 40; };
      /* cinematic focus: panel nearest center grows + brightens, others recede */
      function focus() {
        var cx = window.innerWidth / 2;
        panels.forEach(function (p) {
          var r = p.getBoundingClientRect();
          var d = Math.min(1, Math.abs((r.left + r.width / 2) - cx) / (window.innerWidth * 0.9));
          gsap.set(p, { scale: 1 - d * 0.17, opacity: 1 - d * 0.5, transformOrigin: "center center" });
        });
      }
      gsap.to(track, {
        x: function () { return -distance(); },
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: function () { return "+=" + distance(); },
          pin: ".hpanels-pin",
          scrub: 0.5,
          invalidateOnRefresh: true,
          anticipatePin: 1,
          onUpdate: focus,
          onRefresh: focus
        }
      });
      focus();
      /* return cleanup fn so gsap.matchMedia tears down on resize below 901px */
      return function () {
        panels.forEach(function (p) {
          gsap.set(p, { clearProps: "scale,opacity,transform" });
        });
        gsap.set(track, { clearProps: "x,transform" });
      };
    });

    /* ===== MANIFESTO — word-by-word scrub highlight ===== */
    var man = document.querySelector("[data-manifesto]");
    if (man) {
      var emphasis = ["clients", "automate", "revenue.", "sleep,", "ideas"];
      var words = man.textContent.trim().split(/\s+/);
      man.innerHTML = words.map(function (w) {
        var isEm = emphasis.indexOf(w.toLowerCase()) !== -1;
        return '<span class="w' + (isEm ? " em" : "") + '">' + w + "</span>";
      }).join(" ");
      var wEls = man.querySelectorAll(".w");
      ScrollTrigger.create({
        trigger: ".manifesto",
        start: "top top",
        end: "+=120%",
        pin: ".manifesto-pin",
        scrub: 0.3,
        onUpdate: function (self) {
          var lit = Math.round(self.progress * wEls.length);
          wEls.forEach(function (el, i) { el.classList.toggle("lit", i < lit); });
        }
      });
    }

    /* ===== PINNED SCROLLYTELLING SHOWPIECE ===== */
    var scrolly = document.querySelector("[data-scrolly]");
    if (scrolly) {
      var steps = gsap.utils.toArray(".scrolly-step");
      var dots = gsap.utils.toArray(".scrolly-prog .dot");
      var countEl = scrolly.querySelector(".scrolly-count");
      var glow = scrolly.querySelector(".scrolly-glow");
      var n = steps.length;

      function setActive(idx) {
        steps.forEach(function (s, i) { s.classList.toggle("on", i === idx); });
        dots.forEach(function (d, i) { d.classList.toggle("on", i <= idx); });
        if (countEl) countEl.textContent = "0" + (idx + 1);
      }
      setActive(0);

      ScrollTrigger.create({
        trigger: scrolly,
        start: "top top",
        end: "+=" + (n * 90) + "%",
        pin: ".scrolly-pin",
        scrub: 0.4,
        onUpdate: function (self) {
          var idx = Math.min(n - 1, Math.floor(self.progress * n));
          setActive(idx);
          if (glow) {
            gsap.set(glow, {
              x: (self.progress - 0.5) * 220,
              y: Math.sin(self.progress * Math.PI) * -80
            });
          }
        }
      });
    }

    /* gentle section-image reveals via gsap (extra polish on cards) */
    gsap.utils.toArray("[data-rise]").forEach(function (el) {
      gsap.from(el, {
        y: 60, opacity: 0, duration: 1, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 85%" }
      });
    });

    ScrollTrigger.refresh();
  }

  /* ---------- HERO CANVAS: soft animated emerald line-field ---------- */
  function heroCanvas() {
    var cv = document.getElementById("hero-canvas");
    if (!cv || reduceMotion) return;
    var ctx = cv.getContext("2d");
    var W, H, dots = [];
    var DPR = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      var p = cv.parentElement;
      W = p.offsetWidth; H = p.offsetHeight;
      cv.width = W * DPR; cv.height = H * DPR;
      cv.style.width = W + "px"; cv.style.height = H + "px";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      build();
    }
    function build() {
      dots = [];
      var count = Math.min(70, Math.floor((W * H) / 22000));
      for (var i = 0; i < count; i++) {
        dots.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18
        });
      }
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0 || d.x > W) d.vx *= -1;
        if (d.y < 0 || d.y > H) d.vy *= -1;
        for (var j = i + 1; j < dots.length; j++) {
          var e = dots[j];
          var dx = d.x - e.x, dy = d.y - e.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.strokeStyle = "rgba(30,148,107," + (0.14 * (1 - dist / 130)) + ")";
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(e.x, e.y); ctx.stroke();
          }
        }
        ctx.fillStyle = "rgba(30,148,107,0.35)";
        ctx.beginPath(); ctx.arc(d.x, d.y, 1.6, 0, 6.283); ctx.fill();
      }
      requestAnimationFrame(draw);
    }
    window.addEventListener("resize", resize);
    resize(); draw();
  }
  heroCanvas();

  /* ---------- CONTACT FORM (Web3Forms) ---------- */
  var form = document.getElementById("contactForm");
  if (form) {
    var status = form.querySelector(".form-status");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      var orig = btn.textContent;
      btn.disabled = true; btn.textContent = "Sending…";
      if (status) { status.className = "form-status"; status.textContent = ""; }
      var data = new FormData(form);
      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: data
      }).then(function (r) { return r.json(); })
        .then(function (res) {
          if (res.success) {
            if (status) { status.className = "form-status ok"; status.textContent = "Thanks — your message is on its way. We'll reply within one business day."; }
            form.reset();
          } else {
            if (status) { status.className = "form-status err"; status.textContent = "Something went wrong. Please email info@sequonix.com directly."; }
          }
        }).catch(function () {
          if (status) { status.className = "form-status err"; status.textContent = "Network error. Please email info@sequonix.com directly."; }
        }).finally(function () {
          btn.disabled = false; btn.textContent = orig;
        });
    });
  }
})();
