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
const CLINIC_WHATSAPP       = "923222905560";                 // from the clinic's own Google listing — owner: confirm this is your WhatsApp number
const CLINIC_PHONE_DISPLAY  = "+92 322 2905560";              // from the clinic's own Google listing
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
    // Per-element prefilled message (e.g. package "Order" buttons): data-wa-msg-en / data-wa-msg-ur.
    var custom = a.getAttribute("data-wa-msg-" + currentLang) || a.getAttribute("data-wa-msg");
    a.setAttribute("href", waLink(custom));
  });
  document.querySelectorAll("[data-tel]").forEach(function (a) {
    a.setAttribute("href", telLink());
  });
  document.querySelectorAll("[data-phone-display]").forEach(function (el) {
    el.textContent = CLINIC_PHONE_DISPLAY;
  });
}

/* =========================================================================
   Sunnah days for Hijama — Islamic (Hijri) date feature
   Uses the browser-native Umm al-Qura Islamic calendar (Intl). No library.
   Sunnah: cupping (Hijama) is reported as especially good on the 17th, 19th
   and 21st of the lunar month (Sunan Abu Dawud 3861, Sunan Ibn Majah 3486),
   and particularly on Monday or Thursday.
   ========================================================================= */

/* Urdu names for the 12 Hijri months (Umm al-Qura month index 1..12). */
const HIJRI_MONTHS_UR = [
  "محرم", "صفر", "ربیع الاول", "ربیع الثانی", "جمادی الاول", "جمادی الثانی",
  "رجب", "شعبان", "رمضان", "شوال", "ذوالقعدہ", "ذوالحجہ"
];
/* Clean English Hijri month names (avoids the transliteration marks Intl adds). */
const HIJRI_MONTHS_EN = [
  "Muharram", "Safar", "Rabiʿ al-Awwal", "Rabiʿ al-Thani", "Jumada al-Ula", "Jumada al-Akhira",
  "Rajab", "Shaʿban", "Ramadan", "Shawwal", "Dhu al-Qaʿda", "Dhu al-Hijja"
];
const SUNNAH_DAYS = [17, 19, 21];

const _hijriFmt = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
  day: "numeric", month: "numeric", year: "numeric"
});

/* Return {day, month, year} in the Umm al-Qura calendar for a JS Date. */
function hijriParts(date) {
  const out = {};
  _hijriFmt.formatToParts(date).forEach(function (p) {
    if (p.type !== "literal") out[p.type] = parseInt(p.value, 10);
  });
  return out;
}

/* Build a display string "17 Safar 1448 AH" (en) / "17 صفر 1448 ہجری" (ur). */
function hijriString(hp, lang) {
  const mi = hp.month - 1;
  if (lang === "ur") {
    return hp.day + " " + (HIJRI_MONTHS_UR[mi] || "") + " " + hp.year + " ہجری";
  }
  return hp.day + " " + (HIJRI_MONTHS_EN[mi] || "") + " " + hp.year + " AH";
}

function gregString(date, lang) {
  try {
    return new Intl.DateTimeFormat(lang === "ur" ? "ur-PK" : "en-GB", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    }).format(date);
  } catch (e) {
    return date.toDateString();
  }
}

/* Is this weekday a specially-recommended one (Monday=1 or Thursday=4)? */
function isBlessedWeekday(date) {
  const d = date.getDay();
  return d === 1 || d === 4;
}
function weekdayName(date, lang) {
  try {
    return new Intl.DateTimeFormat(lang === "ur" ? "ur-PK" : "en-US", { weekday: "long" }).format(date);
  } catch (e) { return ""; }
}

/* Compute today's Hijri date + the next few upcoming 17/19/21 Sunnah days. */
function computeSunnahData() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayHp = hijriParts(today);
  const todayIsSunnah = SUNNAH_DAYS.indexOf(todayHp.day) >= 0;

  const upcoming = [];
  const cur = new Date(today.getTime());
  // iterate forward day-by-day until we collect 6 Sunnah dates (guard ~420 days)
  for (let i = 0; i < 420 && upcoming.length < 6; i++) {
    const hp = hijriParts(cur);
    if (SUNNAH_DAYS.indexOf(hp.day) >= 0) {
      upcoming.push({
        date: new Date(cur.getTime()),
        hp: hp,
        isToday: (i === 0)
      });
    }
    cur.setDate(cur.getDate() + 1);
  }
  return { today: today, todayHp: todayHp, todayIsSunnah: todayIsSunnah, upcoming: upcoming };
}

