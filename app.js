// Hayrat Dua — iPhone (ve her tarayıcı) için web sürümü.
// Android uygulamasıyla AYNI Firebase veritabanını ve aynı veri yapısını kullanır.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, signInAnonymously, onAuthStateChanged, signInWithEmailAndPassword, signOut,
  EmailAuthProvider, linkWithCredential,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getDatabase, ref, onValue, off, update, set, get, push, remove, runTransaction,
  increment, serverTimestamp, onDisconnect, query, orderByChild,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDhFH4fiaYaqfDXj3Q-ogT28JJeOXC6A80",
  authDomain: "sharedread-d061e.firebaseapp.com",
  databaseURL: "https://sharedread-d061e-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "sharedread-d061e",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ---------------------------------------------------------------- yardımcılar
const $ = (s, el = document) => el.querySelector(s);
const view = $("#view");
const fmt = n => Number(n || 0).toLocaleString("tr-TR");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dayKey = (d = new Date()) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
const ANON = "İsimsiz okuyucu";
let uid = null;

const store = {
  get name() { return localStorage.getItem("name") || ""; },
  set name(v) { localStorage.setItem("name", v.trim()); },
  get anon() { return localStorage.getItem("anon") === "1"; },
  set anon(v) { localStorage.setItem("anon", v ? "1" : "0"); },
  get color() { return localStorage.getItem("color") || "#1E724A"; },
  set color(v) { localStorage.setItem("color", v); },
  get lastGroup() { return localStorage.getItem("lastGroup"); },
  set lastGroup(v) { v ? localStorage.setItem("lastGroup", v) : localStorage.removeItem("lastGroup"); },
  session(gid, id) { return Number(localStorage.getItem(`s_${gid}_${id}`) || 0); },
  setSession(gid, id, v) { localStorage.setItem(`s_${gid}_${id}`, String(Math.max(0, v))); },
  show(gid, id, def) { const v = localStorage.getItem(`show_${gid}_${id}`); return v === null ? def : v === "1"; },
  setShow(gid, id, v) { localStorage.setItem(`show_${gid}_${id}`, v ? "1" : "0"); },
  get font() { return Number(localStorage.getItem("font") || 20); },
  set font(v) { localStorage.setItem("font", String(v)); },
};
const contribName = () => (store.anon ? "" : store.name);

// ------------------------------------------------------------- tema rengi
const PRESETS = [["Yeşil", "#1E724A"], ["Lacivert", "#2D2B74"], ["Turkuaz", "#0F7C80"], ["Bordo", "#8E2440"],
  ["Kahve", "#7A4E2D"], ["Mor", "#5B3A8C"], ["Gece", "#2B3A4A"]];
function mix(hex, to, t) {
  const a = hex.match(/\w\w/g).map(x => parseInt(x, 16)), b = to.match(/\w\w/g).map(x => parseInt(x, 16));
  return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, "0")).join("");
}
function applyTheme() {
  const c = store.color, r = document.documentElement.style;
  r.setProperty("--primary", c);
  r.setProperty("--dark", mix(c, "#000000", .28));
  r.setProperty("--soft", mix(c, "#FFFFFF", .9));
  document.querySelector('meta[name="theme-color"]').content = c;
}
applyTheme();

// ------------------------------------------------------------- ikonlar
const I = {
  chev: '<svg class="chev" viewBox="0 0 24 24"><path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>',
  star: (() => { let p = ""; for (let i = 0; i < 16; i++) { const a = (-90 + i * 22.5) * Math.PI / 180, r = i % 2 ? 5.6 : 10.2; p += (i ? "L" : "M") + (12 + r * Math.cos(a)).toFixed(2) + "," + (12 + r * Math.sin(a)).toFixed(2); } return `<svg viewBox="0 0 24 24"><path fill-rule="evenodd" d="${p}ZM12 10.2a1.8 1.8 0 1 0 .01 0Z"/></svg>`; })(),
  add: '<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11A2.99 2.99 0 1 0 15 5c0 .24.04.47.09.7L8.04 9.81A2.99 2.99 0 1 0 6 15c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65A2.92 2.92 0 1 0 18 16.08z"/></svg>',
  refresh: '<svg viewBox="0 0 24 24"><path d="M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>',
  minus: '<svg viewBox="0 0 24 24"><path d="M19 13H5v-2h14v2z"/></svg>',
  many: '<svg viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z"/></svg>',
  more: '<svg viewBox="0 0 24 24"><path d="M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>',
  people: '<svg viewBox="0 0 24 24"><path d="M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05A4.22 4.22 0 0 1 17 16.5V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>',
  exit: '<svg viewBox="0 0 24 24"><path d="M10.09 15.59 11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5a2 2 0 0 0-2 2v4h2V5h14v14H5v-4H3v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"/></svg>',
  shield: '<svg viewBox="0 0 24 24"><path d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>',
  shieldOff: '<svg viewBox="0 0 24 24"><path d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>',
  personRemove: '<svg viewBox="0 0 24 24"><path d="M14 8a4 4 0 1 0-8 0 4 4 0 0 0 8 0zm3 2v2h6v-2h-6zM2 18v2h16v-2c0-2.66-5.33-4-8-4s-8 1.34-8 4z"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M15 16h4v2h-4zm0-8h7v2h-7zm0 4h6v2h-6zM3 18a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V8H3v10zM14 5h-3l-1-1H6L5 5H2v2h12z"/></svg>',
  ok: '<svg viewBox="0 0 24 24"><path fill="#5FD38D" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
  warn: '<svg viewBox="0 0 24 24"><path fill="#F2B84B" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>',
};

// ------------------------------------------------------------- bildirim / alt sayfa
let snackTimer;
function toast(msg, warn = /hata|amadı|emedi|bulunamadı|gerekli/i.test(msg)) {
  const s = $("#snack");
  s.innerHTML = (warn ? I.warn : I.ok) + `<span>${esc(msg)}</span>`;
  s.hidden = false;
  clearTimeout(snackTimer);
  snackTimer = setTimeout(() => (s.hidden = true), 3000);
}
function sheet(html) {
  const wrap = $("#sheet-wrap"), sh = $("#sheet");
  sh.innerHTML = `<div class="handle"></div>${html}`;
  wrap.hidden = false;
  wrap.onclick = e => { if (e.target === wrap) closeSheet(); };
  return sh;
}
function closeSheet() { $("#sheet-wrap").hidden = true; $("#sheet").innerHTML = ""; }

/** Onay sayfası: başlık, açıklama, Vazgeç + onay düğmesi (tehlikeliyse kırmızı). */
function confirmSheet({ title, msg, ok, danger = false, cancel = "Vazgeç", emoji = "", onOk }) {
  const sh = sheet(`${emoji ? `<div style="text-align:center;font-size:44px;margin-top:12px">${emoji}</div>` : ""}
    <h2>${esc(title)}</h2><p class="s">${esc(msg)}</p>
    <div class="btnrow"><button class="soft-btn" id="cx">${esc(cancel)}</button><button class="primary ${danger ? "danger" : ""}" id="cy">${esc(ok)}</button></div>`);
  $("#cx", sh).onclick = closeSheet;
  $("#cy", sh).onclick = () => { closeSheet(); onOk(); };
}

/** Kartlı seçenek menüsü (alttan açılır). items: {icon, title, desc, danger, run} */
function menuSheet(head, items) {
  const sh = sheet(head + items.map((it, i) => `<button class="opt ${it.danger ? "danger-opt" : ""}" data-i="${i}">
      <div class="badge sm">${it.icon}</div><div class="grow"><div class="t">${esc(it.title)}</div>${it.desc ? `<div class="d">${esc(it.desc)}</div>` : ""}</div></button>`).join(""));
  sh.querySelectorAll("[data-i]").forEach(b => (b.onclick = () => { closeSheet(); setTimeout(() => items[+b.dataset.i].run(), 60); }));
}

const initials = n => { const p = n.trim().split(/\s+/).filter(Boolean); return (p.length > 1 ? p[0][0] + p[1][0] : (p[0] || "?")[0]).toLocaleUpperCase("tr"); };

