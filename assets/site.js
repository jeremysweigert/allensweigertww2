(function () {
  "use strict";

  var d = document;
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };

  // ------------------------------------------------------------ theme toggle --
  // The <head> inline script has already applied the stored choice, so the
  // page never flashes the wrong palette. This only handles the click.
  var themeBtn = $(".themetoggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var root = d.documentElement;
      var sysDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      var now = root.getAttribute("data-theme") || (sysDark ? "dark" : "light");
      var next = now === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("sweigert-theme", next); } catch (e) { /* private mode */ }
      themeBtn.setAttribute("aria-label", next === "dark" ? "Switch to light" : "Switch to dark");
    });
  }

  // ---------------------------------------------------------------- nav toggle --
  var toggle = $(".navtoggle");
  var links = $(".sitenav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = toggle.classList.toggle("open");
      links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    $$("a", links).forEach(function (a) {
      a.addEventListener("click", function () {
        toggle.classList.remove("open");
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // ----------------------------------------------------------- reading progress --
  var bar = d.getElementById("progress");
  var top = d.getElementById("totop");
  var onScroll = function () {
    var h = d.documentElement;
    var scrollable = h.scrollHeight - h.clientHeight;
    var pct = scrollable > 0 ? (h.scrollTop / scrollable) * 100 : 0;
    if (bar) bar.style.width = pct + "%";
    if (top) top.classList.toggle("show", h.scrollTop > 700);
  };
  d.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  if (top) {
    top.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // ------------------------------------------------------------- scroll reveal --
  // Anything already inside (or just below) the first viewport on load is
  // marked in-view immediately -- only content the reader will actually
  // scroll to fades in, so there is never a flash of invisible above-the-fold
  // content while IntersectionObserver's async first callback is pending.
  var revealables = $$("figure.photo, .gallery-cell");
  var already = [];
  var pending = [];
  revealables.forEach(function (el) {
    var r = el.getBoundingClientRect();
    if (r.top < window.innerHeight + 200) already.push(el); else pending.push(el);
  });
  already.forEach(function (el) { el.classList.add("in-view"); });

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    revealables.forEach(function (el) { el.classList.add("in-view"); });
  } else if ("IntersectionObserver" in window && pending.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("in-view");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -60px 0px", threshold: 0.05 }
    );
    pending.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add("in-view"); });
  }

  // ------------------------------------------------------- transcript search --
  var search = $(".t-search");
  if (search) {
    var input = $("input", search);
    var count = $(".t-count", search);
    var clear = $("button", search);
    var lines = $$(".t-line");
    var texts = lines.map(function (l) {
      var t = $(".t-text", l);
      return { line: l, el: t, html: t ? t.innerHTML : "", plain: (t ? t.textContent : "").toLowerCase() };
    });
    var hits = [];
    var at = -1;

    var esc = function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); };

    var reset = function () {
      texts.forEach(function (t) {
        if (t.el) t.el.innerHTML = t.html;
        t.line.classList.remove("t-hidden", "t-current");
      });
      hits = []; at = -1;
    };

    var run = function () {
      var q = input.value.trim();
      if (q.length < 2) {
        reset();
        count.textContent = "";
        return;
      }
      reset();
      var re = new RegExp("(" + esc(q) + ")", "gi");
      texts.forEach(function (t) {
        if (t.plain.indexOf(q.toLowerCase()) === -1) {
          t.line.classList.add("t-hidden");
          return;
        }
        hits.push(t.line);
        if (!t.el) return;
        // Highlight in text nodes only, so existing <i> markup survives intact.
        var walk = d.createTreeWalker(t.el, NodeFilter.SHOW_TEXT, null);
        var nodes = [];
        while (walk.nextNode()) nodes.push(walk.currentNode);
        nodes.forEach(function (n) {
          if (!re.test(n.nodeValue)) { re.lastIndex = 0; return; }
          re.lastIndex = 0;
          var frag = d.createDocumentFragment();
          var last = 0, m;
          while ((m = re.exec(n.nodeValue)) !== null) {
            if (m.index > last) frag.appendChild(d.createTextNode(n.nodeValue.slice(last, m.index)));
            var mk = d.createElement("mark");
            mk.textContent = m[0];
            frag.appendChild(mk);
            last = m.index + m[0].length;
            if (m[0].length === 0) re.lastIndex++;
          }
          if (last < n.nodeValue.length) frag.appendChild(d.createTextNode(n.nodeValue.slice(last)));
          n.parentNode.replaceChild(frag, n);
        });
      });
      count.textContent = hits.length
        ? hits.length + (hits.length === 1 ? " passage" : " passages")
        : "no match";
      if (hits.length) {
        at = 0;
        hits[0].classList.add("t-current");
        hits[0].scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
      }
    };

    var debounce;
    input.addEventListener("input", function () {
      clearTimeout(debounce);
      debounce = setTimeout(run, 180);
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { input.value = ""; run(); input.blur(); }
      if (e.key === "Enter" && hits.length) {
        e.preventDefault();
        hits[at] && hits[at].classList.remove("t-current");
        at = (at + (e.shiftKey ? -1 : 1) + hits.length) % hits.length;
        hits[at].classList.add("t-current");
        hits[at].scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
      }
    });
    if (clear) clear.addEventListener("click", function () { input.value = ""; run(); input.focus(); });
  }

  // ------------------------------------------------------------- video panel --
  // Nothing is requested from YouTube until the reader presses play. Until then
  // the panel is just the poster frame stored with the site, so the page reads
  // the same offline.
  $$(".videopanel .frame").forEach(function (frame) {
    var btn = $("button.play", frame);
    if (!btn) return;
    btn.addEventListener("click", function () {
      var id = frame.getAttribute("data-video");
      if (!id) return;
      var f = d.createElement("iframe");
      f.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(id) +
              "?autoplay=1&rel=0&modestbranding=1";
      f.title = "Memorial film";
      f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture";
      f.setAttribute("allowfullscreen", "");
      f.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
      var poster = $("img", frame);
      if (poster) poster.style.display = "none";
      btn.remove();
      frame.appendChild(f);
    });
  });

  // ------------------------------------------------------------------ lightbox --
  var lb = d.getElementById("lightbox");
  if (!lb) return;
  var lbImg = lb.querySelector("img");
  var lbCap = lb.querySelector(".lb-cap");
  var lbPrev = lb.querySelector(".lb-prev");
  var lbNext = lb.querySelector(".lb-next");
  var lbCount = lb.querySelector(".lb-counter");
  var group = [];
  var idx = 0;
  var lastFocus = null;

  // Grouping: a picture inside a gallery browses its own gallery; a standalone
  // plate browses every other standalone plate on the page, in document order.
  var loose = $$("[data-full]").filter(function (el) { return !el.closest(".gallery-grid"); });

  function collectGroup(el) {
    var container = el.closest(".gallery-grid");
    if (container) return $$("[data-full]", container);
    return loose.length ? loose : [el];
  }

  function preload(i) {
    var el = group[(i + group.length) % group.length];
    if (!el) return;
    var im = new Image();
    im.src = el.getAttribute("data-full");
  }

  function show(i) {
    idx = (i + group.length) % group.length;
    var el = group[idx];
    lb.classList.remove("zoomed");
    lbImg.src = el.getAttribute("data-full");
    lbImg.alt = (el.querySelector("img") && el.querySelector("img").alt) || "";
    var cap = el.getAttribute("data-caption") || "";
    lbCap.innerHTML = cap; // caption may carry inline <i> (e.g. a source credit), trusted own-site content
    lbCap.style.display = cap ? "block" : "none";
    var multi = group.length > 1;
    lbPrev.style.display = multi ? "flex" : "none";
    lbNext.style.display = multi ? "flex" : "none";
    if (lbCount) {
      lbCount.textContent = multi ? (idx + 1) + " / " + group.length : "";
      lbCount.style.display = multi ? "block" : "none";
    }
    if (multi) { preload(idx + 1); preload(idx - 1); }
  }

  function openFrom(el) {
    lastFocus = d.activeElement;
    group = collectGroup(el);
    idx = group.indexOf(el);
    if (idx < 0) { group = [el]; idx = 0; }
    show(idx);
    lb.classList.add("open");
    requestAnimationFrame(function () { lb.classList.add("shown"); });
    d.body.style.overflow = "hidden";
    var c = lb.querySelector(".lb-close");
    if (c) c.focus();
  }

  function close() {
    lb.classList.remove("shown", "zoomed");
    d.body.style.overflow = "";
    setTimeout(function () {
      lb.classList.remove("open");
      lbImg.src = "";
    }, 220);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  $$("[data-full]").forEach(function (el) {
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    el.addEventListener("click", function () { openFrom(el); });
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openFrom(el); }
    });
  });

  lb.querySelector(".lb-close").addEventListener("click", close);
  lb.addEventListener("click", function (e) {
    if (e.target === lb || e.target === lbCap) close();
  });
  lbPrev.addEventListener("click", function (e) { e.stopPropagation(); show(idx - 1); });
  lbNext.addEventListener("click", function (e) { e.stopPropagation(); show(idx + 1); });
  lbImg.addEventListener("click", function (e) {
    e.stopPropagation();
    lb.classList.toggle("zoomed");
    if (lb.classList.contains("zoomed")) lb.scrollTop = lb.scrollHeight / 4;
  });

  d.addEventListener("keydown", function (e) {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") show(idx - 1);
    if (e.key === "ArrowRight") show(idx + 1);
    if (e.key === "Home") show(0);
    if (e.key === "End") show(group.length - 1);
  });

  // swipe, for reading this on a phone
  var sx = 0, sy = 0;
  lb.addEventListener("touchstart", function (e) {
    sx = e.touches[0].clientX; sy = e.touches[0].clientY;
  }, { passive: true });
  lb.addEventListener("touchend", function (e) {
    if (lb.classList.contains("zoomed")) return;
    var dx = e.changedTouches[0].clientX - sx;
    var dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.6) show(idx + (dx < 0 ? 1 : -1));
    else if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.6) close();
  }, { passive: true });
})();
