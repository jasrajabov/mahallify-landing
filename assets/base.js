/* mahallify — shared shell behaviour: nav state, mobile menu, scroll reveals. */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── nav: solidify once scrolled ─────────────────────────────────────── */
  var nav = document.getElementById("nav");
  if (nav) {
    var stick = function () {
      nav.classList.toggle("is-stuck", window.scrollY > 12);
    };
    stick();
    window.addEventListener("scroll", stick, { passive: true });
  }

  /* ── mobile menu ─────────────────────────────────────────────────────── */
  var burger = document.getElementById("navBurger");
  var menu = document.getElementById("navMenu");

  if (burger && menu) {
    var lastFocus = null;

    var focusables = function () {
      return menu.querySelectorAll("a[href], button:not([disabled])");
    };

    var setMenu = function (open) {
      burger.setAttribute("aria-expanded", String(open));
      menu.classList.toggle("is-open", open);
      menu.setAttribute("aria-hidden", String(!open));
      document.body.classList.toggle("is-locked", open);
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");

      if (open) {
        lastFocus = document.activeElement;
        // Flush styles first: focus() is a no-op while the overlay is still
        // computed as visibility:hidden.
        void menu.offsetHeight;
        var first = focusables()[0];
        if (first) first.focus();
      } else if (lastFocus) {
        lastFocus.focus();
        lastFocus = null;
      }
    };

    setMenu(false);

    burger.addEventListener("click", function () {
      setMenu(burger.getAttribute("aria-expanded") !== "true");
    });

    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });

    document.addEventListener("keydown", function (e) {
      if (burger.getAttribute("aria-expanded") !== "true") return;

      if (e.key === "Escape") {
        e.preventDefault();
        setMenu(false);
        return;
      }

      if (e.key !== "Tab") return;

      // Keep focus inside the overlay while it is open.
      var items = focusables();
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    // A resize past the breakpoint should not leave the page scroll-locked.
    window.addEventListener("resize", function () {
      if (window.innerWidth > 900 && menu.classList.contains("is-open")) {
        setMenu(false);
      }
    });
  }

  /* ── reveal on scroll ────────────────────────────────────────────────── */
  var revealables = document.querySelectorAll(".reveal");

  if (reduce || !("IntersectionObserver" in window)) {
    revealables.forEach(function (el) {
      el.classList.add("in");
    });
  } else {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          var index = Array.prototype.indexOf.call(
            el.parentElement.children,
            el
          );
          el.style.transitionDelay = Math.min(index, 6) * 70 + "ms";
          el.classList.add("in");
          io.unobserve(el);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.1 }
    );
    revealables.forEach(function (el) {
      io.observe(el);
    });
  }
})();