/** Tek alanlı giriş sayfası. onOk hata metni dönerse gösterir, null dönerse kapanır. */
function inputSheet({ title, sub, placeholder, button, code = false, value = "", onOk }) {
  const sh = sheet(`<h2>${esc(title)}</h2><p class="s">${esc(sub)}</p>
    <input class="field ${code ? "code" : ""}" ${code ? 'inputmode="numeric" maxlength="6"' : ""} placeholder="${esc(placeholder)}" value="${esc(value)}">
    <div class="err"></div><button class="primary">${esc(button)}</button>`);
  const inp = $("input", sh), err = $(".err", sh);
  const go = async () => { const r = await onOk(inp.value.trim()); if (r) err.textContent = r; else closeSheet(); };
  $(".primary", sh).onclick = go;
  inp.onkeydown = e => { if (e.key === "Enter") go(); };
  inp.oninput = () => (err.textContent = "");
  setTimeout(() => inp.focus(), 250);
}

// ------------------------------------------------------------- canlı dinleyiciler
let subs = [];
function listen(path, cb, q) {
  const r = q || ref(db, path);
  const unsub = onValue(r, s => cb(s), e => { console.warn(path, e); cb(null, e); });
  subs.push(unsub);
}
function clearSubs() { subs.forEach(u => u()); subs = []; leavePresence?.(); leavePresence = null; }
let leavePresence = null;

// ------------------------------------------------------------- üst çubuk
const syncBarHeight = () => document.documentElement.style.setProperty("--bar-h", $("#bar").offsetHeight + "px");
window.addEventListener("resize", syncBarHeight);
function setBar(title, { back = null, actions = "" } = {}) {
  $("#bar").hidden = false;
  requestAnimationFrame(syncBarHeight);
  $("#title").textContent = title;
  const b = $("#back");
  b.hidden = !back;
  b.onclick = back;
  $("#actions").innerHTML = actions;
}