let _sunnahData = null;

/* Render (or re-render on language change) the Sunnah-days UI. */
function renderSunnah() {
  const daysEl = document.getElementById("sunnahDays");
  const hijriEl = document.getElementById("hijriToday");
  const gregEl = document.getElementById("gregToday");
  if (!daysEl || !hijriEl || !gregEl) return;

  if (!_sunnahData) {
    try { _sunnahData = computeSunnahData(); }
    catch (e) { return; } // Intl islamic calendar unsupported — leave the "…" placeholders / noscript note
  }
  const lang = currentLang;
  const d = _sunnahData;

  hijriEl.textContent = hijriString(d.todayHp, lang);
  gregEl.textContent = gregString(d.today, lang);

  const flag = document.getElementById("sunnahTodayFlag");
  if (flag) { if (d.todayIsSunnah) flag.removeAttribute("hidden"); else flag.setAttribute("hidden", ""); }

  const todayLabel = lang === "ur" ? "آج" : "Today";
  const blessedLabel = lang === "ur" ? "پیر/جمعرات — بابرکت" : "Mon/Thu — blessed";

  daysEl.innerHTML = d.upcoming.map(function (u) {
    const blessed = isBlessedWeekday(u.date);
    const dow = weekdayName(u.date, lang);
    return '' +
      '<div class="sunnah-card' + (u.isToday ? ' is-today' : '') + '" data-today-label="' + todayLabel + '">' +
        '<div class="sc-badge"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 1l2 5 5-2-2 5 5 2-5 2 2 5-5-2-2 5-2-5-5 2 2-5-5-2 5-2-2-5 5 2z"/></svg><span class="sc-num">' + u.hp.day + '</span></div>' +
        '<p class="sc-hijri">' + hijriString(u.hp, lang) + '</p>' +
        '<p class="sc-greg">' + gregString(u.date, lang) + '</p>' +
        '<span class="sc-dow' + (blessed ? ' blessed' : '') + '">' + dow + (blessed ? ' · ' + (lang === "ur" ? "بابرکت" : "recommended") : '') + '</span>' +
      '</div>';
  }).join("");
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
  // Re-render the Hijri / Sunnah-days UI in the chosen language.
  renderSunnah();
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
/* ---- Sunnah-dates alert popup (shows the next Sunnah Hijama day, once per session) ---- */
function initDatesPopup() {
  const overlay = document.getElementById("datesPop");
  if (!overlay) return;
  let seen = false;
  try { seen = sessionStorage.getItem("sh_dates_pop") === "1"; } catch (e) {}
  if (seen) return;

  let data = null;
  try { data = computeSunnahData(); } catch (e) { return; }
  if (!data || !data.upcoming || !data.upcoming.length) return;
  const next = data.upcoming[0];

  const hijriEl = overlay.querySelector(".dp-hijri");
  const gregEl  = overlay.querySelector(".dp-greg");
  if (hijriEl) hijriEl.textContent = hijriString(next.hp, currentLang);
  if (gregEl)  gregEl.textContent  = (next.isToday ? "" : "") + gregString(next.date, currentLang);

  function close() {
    overlay.classList.remove("show");
    try { sessionStorage.setItem("sh_dates_pop", "1"); } catch (e) {}
  }
  overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
  const x = overlay.querySelector(".dates-pop__close");
  if (x) x.addEventListener("click", close);
  overlay.querySelectorAll("[data-wa]").forEach(function (a) { a.addEventListener("click", close); });

  // Show after a short delay so the page settles first.
  setTimeout(function () { overlay.classList.add("show"); }, 1400);
}

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
  initDatesPopup();

  // Set current year in footer.
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
});
