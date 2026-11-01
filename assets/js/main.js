(function () {
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* 0. Theme switch (remembered between visits) */
    const toggle = document.getElementById("themeToggle");
    function setTheme(t) {
      root.setAttribute("data-theme", t);
      toggle.setAttribute("aria-label", t === "dark" ? "Switch to light theme" : "Switch to dark theme");
      try { localStorage.setItem("portfolio-theme", t); } catch (e) {}
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", t === "dark" ? "#07080c" : "#eceef5");
      if (window.__cmosSetTheme) window.__cmosSetTheme(t);
    }
    setTheme(root.getAttribute("data-theme") || "light");
    toggle.addEventListener("click", () => {
      setTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
    });

    /* 1. Split headings into words for a staggered reveal */
    document.querySelectorAll("[data-split]").forEach(el => {
      const text = el.textContent.trim();
      el.setAttribute("aria-label", text);
      el.innerHTML = text.split(" ").map((w, i) =>
        `<span class="w" aria-hidden="true" style="--i:${i}">${w}</span>`
      ).join(" ");
    });

    /* 2. Scroll-linked statement */
    const statement = document.getElementById("statement");
    const firstStatement = statement && statement.closest("#about") ? statement : null;
    if (firstStatement && !reduce) {
      const words = firstStatement.textContent.trim().split(/\s+/);
      firstStatement.innerHTML = words.map(w => `<span class="word">${w}</span>`).join(" ");
    }
    const spans = firstStatement && !reduce ? [...firstStatement.querySelectorAll(".word")] : [];

    /* 3. Reveal on scroll */
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        e.target.querySelectorAll("[data-count]").forEach(countUp);
        io.unobserve(e.target);
      });
    }, { threshold: 0.2 });
    document.querySelectorAll(".split, .fade-up, .photo-card").forEach(el => io.observe(el));


    function countUp(el) {
      if (reduce) return;
      const target = +el.dataset.count, start = performance.now(), dur = 1200;
      (function tick(now) {
        const p = Math.min((now - start) / dur, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      })(start);
    }

    /* 4. Scroll effects and active nav link */
    function onScroll() {
      if (spans.length) {
        const r = firstStatement.getBoundingClientRect();
        const vh = window.innerHeight;
        const p = Math.min(Math.max((vh * 0.85 - r.top) / (r.height + vh * 0.4), 0), 1);
        const n = Math.floor(p * spans.length);
        spans.forEach((s, i) => s.classList.toggle("lit", i < n));
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const links = [...document.querySelectorAll(".nav ul a")];
    const secIO = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        links.forEach(l => l.classList.toggle("active", l.getAttribute("href") === "#" + e.target.id));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll("section[id], header#home").forEach(s => secIO.observe(s));

    /* 5. 3D CMOS cross-section with Three.js */
    initCMOS();

    function initCMOS() {
      const host = document.getElementById("cmosStage");
      if (!window.THREE || !host) {
        if (host) host.innerHTML = '<p style="padding:24px;color:var(--fg-dim)">3D model needs an internet connection to load Three.js.</p>';
        return;
      }
      const THREE = window.THREE;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      host.appendChild(renderer.domElement);

      const model = new THREE.Group();
      scene.add(model);
      scene.add(new THREE.AmbientLight(0xffffff, 0.8));
      const key = new THREE.DirectionalLight(0xffffff, 0.95);
      key.position.set(5, 9, 6);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0x9cc3ff, 0.5);
      rim.position.set(-7, 4, -5);
      scene.add(rim);

      const parts = [];
      const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 });

      // Helper: a box with a solid colour and thin edge lines
      function box(w, h, d, color, x, y, z, o) {
        o = o || {};
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({
          color: color, roughness: 0.4, metalness: o.metal || 0,
          transparent: true, opacity: o.op === undefined ? 1 : o.op,
          emissive: color, emissiveIntensity: 0.12
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
        mesh.userData.device = o.device || "common";
        model.add(mesh);
        parts.push(mesh);
        return mesh;
      }

      // Substrate and wells (top surface at y = 0)
      box(11, 1.4, 4.4, 0x7d8bab, 0, -0.7, 0, { op: 0.82, device: "common" });
      box(5.2, 1.0, 4.0, 0xffb36b, 2.4, -0.5, 0, { op: 0.7, device: "pmos" });

      // Source and drain diffusions
      box(1.2, 0.5, 3.6, 0x3ddc84, -3.4, -0.25, 0, { device: "nmos" }); // NMOS source
      box(1.2, 0.5, 3.6, 0x3ddc84, -1.0, -0.25, 0, { device: "nmos" }); // NMOS drain
      box(1.2, 0.5, 3.6, 0x5b8cff, 0.9, -0.25, 0, { device: "pmos" });  // PMOS source
      box(1.2, 0.5, 3.6, 0x5b8cff, 3.9, -0.25, 0, { device: "pmos" });  // PMOS drain

      // Gate oxide and poly gates
      box(1.2, 0.12, 3.6, 0xdfe7f5, -2.2, 0.06, 0, { device: "nmos", op: 0.9 });
      box(1.2, 0.5, 3.6, 0xe11d48, -2.2, 0.37, 0, { device: "nmos" });
      box(1.8, 0.12, 3.6, 0xdfe7f5, 2.4, 0.06, 0, { device: "pmos", op: 0.9 });
      box(1.8, 0.5, 3.6, 0xe11d48, 2.4, 0.37, 0, { device: "pmos" });

      // Contacts and metal
      const metal = 0xd08a4a;
      box(0.22, 0.75, 0.22, 0x9aa3b5, -3.4, 0.62, 1.4, { device: "common" });
      box(0.22, 0.75, 0.22, 0x9aa3b5, -1.0, 0.62, 1.4, { device: "common" });
      box(0.22, 0.75, 0.22, 0x9aa3b5, 3.9, 0.62, 1.4, { device: "common" });
      box(4.9, 0.3, 1.0, metal, 1.45, 1.15, 1.4, { device: "common" });      // output metal (Vout)
      box(0.22, 1.45, 0.22, 0x9aa3b5, -2.2, 1.34, 1.4, { device: "common" }); // gate contacts
      box(0.22, 1.45, 0.22, 0x9aa3b5, 2.4, 1.34, 1.4, { device: "common" });
      box(4.9, 0.3, 1.0, 0x8b4cf0, 0.1, 2.1, 1.4, { device: "common" });    // input metal (Vin)

      // Charge carriers: electrons (NMOS channel) and holes (PMOS channel)
      const electronMat = new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x67e8f9, emissiveIntensity: 1.2 });
      const holeMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, emissive: 0xf472b6, emissiveIntensity: 1.2 });
      const sphereGeo = new THREE.SphereGeometry(0.09, 16, 12);
      const electrons = [], holes = [];
      for (let i = 0; i < 4; i++) {
        const e = new THREE.Mesh(sphereGeo, electronMat);
        e.position.set(-2.8, 0.2, 0);
        model.add(e); electrons.push(e);
        const h = new THREE.Mesh(sphereGeo, holeMat);
        h.position.set(1.5, 0.2, 0);
        model.add(h); holes.push(h);
      }

      // Fit the view to the container size
      function resize() {
        const w = host.clientWidth || 600, h = host.clientHeight || 460;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.position.set(0, 5.2, w < 600 ? 22 : 16);
        camera.lookAt(0, 0.6, 0);
        camera.updateProjectionMatrix();
      }
      new ResizeObserver(resize).observe(host);
      resize();

      // Highlight a device: dim everything that is not selected
      let mode = "both";
      function applyMode() {
        parts.forEach(p => {
          const m = p.material;
          const dim = mode !== "both" && mode !== "none" && p.userData.device !== "common" && p.userData.device !== mode;
          m.opacity = dim ? 0.14 : m.userData_op;
          m.needsUpdate = true;
        });
        electrons.forEach(e => e.visible = (mode === "both" || mode === "nmos"));
        holes.forEach(h => h.visible = (mode === "both" || mode === "pmos"));
      }
      // Remember each part's base opacity so restoring is exact
      parts.forEach(p => { p.material.userData_op = p.material.opacity; });

      document.querySelectorAll(".modes button").forEach(btn => {
        btn.addEventListener("click", () => {
          mode = btn.dataset.mode;
          document.querySelectorAll(".modes button").forEach(b => b.setAttribute("aria-pressed", String(b === btn)));
          applyMode();
        });
      });

      // Light-mode / dark-mode colours for the model's base
      window.__cmosSetTheme = function (t) {
        const sub = parts[0];
        sub.material.color.set(t === "dark" ? 0x3a4256 : 0x7d8bab);
        sub.material.emissive.set(t === "dark" ? 0x3a4256 : 0x7d8bab);
        edgeMat.color.set(t === "dark" ? 0xffffff : 0x1b2030);
        edgeMat.opacity = t === "dark" ? 0.4 : 0.35;
      };
      window.__cmosSetTheme(root.getAttribute("data-theme") || "light");

      // Drag to rotate
      let dragging = false, lastX = 0, lastY = 0, targetY = -0.5, targetX = 0.18;
      host.addEventListener("pointerdown", e => { dragging = true; lastX = e.clientX; lastY = e.clientY; host.setPointerCapture(e.pointerId); });
      host.addEventListener("pointermove", e => {
        if (!dragging) return;
        targetY += (e.clientX - lastX) * 0.008;
        targetX = Math.max(-0.5, Math.min(0.6, targetX + (e.clientY - lastY) * 0.005));
        lastX = e.clientX; lastY = e.clientY;
      });
      const stopDrag = () => { dragging = false; };
      host.addEventListener("pointerup", stopDrag);
      host.addEventListener("pointercancel", stopDrag);

      // Animation loop
      const clock = new THREE.Clock();
      let curY = targetY, curX = targetX;
      function frame() {
        const t = clock.getElapsedTime();
        if (!dragging && !reduce) targetY += 0.0015; // slow idle spin
        curY += (targetY - curY) * 0.12;
        curX += (targetX - curX) * 0.12;
        model.rotation.y = curY;
        model.rotation.x = curX;
        model.position.y = reduce ? 0 : Math.sin(t * 0.8) * 0.08;

        // Carriers drift along the channels, looping
        electrons.forEach((e, i) => {
          const u = ((t * 0.35) + i / electrons.length) % 1;
          e.position.x = -2.8 + u * 1.2;
          e.position.y = 0.22 + Math.sin(u * Math.PI) * 0.12;
        });
        holes.forEach((h, i) => {
          const u = ((t * 0.35) + i / holes.length) % 1;
          h.position.x = 1.5 + u * 1.8;
          h.position.y = 0.22 + Math.sin(u * Math.PI) * 0.12;
        });

        renderer.render(scene, camera);
        requestAnimationFrame(frame);
      }
      frame();
    }

    if (reduce) return;


    /* 9b. Circuit-board background: traces light up near the pointer and pulses travel along them */
    (function circuit() {
      const canvas = document.getElementById("circuit");
      if (!canvas || !canvas.getContext) return;
      const ctx = canvas.getContext("2d");
      const STEP = 24;                     // grid spacing in px
      const RADIUS = 230;                  // how far the pointer lights the traces
      const DIRS = [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]]; // 45-degree steps
      let W = 0, H = 0, dpr = 1, traces = [], chips = [];
      const pointer = { x: -9999, y: -9999 };

      function mulberry32(a) {
        return function () {
          a |= 0; a = a + 0x6D2B79F5 | 0;
          let t = Math.imul(a ^ a >>> 15, 1 | a);
          t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
          return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
      }

      // Walk a trace from (x,y) on a 45-degree grid, occasionally turning
      function walk(rnd, x, y, dir, maxCells) {
        const pts = [{ x, y }], pads = [];
        let d = dir, cells = 0;
        const target = 4 + Math.floor(rnd() * maxCells);
        while (cells < target) {
          if (rnd() < 0.28) {
            d = (d + (rnd() < 0.5 ? 1 : -1) * (rnd() < 0.6 ? 1 : 2) + 8) % 8;
            pads.push(pts.length - 1);
          }
          x += DIRS[d][0] * STEP; y += DIRS[d][1] * STEP; cells++;
          if (x < -STEP || y < -STEP || x > W + STEP || y > H + STEP) break;
          pts.push({ x, y });
        }
        return { pts, pads };
      }

      function buildTrace(pts, pads, rnd) {
        const cum = [0];
        for (let i = 1; i < pts.length; i++) {
          cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
        }
        // sample points along the trace for pointer proximity
        const samples = [];
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i];
          const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 8));
          for (let k = 0; k <= n; k++) {
            samples.push({ x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n });
          }
        }
        const L = cum[cum.length - 1];
        const pulse = rnd() < 0.55 ? { s: -rnd() * L, v: 90 + rnd() * 150 } : null;
        return { pts, pads, cum, L, samples, pulse, near: 0 };
      }

      function buildChip(rnd, x, y) {
        const size = 44;
        const starts = [];
        // leads leave from the four sides of the chip
        for (let k = -1; k <= 1; k += 2) {
          starts.push({ x: x - size / 2 - STEP, y: y + k * STEP, dir: 4 });
          starts.push({ x: x + size / 2 + STEP, y: y + k * STEP, dir: 0 });
          starts.push({ x: x + k * STEP, y: y - size / 2 - STEP, dir: 6 });
          starts.push({ x: x + k * STEP, y: y + size / 2 + STEP, dir: 2 });
        }
        starts.forEach(st => {
          if (rnd() < 0.35) return;
          const w = walk(rnd, st.x, st.y, st.dir, 16);
          w.pts.unshift({ x: x + (st.dir === 0 ? size / 2 : st.dir === 4 ? -size / 2 : st.x - x),
                          y: y + (st.dir === 2 ? size / 2 : st.dir === 6 ? -size / 2 : st.y - y) });
          traces.push(buildTrace(w.pts, w.pads, rnd));
        });
        return { x, y, size };
      }

      function generate() {
        const rnd = mulberry32(7);     // fixed seed so the layout is stable
        traces = []; chips = [];
        const chipCount = Math.max(2, Math.round(W * H / 260000));
        for (let i = 0; i < chipCount; i++) {
          const cx = Math.round((W * (0.12 + rnd() * 0.76)) / STEP) * STEP;
          const cy = Math.round((H * (0.12 + rnd() * 0.76)) / STEP) * STEP;
          chips.push(buildChip(rnd, cx, cy));
        }
        const count = Math.round(W * H / 20000 * (W < 700 ? 0.55 : 1));
        for (let i = 0; i < count; i++) {
          const x = Math.round(rnd() * W / STEP) * STEP;
          const y = Math.round(rnd() * H / STEP) * STEP;
          const w = walk(rnd, x, y, Math.floor(rnd() * 8), 14);
          if (w.pts.length > 2) traces.push(buildTrace(w.pts, w.pads, rnd));
        }
      }

      function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, W < 700 ? 1.5 : 2);
        W = window.innerWidth; H = window.innerHeight;
        canvas.width = W * dpr; canvas.height = H * dpr;
        canvas.style.width = W + "px"; canvas.style.height = H + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        generate();
        if (reduce) draw(0);
      }

      function pointAt(tr, s) {
        if (s <= 0) return tr.pts[0];
        if (s >= tr.L) return tr.pts[tr.pts.length - 1];
        let i = 1;
        while (tr.cum[i] < s) i++;
        const t = (s - tr.cum[i - 1]) / (tr.cum[i] - tr.cum[i - 1] || 1);
        const a = tr.pts[i - 1], b = tr.pts[i];
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      }

      function tracePath(tr, s0, s1) {
        ctx.beginPath();
        const p0 = pointAt(tr, s0);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 0; i < tr.pts.length; i++) {
          if (tr.cum[i] > s0 && tr.cum[i] < s1) ctx.lineTo(tr.pts[i].x, tr.pts[i].y);
        }
        const p1 = pointAt(tr, s1);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }

      function draw(dt) {
        const dark = root.getAttribute("data-theme") !== "light";
        ctx.clearRect(0, 0, W, H);
        ctx.lineCap = "round"; ctx.lineJoin = "round";

        const base = dark ? "70,230,160" : "0,128,84";
        const bright = dark ? "200,255,228" : "0,104,66";
        const glowRGB = dark ? "60,255,170" : "0,150,96";

        // Traces: dim by default, lit where the pointer is
        traces.forEach(tr => {
          let near = 0;
          for (let i = 0; i < tr.samples.length; i++) {
            const q = tr.samples[i];
            const d = Math.hypot(q.x - pointer.x, q.y - pointer.y);
            if (d < RADIUS) { const v = 1 - d / RADIUS; if (v > near) near = v; }
          }
          tr.near = near;
          if (near > 0.05) {
            ctx.strokeStyle = `rgba(${glowRGB},${(near * 0.5).toFixed(3)})`;
            ctx.lineWidth = 5;
            tracePath(tr, 0, tr.L);
          }
          ctx.strokeStyle = `rgba(${base},${(dark ? 0.32 : 0.36) + near * 0.65})`;
          ctx.lineWidth = 1.4;
          tracePath(tr, 0, tr.L);
          // solder pads at the bends
          tr.pads.forEach(i => {
            const p = tr.pts[i];
            ctx.fillStyle = `rgba(${base},${(dark ? 0.45 : 0.5) + near * 0.5})`;
            ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
          });
        });

        // Electrical pulses travelling along traces
        if (dt) {
          traces.forEach(tr => {
            if (!tr.pulse) return;
            tr.pulse.s += tr.pulse.v * dt;
            if (tr.pulse.s - 130 > tr.L) tr.pulse.s = -Math.random() * tr.L * 0.6;
          });
        }
        traces.forEach(tr => {
          if (!tr.pulse) return;
          const s1 = Math.min(tr.pulse.s, tr.L), s0 = Math.max(0, tr.pulse.s - 130);
          if (s1 <= 0) return;
          ctx.strokeStyle = `rgba(${glowRGB},0.4)`; ctx.lineWidth = 6;
          tracePath(tr, s0, s1);
          ctx.strokeStyle = `rgba(${bright},1)`; ctx.lineWidth = 2.2;
          tracePath(tr, s0, s1);
        });

        // Chips: glowing packages with a halo, pins and a dot matrix
        chips.forEach(c => {
          const half = c.size / 2;
          const d = Math.hypot(c.x - pointer.x, c.y - pointer.y);
          const near = Math.max(0, 1 - d / (RADIUS * 1.4));
          // soft halo around the package
          const halo = ctx.createRadialGradient(c.x, c.y, half, c.x, c.y, half * 4.5);
          halo.addColorStop(0, `rgba(${glowRGB},${(dark ? 0.26 : 0.14) + near * 0.2})`);
          halo.addColorStop(1, `rgba(${glowRGB},0)`);
          ctx.fillStyle = halo;
          ctx.beginPath(); ctx.arc(c.x, c.y, half * 4.5, 0, Math.PI * 2); ctx.fill();
          // body with a glowing edge
          ctx.save();
          ctx.shadowColor = `rgba(${glowRGB},${dark ? 0.9 : 0.45})`;
          ctx.shadowBlur = 12 + near * 14;
          ctx.fillStyle = dark ? "rgba(4,16,11,0.97)" : "rgba(250,255,252,1)";
          ctx.strokeStyle = `rgba(${glowRGB},${0.75 + near * 0.25})`;
          ctx.lineWidth = 1.6;
          ctx.fillRect(c.x - half, c.y - half, c.size, c.size);
          ctx.strokeRect(c.x - half, c.y - half, c.size, c.size);
          ctx.restore();
          // pins on all four sides
          ctx.strokeStyle = `rgba(${base},${0.85 + near * 0.15})`;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          for (let k = -1; k <= 1; k++) {
            const o = k * 10;
            ctx.moveTo(c.x + o, c.y - half); ctx.lineTo(c.x + o, c.y - half - 7);
            ctx.moveTo(c.x + o, c.y + half); ctx.lineTo(c.x + o, c.y + half + 7);
            ctx.moveTo(c.x - half, c.y + o); ctx.lineTo(c.x - half - 7, c.y + o);
            ctx.moveTo(c.x + half, c.y + o); ctx.lineTo(c.x + half + 7, c.y + o);
          }
          ctx.stroke();
          // dot matrix that brightens near the pointer
          ctx.fillStyle = `rgba(${glowRGB},${(dark ? 0.55 : 0.6) + near * 0.4})`;
          for (let i = -1.5; i <= 1.5; i++) for (let j = -1.5; j <= 1.5; j++) {
            ctx.beginPath(); ctx.arc(c.x + i * 7, c.y + j * 7, 1.3, 0, Math.PI * 2); ctx.fill();
          }
        });
      }

      let last = performance.now();
      function frame(now) {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        draw(dt);
        requestAnimationFrame(frame);
      }

      window.addEventListener("pointermove", e => { pointer.x = e.clientX; pointer.y = e.clientY; if (reduce) draw(0); }, { passive: true });
      window.addEventListener("pointerleave", () => { pointer.x = -9999; pointer.y = -9999; });
      window.addEventListener("resize", resize);
      resize();
      if (!reduce) requestAnimationFrame(frame);
    })();

    /* 10. Contact form: opens the visitor's email app with the message ready */
    const form = document.getElementById("contactForm");
    if (form) {
      form.addEventListener("submit", e => {
        e.preventDefault();
        const name = document.getElementById("cfName").value.trim();
        const mail = document.getElementById("cfMail").value.trim();
        const msg = document.getElementById("cfMsg").value.trim();
        const status = document.getElementById("formStatus");
        if (!name || !mail || !msg || !/^\S+@\S+\.\S+$/.test(mail)) {
          status.textContent = "Please fill in your name, a valid email and a message.";
          return;
        }
        const subject = encodeURIComponent("Portfolio message from " + name);
        const body = encodeURIComponent(msg + "\n\n- " + name + " (" + mail + ")");
        window.location.href = "mailto:manishgowda2k3@gmail.com?subject=" + subject + "&body=" + body;
        status.textContent = "Your email app should open with the message ready to send.";
      });
    }

    /* 11. Project details dialog: double-click (or Enter) opens it */
    const dlg = document.getElementById("projectDialog");
    function openProject(card) {
      document.getElementById("pmImg").src = card.dataset.img;
      document.getElementById("pmImg").alt = card.dataset.title;
      document.getElementById("pmNum").textContent = card.dataset.num;
      document.getElementById("pmTitle").textContent = card.dataset.title;
      document.getElementById("pmDesc").textContent = card.dataset.desc;
      document.getElementById("pmDetails").textContent = card.dataset.details;
      const img = document.getElementById("pmImg");
      img.classList.toggle("logo-view", card.dataset.kind === "logo");
      const repo = document.getElementById("pmRepo");
      repo.style.display = card.dataset.repo ? "" : "none";
      repo.href = card.dataset.repo || "#";
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
    }
    if (dlg) {
      document.querySelectorAll(".project, .exp").forEach(card => {
        card.addEventListener("dblclick", () => openProject(card));
        let lastTap = 0;
        card.addEventListener("pointerup", e => {
          if (e.pointerType !== "touch") return;
          const now = Date.now();
          if (now - lastTap < 350) { lastTap = 0; openProject(card); }
          else lastTap = now;
        });
        card.addEventListener("keydown", e => { if (e.key === "Enter") openProject(card); });
      });
      document.getElementById("pmClose").addEventListener("click", () => dlg.close());
      dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
    }

    /* 6. Cursor glow + hero depth parallax */

    const stage = document.getElementById("stage");
    const layers = [...document.querySelectorAll(".layer")];
    window.addEventListener("pointermove", e => {

    }, { passive: true });

    /* 7. 3D tilt helper */
    function tilt(el, max, glareEl) {
      el.addEventListener("pointermove", e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        el.style.setProperty("--ry", ((x - 0.5) * max * 2).toFixed(2) + "deg");
        el.style.setProperty("--rx", ((0.5 - y) * max * 2).toFixed(2) + "deg");
        if (glareEl) {
          glareEl.style.setProperty("--gx", (x * 100) + "%");
          glareEl.style.setProperty("--gy", (y * 100) + "%");
          glareEl.style.setProperty("--go", 1);
        }
        if (el === stage) {
          const dx = x - 0.5, dy = y - 0.5;
          layers.forEach(l => {
            const d = +l.dataset.depth;
            l.style.transform = `translate3d(${(-dx * d).toFixed(1)}px, ${(-dy * d).toFixed(1)}px, ${d}px)`;
          });
        }
      });
      el.addEventListener("pointerleave", () => {
        el.style.setProperty("--rx", "0deg");
        el.style.setProperty("--ry", "0deg");
        if (glareEl) glareEl.style.setProperty("--go", 0);
        if (el === stage) layers.forEach(l => { l.style.transform = ""; });
      });
    }
    tilt(stage, 9, document.getElementById("glare"));
    document.querySelectorAll(".project").forEach(p => tilt(p, 6));

    /* 8. Light that follows the pointer on every glass panel */
    document.querySelectorAll(".glass").forEach(g => {
      g.addEventListener("pointermove", e => {
        const r = g.getBoundingClientRect();
        g.style.setProperty("--mx", (e.clientX - r.left) + "px");
        g.style.setProperty("--my", (e.clientY - r.top) + "px");
        g.style.setProperty("--mo", 1);
      });
      g.addEventListener("pointerleave", () => g.style.setProperty("--mo", 0));
    });

    /* 9. Magnetic primary buttons */
    document.querySelectorAll(".btn-primary, .big-mail").forEach(b => {
      b.addEventListener("pointermove", e => {
        const r = b.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.22;
        const y = (e.clientY - r.top - r.height / 2) * 0.22;
        b.style.transform = `translate(${x}px, ${y}px)`;
      });
      b.addEventListener("pointerleave", () => { b.style.transform = ""; });
    });
  })();
