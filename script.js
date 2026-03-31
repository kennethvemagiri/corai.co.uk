(function () {
  "use strict";

  // ─────────────────────────────────────────────────────────────────────────
  // CONFIG
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Formspree form ID — create a form at https://formspree.io and paste only
   * the ID segment (e.g. "abcxyz" from https://formspree.io/f/abcxyz).
   * Leave empty to use the mailto fallback.
   */
  const FORMSPREE_FORM_PATH = "";

  /** General enquiries and CTA form fallback address */
  const CONTACT_EMAIL = "contact@corai.co.uk";

  /**
   * OpenAI API key — set up a Cloudflare Worker proxy (recommended) and point
   * CHAT_ENDPOINT at your worker URL so the key never lives in the browser.
   * For a quick local test only, you can paste a key here temporarily.
   */
  const OPENAI_API_KEY = "";

  /**
   * Chat endpoint — either your Cloudflare Worker proxy URL or the direct
   * OpenAI endpoint (only use direct when testing locally with a restricted key).
   */
  const CHAT_ENDPOINT = "https://corai.urstrulykenneth.workers.dev/";

  /** System prompt for Corai GPT */
  const OPENAI_SYSTEM_PROMPT = `You are the Corai GPT demo assistant embedded on the Corai website. Corai Ltd is a UK-based B2B AI transformation and automation partner.

Corai's three core services:
1. Website & Digital Transformation — AI-driven UX redesigns, brand repositioning, and AI Engine Optimisation (AEO) so businesses get cited by ChatGPT, Perplexity, and Google AI.
2. Workflow & Admin Automation — bespoke AI agents that automate scheduling, invoicing, onboarding, and reporting. Many clients see a significant drop in admin load within the first 90 days, depending on scope.
3. AI-Powered Customer Experience — 24/7 chatbots trained on the client's exact business context, automated follow-ups, and CRM/booking/helpdesk integration.

Key facts: UK-based, GDPR-compliant, works especially well with regulated and high-trust sectors including healthcare. Contact: contact@corai.co.uk.

Your role: give short, practical answers tailored to the visitor's specific question. Always end with a gentle CTA directing them to the Contact section to book a discovery call, or to the Free Request form for a free pilot. Do not invent specific pricing figures. Be warm, professional, and direct. Keep every response under 80 words.`;

  // ─────────────────────────────────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────────────────────────────────

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COOKIE CONSENT
  // ─────────────────────────────────────────────────────────────────────────

  function initCookieConsent() {
    const banner = document.getElementById("cookie-banner");
    const acceptBtn = document.getElementById("cookie-accept");
    const rejectBtn = document.getElementById("cookie-reject");
    const stored = localStorage.getItem("corai-cookie-consent");

    if (stored === "accepted" || stored === "rejected") {
      if (banner) banner.hidden = true;
      return;
    }

    if (banner) banner.hidden = false;

    if (acceptBtn) {
      acceptBtn.addEventListener("click", () => {
        localStorage.setItem("corai-cookie-consent", "accepted");
        if (banner) banner.hidden = true;
      });
    }

    if (rejectBtn) {
      rejectBtn.addEventListener("click", () => {
        localStorage.setItem("corai-cookie-consent", "rejected");
        if (banner) banner.hidden = true;
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LEGAL MODALS
  // ─────────────────────────────────────────────────────────────────────────

  const MODAL_CONTENT = {
    privacy: {
      title: "Privacy Policy",
      body: `
        <h4>Who we are</h4>
        <p>Corai Ltd is a company registered in England &amp; Wales. Our registered address and company number are available on request. You can contact us at <a href="mailto:privacy@corai.co.uk">privacy@corai.co.uk</a>.</p>

        <h4>What data we collect</h4>
        <p>When you use our contact form or chat widget, we may collect your name, email address, and the content of your message. If the form is submitted through a third-party delivery service (such as Formspree), that provider processes the submission on our behalf under their privacy policy. We do not collect payment details on this website.</p>

        <h4>How we use your data</h4>
        <p>We use the information you provide solely to respond to your enquiry and to improve our services. We do not sell or share your personal data with third parties for marketing purposes.</p>

        <h4>Cookies</h4>
        <p>We use a single functional cookie (<code>corai-cookie-consent</code>) to remember your cookie preference. If you consent, we also load Google Fonts from Google's servers, which may set cookies and process your IP address under Google's privacy policy.</p>

        <h4>Your rights</h4>
        <p>Under UK GDPR you have the right to access, rectify, erase, restrict, or object to the processing of your personal data. To exercise these rights, email <a href="mailto:privacy@corai.co.uk">privacy@corai.co.uk</a>.</p>

        <h4>Complaints</h4>
        <p>You have the right to lodge a complaint with the UK Information Commissioner's Office (ICO) at <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">ico.org.uk</a>.</p>

        <h4>Contact</h4>
        <p>Privacy enquiries: <a href="mailto:privacy@corai.co.uk">privacy@corai.co.uk</a></p>
        <p>General enquiries: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
      `,
    },
    terms: {
      title: "Terms of Use",
      body: `
        <h4>Acceptance</h4>
        <p>By accessing this website you agree to these terms. If you do not agree, please do not use this site.</p>

        <h4>Intellectual property</h4>
        <p>All content on this website (including text, graphics, logos, and software) is the property of Corai Ltd and is protected by applicable intellectual property law. You may not reproduce or distribute any content without prior written consent.</p>

        <h4>Disclaimer</h4>
        <p>This website is provided on an "as is" basis. Corai Ltd makes no warranties, express or implied, regarding the accuracy or completeness of the content and accepts no liability for any loss arising from your use of this site.</p>

        <h4>External links</h4>
        <p>We may link to third-party websites. Corai Ltd is not responsible for the content or privacy practices of those sites.</p>

        <h4>Governing law</h4>
        <p>These terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>

        <h4>Contact</h4>
        <p>Legal enquiries: <a href="mailto:legal@corai.co.uk">legal@corai.co.uk</a></p>
      `,
    },
    cookies: {
      title: "Cookie Policy",
      body: `
        <h4>What are cookies?</h4>
        <p>Cookies are small text files stored on your device when you visit a website. They help the site remember your preferences.</p>

        <h4>Cookies we use</h4>
        <p><strong>Essential cookies</strong></p>
        <p><code>corai-cookie-consent</code>: stores your cookie preference (accepted / rejected). This is a strictly necessary cookie and is always set. It does not track you.</p>

        <p><strong>Optional cookies (only if you accept)</strong></p>
        <p>If you click "Accept all", we load Google Fonts from <code>fonts.googleapis.com</code>. Google may set cookies and process your IP address to serve fonts. See <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google's Privacy Policy</a> for details.</p>

        <h4>Managing cookies</h4>
        <p>You can withdraw consent at any time by clearing your browser's local storage or cookies, which will cause the consent banner to reappear on your next visit. You can also disable cookies in your browser settings.</p>

        <h4>More information</h4>
        <p>For guidance on cookies and your rights, visit the ICO at <a href="https://ico.org.uk/your-data-matters/online/cookies/" target="_blank" rel="noopener noreferrer">ico.org.uk</a>.</p>

        <h4>Contact</h4>
        <p>Cookie queries: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
      `,
    },
    accessibility: {
      title: "Accessibility Statement",
      body: `
        <h4>Our commitment</h4>
        <p>Corai Ltd is committed to making this website accessible to all users, including those with disabilities. We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 at Level AA.</p>

        <h4>What we've done</h4>
        <p>We have designed this site with semantic HTML, sufficient colour contrast, keyboard navigability, and support for screen readers. We also respect your <code>prefers-reduced-motion</code> system preference to minimise animations.</p>

        <h4>Known issues</h4>
        <p>We are continually working to improve accessibility. If you encounter any issues, please contact us so we can address them promptly.</p>

        <h4>Feedback and contact</h4>
        <p>If you experience any accessibility barriers on this site, please email us at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> and we will endeavour to respond within five working days.</p>

        <h4>Enforcement</h4>
        <p>If you are not satisfied with our response, you can contact the <a href="https://www.equalityadvisoryservice.com/" target="_blank" rel="noopener noreferrer">Equality Advisory and Support Service (EASS)</a>.</p>
      `,
    },
  };

  function initModals() {
    const overlay = document.getElementById("modal-overlay");
    const closeBtn = document.getElementById("modal-close");
    const contentEl = document.getElementById("modal-content");
    if (!overlay || !closeBtn || !contentEl) return;

    function openModal(key) {
      const data = MODAL_CONTENT[key];
      if (!data) return;
      contentEl.innerHTML = "<h2>" + escapeHtml(data.title) + "</h2>" + data.body;
      overlay.hidden = false;
      document.documentElement.classList.add("modal-open");
      document.body.classList.add("modal-open");
      closeBtn.focus();
    }

    function closeModal() {
      overlay.hidden = true;
      document.documentElement.classList.remove("modal-open");
      document.body.classList.remove("modal-open");
    }

    document.addEventListener("click", (e) => {
      const trigger = e.target.closest("[data-modal]");
      if (!trigger) return;
      e.preventDefault();
      openModal(trigger.getAttribute("data-modal"));
    });

    closeBtn.addEventListener("click", closeModal);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !overlay.hidden) closeModal();
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DATA LOADING  (features, metrics, budget bands — all driven by data.json)
  // ─────────────────────────────────────────────────────────────────────────

  function renderBudgetBands(data) {
    const radiosWrap = document.getElementById("request-budget-radios");
    if (!data.budgetBands || !Array.isArray(data.budgetBands) || !radiosWrap) return;

    radiosWrap.innerHTML = data.budgetBands
      .map((b) => {
        const checked = b.id === "unsure" ? " checked" : "";
        return `<label class="request-budget-option">
          <input type="radio" name="budget_band" value="${escapeHtml(b.id)}" data-label="${escapeHtml(b.name)}"${checked} />
          <span class="request-budget-option-text">
            <strong>${escapeHtml(b.name)}</strong>
            <span class="request-budget-option-sub">${escapeHtml(b.tagline)}</span>
          </span>
        </label>`;
      })
      .join("");
  }

  async function loadData() {
    const maxRetries = 2;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch("./data.json");
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();

        const featuresEl = document.getElementById("features-grid");
        if (featuresEl && data.features) {
          featuresEl.innerHTML = data.features
            .map((f, i) => {
              const detailAttrs =
                i === 0
                  ? ' data-feature-detail="./feature-website-digital.html" role="link" tabindex="0" aria-label="Open Website and Digital Transformation in a new browser tab"'
                  : "";
              const pointsHtml =
                f.points && f.points.length
                  ? `<ul class="feature-card-points">${f.points.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>`
                  : "";
              return `<article class="feature-card reveal"${detailAttrs}><h3>${escapeHtml(f.title)}</h3><p>${escapeHtml(f.description)}</p>${pointsHtml}</article>`;
            })
            .join("");
        }

        const metricsEl = document.getElementById("metrics-strip");
        if (metricsEl && data.metrics) {
          metricsEl.innerHTML = data.metrics
            .map(
              (m) =>
                `<div class="metric-item"><span class="metric-value">${escapeHtml(m.value)}</span><span class="metric-label">${escapeHtml(m.label)}</span></div>`
            )
            .join("");
        }

        renderBudgetBands(data);
        return;
      } catch (err) {
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 220));
        } else {
          console.warn("Could not load data.json:", err);
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ANIMATIONS
  // ─────────────────────────────────────────────────────────────────────────

  function initReveals() {
    const reveals = document.querySelectorAll(".reveal");

    if (prefersReducedMotion) {
      reveals.forEach((el) => el.classList.add("visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const delay = Math.round(
            parseInt(entry.target.getAttribute("data-delay") || "0", 10) * 0.52
          );
          setTimeout(() => entry.target.classList.add("visible"), delay);
        });
      },
      { root: null, rootMargin: "0px 0px 12% 0px", threshold: 0.04 }
    );

    reveals.forEach((el) => observer.observe(el));
  }

  function staggerFeatures() {
    if (prefersReducedMotion) return;
    document.querySelectorAll(".feature-card.reveal").forEach((card, i) => {
      card.style.transitionDelay = `${i * 42}ms`;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FEATURE CARDS
  // ─────────────────────────────────────────────────────────────────────────

  function initFeatureCardDetailWindows() {
    const grid = document.getElementById("features-grid");
    if (!grid || grid.dataset.featureDetailBound === "1") return;
    grid.dataset.featureDetailBound = "1";

    function openDetail(card) {
      const url = card.getAttribute("data-feature-detail");
      if (!url) return;
      const w = window.open(url, "_blank", "noopener,noreferrer");
      if (w) w.focus();
    }

    grid.addEventListener("click", (e) => {
      const card = e.target.closest(".feature-card[data-feature-detail]");
      if (!card) return;
      e.preventDefault();
      openDetail(card);
    });

    grid.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const card = e.target.closest(".feature-card[data-feature-detail]");
      if (!card || !grid.contains(card)) return;
      e.preventDefault();
      openDetail(card);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // NAVIGATION — mobile menu, scroll state, smooth scroll, scroll spy
  // ─────────────────────────────────────────────────────────────────────────

  const nav = document.getElementById("nav");
  const burger = document.getElementById("nav-burger");
  const navLinks = document.getElementById("nav-links");
  const navLogoLink = document.querySelector(".nav-logo-link");
  let menuScrollY = 0;

  function closeMobileMenu() {
    if (!burger || !navLinks || !navLinks.classList.contains("open")) return;
    navLinks.classList.remove("open");
    burger.classList.remove("open");
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "Open menu");
    document.documentElement.classList.remove("menu-open");
    document.body.classList.remove("menu-open", "menu-open--fixed");
    document.body.style.top = "";
    window.scrollTo(0, menuScrollY);
    requestAnimationFrame(() => {
      nav?.classList.toggle("scrolled", (window.scrollY || document.documentElement.scrollTop) > 80);
    });
  }

  function openMobileMenu() {
    if (!burger || !navLinks) return;
    menuScrollY = window.scrollY || document.documentElement.scrollTop;
    document.documentElement.classList.add("menu-open");
    document.body.classList.add("menu-open", "menu-open--fixed");
    document.body.style.top = "-" + menuScrollY + "px";
    navLinks.classList.add("open");
    burger.classList.add("open");
    burger.setAttribute("aria-expanded", "true");
    burger.setAttribute("aria-label", "Close menu");
  }

  if (burger && navLinks) {
    burger.addEventListener("click", () => {
      navLinks.classList.contains("open") ? closeMobileMenu() : openMobileMenu();
    });

    navLinks.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", closeMobileMenu);
    });

    if (navLogoLink) {
      navLogoLink.addEventListener("click", () => {
        if (navLinks.classList.contains("open")) closeMobileMenu();
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && navLinks.classList.contains("open")) {
        e.preventDefault();
        closeMobileMenu();
      }
    });

    window.addEventListener("resize", () => {
      if (window.matchMedia("(min-width: 901px)").matches) closeMobileMenu();
    }, { passive: true });
  }

  function updateNavScroll() {
    if (document.documentElement.classList.contains("menu-open")) return;
    nav?.classList.toggle(
      "scrolled",
      (window.scrollY || document.documentElement.scrollTop) > 80
    );
  }

  window.addEventListener("scroll", updateNavScroll, { passive: true });

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (href === "#") return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({
          behavior: prefersReducedMotion ? "instant" : "smooth",
          block: "start",
        });
      }
    });
  });

  if (window.location.hash) {
    const target = document.querySelector(window.location.hash);
    if (target) target.scrollIntoView({ block: "start" });
  }

  function initNavScrollSpy() {
    const sectionIds = ["slide-1", "slide-2", "slide-3", "slide-4", "slide-5"];
    const navAnchors = document.querySelectorAll(".nav-links a");
    if (!navAnchors.length) return;

    function updateActiveSpy() {
      if (document.documentElement.classList.contains("menu-open")) return;
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const threshold = scrollY + window.innerHeight * 0.35;
      let activeId = null;

      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= threshold) activeId = id;
      }

      const supportEl = document.getElementById("support");
      const supportInView =
        activeId === "slide-5" && supportEl
          ? (() => {
              const r = supportEl.getBoundingClientRect();
              return r.top >= 0 && r.top < window.innerHeight * 0.28;
            })()
          : false;

      navAnchors.forEach((a) => {
        const href = a.getAttribute("href");
        if (activeId !== "slide-5") {
          a.classList.toggle("nav-active", href === "#" + activeId);
          return;
        }
        if (href === "#slide-5") a.classList.toggle("nav-active", !supportInView);
        else if (href === "#support") a.classList.toggle("nav-active", supportInView);
        else a.classList.remove("nav-active");
      });
    }

    window.addEventListener("scroll", updateActiveSpy, { passive: true });
    updateActiveSpy();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FORMS — word/char counters, CTA form submission
  // ─────────────────────────────────────────────────────────────────────────

  function initMessageBox() {
    const textarea = document.querySelector('#cta-form textarea[name="message"]');
    const counter = document.getElementById("word-counter");
    if (!textarea) return;

    const maxWords = parseInt(textarea.getAttribute("data-max-words") || "60", 10);
    const maxChars = parseInt(textarea.getAttribute("maxlength") || "400", 10);

    function applyLimits() {
      if (textarea.value.length > maxChars) {
        textarea.value = textarea.value.slice(0, maxChars);
      }
      const words = textarea.value.trim().split(/\s+/).filter(Boolean);
      if (words.length > maxWords) {
        textarea.value = words.slice(0, maxWords).join(" ");
      }
      const count = textarea.value.trim() === "" ? 0 : words.length;
      if (counter) {
        counter.textContent = `${count} / ${maxWords} words`;
        counter.classList.toggle("near-limit", count >= maxWords * 0.8 && count < maxWords);
        counter.classList.toggle("at-limit", count >= maxWords);
      }
      textarea.style.height = "auto";
      const maxPx = parseInt(getComputedStyle(textarea).maxHeight, 10) || 160;
      textarea.style.height = Math.min(textarea.scrollHeight, maxPx) + "px";
    }

    textarea.addEventListener("input", applyLimits);
    window.addEventListener("load", applyLimits);
  }

  function initRequestFormLimits() {
    const input = document.querySelector('#request-form [name="message"]');
    if (!input) return;
    const counter = input.parentElement?.querySelector(".request-char-counter");
    const maxChars = parseInt(input.getAttribute("data-max-chars") || "180", 10);

    function applyCharLimit() {
      if (input.value.length > maxChars) input.value = input.value.slice(0, maxChars);
      if (counter) counter.textContent = `${input.value.length} / ${maxChars} characters`;
    }

    input.addEventListener("input", applyCharLimit);
    window.addEventListener("load", applyCharLimit);
    document.getElementById("request-form")?.addEventListener("reset", applyCharLimit);
  }

  function initCtaForm() {
    const forms = document.querySelectorAll(".cta-form");
    if (!forms.length) return;

    forms.forEach((ctaForm) => {
      const statusEl = ctaForm.querySelector(".cta-form-status");
      const submitBtn = ctaForm.querySelector('button[type="submit"]');

      function setStatus(message, kind) {
        if (!statusEl) return;
        statusEl.textContent = message;
        statusEl.hidden = !message;
        statusEl.className =
          "cta-form-status" +
          (kind === "ok" ? " cta-form-status--ok" : kind === "err" ? " cta-form-status--err" : " cta-form-status--info");
      }

      ctaForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name     = ctaForm.querySelector('[name="name"]')?.value.trim() ?? "";
        const business = ctaForm.querySelector('[name="business"]')?.value.trim() ?? "";
        const email    = ctaForm.querySelector('[name="email"]')?.value.trim() ?? "";
        const phone    = ctaForm.querySelector('[name="phone"]')?.value.trim() ?? "";
        const website  = ctaForm.querySelector('[name="website"]')?.value.trim() ?? "";
        const industry = ctaForm.querySelector('[name="industry"]')?.value.trim() ?? "";
        const message  = ctaForm.querySelector('[name="message"]')?.value.trim() ?? "";
        const budgetEl = ctaForm.querySelector('input[name="budget_band"]:checked');
        const budgetId    = budgetEl?.value ?? "";
        const budgetLabel = budgetEl?.getAttribute("data-label") || budgetId;
        const subject  = "Corai contact: " + (name || "Website enquiry");

        if (FORMSPREE_FORM_PATH) {
          if (submitBtn) submitBtn.disabled = true;
          setStatus("Sending…", "info");
          try {
            const res = await fetch("https://formspree.io/f/" + FORMSPREE_FORM_PATH, {
              method: "POST",
              headers: { Accept: "application/json", "Content-Type": "application/json" },
              body: JSON.stringify({
                name, business, email, phone, website, industry,
                budgetBand: budgetLabel || budgetId,
                message,
                _subject: subject,
                _replyto: email,
              }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
              setStatus("Thanks. We received your message and will reply soon.", "ok");
              ctaForm.reset();
              const wc = ctaForm.querySelector(".word-counter");
              if (wc) wc.textContent = "0 / 60 words";
            } else {
              const msg = data.errors?.map((err) => err.message).join(" ") || "";
              setStatus(msg || "Could not send. Please email " + CONTACT_EMAIL + " directly.", "err");
            }
          } catch {
            setStatus("Network error. Please email " + CONTACT_EMAIL + " directly.", "err");
          }
          if (submitBtn) submitBtn.disabled = false;
          return;
        }

        const bodyLines = [
          name     && "Name: " + name,
          business && "Business: " + business,
          email    && "Email: " + email,
          phone    && "Phone: " + phone,
          website  && "Website: " + website,
          industry && "Industry: " + industry,
          (budgetLabel || budgetId) && "Preferred budget band: " + (budgetLabel || budgetId),
          message  && "\nMessage:\n" + message,
        ].filter(Boolean).join("\n");

        const mailto =
          "mailto:" + CONTACT_EMAIL +
          "?subject=" + encodeURIComponent(subject) +
          "&body=" + encodeURIComponent(bodyLines);

        setStatus(
          "Opening your email app… If nothing happens, email " + CONTACT_EMAIL + " directly.",
          "info"
        );
        window.setTimeout(() => { window.location.href = mailto; }, 200);
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CORAI GPT CHAT
  // ─────────────────────────────────────────────────────────────────────────

  const chatHistory = [];

  async function getAIResponse(query) {
    chatHistory.push({ role: "user", content: query });

    if (!OPENAI_API_KEY) {
      const fallback = getDemoFallback(query);
      chatHistory.push({ role: "assistant", content: fallback });
      return fallback;
    }

    try {
      const res = await fetch(CHAT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + OPENAI_API_KEY,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: OPENAI_SYSTEM_PROMPT },
            ...chatHistory,
          ],
          max_tokens: 200,
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData.error?.message) || "API error " + res.status);
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content?.trim() || getDemoFallback(query);
      chatHistory.push({ role: "assistant", content: reply });
      return reply;
    } catch (err) {
      console.warn("Corai GPT error:", err.message);
      chatHistory.pop();
      return "Sorry, I had a connection issue. Please try again or reach us at " + CONTACT_EMAIL + ".";
    }
  }

  function getDemoFallback(query) {
    const q = query.toLowerCase();

    if (/lead|sales|marketing|seo|aeo/.test(q)) {
      return "In the AI era, being in search results isn't enough — you need to appear in the answers AI assistants give to customers. Corai's AI Engine Optimisation (AEO) positions your brand as the source that ChatGPT, Perplexity, and Google AI cite. Qualified leads who already trust you before the first call. Head to our Contact section to book a discovery call.";
    }
    if (/automat|workflow|process|admin|schedul|invoic/.test(q)) {
      return "Workflow automation is one of the highest-ROI investments a business can make. Corai builds bespoke AI agents that handle scheduling, invoicing, onboarding, and reporting — freeing your team to focus on growth. Many clients see a meaningful drop in admin load within the first quarter, scope-dependent. Message us in the Contact section and we'll map your first automation for free.";
    }
    if (/website|web|digital|design|brand|ux/.test(q)) {
      return "Your website is your 24/7 sales asset, and most business sites are leaving money on the table. Corai handles everything from AI-driven UX redesigns and brand repositioning to full digital transformation built to 2026 standards. Reach out via the Contact section and let's scope your project together.";
    }
    if (/healthcare|clinic|gp|nhs|medical|patient/.test(q)) {
      return "Corai works closely with clinics, GP practices, and health-tech companies to automate patient communication, appointment scheduling, and compliance reporting — fully GDPR-compliant. Book a consultation via the Contact section and let's discuss your specific needs.";
    }
    if (/chat|bot|assistant|virtual/.test(q)) {
      return "You're looking at one right now! Corai builds production-grade AI chatbots and virtual assistants that integrate with your CRM, booking system, and helpdesk — trained on your exact business context for accurate, on-brand 24/7 responses. Get in touch via the Contact section to see what a custom assistant could look like for you.";
    }
    if (/price|cost|pricing|how.much|budget/.test(q)) {
      return "Our pricing is bespoke to each project because every business has different needs. We offer fixed-scope engagements and retained partnerships for ongoing transformation. The best next step is a free 30-minute discovery call — head to the Contact section to book. No commitment required.";
    }

    return "Corai is an AI transformation and automation partner built for businesses that want to move faster without the overhead of building in-house. Whether it's AI visibility, workflow automation, or a full digital rebuild — we deliver production-ready outcomes you can measure. Head to our Contact section to start a free discovery call.";
  }

  function initHeroChat() {
    const heroChatForm     = document.getElementById("hero-chat-form");
    const heroChatMessages = document.getElementById("hero-chat-messages");
    const chatTyping       = document.getElementById("chat-typing");
    const heroChat         = document.getElementById("hero-chat");
    const heroChatClear    = document.getElementById("hero-chat-clear");
    const heroChatClose    = document.getElementById("hero-chat-close");
    const heroChatBackdrop = document.getElementById("hero-chat-backdrop");

    if (!heroChatForm || !heroChatMessages || !heroChat) return;

    const welcomeHTML = heroChatMessages.querySelector(".chat-msg--welcome")?.outerHTML ?? "";

    function scrollToBottom() {
      heroChatMessages.scrollTo({ top: heroChatMessages.scrollHeight, behavior: "instant" });
    }

    function appendMessage(role, text) {
      const wrap = document.createElement("div");
      wrap.className = "chat-msg chat-msg--" + (role === "user" ? "user" : "ai");
      wrap.innerHTML = '<p class="chat-msg-text">' + escapeHtml(text) + "</p>";
      heroChatMessages.appendChild(wrap);
      scrollToBottom();
    }

    function setTypingVisible(visible) {
      if (!chatTyping) return;
      if (visible) heroChatMessages.appendChild(chatTyping);
      chatTyping.classList.toggle("visible", !!visible);
      chatTyping.setAttribute("aria-hidden", visible ? "false" : "true");
      if (visible) scrollToBottom();
    }

    function openPopout() {
      heroChat.classList.add("hero-chat--popout");
      if (heroChatBackdrop) {
        heroChatBackdrop.classList.add("is-open");
        heroChatBackdrop.setAttribute("aria-hidden", "false");
      }
      document.documentElement.classList.add("hero-chat-modal-open");
      document.body.classList.add("hero-chat-modal-open");
    }

    function closePopout() {
      if (!heroChat.classList.contains("hero-chat--popout")) return;
      heroChat.classList.remove("hero-chat--popout");
      if (heroChatBackdrop) {
        heroChatBackdrop.classList.remove("is-open");
        heroChatBackdrop.setAttribute("aria-hidden", "true");
      }
      document.documentElement.classList.remove("hero-chat-modal-open");
      document.body.classList.remove("hero-chat-modal-open");
    }

    function activateChat() {
      if (heroChat.classList.contains("hero-chat--active")) return;
      heroChat.classList.add("hero-chat--active");
      heroChatMessages.removeAttribute("hidden");
      if (heroChatClear) heroChatClear.hidden = false;
      openPopout();
    }

    function clearChat() {
      heroChatMessages.innerHTML = welcomeHTML;
      if (chatTyping) heroChatMessages.appendChild(chatTyping);
      setTypingVisible(false);
      closePopout();
      heroChat.classList.remove("hero-chat--active");
      heroChatMessages.setAttribute("hidden", "");
      if (heroChatClear) heroChatClear.hidden = true;
      chatHistory.length = 0;
      const input     = heroChatForm.querySelector('input[name="query"]');
      const submitBtn = heroChatForm.querySelector('button[type="submit"]');
      if (input)     { input.disabled = false; input.value = ""; input.focus(); }
      if (submitBtn)   submitBtn.disabled = false;
    }

    const heroChatInput = heroChatForm.querySelector('input[name="query"]');
    if (heroChatInput) {
      heroChatInput.addEventListener("focus", activateChat);
      heroChatInput.addEventListener("click", activateChat);
    }

    heroChatClose?.addEventListener("click", closePopout);
    heroChatBackdrop?.addEventListener("click", closePopout);
    heroChatClear?.addEventListener("click", clearChat);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && heroChat.classList.contains("hero-chat--popout")) {
        closePopout();
      }
    });

    heroChatForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input     = heroChatForm.querySelector('input[name="query"]');
      const submitBtn = heroChatForm.querySelector('button[type="submit"]');
      const query     = input?.value.trim() ?? "";
      if (!query) return;

      activateChat();
      input.value = "";
      appendMessage("user", query);

      if (input)     input.disabled = true;
      if (submitBtn) submitBtn.disabled = true;
      setTypingVisible(true);

      const reply = await getAIResponse(query);

      setTypingVisible(false);
      appendMessage("ai", reply);

      if (input)     { input.disabled = false; input.focus(); }
      if (submitBtn)   submitBtn.disabled = false;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────────────────────────────────

  initCookieConsent();
  initModals();
  loadData().then(() => {
    initReveals();
    staggerFeatures();
    initFeatureCardDetailWindows();
  });
  initMessageBox();
  initRequestFormLimits();
  initCtaForm();
  initHeroChat();
  updateNavScroll();
  initNavScrollSpy();
})();
