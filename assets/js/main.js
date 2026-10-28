/* Jabreel Real Estate – interactions. No dependencies. */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const touch = matchMedia("(hover: none)").matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- load curtain + page transitions ---------- */
  let loaded = false;
  const markLoaded = () => { if (!loaded) { loaded = true; root.classList.add("is-loaded"); } };
  addEventListener("load", () => setTimeout(markLoaded, 250));
  setTimeout(markLoaded, 2500); // never hold the page hostage to a slow image
  if (document.readyState === "complete") setTimeout(markLoaded, 250);
  addEventListener("pageshow", (e) => { if (e.persisted) { root.classList.remove("is-leaving"); markLoaded(); } });

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const href = a.getAttribute("href");
    if (a.target === "_blank" || !href || href.startsWith("#") || /^(mailto|tel|https?):/.test(href)) return;
    const url = new URL(a.href, location.href);
    if (url.pathname === location.pathname && url.hash) return;
    if (reduce) return;
    e.preventDefault();
    root.classList.add("is-leaving");
    setTimeout(() => { location.href = a.href; }, 560);
  });

  /* ---------- compact bar ---------- */
  const bar = $("[data-bar]");
  const hero = $(".hero");
  const onScrollBar = () => {
    if (!bar) return;
    const limit = hero ? hero.offsetHeight * 0.75 : 200;
    bar.classList.toggle("is-shown", scrollY > limit);
  };

  /* ---------- menu ---------- */
  const menu = $("#menu");
  const burgers = $$(".burger");
  const setMenu = (open) => {
    if (!menu) return;
    if (open) { menu.hidden = false; requestAnimationFrame(() => menu.classList.add("is-open")); }
    else { menu.classList.remove("is-open"); setTimeout(() => { if (!menu.classList.contains("is-open")) menu.hidden = true; }, 800); }
    burgers.forEach((b) => b.setAttribute("aria-expanded", String(open)));
    document.body.style.overflow = open ? "hidden" : "";
    if (open) setTimeout(() => $(".menu__close")?.focus(), 50);
  };
  burgers.forEach((b) => b.addEventListener("click", () => setMenu(true)));
  $(".menu__close")?.addEventListener("click", () => setMenu(false));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && menu?.classList.contains("is-open")) setMenu(false); });

  /* ---------- wordmark: split + fit to width ---------- */
  $$("[data-wordmark]").forEach((el) => {
    const text = el.dataset.wordmark;
    el.setAttribute("aria-label", text);
    el.innerHTML = [...text].map((c, i) => `<span class="ch" aria-hidden="true"><span style="--i:${i}">${c}</span></span>`).join("") + (el.dataset.sub ? `<span class="wordmark__sub" aria-hidden="true">${el.dataset.sub}</span>` : "");
    const fit = () => {
      el.style.fontSize = "";
      const target = el.parentElement.clientWidth - parseFloat(getComputedStyle(el.parentElement).paddingLeft) * 2;
      const chars = $$(".ch", el);
      const w = chars.reduce((s, c) => s + c.getBoundingClientRect().width, 0);
      if (w > 0) {
        const fs = parseFloat(getComputedStyle(el).fontSize);
        el.style.fontSize = `${Math.min(fs * (target * 0.985) / w, 340)}px`;
      }
    };
    document.fonts?.ready.then(fit);
    fit();
    addEventListener("resize", fit);
  });

  /* ---------- split headings into lines ---------- */
  const splitLines = (el) => {
    const units = [];
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach((t) => {
            if (!t) return;
            if (/^\s+$/.test(t)) { units.push(document.createTextNode(" ")); return; }
            const s = document.createElement("span"); s.className = "wd"; s.textContent = t; units.push(s);
          });
        } else if (n.nodeName === "BR") {
          units.push("BR");
        } else {
          const c = n.cloneNode(true); c.classList?.add("wd"); units.push(c);
        }
      });
    };
    walk(el);
    el.textContent = "";
    units.forEach((u) => el.append(u === "BR" ? document.createElement("br") : u));
    const lines = [];
    let top = null;
    let cur = null;
    [...el.childNodes].forEach((n) => {
      if (n.nodeName === "BR") { cur = null; top = null; return; }
      if (n.nodeType === 3) { if (cur) cur.push(n); return; }
      const t = n.offsetTop;
      if (cur === null || Math.abs(t - top) > 4) { cur = [n]; lines.push(cur); top = t; } else cur.push(n);
    });
    el.textContent = "";
    lines.forEach((ln, i) => {
      const outer = document.createElement("span"); outer.className = "line";
      const inner = document.createElement("span"); inner.style.setProperty("--l", i);
      while (ln.length && ln[ln.length - 1].nodeType === 3) ln.pop();
      ln.forEach((n) => inner.append(n));
      outer.append(inner); el.append(outer);
    });
  };
  const lineEls = $$("[data-lines]");
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => lineEls.forEach(splitLines)).then(() => lineEls.forEach((el) => io.observe(el)));

  /* ---------- scroll-lit statement ---------- */
  const statements = $$("[data-light]").map((el) => {
    const words = [];
    const walk = (node) => [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((t) => {
          if (!t) return;
          if (/^\s+$/.test(t)) frag.append(t);
          else { const s = document.createElement("span"); s.className = "w"; s.textContent = t; words.push(s); frag.append(s); }
        });
        n.replaceWith(frag);
      } else walk(n);
    });
    walk(el);
    return { el, words };
  });
  const onScrollLight = () => statements.forEach(({ el, words }) => {
    const r = el.getBoundingClientRect();
    const p = clamp((innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35), 0, 1);
    const n = Math.round(p * words.length);
    words.forEach((w, i) => w.classList.toggle("is-lit", i < n));
  });

  /* ---------- reveal observer ---------- */
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
  }), { rootMargin: "0px 0px -12% 0px", threshold: 0.01 });
  $$("[data-reveal], [data-clip], .zmap, .chart, .scale, [data-count]").forEach((el) => io.observe(el));

  /* ---------- counters ---------- */
  const countIO = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    countIO.unobserve(en.target);
    const el = en.target;
    const end = parseFloat(el.dataset.count);
    const dur = reduce ? 0 : 1800;
    const t0 = performance.now();
    const fmt = (v) => Math.round(v).toLocaleString("en-US");
    const tick = (t) => {
      const p = dur ? clamp((t - t0) / dur, 0, 1) : 1;
      el.textContent = fmt(end * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { threshold: 0.6 });
  $$("[data-count]").forEach((el) => countIO.observe(el));

  /* ---------- parallax ---------- */
  const para = $$("[data-parallax]");
  const onScrollPara = () => {
    if (reduce) return;
    para.forEach((el) => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const k = parseFloat(el.dataset.parallax) || 0.1;
      const off = (r.top + r.height / 2 - innerHeight / 2) * -k;
      el.style.transform = `translate3d(0, ${off.toFixed(1)}px, 0)`;
    });
  };

  /* ---------- touch: mirror hover on cards crossing the middle ---------- */
  const inviewEls = touch ? $$(".svc, .acard, .rail__item, .lcard, .feat, .fcard, .person, .gallery a, .ccard, .unit, .mapsec__list a, .step, .next, .near div, .value") : [];
  // Only what sits on the screen's vertical centre line lights up: the closest row to the line,
  // and within that row the card under the horizontal centre when there is one (e.g. the rail).
  const onScrollInview = () => {
    if (!inviewEls.length) return;
    const my = innerHeight / 2, mx = innerWidth / 2, reach = innerHeight * 0.18;
    let best = Infinity;
    const rows = inviewEls.map((el) => {
      const r = el.getBoundingClientRect();
      const onX = r.right > 0 && r.left < innerWidth && r.width > 0;
      const d = !onX ? Infinity : r.top <= my && r.bottom >= my ? 0 : Math.min(Math.abs(r.top - my), Math.abs(r.bottom - my));
      if (d < best) best = d;
      return { el, r, d };
    });
    let on = best <= reach ? rows.filter((o) => o.d <= best + 2) : [];
    const atX = on.filter((o) => o.r.left <= mx && o.r.right >= mx);
    if (atX.length) on = atX;
    inviewEls.forEach((el) => el.classList.toggle("is-inview", on.some((o) => o.el === el)));
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onScrollBar(); onScrollLight(); onScrollPara(); onScrollInview(); ticking = false; });
  };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  if (touch) $$(".rail__track").forEach((t) => t.addEventListener("scroll", onScroll, { passive: true }));
  onScroll();

  /* ---------- magnetic buttons ---------- */
  if (!touch && !reduce) $$("[data-magnetic]").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.22}px, ${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
    });
    el.addEventListener("mouseleave", () => { el.style.transform = ""; });
  });

  /* ---------- rail: drag, progress, cursor ---------- */
  const cursor = $(".cursor");
  $$("[data-rail]").forEach((rail) => {
    const track = $(".rail__track", rail);
    const bar = $(".rail__progress span", rail);
    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      const vis = track.clientWidth / track.scrollWidth;
      const p = max > 0 ? track.scrollLeft / max : 0;
      bar.style.width = `${(vis + (1 - vis) * p) * 100}%`;
    };
    track.addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    update();
    let down = false, sx = 0, sl = 0, moved = false;
    track.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse") return;
      down = true; moved = false; sx = e.clientX; sl = track.scrollLeft;
    });
    addEventListener("pointermove", (e) => {
      if (cursor && !touch) { cursor.style.left = `${e.clientX}px`; cursor.style.top = `${e.clientY}px`; }
      if (!down) return;
      const dx = e.clientX - sx;
      if (Math.abs(dx) > 4) { moved = true; track.classList.add("is-drag"); }
      track.scrollLeft = sl - dx;
    });
    addEventListener("pointerup", () => {
      if (!down) return;
      down = false;
      track.classList.remove("is-drag");
      if (moved) {
        const items = $$(".rail__item", track);
        const w = items[0].offsetWidth + parseFloat(getComputedStyle(track).columnGap || 0);
        track.scrollTo({ left: Math.round(track.scrollLeft / w) * w, behavior: "smooth" });
      }
    });
    track.addEventListener("click", (e) => { if (moved) { e.preventDefault(); moved = false; } }, true);
    if (cursor && !touch) {
      track.addEventListener("mouseenter", () => cursor.classList.add("is-on"));
      track.addEventListener("mouseleave", () => cursor.classList.remove("is-on"));
    }
  });

  /* ---------- finder (hero pill search) ---------- */
  const finder = $("[data-finder]");
  if (finder) {
    const fields = $$(".finder__field", finder);
    const closeAll = (except) => fields.forEach((f) => {
      if (f === except) return;
      $(".finder__pop", f).classList.remove("is-open");
      $(".finder__btn", f).setAttribute("aria-expanded", "false");
    });
    fields.forEach((f) => {
      const btn = $(".finder__btn", f);
      const pop = $(".finder__pop", f);
      btn.addEventListener("click", () => {
        const open = !pop.classList.contains("is-open");
        closeAll(f);
        pop.classList.toggle("is-open", open);
        btn.setAttribute("aria-expanded", String(open));
        if (open) $("button", pop)?.focus();
      });
      $$("button", pop).forEach((opt) => opt.addEventListener("click", () => {
        $$("button", pop).forEach((o) => o.setAttribute("aria-selected", "false"));
        opt.setAttribute("aria-selected", "true");
        f.dataset.value = opt.dataset.value;
        $(".val", btn).textContent = opt.dataset.label || opt.firstChild.textContent.trim();
        btn.classList.toggle("has-val", !!opt.dataset.value);
        pop.classList.remove("is-open");
        btn.setAttribute("aria-expanded", "false");
        btn.focus();
      }));
    });
    document.addEventListener("click", (e) => { if (!finder.contains(e.target)) closeAll(); });
    finder.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAll(); });
    finder.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = new URLSearchParams();
      fields.forEach((f) => { if (f.dataset.value) q.set(f.dataset.key, f.dataset.value); });
      root.classList.add("is-leaving");
      setTimeout(() => { location.href = `developments.html${q.toString() ? "?" + q : ""}#all`; }, reduce ? 0 : 560);
    });
  }

  /* ---------- developments filter ---------- */
  const listing = $("[data-listing]");
  if (listing) {
    const cards = $$(".lcard", listing);
    const btns = $$("[data-filter]");
    const empty = $(".empty");
    const params = new URLSearchParams(location.search);
    const state = { loc: params.get("loc") || "", type: params.get("type") || "", budget: params.get("budget") || "" };
    const apply = () => {
      let shown = 0;
      cards.forEach((c) => {
        const ok = (!state.loc || c.dataset.loc === state.loc)
          && (!state.type || c.dataset.type.split(" ").includes(state.type))
          && (!state.budget || c.dataset.budget.split(" ").includes(state.budget));
        c.classList.toggle("is-hidden", !ok);
        if (ok) shown++;
      });
      btns.forEach((b) => b.setAttribute("aria-pressed", String(state[b.dataset.filter] === b.dataset.value)));
      empty?.classList.toggle("is-shown", shown === 0);
      const note = $("[data-filter-note]");
      if (note) note.textContent = `${shown} of ${cards.length} developments`;
    };
    btns.forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.filter;
      state[k] = state[k] === b.dataset.value ? "" : b.dataset.value;
      if (k === "all") { state.loc = state.type = state.budget = ""; }
      const q = new URLSearchParams(Object.entries(state).filter(([, v]) => v));
      history.replaceState(null, "", `${location.pathname}${q.toString() ? "?" + q : ""}#all`);
      apply();
    }));
    apply();
  }

  /* ---------- map ---------- */
  $$("[data-map]").forEach((sec) => {
    const tip = $(".mapsec__tip", sec);
    const pins = $$(".zmap-pin", sec);
    const links = $$("[data-pin-link]", sec);
    const wrap = $(".mapsec__map", sec);
    const svg = $(".zmap", sec);
    const focus = sec.dataset.focus;
    const show = (id) => {
      pins.forEach((p) => p.classList.toggle("is-active", p.dataset.pin === id));
      links.forEach((l) => l.classList.toggle("is-active", l.dataset.pinLink === id));
      const pin = pins.find((p) => p.dataset.pin === id);
      const link = links.find((l) => l.dataset.pinLink === id);
      if (!pin || !link || !tip) return;
      const pr = pin.getBoundingClientRect();
      const wr = wrap.getBoundingClientRect();
      let x = pr.left + pr.width / 2 - wr.left;
      x = clamp(x, 130, wr.width - 130);
      tip.style.left = `${x}px`;
      const py = pr.top + pr.height - wr.top;
      tip.style.top = `${py}px`;
      tip.classList.toggle("is-below", py < 260);
      const img = $("img", tip);
      img.src = link.dataset.img;
      img.alt = "";
      $("strong", tip).textContent = $(".t", link).textContent;
      $("span", tip).textContent = link.dataset.sub;
      tip.hidden = false;
      tip.style.animation = "none"; void tip.offsetWidth; tip.style.animation = "";
    };
    const hide = () => {
      if (focus) { show(focus); return; }
      tip.hidden = true;
      pins.forEach((p) => p.classList.remove("is-active"));
      links.forEach((l) => l.classList.remove("is-active"));
    };
    pins.forEach((p) => {
      if (focus && p.dataset.pin === focus) p.classList.add("is-focus");
      p.addEventListener("mouseenter", () => show(p.dataset.pin));
      p.addEventListener("focus", () => show(p.dataset.pin));
      p.addEventListener("mouseleave", hide);
      p.addEventListener("blur", hide);
      const go = () => { const l = links.find((l) => l.dataset.pinLink === p.dataset.pin); if (l) l.click(); };
      p.addEventListener("click", go);
      p.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    });
    links.forEach((l) => {
      l.addEventListener("mouseenter", () => show(l.dataset.pinLink));
      l.addEventListener("focus", () => show(l.dataset.pinLink));
      l.addEventListener("mouseleave", hide);
      l.addEventListener("blur", hide);
    });
    if (focus) {
      const mo = new IntersectionObserver((en) => { if (en[0].isIntersecting) { setTimeout(() => show(focus), 900); mo.disconnect(); } }, { threshold: 0.4 });
      mo.observe(svg);
      addEventListener("resize", () => show(focus));
    }
  });

  /* ---------- bar chart (single series) ---------- */
  $$("[data-bars]").forEach((box) => {
    const data = JSON.parse(box.dataset.bars);
    const unit = box.dataset.unit || "";
    const W = 640, H = 300, P = { l: 56, r: 8, t: 30, b: 34 };
    const max = Math.ceil(Math.max(...data.map((d) => d.v)) / 5000) * 5000;
    const iw = W - P.l - P.r, ih = H - P.t - P.b;
    const bw = iw / data.length;
    const ticks = [0, max / 4, max / 2, (max * 3) / 4, max];
    const y = (v) => P.t + ih - (v / max) * ih;
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${box.dataset.label}">`;
    s += `<g class="grid">${ticks.map((t) => `<line x1="${P.l}" x2="${W - P.r}" y1="${y(t)}" y2="${y(t)}"/>`).join("")}</g>`;
    s += `<g class="axis">${ticks.map((t) => `<text x="${P.l - 10}" y="${y(t) + 4}" text-anchor="end">$${(t / 1000).toFixed(t % 1000 ? 1 : 0)}k</text>`).join("")}`;
    s += data.map((d, i) => `<text x="${P.l + bw * i + bw / 2}" y="${H - 10}" text-anchor="middle">${d.k}</text>`).join("") + "</g>";
    // bar outline with 4px rounded data-end, anchored to the baseline; k = grow progress 0..1
    const barPath = (i, k) => {
      const x = P.l + bw * i + bw * 0.18, w = bw * 0.64;
      const h = Math.max((data[i].v / max) * ih * k, 0.01);
      const r = Math.min(4, w / 2, h);
      const top = P.t + ih - h;
      return `M${x},${P.t + ih}V${top + r}q0,-${r} ${r},-${r}h${w - 2 * r}q${r},0 ${r},${r}V${P.t + ih}z`;
    };
    s += data.map((d, i) => `<g class="cbar-g" data-i="${i}"><rect x="${P.l + bw * i}" y="${P.t}" width="${bw}" height="${ih}" fill="transparent"/><path class="cbar" d="${barPath(i, reduce ? 1 : 0)}"/></g>`).join("");
    const ends = [0, data.length - 1];
    s += ends.map((i) => `<text class="val" x="${P.l + bw * i + bw / 2}" y="${y(data[i].v) - 10}" text-anchor="middle">$${data[i].v.toLocaleString("en-US")}</text>`).join("");
    s += "</svg>";
    box.innerHTML = s + `<div class="chart__tip" role="status"></div>`;
    if (!reduce) {
      const grow = new IntersectionObserver((en) => {
        if (!en[0].isIntersecting) return;
        grow.disconnect();
        const t0 = performance.now();
        const paths = $$(".cbar", box);
        const step = (t) => {
          let done = true;
          paths.forEach((p, i) => {
            const k = clamp((t - t0 - i * 90) / 1100, 0, 1);
            if (k < 1) done = false;
            p.setAttribute("d", barPath(i, 1 - Math.pow(1 - k, 4)));
          });
          if (!done) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }, { threshold: 0.4 });
      grow.observe(box);
    }
    const tipEl = $(".chart__tip", box);
    const svgEl = $("svg", box);
    $$(".cbar-g", box).forEach((g) => {
      const i = +g.dataset.i;
      const on = () => {
        $$(".cbar", box).forEach((b, j) => b.classList.toggle("is-on", j === i));
        const r = svgEl.getBoundingClientRect(), br = box.getBoundingClientRect();
        tipEl.innerHTML = `<strong>${data[i].k}</strong> · $${data[i].v.toLocaleString("en-US")}${unit}`;
        tipEl.style.left = `${((P.l + bw * i + bw / 2) / W) * r.width + r.left - br.left}px`;
        tipEl.style.top = `${(y(data[i].v) / H) * r.height + r.top - br.top}px`;
        tipEl.classList.add("is-on");
      };
      g.addEventListener("mouseenter", on);
      g.addEventListener("mouseleave", () => { tipEl.classList.remove("is-on"); $$(".cbar", box).forEach((b) => b.classList.remove("is-on")); });
    });
  });

  /* ---------- donut ---------- */
  $$("[data-donut]").forEach((box) => {
    const data = JSON.parse(box.dataset.donut);
    const total = data.reduce((s, d) => s + d.v, 0);
    const R = 120, C = 2 * Math.PI * R, gap = 6;
    let acc = 0;
    let s = `<svg viewBox="0 0 320 320" role="img" aria-label="${box.dataset.label}"><g transform="translate(160 160) rotate(-90)">`;
    const labels = [];
    data.forEach((d, i) => {
      const len = (d.v / total) * C - gap;
      s += `<circle class="seg" r="${R}" stroke="${d.c}" stroke-dasharray="${len} ${C}" stroke-dashoffset="${len}" data-off="${-acc}"><title>${d.k}: ${d.v} homes</title></circle>`;
      const mid = ((acc + (d.v / total) * C / 2) / C) * Math.PI * 2;
      labels.push({ x: Math.cos(mid - Math.PI / 2) * (R + 0), y: Math.sin(mid - Math.PI / 2) * R, v: d.v });
      acc += (d.v / total) * C;
    });
    s += `</g><text class="center-n" x="160" y="168" text-anchor="middle">${total}</text><text class="center-l" x="160" y="194" text-anchor="middle">homes in total</text>`;
    labels.forEach((l) => { s += `<g transform="translate(${160 + l.x} ${160 + l.y})"><circle r="17" fill="#fff"/><text class="dl" text-anchor="middle" y="5">${l.v}</text></g>`; });
    s += "</svg>";
    box.innerHTML = s;
    const run = () => $$(".seg", box).forEach((c) => { c.style.strokeDashoffset = c.dataset.off; });
    const o = new IntersectionObserver((en) => { if (en[0].isIntersecting) { setTimeout(run, 150); o.disconnect(); } }, { threshold: 0.4 });
    o.observe(box);
  });

  /* ---------- scale grid (hectares) ---------- */
  $$("[data-scale]").forEach((box) => {
    const n = +box.dataset.scale;
    const hl = +box.dataset.hl || 0;
    box.innerHTML = Array.from({ length: n }, (_, i) => `<i style="--i:${i % 300}"${i < hl ? ' class="hl"' : ""}></i>`).join("");
  });

  /* ---------- calculator ---------- */
  $$("[data-calc]").forEach((box) => {
    const range = $("input", box);
    const out = $("output", box);
    const size = $("[data-size]", box);
    const rate = +box.dataset.calc;
    const upd = () => {
      const v = +range.value;
      out.textContent = `$${(v * rate).toLocaleString("en-US")}`;
      size.textContent = `${v} m²`;
      range.style.setProperty("--p", `${((v - range.min) / (range.max - range.min)) * 100}%`);
    };
    range.addEventListener("input", upd);
    upd();
  });

  /* ---------- lightbox ---------- */
  const lb = $(".lightbox");
  const galleries = $$(".gallery");
  if (lb && galleries.length) {
    let items = [], idx = 0, last = null;
    const img = $("img", lb), cap = $("figcaption", lb);
    const show = (i) => {
      idx = (i + items.length) % items.length;
      const a = items[idx];
      img.src = a.href;
      img.alt = $("img", a).alt;
      cap.textContent = `${idx + 1} / ${items.length} · ${$("img", a).alt}`;
      img.style.animation = "none"; void img.offsetWidth; img.style.animation = "";
    };
    const close = () => { lb.hidden = true; document.body.style.overflow = ""; last?.focus(); };
    galleries.forEach((g) => $$("a", g).forEach((a) => a.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      items = $$("a", g); last = a;
      lb.hidden = false; document.body.style.overflow = "hidden";
      show(items.indexOf(a));
      $(".lightbox__close", lb).focus();
    })));
    $(".lightbox__close", lb).addEventListener("click", close);
    $(".lightbox__nav--prev", lb).addEventListener("click", () => show(idx - 1));
    $(".lightbox__nav--next", lb).addEventListener("click", () => show(idx + 1));
    lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
    addEventListener("keydown", (e) => {
      if (lb.hidden) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(idx - 1);
      if (e.key === "ArrowRight") show(idx + 1);
    });
  }

  /* ---------- enquiry forms → email or WhatsApp ---------- */
  $$("[data-enquiry]").forEach((form) => {
    const status = $(".form__status", form);
    const compose = () => {
      const fd = new FormData(form);
      const lines = [];
      for (const [k, v] of fd) if (String(v).trim()) lines.push(`${k}: ${v}`);
      return lines.join("\n");
    };
    const valid = () => {
      if (form.reportValidity()) return true;
      status.textContent = "Please fill in the highlighted fields.";
      return false;
    };
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!valid()) return;
      const subject = `Enquiry: ${form.dataset.enquiry}`;
      location.href = `mailto:property@jabreel.co.zw?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(compose())}`;
      status.textContent = "Your email app should open with the message ready to send.";
    });
    $("[data-wa]", form)?.addEventListener("click", () => {
      if (!valid()) return;
      window.open(`https://wa.me/263789586986?text=${encodeURIComponent(`Hello Jabreel, an enquiry about ${form.dataset.enquiry}:\n\n${compose()}`)}`, "_blank", "noopener");
      status.textContent = "WhatsApp opened in a new tab.";
    });
  });

  /* ---------- misc ---------- */
  $$("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });
  $$("[data-top]").forEach((b) => b.addEventListener("click", () => scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" })));
})();
