(function () {
  "use strict";

  // ---------------------------------------------------------------- nav toggle --
  var toggle = document.querySelector(".navtoggle");
  var links = document.querySelector(".sitenav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      toggle.classList.toggle("open");
      links.classList.toggle("open");
    });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        toggle.classList.remove("open");
        links.classList.remove("open");
      });
    });
  }

  // ----------------------------------------------------------- reading progress --
  var bar = document.getElementById("progress");
  if (bar) {
    var onScroll = function () {
      var h = document.documentElement;
      var scrollable = h.scrollHeight - h.clientHeight;
      var pct = scrollable > 0 ? (h.scrollTop / scrollable) * 100 : 0;
      bar.style.width = pct + "%";
    };
    document.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // ------------------------------------------------------------- scroll reveal --
  // Anything already inside (or just below) the first viewport on load is
  // marked in-view immediately -- only content the reader will actually
  // scroll to fades in, so there is never a flash of invisible above-the-fold
  // content while IntersectionObserver's async first callback is pending.
  var revealables = document.querySelectorAll("figure.photo, .gallery-cell");
  var already = [];
  var pending = [];
  revealables.forEach(function (el) {
    var r = el.getBoundingClientRect();
    if (r.top < window.innerHeight + 200) already.push(el); else pending.push(el);
  });
  already.forEach(function (el) { el.classList.add("in-view"); });

  if ("IntersectionObserver" in window && pending.length) {
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

  // ------------------------------------------------------------------ lightbox --
  var lb = document.getElementById("lightbox");
  if (!lb) return;
  var lbImg = lb.querySelector("img");
  var lbCap = lb.querySelector(".lb-cap");
  var lbPrev = lb.querySelector(".lb-prev");
  var lbNext = lb.querySelector(".lb-next");
  var group = [];
  var idx = 0;

  function collectGroup(el) {
    var container = el.closest(".gallery-grid");
    if (!container) return [el];
    return Array.prototype.slice.call(container.querySelectorAll("[data-full]"));
  }

  function show(i) {
    idx = (i + group.length) % group.length;
    var el = group[idx];
    lbImg.src = el.getAttribute("data-full");
    var cap = el.getAttribute("data-caption") || "";
    lbCap.innerHTML = cap; // caption may carry inline <i> (e.g. a source credit), trusted own-site content
    lbCap.style.display = cap ? "block" : "none";
    var multi = group.length > 1;
    lbPrev.style.display = multi ? "flex" : "none";
    lbNext.style.display = multi ? "flex" : "none";
  }

  function openFrom(el) {
    group = collectGroup(el);
    idx = group.indexOf(el);
    if (idx < 0) { group = [el]; idx = 0; }
    show(idx);
    lb.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function close() {
    lb.classList.remove("open");
    document.body.style.overflow = "";
  }

  document.querySelectorAll("[data-full]").forEach(function (el) {
    el.addEventListener("click", function () { openFrom(el); });
  });
  lb.querySelector(".lb-close").addEventListener("click", close);
  lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
  lbPrev.addEventListener("click", function () { show(idx - 1); });
  lbNext.addEventListener("click", function () { show(idx + 1); });
  document.addEventListener("keydown", function (e) {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") show(idx - 1);
    if (e.key === "ArrowRight") show(idx + 1);
  });
})();