// ------------------------------------------------------------- yönlendirme
function go(hash) { location.hash = hash; }
window.addEventListener("hashchange", route);
function route() {
  clearSubs();
  closeSheet();
  const user = auth.currentUser;
  if (!user || user.isAnonymous) return loginPage();
  if (!store.name) {   // başka cihazda giriş: adı profilden al
    get(ref(db, `users/${uid}/name`)).then(s => { store.name = s.val() || username(); route(); }).catch(() => { store.name = username(); route(); });
    return;
  }
  const p = location.hash.replace(/^#\/?/, "").split("/");
  document.body.classList.toggle("counter-page", p[0] === "g" && p[2] === "d");
  if (p[0] === "g" && p[1] && p[2] === "d" && p[3]) return counterPage(p[1], p[3]);
  if (p[0] === "g" && p[1]) return duasPage(p[1]);
  if (p[0] === "settings") return settingsPage();
  return groupsPage();
}

// ------------------------------------------------------------- ad sorma
function askName(first) {
  setBar("Hayrat Dua");
  view.innerHTML = "";
  inputSheet({
    title: first ? "Hoş geldiniz" : "Adınızı değiştirin",
    sub: "Katkılar listesinde görünecek adınızı yazın.",
    placeholder: "Adınız", button: "Devam", value: store.name,
    onOk: v => {
      if (!v) return "Ad boş olamaz";
      store.name = v; renameEverywhere();
      setTimeout(route, 50); return null;
    },
  });
  if (first) $("#sheet-wrap").onclick = null;
}

async function renameEverywhere() {
  if (!uid) return;
  set(ref(db, `users/${uid}/name`), store.name).catch(() => {});
  const gs = await get(ref(db, `users/${uid}/groups`)).catch(() => null);
  if (!gs || !gs.exists()) return;
  for (const gid of Object.keys(gs.val())) {
    set(ref(db, `groups/${gid}/members/${uid}`), store.name).catch(() => {});
    get(ref(db, `g/${gid}/contrib`)).then(cs => {
      const upd = {};
      cs.forEach(d => { if (d.hasChild(uid)) upd[`g/${gid}/contrib/${d.key}/${uid}/name`] = contribName(); });
      if (Object.keys(upd).length) update(ref(db), upd);
    }).catch(() => {});
  }
}

// ============================================================= GRUPLARIM
function groupsPage() {
  setBar("Hayrat Dua", { actions: `<button class="icon-btn" id="gear" aria-label="Ayarlar">${I.gear}</button>` });
  $("#gear").onclick = () => go("#/settings");
  const groups = {};
  const draw = () => {
    const list = Object.values(groups).sort((a, b) => a.name.localeCompare(b.name, "tr"));
    view.innerHTML = `${greetCard()}
      <div class="section">${list.length ? "GRUPLARIM · " + list.length : ""}</div>
      ${list.map(g => `<div class="card tap row" data-g="${g.id}">
          <div class="badge">${I.star}</div>
          <div class="grow"><div class="name">${esc(g.name)}</div>
            <div class="sub">👥 ${g.members} üye &nbsp;<span class="pill">Kod ${esc(g.code)}</span></div></div>${I.chev}</div>`).join("")}
      ${list.length ? "" : `<div class="empty">Henüz bir grubunuz yok.<br>Sağ alttaki “Grup ekle” ile yeni grup kurun<br>ya da davet koduyla katılın.</div>`}
      <button class="fab" id="fab">${I.add}Grup ekle</button>`;
    view.querySelectorAll("[data-g]").forEach(el => (el.onclick = () => go(`#/g/${el.dataset.g}`)));
    $("#fab").onclick = addGroupSheet;
  };
  draw();
  const groupUnsubs = {};
  listen(`creators/${uid}`, s => { canCreate = s?.val() === true; });
  listen(`users/${uid}/groups`, s => {
    const ids = s && s.exists() ? Object.keys(s.val()) : [];
    for (const gid of Object.keys(groupUnsubs)) if (!ids.includes(gid)) { groupUnsubs[gid](); delete groupUnsubs[gid]; delete groups[gid]; }
    for (const gid of ids) if (!groupUnsubs[gid]) {
      groupUnsubs[gid] = onValue(ref(db, `groups/${gid}`), gs => {
        if (!gs.exists()) { delete groups[gid]; remove(ref(db, `users/${uid}/groups/${gid}`)).catch(() => {}); draw(); return; }
        groups[gid] = { id: gid, name: gs.child("info/name").val() || "Grup", code: gs.child("info/code").val() || "", members: gs.child("members").size };
        draw();
      }, () => { delete groups[gid]; remove(ref(db, `users/${uid}/groups/${gid}`)).catch(() => {}); draw(); });
      subs.push(() => groupUnsubs[gid]?.());
    }
    draw();
  });
}

function greetCard() {
  // Pastel süsleme: kemer, sekiz köşeli yıldızlar, çift çerçeve
  const star = (x, y, R, r, fill, op = 1) => { let p = ""; for (let i = 0; i < 16; i++) { const a = (-90 + i * 22.5) * Math.PI / 180, rr = i % 2 ? r : R; p += (i ? "L" : "M") + (x + rr * Math.cos(a)).toFixed(1) + "," + (y + rr * Math.sin(a)).toFixed(1); } return `<path d="${p}Z" fill="${fill}" opacity="${op}"/>`; };
  const soft = "var(--soft)";
  return `<div class="greet"><svg class="orn" viewBox="0 0 360 150" preserveAspectRatio="none">
    <defs><linearGradient id="gg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--soft)"/><stop offset=".55" stop-color="#FBF3E4"/><stop offset="1" stop-color="#F7E6E8"/></linearGradient></defs>
    <rect width="360" height="150" rx="26" fill="url(#gg)"/>
    <rect x="7" y="7" width="346" height="136" rx="20" fill="none" stroke="#D9B26A" stroke-opacity=".6" stroke-width="1.4"/>
    <rect x="11" y="11" width="338" height="128" rx="16" fill="none" stroke="var(--primary)" stroke-opacity=".18"/>
    <path d="M68 132V68C68 40 140 30 180 20C220 30 292 40 292 68V132" fill="#fff" fill-opacity=".45" stroke="#D9B26A" stroke-width="1.6"/>
    ${star(180, 19, 5, 2.4, "#D9B26A")}
    ${star(36, 78, 22, 12, soft)}${star(324, 78, 22, 12, soft)}
    <circle cx="36" cy="78" r="7.5" fill="#F3D9DC"/><circle cx="324" cy="78" r="7.5" fill="#F3D9DC"/>
    <circle cx="36" cy="78" r="3.2" fill="#D9B26A"/><circle cx="324" cy="78" r="3.2" fill="#D9B26A"/>
    ${star(22, 22, 6, 3, "#D9B26A", .7)}${star(338, 22, 6, 3, "#D9B26A", .7)}${star(22, 128, 6, 3, "#D9B26A", .7)}${star(338, 128, 6, 3, "#D9B26A", .7)}
  </svg><div class="ar">السلام عليكم</div></div>`;
}

let canCreate = false;
function addGroupSheet() {
  const sh = sheet(`<h2>Grup ekle</h2><p class="s">Bir gruba katılın ya da yenisini kurun.</p>
    <button class="opt" id="o1"><div class="badge">${I.share}</div><div class="grow"><div class="t">Davet koduyla katıl</div><div class="d">Arkadaşınızdan aldığınız 6 haneli kodu girin.</div></div>${I.chev}</button>
    <button class="opt" id="o2"><div class="badge">${I.add}</div><div class="grow"><div class="t">Yeni grup kur</div><div class="d">Kendi grubunuzu kurun, davet kodunu paylaşın.</div></div>${I.chev}</button>`);
  $("#o1", sh).onclick = () => inputSheet({
    title: "Davet koduyla katıl", sub: "Arkadaşınızdan aldığınız 6 haneli kodu girin.", placeholder: "••••••",
    button: "Gruba katıl", code: true, onOk: c => (c.length !== 6 ? "Kod 6 haneli olmalı" : join(c)),
  });
  if (!canCreate) {
    $("#o2", sh).style.opacity = .45;
    $("#o2", sh).onclick = () => toast("Grup kurma yetkiniz yok. Yetki için yöneticiye başvurun", true);
    return;
  }
  $("#o2", sh).onclick = () => inputSheet({
    title: "Yeni grup kur", sub: "Grubu kurduktan sonra davet kodunu arkadaşlarınızla paylaşın.",
    placeholder: "Grup adı (örn. Perşembe Halkası)", button: "Grubu kur",
    onOk: n => (n ? (createGroup(n), null) : "Grup adı gerekli"),
  });
}

async function join(code) {
  try {
    const s = await get(ref(db, `codes/${code}`));
    const gid = s.val();
    if (!gid) return "Bu kodla bir grup bulunamadı";
    await update(ref(db), { [`groups/${gid}/members/${uid}`]: store.name, [`users/${uid}/groups/${gid}`]: true });
    toast("Gruba katıldınız");
    setTimeout(() => go(`#/g/${gid}`), 50);
    return null;
  } catch (e) { return "Katılınamadı: " + e.message; }
}

async function createGroup(name, attempt = 0) {
  if (attempt > 5) return toast("Kod üretilemedi, tekrar deneyin", true);
  const gid = push(ref(db, "groups")).key;
  const code = String(100000 + Math.floor(Math.random() * 900000));
  try {
    const t = await runTransaction(ref(db, `codes/${code}`), cur => (cur === null ? gid : undefined));
    if (!t.committed) return createGroup(name, attempt + 1);
  } catch { return createGroup(name, attempt + 1); }
  try {
    await update(ref(db), {
      [`groups/${gid}/info`]: { name, code, createdBy: uid, createdAt: serverTimestamp() },
      [`groups/${gid}/members/${uid}`]: store.name,
      [`users/${uid}/groups/${gid}`]: true,
    });
    const sh = sheet(`<h2 style="text-align:center">Grup kuruldu</h2><p class="s" style="text-align:center">“${esc(name)}” grubunun davet kodu</p>
      <div class="codebox">${code}</div><p class="s" style="text-align:center;margin-top:8px">Arkadaşlarınız “Grup ekle → Davet koduyla katıl” diyerek bu kodu girsin.</p>
      <div class="btnrow"><button class="outline" id="cp">Kopyala</button><button class="primary" id="sh">Paylaş</button></div>`);
    $("#cp", sh).onclick = () => navigator.clipboard?.writeText(code).then(() => toast("Davet kodu kopyalandı"));
    $("#sh", sh).onclick = () => shareInvite(name, code);
  } catch (e) { toast("Grup kurulamadı: " + e.message, true); }
}

function shareInvite(groupName, code) {
  const text = `"${groupName}" dua grubumuza katıl 🤲\n\nHayrat Dua uygulamasında "Grup ekle → Davet koduyla katıl" de ve şu kodu gir:\n\n${code}\n\niPhone ya da tarayıcıdan katılmak için:\n${location.origin + location.pathname}?kod=${code}`;
  if (navigator.share) navigator.share({ text }).catch(() => {});
  else navigator.clipboard?.writeText(text).then(() => toast("Davet metni kopyalandı"));
}

// ============================================================= DUA LİSTESİ
function duasPage(gid) {
  store.lastGroup = gid;
  setBar("Grup", { back: () => { store.lastGroup = null; go("#/"); }, actions: `<button class="icon-btn" id="sh" aria-label="Davet">${I.share}</button><button class="icon-btn" id="mm" aria-label="Menü">${I.more}</button>` });
  let info = {}, members = 0, duas = [], online = {}, memberList = [], owner = "", admins = new Set(), globalOwner = false;
  get(ref(db, `owners/${uid}`)).then(s => (globalOwner = s.exists())).catch(() => {});
  const isAdmin = u => u === owner || admins.has(u);
  const draw = () => {
    const total = duas.reduce((a, d) => a + d.rounds * d.target + d.count, 0);
    const on = Object.values(online).reduce((a, b) => a + b, 0);
    view.innerHTML = `<div class="hero">
        <div class="label">GRUBUN TOPLAM OKUMASI</div><div class="big">${fmt(total)}</div>
        <div class="glass"><div><b>${duas.length}</b><span>DUA</span></div><div><b>${members}</b><span>ÜYE</span></div><div><b>${on}</b><span>OKUYOR</span></div></div>
        <div class="invite"><div class="grow">${info.code ? "Davet kodu&nbsp; " + esc(info.code) : ""}</div><button class="btn-white" id="inv">Davet et</button></div>
      </div>
      <div class="section">${duas.length ? "DUALAR · " + duas.length : ""}</div>
      ${duas.map(d => duaCard(d, online[d.id] || 0)).join("")}
      ${duas.length ? "" : `<div class="empty">Bu grupta henüz dua yok.<br>Sağ alttaki “Dua ekle” ile ilk duayı ekleyin.</div>`}
      <button class="fab" id="fab">${I.add}Dua ekle</button>`;
    view.querySelectorAll("[data-d]").forEach(el => (el.onclick = () => go(`#/g/${gid}/d/${el.dataset.d}`)));
    $("#inv").onclick = () => shareInvite(info.name, info.code);
    $("#fab").onclick = () => duaForm(gid);
  };
  $("#sh").onclick = () => shareInvite(info.name, info.code);
  $("#mm").onclick = () => {
    const items = [{ icon: I.people, title: "Üyeler ve yöneticiler", desc: `${memberList.length} kişi`, run: showMembers }];
    if (isAdmin(uid)) items.push({ icon: I.edit, title: "Grup adını değiştir", desc: "Yeni ad bütün üyelerde görünür", run: renameGroup });
    items.push({ icon: I.exit, title: "Gruptan çık", desc: "Grup listenizden kalkar", danger: true, run: leaveGroup });
    if (uid === owner || globalOwner) items.push({ icon: I.trash, title: "Grubu sil", desc: "Herkes için kalıcı olarak silinir", danger: true, run: deleteGroup });
    menuSheet(`<h2>${esc(info.name)}</h2><p class="s">Davet kodu ${esc(info.code)}</p>`, items);
  };

  function renameGroup() {
    inputSheet({ title: "Grup adını değiştir", sub: "Yeni ad bütün üyelerde görünür.", placeholder: "Grup adı", button: "Kaydet", value: info.name,
      onOk: n => { if (!n) return "Grup adı gerekli"; set(ref(db, `groups/${gid}/info/name`), n).then(() => toast("Grup adı değiştirildi")).catch(e => toast("Değiştirilemedi: " + e.message, true)); return null; } });
  }
  /** Grubu tamamen siler (kurucu ya da baş yönetici). Yanlışlıkla silinmesin diye adını yazmak gerekir. */
  function deleteGroup() {
    const total = duas.reduce((a, d) => a + d.rounds * d.target + d.count, 0);
    const sh = sheet(`<h2>"${esc(info.name)}" silinsin mi?</h2>
      <p class="s">Grup herkes için kalıcı olarak silinir: dualar, sayaçlar, okuyanlar, geçmiş ve davet kodu. Bu işlem geri alınamaz.</p>
      <div class="glass soft" style="margin-top:14px"><div><b>${duas.length}</b><span>DUA</span></div><div><b>${memberList.length}</b><span>ÜYE</span></div><div><b>${fmt(total)}</b><span>OKUMA</span></div></div>
      <p class="s" style="margin-top:14px;color:var(--text)">Onaylamak için grubun adını aynen yazın: <b>${esc(info.name)}</b></p>
      <input class="field" id="dn" placeholder="Grubun adı" autocomplete="off">
      <div class="btnrow"><button class="soft-btn" id="dx">Vazgeç</button><button class="primary danger" id="dy" disabled>Kalıcı olarak sil</button></div>`);
    const norm = x => x.trim().toLocaleLowerCase("tr");
    $("#dn", sh).oninput = e => ($("#dy", sh).disabled = norm(e.target.value) !== norm(info.name));
    $("#dx", sh).onclick = closeSheet;
    $("#dy", sh).onclick = async () => {
      closeSheet(); clearSubs();
      const u = { [`g/${gid}`]: null, [`groups/${gid}`]: null, [`users/${uid}/groups/${gid}`]: null };
      if (info.code) u[`codes/${info.code}`] = null;
      try { await update(ref(db), u); toast(`"${info.name}" silindi`); }
      catch (e) { toast("Silinemedi: " + e.message, true); }
      store.lastGroup = null; go("#/");
    };
  }

  function leaveGroup() {
    // Grupta başka kimse yoksa: çıkarken grup da silinsin (sahipsiz grup kalmasın)
    if (!memberList.some(m => m.uid !== uid)) {
      return confirmSheet({ title: "Grupta başka kimse kalmadı",
        msg: `"${info.name}" grubunun son üyesisiniz. Çıkarsanız grup; duaları, sayaçları, geçmişi ve davet koduyla birlikte kalıcı olarak silinir.`,
        ok: "Grubu sil ve çık", danger: true, onOk: async () => {
          clearSubs();
          try {
            await update(ref(db), { [`g/${gid}`]: null, [`users/${uid}/groups/${gid}`]: null });
            await remove(ref(db, `groups/${gid}/members/${uid}`));
            const u = { [`groups/${gid}`]: null };
            if (info.code) u[`codes/${info.code}`] = null;
            await update(ref(db), u);
            toast(`"${info.name}" silindi`);
          } catch (e) { toast("Gruptan çıkıldı, ancak grup silinemedi: " + e.message, true); }
          store.lastGroup = null; go("#/");
        } });
    }
    confirmSheet({ title: "Gruptan çıkılsın mı?", msg: `"${info.name}" grubu listenizden kalkar. Tekrar katılmak için davet kodu gerekir. Okumalarınız grupta kalır.`,
      ok: "Gruptan çık", danger: true, onOk: async () => {
        clearSubs();
        await update(ref(db), { [`groups/${gid}/members/${uid}`]: null, [`users/${uid}/groups/${gid}`]: null }).catch(e => toast("Çıkılamadı: " + e.message, true));
        store.lastGroup = null; go("#/");
      } });
  }

  const avatar = (u, name, big = false) => {
    const c = u === owner ? "var(--gold)" : "var(--primary)";
    return `<div class="av ${big ? "big" : ""}" style="color:${c};background:color-mix(in srgb, ${c} 14%, transparent)">${esc(initials(name))}</div>`;
  };
  function showMembers() {
    const sorted = [...memberList].sort((a, b) => (b.uid === owner) - (a.uid === owner) || isAdmin(b.uid) - isAdmin(a.uid) || (b.uid === uid) - (a.uid === uid) || a.name.localeCompare(b.name, "tr"));
    const nAdm = memberList.filter(m => isAdmin(m.uid) && m.uid !== owner).length;
    const can = m => isAdmin(uid) && m.uid !== uid && m.uid !== owner && (uid === owner || !isAdmin(m.uid));
    const sh = sheet(`<div class="row" style="margin-top:16px"><h2 class="grow" style="margin:0">Üyeler</h2><span class="cnt">${memberList.length} kişi</span></div>
      <p class="s" style="margin-top:4px">${isAdmin(uid) ? "Bir üyenin yanındaki ⋮ simgesine dokunarak yönetici yapabilir ya da gruptan çıkarabilirsiniz." : "Grubu kuran kişi ve yöneticiler duaları düzenleyebilir, sayacı düzeltebilir."}</p>
      <div class="glass soft"><div><b>1</b><span>KURUCU</span></div><div><b>${nAdm}</b><span>YÖNETİCİ</span></div><div><b>${Math.max(0, memberList.length - nAdm - 1)}</b><span>ÜYE</span></div></div>
      <div class="mlist">${sorted.map((m, i) => `<div class="mrow ${can(m) ? "tap" : ""}" data-m="${i}">${avatar(m.uid, m.name)}
        <div class="grow"><div class="name" style="font-size:16px">${esc(m.name)}</div><div class="chips" style="margin-top:4px">
        ${m.uid === owner ? chip("Kurucu", "var(--gold)") : isAdmin(m.uid) ? chip("Yönetici", "var(--primary)") : ""}${m.uid === uid ? chip("Siz", "var(--muted)") : ""}</div></div>
        ${can(m) ? `<span class="more">${I.more}</span>` : ""}</div>`).join("")}</div>`);
    sh.querySelectorAll(".mrow.tap").forEach(el => (el.onclick = () => { const m = sorted[+el.dataset.m]; closeSheet(); setTimeout(() => memberActions(m), 60); }));
  }
  function memberActions(m) {
    const items = [];
    if (uid === owner) items.push(isAdmin(m.uid)
      ? { icon: I.shieldOff, title: "Yöneticilikten al", desc: "Artık duaları düzenleyemez, üye çıkaramaz.", run: () => remove(ref(db, `groups/${gid}/admins/${m.uid}`)).then(() => toast(`${m.name} artık yönetici değil`)) }
      : { icon: I.shield, title: "Yönetici yap", desc: "Duaları düzenleyebilir, sayacı düzeltebilir, üye çıkarabilir.", run: () => set(ref(db, `groups/${gid}/admins/${m.uid}`), true).then(() => toast(`${m.name} artık grup yöneticisi`)) });
    items.push({ icon: I.personRemove, title: "Gruptan çıkar", desc: "Grubu artık göremez. Okumaları sayaçta kalır.", danger: true,
      run: () => confirmSheet({ title: `${m.name} çıkarılsın mı?`, msg: "Davet koduyla tekrar katılabilir.", ok: "Çıkar", danger: true, onOk: () => {
        const u = { [`groups/${gid}/members/${m.uid}`]: null };
        if (uid === owner) u[`groups/${gid}/admins/${m.uid}`] = null;
        update(ref(db), u).then(() => toast(`${m.name} gruptan çıkarıldı`)).catch(e => toast("Çıkarılamadı: " + e.message, true));
      } }) });
    menuSheet(`<div class="row" style="margin-top:16px">${avatar(m.uid, m.name, true)}<div class="grow"><h2 style="margin:0">${esc(m.name)}</h2><p class="s">${isAdmin(m.uid) ? "Grup yöneticisi" : "Grup üyesi"}</p></div></div>`, items);
  }

  listen(`groups/${gid}`, (s, err) => {
    if (err || !s) { store.lastGroup = null; toast("Bu gruba erişilemiyor", true); go("#/"); return; }
    info = { name: s.child("info/name").val() || "Grup", code: s.child("info/code").val() || "" };
    members = s.child("members").size;
    owner = s.child("info/createdBy").val() || "";
    admins = new Set(Object.keys(s.child("admins").val() || {}));
    memberList = []; s.child("members").forEach(m => { memberList.push({ uid: m.key, name: m.val() || "?" }); });
    $("#title").textContent = info.name;
    draw();
  });
  listen(null, s => { duas = []; s?.forEach(c => { duas.push(toDua(c)); }); draw(); }, query(ref(db, `g/${gid}/duas`), orderByChild("createdAt")));
  listen(`g/${gid}/presence`, s => { online = {}; s?.forEach(c => { online[c.key] = c.size; }); draw(); });
}

function toDua(s) {
  const v = s.val() || {};
  return { id: s.key, name: v.name || "Dua", text: v.text || "", target: v.target || 0, count: v.count || 0, rounds: v.rounds || 0,
    intent: v.intent || "", deadline: v.deadline || 0, hasImage: !!v.hasImage, showText: v.showText !== false, createdBy: v.createdBy || "" };
}
const reached = d => d.target > 0 && d.count >= d.target;
function daysLeft(d) { if (!d.deadline) return null; const now = Date.now(); if (now > d.deadline) return -1; return Math.floor((d.deadline - now) / 864e5) + 1; }

function miniRing(frac, done) {
  const r = 26, c = 2 * Math.PI * r, col = done ? "var(--gold)" : "var(--primary)";
  return `<svg class="mini" viewBox="0 0 60 60"><circle cx="30" cy="30" r="${r}" fill="none" stroke="${done ? "#F3E6CC" : "var(--soft)"}" stroke-width="5"/>
    <circle cx="30" cy="30" r="${r}" fill="none" stroke="${col}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - (done ? 1 : frac))}" transform="rotate(-90 30 30)"/>
    <text x="30" y="34.5" text-anchor="middle" fill="${col}" style="font-size:${done ? 20 : 12.5}px">${done ? "✓" : "%" + Math.floor(frac * 100)}</text></svg>`;
}
function chip(text, color) { return `<span class="chip" style="color:${color};background:color-mix(in srgb, ${color} 11%, transparent)">${esc(text)}</span>`; }

function duaCard(d, n) {
  const frac = d.target ? Math.min(1, d.count / d.target) : 0, done = reached(d), dl = daysLeft(d);
  const chips = [];
  if (n > 0) chips.push(chip(`● ${n} okuyor`, "var(--online)"));
  if (done) chips.push(chip("Hedefe ulaşıldı", "var(--gold)"));
  if (d.rounds > 0) chips.push(chip(`${d.rounds} tur`, "var(--primary)"));
  if (dl !== null && !done) chips.push(chip(dl < 0 ? "Süre doldu" : `⏳ ${dl} gün`, "var(--muted)"));
  return `<div class="card tap row" data-d="${d.id}">${miniRing(frac, done)}
    <div class="grow"><div class="name">${esc(d.name)}</div><div class="sub">${fmt(d.count)} / ${fmt(d.target)}</div>
    ${d.intent ? `<div class="sub" style="font-style:italic">“${esc(d.intent)}”</div>` : ""}
    ${chips.length ? `<div class="chips">${chips.join("")}</div>` : ""}</div>${I.chev}</div>`;
}

function duaForm(gid) {
  const sh = sheet(`<h2>Yeni dua</h2>
    <input class="field" id="n" placeholder="Dua adı (örn. Salâten Nâriye)">
    <input class="field" id="t" inputmode="numeric" placeholder="Hedef sayı" value="1000">
    <input class="field" id="i" placeholder="Niyet (isteğe bağlı)">
    <div class="err"></div><button class="primary">Kaydet</button>
    <p class="s" style="margin-top:10px">Dua görseli ve son tarih Android uygulamasından eklenebilir.</p>`);
  $(".primary", sh).onclick = async () => {
    const name = $("#n", sh).value.trim(), target = parseInt($("#t", sh).value, 10) || 0, intent = $("#i", sh).value.trim();
    if (!name) return ($(".err", sh).textContent = "Ad gerekli");
    if (target <= 0) return ($(".err", sh).textContent = "Hedef 0'dan büyük olmalı");
    const id = push(ref(db, `g/${gid}/duas`)).key;
    const b = `g/${gid}/duas/${id}`;
    await update(ref(db), { [`${b}/name`]: name, [`${b}/target`]: target, [`${b}/text`]: "", [`${b}/intent`]: intent || null,
      [`${b}/showText`]: true, [`${b}/count`]: 0, [`${b}/rounds`]: 0, [`${b}/createdBy`]: uid, [`${b}/createdAt`]: serverTimestamp() })
      .then(() => closeSheet()).catch(e => ($(".err", sh).textContent = "Eklenemedi: " + e.message));
  };
}

// ============================================================= OKUMA SAYFASI
function counterPage(gid, id) {
  setBar("", { back: () => go(`#/g/${gid}`), actions: `<button class="icon-btn" id="cm" aria-label="Menü" hidden>${I.more}</button>` });
  let gOwner = "", gAdmins = new Set();
  const amAdmin = () => uid === gOwner || gAdmins.has(uid);
  listen(`groups/${gid}`, s => {
    if (!s) return;
    gOwner = s.child("info/createdBy").val() || "";
    gAdmins = new Set(Object.keys(s.child("admins").val() || {}));
    const b = $("#cm"); if (b) b.hidden = !(amAdmin() || (d && d.createdBy === uid));
  });
  let d = null, all = [], round = [], mine = 0, roundMine = 0, showRound = true, roundUnsub = null, listenedRound = -1, img = null, lastCount = null;
  let sessionAdded = 0;
  const R = 63, C = 2 * Math.PI * R;
  view.innerHTML = `<div class="counter-wrap">
    <div class="c-head"><div class="top">
      <div class="ring"><svg viewBox="0 0 150 150">
        <circle cx="75" cy="75" r="${R}" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="11"/>
        <circle class="arc" id="arc" cx="75" cy="75" r="${R}" fill="none" stroke="#fff" stroke-width="11" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}"/></svg>
        <div class="mid"><div class="num" id="num">0</div><div class="pct" id="pct">%0</div></div></div>
      <div class="kv grow"><div class="k">HEDEF</div><div class="v" id="goal">–</div><div class="k">KALAN</div><div class="v" id="left">–</div>
        <span class="glass-chip" id="on">● Sadece siz</span><span class="glass-chip" id="rounds" hidden></span></div></div>
      <div class="intent" id="intent" hidden></div><div class="deadline" id="dl" hidden></div>
      <button class="newround" id="nr" hidden>Hedefe ulaşıldı 🤲 Yeni tura başla</button></div>
    <div class="c-mid">
      <div class="card dua-card" id="dcard" hidden><div class="toggle"><button id="tg" style="color:inherit;font-weight:700"></button>
        <span class="font-btns" id="fb"><button id="fm">A−</button><button id="fp" style="font-size:19px">A+</button></span></div>
        <div id="dbody"><img id="dimg" hidden alt=""><div class="txt" id="dtxt"></div></div></div>
      <div class="mine" id="mine"></div>
      <div class="card"><div class="row" style="justify-content:space-between"><b>Okuyanlar</b><div class="tabs" id="tabs" hidden><button id="t1">Bu tur</button><button id="t2">Tüm zamanlar</button></div></div>
        <div id="clist" style="margin-top:6px"></div></div>
    </div>
    <div class="c-bottom">
      <div class="session"><span class="l">Bu oturumda</span><span class="n" id="sess">0</span><button id="sreset">${I.refresh}Sıfırla</button></div>
      <button class="okudum" id="ok">OKUDUM<small>+1</small></button>
      <div class="two"><button class="tonal" id="undo">${I.minus}Azalt</button><button class="tonal" id="bulk">${I.many}Toplu ekle</button></div>
    </div></div>`;

  const drawSession = () => ($("#sess").textContent = fmt(store.session(gid, id)));
  drawSession();
  $("#sreset").onclick = () => { store.setSession(gid, id, 0); drawSession(); };
  $("#ok").onclick = () => add(1);
  $("#undo").onclick = undo;
  $("#bulk").onclick = bulkSheet;
  $("#t1").onclick = () => { showRound = true; drawList(); };
  $("#t2").onclick = () => { showRound = false; drawList(); };
  $("#tg").onclick = () => { store.setShow(gid, id, !store.show(gid, id, d.showText)); drawText(); };
  $("#fm").onclick = () => { store.font = Math.max(14, store.font - 2); drawText(); };
  $("#fp").onclick = () => { store.font = Math.min(40, store.font + 2); drawText(); };
  $("#nr").onclick = () => confirmSheet({ title: "Yeni tura başlansın mı?",
    msg: `Sayaç ${fmt(d.target)} azaltılacak ve tamamlanan tur sayısı 1 artacak. Hedefin üstündeki okumalar yeni tura aktarılır.`, ok: "Başlat", onOk: newRound });
  $("#cm").onclick = () => {
    const items = [];
    if (amAdmin()) {
      items.push({ icon: I.edit, title: "Sayacı düzelt", desc: "Ortak sayacı elle ayarlayın", run: fixCount });
      items.push({ icon: I.refresh, title: "Sıfırla / baştan başla", desc: "Sayaç, turlar ve okuyanlar", run: resetSheet });
    }
    if (amAdmin() || d.createdBy === uid) items.push({ icon: I.trash, title: "Duayı sil", desc: "Sayaç, katkı ve geçmişle birlikte", danger: true, run: deleteDua });
    menuSheet(`<h2>${esc(d.name)}</h2><p class="s">Yönetici işlemleri</p>`, items);
  };
  function fixCount() {
    inputSheet({ title: "Sayacı düzelt", sub: "Bu turun ortak sayacı herkes için bu değere ayarlanır. Kişi katkıları değişmez.", placeholder: "Doğru sayı", button: "Ayarla", value: String(d.count),
      onOk: v => { const n = parseInt(v, 10); if (!(n >= 0)) return "Geçerli bir sayı girin"; set(ref(db, `g/${gid}/duas/${id}/count`), n).then(() => toast("Sayaç ayarlandı")); return null; } });
  }
  function resetSheet() {
    let choice = -1;
    const sh = sheet(`<h2>Ne sıfırlansın?</h2><p class="s">Bu işlem gruptaki herkes için geçerlidir.</p>
      <button class="opt" data-c="0"><div class="badge sm">${I.refresh}</div><div class="grow"><div class="t">Sadece ortak sayaç</div><div class="d">Ortak sayaç sıfırlanır. Okuyanlar listesi ve tamamlanan turlar kalır.</div></div></button>
      <button class="opt danger-opt" data-c="1"><div class="badge sm">${I.trash}</div><div class="grow"><div class="t">Her şey (baştan başla)</div><div class="d">Ortak sayaç, tamamlanan turlar ve okuyanlar listesi sıfırlanır. Dua, görsel ve hedef kalır. Önceki dönemin özeti Geçmiş'e kaydedilir.</div></div></button>
      <div class="btnrow"><button class="soft-btn" id="rx">Vazgeç</button><button class="primary" id="ry" disabled>Sıfırla</button></div>`);
    sh.querySelectorAll("[data-c]").forEach(b => (b.onclick = () => {
      choice = +b.dataset.c;
      sh.querySelectorAll("[data-c]").forEach(x => x.classList.toggle("sel", x === b));
      const y = $("#ry", sh); y.disabled = false; y.textContent = choice ? "Baştan başla" : "Sayacı sıfırla"; y.classList.toggle("danger", choice === 1);
    }));
    $("#rx", sh).onclick = closeSheet;
    $("#ry", sh).onclick = async () => {
      closeSheet();
      if (choice === 0) return set(ref(db, `g/${gid}/duas/${id}/count`), 0).then(() => toast("Ortak sayaç sıfırlandı"));
      const total = all.reduce((a, r) => a + r.count, 0), hKey = push(ref(db, `g/${gid}/history/${id}`)).key;
      await update(ref(db), {
        [`g/${gid}/history/${id}/${hKey}`]: { type: "reset", total, people: all.length, rounds: d.rounds, count: d.count, completedAt: serverTimestamp(), by: store.name },
        [`g/${gid}/duas/${id}/count`]: 0, [`g/${gid}/duas/${id}/rounds`]: 0, [`g/${gid}/contrib/${id}`]: null, [`g/${gid}/rc/${id}`]: null,
      }).then(() => toast("Baştan başlandı. Önceki dönemin özeti kaydedildi.")).catch(e => toast("Sıfırlanamadı: " + e.message, true));
    };
  }
  function deleteDua() {
    confirmSheet({ title: `"${d.name}" silinsin mi?`, msg: "Duanın sayacı, katkıları ve geçmişi herkes için silinecek. Bu işlem geri alınamaz.", ok: "Sil", danger: true,
      onOk: () => { const b = `g/${gid}`; clearSubs(); update(ref(db), { [`${b}/duas/${id}`]: null, [`${b}/contrib/${id}`]: null, [`${b}/history/${id}`]: null,
        [`${b}/stats/${id}`]: null, [`${b}/presence/${id}`]: null, [`${b}/img/${id}`]: null, [`${b}/rc/${id}`]: null }).then(() => go(`#/g/${gid}`)); } });
  }

  function add(n) {
    if (!d) return;
    const b = `g/${gid}`, nm = contribName();
    update(ref(db), {
      [`${b}/duas/${id}/count`]: increment(n),
      [`${b}/contrib/${id}/${uid}/count`]: increment(n), [`${b}/contrib/${id}/${uid}/name`]: nm,
      [`${b}/rc/${id}/${d.rounds}/${uid}/count`]: increment(n), [`${b}/rc/${id}/${d.rounds}/${uid}/name`]: nm,
      [`${b}/stats/${id}/${dayKey()}`]: increment(n),
    });
    sessionAdded += n;
    store.setSession(gid, id, store.session(gid, id) + n); drawSession();
    if (n > 1) toast(`${fmt(n)} okuma eklendi. Allah kabul etsin.`);
    navigator.vibrate?.(30);
  }
  function undo() {
    if (!d || mine <= 0 || d.count <= 0) return toast("Geri alınacak okumanız yok", true);
    const b = `g/${gid}`, m = { [`${b}/duas/${id}/count`]: increment(-1), [`${b}/contrib/${id}/${uid}/count`]: increment(-1) };
    if (roundMine > 0) m[`${b}/rc/${id}/${d.rounds}/${uid}/count`] = increment(-1);
    if (sessionAdded > 0) { m[`${b}/stats/${id}/${dayKey()}`] = increment(-1); sessionAdded--; }
    update(ref(db), m);
    store.setSession(gid, id, store.session(gid, id) - 1); drawSession();
    toast("1 okuma geri alındı");
  }
  function bulkSheet() {
    const sh = sheet(`<h2>Toplu ekle</h2><p class="s">Tesbihle ya da başka yerde okuduklarınızı tek seferde ekleyin.</p>
      <input class="field" inputmode="numeric" placeholder="Kaç kere okudunuz?"><div class="quick">${[33, 99, 100, 1000].map(x => `<button>${x}</button>`).join("")}</div>
      <div class="err"></div><button class="primary">Ekle</button>`);
    const inp = $("input", sh);
    sh.querySelectorAll(".quick button").forEach(b => (b.onclick = () => (inp.value = b.textContent)));
    $(".primary", sh).onclick = () => {
      const n = parseInt(inp.value, 10) || 0;
      if (n <= 0) return ($(".err", sh).textContent = "1 veya daha büyük bir sayı girin");
      if (n > 100000) return ($(".err", sh).textContent = "En fazla 100.000");
      closeSheet(); add(n);
    };
    setTimeout(() => inp.focus(), 250);
  }
  async function newRound() {
    const r = await runTransaction(ref(db, `g/${gid}/duas/${id}`), v => {
      if (!v || !v.target || (v.count || 0) < v.target) return undefined;
      v.count -= v.target; v.rounds = (v.rounds || 0) + 1; return v;
    }).catch(e => toast("Hata: " + e.message, true));
    if (r?.committed) {
      const v = r.snapshot.val();
      push(ref(db, `g/${gid}/history/${id}`), { round: v.rounds, target: v.target, completedAt: serverTimestamp(), by: store.name });
    }
  }

  function drawHead() {
    $("#title").textContent = d.name;
    const num = $("#num"), f = d.target ? d.count / d.target : 0;
    if (num.textContent !== fmt(d.count)) { num.textContent = fmt(d.count); num.classList.remove("pulse"); void num.offsetWidth; num.classList.add("pulse"); }
    num.style.fontSize = fmt(d.count).length > 6 ? "26px" : "";
    $("#pct").textContent = "%" + Math.min(100, Math.floor(f * 100));
    $("#arc").style.strokeDashoffset = C * (1 - Math.min(1, f));
    $("#goal").textContent = fmt(d.target);
    $("#left").textContent = reached(d) ? "Tamam ✓" : fmt(Math.max(0, d.target - d.count));
    const rs = $("#rounds"); rs.hidden = !(d.rounds > 0); rs.textContent = `${d.rounds}. tur bitti`;
    const it = $("#intent"); it.hidden = !d.intent; it.textContent = `“${d.intent}”`;
    const dl = daysLeft(d), dle = $("#dl");
    dle.hidden = dl === null;
    if (dl !== null) {
      const date = new Date(d.deadline).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
      dle.textContent = reached(d) ? `Son tarih: ${date} · Hedefe ulaşıldı` : dl < 0 ? `Son tarih: ${date} · Süre doldu`
        : `Son tarih: ${date} · ${dl} gün kaldı · günde ~${fmt(Math.ceil(Math.max(0, d.target - d.count) / dl))}`;
    }
    $("#nr").hidden = !reached(d);
  }
  function drawText() {
    const has = !!d.text.trim(), hasImg = d.hasImage && img;
    $("#dcard").hidden = !(has || d.hasImage);
    const shown = store.show(gid, id, d.showText);
    $("#tg").textContent = shown ? "▾  Duayı gizle" : "▸  Duayı göster";
    $("#dbody").hidden = !shown;
    $("#fb").style.visibility = shown && has ? "visible" : "hidden";
    const im = $("#dimg"); im.hidden = !hasImg; if (hasImg && im.src !== img) im.src = img;
    const tx = $("#dtxt"); tx.hidden = !has; tx.textContent = d.text; tx.style.fontSize = store.font + "px";
  }
  function drawList() {
    const hasR = d && d.rounds > 0, rm = hasR && showRound, list = rm ? round : all;
    $("#tabs").hidden = !hasR;
    $("#t1").classList.toggle("on", rm); $("#t2").classList.toggle("on", !rm);
    $("#mine").textContent = (hasR ? `Bu turda: ${fmt(roundMine)}  ·  Toplam katkım: ${fmt(mine)}` : `Toplam katkım: ${fmt(mine)}`) + (store.anon ? "  (adım gizli)" : "");
    $("#clist").innerHTML = list.length ? list.slice(0, 100).map((r, i) => `<div class="contrib ${r.id === uid ? "me" : ""}"><span>${i + 1}. ${esc(r.name)}${r.id === uid ? " (siz)" : ""}</span><span class="n">${fmt(r.count)}</span></div>`).join("")
      : `<div class="sub">${rm ? "Bu turda henüz kimse okumadı." : "Henüz kimse okumadı."}</div>`;
  }
  const rows = s => { const out = []; s?.forEach(c => { const v = c.val() || {}; if ((v.count || 0) > 0) out.push({ id: c.key, name: v.name || ANON, count: v.count }); }); return out.sort((a, b) => b.count - a.count); };

  listen(`g/${gid}/duas/${id}`, s => {
    if (!s || !s.exists()) { toast("Bu dua silinmiş", true); go(`#/g/${gid}`); return; }
    const prev = lastCount;
    d = toDua(s); lastCount = d.count;
    drawHead(); drawText(); drawList();
    if (d.rounds !== listenedRound) {
      listenedRound = d.rounds; roundUnsub?.();
      roundUnsub = onValue(ref(db, `g/${gid}/rc/${id}/${d.rounds}`), rs => { round = rows(rs); roundMine = rs.child(uid).child("count").val() || 0; drawList(); });
    }
    $("#cm").hidden = !(amAdmin() || d.createdBy === uid);
    if (prev !== null && prev < d.target && d.count >= d.target)
      confirmSheet({ title: "Hedefe ulaşıldı", msg: `"${d.name}" ${fmt(d.target)} kere okundu. Allah kabul etsin.`, ok: "Yeni tura başla", cancel: "Kapat", emoji: "🤲", onOk: newRound });
  });
  subs.push(() => roundUnsub?.());
  listen(`g/${gid}/img/${id}`, s => { const v = s?.val(); img = v ? "data:image/jpeg;base64," + v : null; if (d) drawText(); });
  listen(`g/${gid}/contrib/${id}`, s => { all = rows(s); mine = s?.child(uid).child("count").val() || 0; if (d) drawList(); });
  listen(`g/${gid}/presence/${id}`, s => { const n = s?.size || 0; $("#on").textContent = n <= 1 ? "●  Sadece siz" : `●  ${n} kişi okuyor`; });

  // çevrimiçi kaydı
  const me = ref(db, `g/${gid}/presence/${id}/${uid}`);
  onDisconnect(me).remove();
  set(me, contribName());
  const onVis = () => (document.hidden ? remove(me) : set(me, contribName()));
  document.addEventListener("visibilitychange", onVis);
  leavePresence = () => { remove(me); document.removeEventListener("visibilitychange", onVis); };
}

// ============================================================= AYARLAR
function settingsPage() {
  setBar("Ayarlar", { back: () => go("#/") });
  const draw = () => {
    const cur = store.color;
    view.innerHTML = `<div class="section">TEMA RENGİ</div><div class="card"><div class="sub">Uygulamanın ana rengini seçin</div>
      <div class="swatches">${PRESETS.map(([n, c]) => `<button class="sw ${c === cur ? "on" : ""}" data-c="${c}" style="${c === cur ? "color:" + c : ""}"><i style="background:${c}">${c === cur ? "✓" : ""}</i>${n}</button>`).join("")}
      <label class="sw ${PRESETS.some(p => p[1] === cur) ? "" : "on"}" style="position:relative"><i style="background:conic-gradient(red,yellow,lime,cyan,blue,magenta,red)"></i>Özel renk
      <input type="color" id="cc" value="${cur}" style="position:absolute;inset:0;opacity:0"></label></div></div>
      <div class="section">PROFİL</div><div class="card">
        <div class="switch-row tap" id="rn"><div><div>Adınız</div><div class="sub">${esc(store.name)}</div></div>${I.chev}</div>
        <div class="switch-row tap" id="an"><div><div>Katkılarda adımı gizle</div><div class="sub">${store.anon ? `Listede “${ANON}” görünür` : "Katkılar listesinde adınız görünür"}</div></div><span class="tog ${store.anon ? "on" : ""}"></span></div></div>
      <div class="section">HESAP</div><div class="card">
        <div class="switch-row"><div><div>Kullanıcı adı</div><div class="sub">${esc(username())}</div></div></div>
        <div class="switch-row tap" id="lo"><div><div>Çıkış yap</div><div class="sub">Bu cihazdan hesabınızdan çıkın</div></div>${I.chev}</div></div>
      <div class="sub" style="text-align:center;margin-top:28px">Hayrat Dua · web sürümü 1.0.1</div>`;
    $("#lo").onclick = async () => {
      confirmSheet({ title: "Çıkış yapılsın mı?", msg: "Tekrar girmek için kullanıcı adınız ve şifreniz gerekir.", ok: "Çıkış yap", danger: true,
        onOk: async () => { await signOut(auth); store.name = ""; store.lastGroup = null; location.hash = ""; route(); } });
    };
    view.querySelectorAll("[data-c]").forEach(b => (b.onclick = () => { store.color = b.dataset.c; applyTheme(); draw(); }));
    $("#cc").onchange = e => { store.color = e.target.value; applyTheme(); draw(); };
    $("#rn").onclick = () => inputSheet({ title: "Adınızı değiştirin", sub: "Katkılar listesinde görünecek adınız.", placeholder: "Adınız", button: "Kaydet", value: store.name,
      onOk: v => { if (!v) return "Ad boş olamaz"; store.name = v; renameEverywhere(); setTimeout(draw, 50); return null; } });
    $("#an").onclick = () => { store.anon = !store.anon; renameEverywhere(); toast(store.anon ? `Katkı listelerinde adınız gizlenecek` : "Katkı listelerinde adınız görünecek"); draw(); };
  };
  draw();
}


// ============================================================= GİRİŞ / KAYIT
// Kullanıcı adı + şifre (Firebase e-posta/şifre; e-posta = ad@hayratdua.app).
// Kayıt için geçerli bir davet kodu gerekir. Grup kurmak yalnızca yetkililere açık.
const DOMAIN = "hayratdua.app";
let loginBusy = false;
const username = () => (auth.currentUser?.email || "").split("@")[0];
function cleanUser(raw) {
  const m = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", Ç: "c", Ğ: "g", I: "i", İ: "i", Ö: "o", Ş: "s", Ü: "u" };
  return [...raw.trim()].map(ch => m[ch] ?? ch.toLowerCase()).join("").replace(/ /g, ".").replace(/[^a-z0-9._-]/g, "");
}
function authMsg(e) {
  const c = (e && (e.code || e.message)) || "";
  if (/invalid-credential|wrong-password|user-not-found|invalid-login/.test(c)) return "Kullanıcı adı ya da şifre hatalı";
  if (/email-already-in-use|credential-already-in-use/.test(c)) return "Bu kullanıcı adı alınmış";
  if (/weak-password/.test(c)) return "Şifre en az 6 karakter olmalı";
  if (/network/.test(c)) return "İnternet bağlantısı yok";
  if (/too-many-requests/.test(c)) return "Çok fazla deneme yapıldı, biraz sonra tekrar deneyin";
  if (/operation-not-allowed|configuration-not-found/.test(c)) return "Kullanıcı adı ile giriş henüz açılmamış (Firebase ayarı)";
  return c;
}

function loginPage(mode = new URLSearchParams(location.search).get("kod") ? "register" : "login") {
  document.body.classList.remove("counter-page");
  $("#bar").hidden = true;
  const code0 = new URLSearchParams(location.search).get("kod") || "";
  const reg = mode === "register";
  view.innerHTML = `<div class="login-hero"><img src="icons/hayrat_logo.png" alt=""><div class="ar">السلام عليكم</div><div class="brand">HAYRAT DUA</div></div>
    <div class="login-card">
      <div class="seg"><button class="${reg ? "" : "on"}" id="tl">Giriş yap</button><button class="${reg ? "on" : ""}" id="tr">Kayıt ol</button></div>
      <h2>${reg ? "Kayıt ol" : "Hoş geldiniz"}</h2>
      <p class="s">${reg ? "Kayıt için bir grubun davet kodu gerekir. Kodu grubu kuran kişiden alın." : "Kullanıcı adınız ve şifrenizle giriş yapın."}</p>
      ${reg ? `<input class="field" id="fn" placeholder="Adınız (listelerde görünür)" autocomplete="name">` : ""}
      <input class="field" id="fu" placeholder="Kullanıcı adı" autocapitalize="none" autocorrect="off" autocomplete="username">
      <input class="field" id="fp" type="password" placeholder="Şifre (en az 6 karakter)" autocomplete="${reg ? "new-password" : "current-password"}">
      ${reg ? `<input class="field code" id="fc" inputmode="numeric" maxlength="6" placeholder="Davet kodu" value="${esc(code0)}">` : ""}
      <div class="err" id="fe"></div>
      <button class="primary" id="go">${reg ? "Kayıt ol ve gruba katıl" : "Giriş yap"}</button>
      <p class="s" style="text-align:center;margin-top:14px;font-size:12.5px">${reg ? "Kullanıcı adınızı ve şifrenizi unutmayın; başka cihazda da bunlarla girersiniz." : "Hesabınız yoksa “Kayıt ol” sekmesinden, aldığınız davet koduyla kayıt olun."}</p>
    </div>`;
  $("#tl").onclick = () => loginPage("login");
  $("#tr").onclick = () => loginPage("register");
  const err = $("#fe");
  $("#go").onclick = async () => {
    err.textContent = "";
    const name = reg ? $("#fn").value.trim() : "";
    const u = cleanUser($("#fu").value), p = $("#fp").value, code = reg ? $("#fc").value.trim() : "";
    if (u.length < 3) return (err.textContent = "Kullanıcı adı en az 3 karakter olmalı");
    if (p.length < 6) return (err.textContent = "Şifre en az 6 karakter olmalı");
    if (reg && !name) return (err.textContent = "Adınızı yazın");
    if (reg && code.length !== 6) return (err.textContent = "Davet kodu 6 haneli olmalı");
    $("#go").disabled = true; loginBusy = true;
    try {
      if (!reg) {
        if (auth.currentUser?.isAnonymous) await signOut(auth);
        const r = await signInWithEmailAndPassword(auth, `${u}@${DOMAIN}`, p);
        uid = r.user.uid;
        const s = await get(ref(db, `users/${uid}/name`)).catch(() => null);
        store.name = s?.val() || u;
        store.lastGroup = null;
      } else {
        if (!auth.currentUser) await signInAnonymously(auth);
        const gid = (await get(ref(db, `codes/${code}`))).val();
        if (!gid) throw { code: "x", message: "Bu davet kodu geçersiz" };
        if ((await get(ref(db, `usernames/${u}`))).exists()) throw { code: "auth/email-already-in-use" };
        const cred = EmailAuthProvider.credential(`${u}@${DOMAIN}`, p);
        const r = await linkWithCredential(auth.currentUser, cred);
        await r.user.getIdToken(true);
        uid = r.user.uid;
        await update(ref(db), {
          [`usernames/${u}`]: uid, [`users/${uid}/name`]: name, [`users/${uid}/username`]: u,
          [`groups/${gid}/members/${uid}`]: name, [`users/${uid}/groups/${gid}`]: true,
        });
        store.name = name; store.lastGroup = gid;
      }
      loginBusy = false;
      $("#bar").hidden = false;
      if (location.search) history.replaceState(null, "", location.pathname);
      location.hash = store.lastGroup ? `#/g/${store.lastGroup}` : "#/";
      route();
    } catch (e) {
      loginBusy = false; $("#go").disabled = false;
      err.textContent = e.code === "x" ? e.message : authMsg(e);
    }
  };
}

// ============================================================= başlangıç
view.innerHTML = `<div class="empty">Bağlanıyor…</div>`;
onAuthStateChanged(auth, user => {
  uid = user ? user.uid : null;
  if (user && !user.isAnonymous && !location.hash && store.lastGroup) location.hash = `#/g/${store.lastGroup}`;
  if (!loginBusy) route();
});
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
