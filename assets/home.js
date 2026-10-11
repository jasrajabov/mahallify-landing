/* mahallify — homepage behaviour: counters, hero tilt, pillar tabs, dock. */
document.addEventListener("DOMContentLoaded", function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── animated stat counters ─────────────────────────────────── */
  var counters = document.querySelectorAll(".count");
  if (reduce || !("IntersectionObserver" in window)) {
    counters.forEach(function (el) {
      el.textContent = el.dataset.to;
    });
  } else {
    var run = function (el) {
      var target = +el.dataset.to;
      var start = null;
      var tick = function (ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / 1200, 1);
        el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    var cio = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          run(e.target);
          cio.unobserve(e.target);
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach(function (el) {
      cio.observe(el);
    });
  }

  /* ── hero: pointer tilt on the phone cluster ────────────────── */
  var cluster = document.getElementById("cluster");
  var stage = document.getElementById("clusterStage");
  if (cluster && stage && !reduce && matchMedia("(pointer: fine)").matches) {
    cluster.addEventListener("pointermove", function (e) {
      var r = cluster.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      stage.style.setProperty("--ry", (x * 13).toFixed(2) + "deg");
      stage.style.setProperty("--rx", (-y * 9).toFixed(2) + "deg");
    });
    cluster.addEventListener("pointerleave", function () {
      stage.style.setProperty("--ry", "0deg");
      stage.style.setProperty("--rx", "0deg");
    });
  }

  /* ── pillar tabs ────────────────────────────────────────────── */
  var pillars = document.querySelector(".pillars");
  if (pillars) {
    var tabs = Array.prototype.slice.call(pillars.querySelectorAll(".tab"));
    var panels = tabs.map(function (t) {
      return document.getElementById(t.getAttribute("aria-controls"));
    });

    if (reduce) pillars.classList.add("no-auto");

    var select = function (i, focus) {
      tabs.forEach(function (tab, n) {
        var on = n === i;
        tab.setAttribute("aria-selected", String(on));
        tab.tabIndex = on ? 0 : -1;
        panels[n].hidden = !on;
        panels[n].classList.toggle("is-on", on);
      });
      if (focus) tabs[i].focus();
    };

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () {
        select(i);
      });
      tab.addEventListener("keydown", function (e) {
        var step =
          e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (step) {
          e.preventDefault();
          select((i + step + tabs.length) % tabs.length, true);
        } else if (e.key === "Home") {
          e.preventDefault();
          select(0, true);
        } else if (e.key === "End") {
          e.preventDefault();
          select(tabs.length - 1, true);
        }
      });
    });

    if (!reduce) {
      // The progress bar finishing is what advances the carousel, so
      // pausing its animation (hover/focus) also pauses advancement.
      pillars.addEventListener("animationend", function (e) {
        if (e.animationName !== "fill") return;
        var current = tabs.findIndex(function (t) {
          return t.getAttribute("aria-selected") === "true";
        });
        select((current + 1) % tabs.length);
      });

      var pause = function (on) {
        pillars.classList.toggle("is-paused", on);
      };
      pillars.addEventListener("pointerenter", function () {
        pause(true);
      });
      pillars.addEventListener("pointerleave", function () {
        pause(false);
      });
      pillars.addEventListener("focusin", function () {
        pause(true);
      });
      pillars.addEventListener("focusout", function () {
        if (!pillars.contains(document.activeElement)) pause(false);
      });
    }
  }

  /* ── bento spotlight ────────────────────────────────────────── */
  document.querySelectorAll(".cell").forEach(function (cell) {
    cell.addEventListener("pointermove", function (e) {
      var r = cell.getBoundingClientRect();
      cell.style.setProperty("--mx", e.clientX - r.left + "px");
      cell.style.setProperty("--my", e.clientY - r.top + "px");
    });
  });

  /* ── gallery rail: arrows + drag ────────────────────────────── */
  var rail = document.getElementById("rail");
  if (rail) {
    var prev = document.getElementById("railPrev");
    var next = document.getElementById("railNext");

    var step = function () {
      var card = rail.querySelector(".shot");
      return card ? card.offsetWidth + 24 : 260;
    };
    var sync = function () {
      var max = rail.scrollWidth - rail.clientWidth - 2;
      prev.disabled = rail.scrollLeft <= 2;
      next.disabled = rail.scrollLeft >= max;
    };

    prev.addEventListener("click", function () {
      rail.scrollBy({ left: -step(), behavior: reduce ? "auto" : "smooth" });
    });
    next.addEventListener("click", function () {
      rail.scrollBy({ left: step(), behavior: reduce ? "auto" : "smooth" });
    });
    rail.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    sync();

    // Drag to scroll with a mouse; touch already scrolls natively.
    var down = false, startX = 0, startLeft = 0, moved = 0;
    rail.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse") return;
      down = true;
      moved = 0;
      startX = e.clientX;
      startLeft = rail.scrollLeft;
    });
    rail.addEventListener("pointermove", function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      moved += Math.abs(dx);
      if (moved > 6) rail.classList.add("is-dragging");
      rail.scrollLeft = startLeft - dx;
    });
    var release = function () {
      down = false;
      rail.classList.remove("is-dragging");
    };
    rail.addEventListener("pointerup", release);
    rail.addEventListener("pointercancel", release);
    rail.addEventListener("pointerleave", release);
  }

  /* ── sticky mobile CTA, once the hero is behind us ──────────── */
  var dock = document.getElementById("dock");
  var hero = document.querySelector(".hero");
  if (dock && hero && "IntersectionObserver" in window) {
    new IntersectionObserver(
      function (entries) {
        dock.classList.toggle("is-up", !entries[0].isIntersecting);
      },
      { threshold: 0 }
    ).observe(hero);
  }
});
