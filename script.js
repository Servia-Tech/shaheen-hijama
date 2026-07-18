/* =========================================================================
   Shaheen Shafi Unani Clinic & Hijama Center — site behaviour
   ========================================================================= */

/* -------------------------------------------------------------------------
   >>> THE ONLY PLACE TO CHANGE THE CLINIC'S CONTACT NUMBER <<<
   Replace the placeholder below with the clinic's real WhatsApp / phone
   number once the owner confirms it. Every WhatsApp button, the floating
   button, the call links, and the pre-filled booking message all read from
   these two constants, so this is a one-line change.

   Format for CLINIC_WHATSAPP: international, digits only, no "+" or spaces.
   Pakistan example: 92 (country) + 3XXXXXXXXX  ->  "923001234567"
   ------------------------------------------------------------------------- */
const CLINIC_WHATSAPP       = "923000000000";                 // PLACEHOLDER — owner to confirm
const CLINIC_PHONE_DISPLAY  = "+92 3XX XXX XXXX (to be confirmed)"; // PLACEHOLDER — owner to confirm
/* ------------------------------------------------------------------------- */

const DEFAULT_WA_TEXT = {
  en: "Assalamu alaikum, I'd like to book an appointment at Shaheen Shafi Unani Clinic & Hijama Center.",
  ur: "السلام علیکم، میں شاہین شافی یونانی کلینک اور حجامہ سینٹر میں اپائنٹمنٹ لینا چاہتا/چاہتی ہوں۔"
};

function waLink(text) {
  const msg = text || DEFAULT_WA_TEXT[currentLang] || DEFAULT_WA_TEXT.en;
  return "https://wa.me/" + CLINIC_WHATSAPP + "?text=" + encodeURIComponent(msg);
}
function telLink() {
  // tel: uses the raw international number; owner confirms the real one.
  return "tel:+" + CLINIC_WHATSAPP;
}

/* ---- Wire up all contact links from the constants ---- */
function applyContactLinks() {
  document.querySelectorAll("[data-wa]").forEach(function (a) {
    a.setAttribute("href", waLink());
  });
  document.querySelectorAll("[data-tel]").forEach(function (a) {
    a.setAttribute("href", telLink());
  });
  document.querySelectorAll("[data-phone-display]").forEach(function (el) {
    el.textContent = CLINIC_PHONE_DISPLAY;
  });
}

/* ---- Language toggle (EN / اردو) with localStorage persistence ---- */
let currentLang = "en";

function setLang(lang) {
  currentLang = lang;
  const body = document.body;
  if (lang === "ur") {
    body.setAttribute("dir", "rtl");
    body.setAttribute("lang", "ur");
    loadUrduFont();
  } else {
    body.setAttribute("dir", "ltr");
    body.setAttribute("lang", "en");
  }
  document.querySelectorAll(".lang-toggle button").forEach(function (b) {
    b.setAttribute("aria-pressed", String(b.dataset.setlang === lang));
  });
  try { localStorage.setItem("shaheen_lang", lang); } catch (e) {}
  // Re-apply the WhatsApp default text in the chosen language.
  applyContactLinks();
}

/* Load the Urdu Nastaliq font only when Urdu is first requested (perf). */
let urduFontLoaded = false;
function loadUrduFont() {
  if (urduFontLoaded) return;
  urduFontLoaded = true;
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;600;700&display=swap";
  document.head.appendChild(l);
}

/* ---- Booking form -> pre-filled WhatsApp message ---- */
function handleForm(e) {
  e.preventDefault();
  const f = e.target;
  const name = (f.elements.name.value || "").trim();
  const phone = (f.elements.phone.value || "").trim();
  const service = f.elements.service.value || "";
  const message = (f.elements.message.value || "").trim();

  let text;
  if (currentLang === "ur") {
    text = "السلام علیکم! میں اپائنٹمنٹ بُک کرنا چاہتا/چاہتی ہوں۔\n" +
           "نام: " + name + "\n" +
           "فون: " + phone + "\n" +
           "سروس: " + service + "\n" +
           (message ? "پیغام: " + message + "\n" : "") +
           "— شاہین شافی یونانی کلینک اور حجامہ سینٹر";
  } else {
    text = "Assalamu alaikum! I'd like to book an appointment.\n" +
           "Name: " + name + "\n" +
           "Phone: " + phone + "\n" +
           "Service: " + service + "\n" +
           (message ? "Message: " + message + "\n" : "") +
           "— Shaheen Shafi Unani Clinic & Hijama Center";
  }
  window.open(waLink(text), "_blank", "noopener");
}

/* ---- Mobile nav ---- */
function toggleNav() {
  const links = document.getElementById("navLinks");
  const btn = document.getElementById("navToggle");
  const open = links.classList.toggle("open");
  btn.setAttribute("aria-expanded", String(open));
}
function closeNav() {
  const links = document.getElementById("navLinks");
  if (links.classList.contains("open")) {
    links.classList.remove("open");
    document.getElementById("navToggle").setAttribute("aria-expanded", "false");
  }
}

/* ---- Scroll reveal ---- */
function initReveal() {
  const els = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    els.forEach(function (el) { el.classList.add("in"); });
    return;
  }
  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  els.forEach(function (el) { io.observe(el); });
}

/* ---- Init ---- */
document.addEventListener("DOMContentLoaded", function () {
  // Restore saved language, else default English (offer Urdu via toggle).
  let saved = "en";
  try { saved = localStorage.getItem("shaheen_lang") || "en"; } catch (e) {}
  setLang(saved === "ur" ? "ur" : "en");

  document.querySelectorAll(".lang-toggle button").forEach(function (b) {
    b.addEventListener("click", function () { setLang(b.dataset.setlang); });
  });

  const form = document.getElementById("bookingForm");
  if (form) form.addEventListener("submit", handleForm);

  const navToggle = document.getElementById("navToggle");
  if (navToggle) navToggle.addEventListener("click", toggleNav);
  document.querySelectorAll("#navLinks a").forEach(function (a) {
    a.addEventListener("click", closeNav);
  });

  applyContactLinks();
  initReveal();

  // Set current year in footer.
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
});
