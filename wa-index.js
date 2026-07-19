const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');
const express = require('express');
const fs = require('fs');
let P; try { P = require('pino')({ level: 'silent' }); } catch (e) { P = undefined; }

const PORT = process.env.PORT || 8199;
const TOKEN = (fs.existsSync('token.txt') ? fs.readFileSync('token.txt', 'utf8').trim() : 'changeme');
let currentQR = null, connected = false, me = null, lastEvent = 'starting', sock = null;
const messages = []; // {from, name, text, out, ts}

function pushMsg(m) { messages.push(m); if (messages.length > 500) messages.shift(); }

async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  let version; try { ({ version } = await fetchLatestBaileysVersion()); } catch (e) {}
  sock = makeWASocket({ version, auth: state, printQRInTerminal: false, logger: P, browser: ['Shaheen Clinic', 'Chrome', '1.0'], syncFullHistory: false });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', (u) => {
    const { connection, lastDisconnect, qr } = u;
    if (qr) { currentQR = qr; lastEvent = 'qr-ready'; }
    if (connection === 'open') { connected = true; currentQR = null; me = sock.user && sock.user.id; lastEvent = 'connected'; }
    if (connection === 'close') {
      connected = false;
      const code = lastDisconnect && lastDisconnect.error && lastDisconnect.error.output && lastDisconnect.error.output.statusCode;
      lastEvent = 'closed:' + code;
      if (code !== DisconnectReason.loggedOut) setTimeout(startSock, 3000); else currentQR = null;
    }
  });
  sock.ev.on('messages.upsert', (mu) => {
    try { for (const msg of mu.messages) {
      if (!msg.message) continue;
      const jid = msg.key.remoteJid || '';
      if (jid.endsWith('@g.us') || jid === 'status@broadcast') continue; // skip groups/status
      const text = msg.message.conversation || (msg.message.extendedTextMessage && msg.message.extendedTextMessage.text) || '[media/other]';
      const rec = { from: jid, name: (msg.pushName || ''), text, out: !!msg.key.fromMe, ts: Date.now() };
      pushMsg(rec);
      if (!msg.key.fromMe) { try { fs.appendFileSync('leads.log', new Date().toISOString() + '\t' + jid + '\t' + text + '\n'); } catch (e) {} }
    } } catch (e) {}
  });
}

function toJid(n) { n = String(n).replace(/[^0-9]/g, ''); return n.includes('@') ? n : n + '@s.whatsapp.net'; }
function gate(req, res) { if ((req.query.k || '') !== TOKEN) { res.status(401).send('unauthorized'); return false; } return true; }

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/qr.png', async (req, res) => { if (connected || !currentQR) return res.status(204).end(); try { res.type('png').send(await qrcode.toBuffer(currentQR, { width: 340, margin: 2 })); } catch (e) { res.status(500).end(); } });
app.get('/status', (req, res) => res.json({ connected, hasQr: !!currentQR, me, lastEvent }));
app.get('/messages', (req, res) => { if (!gate(req, res)) return; res.json(messages.slice(-200)); });
app.all('/send', async (req, res) => {
  if (!gate(req, res)) return;
  const to = req.query.to || req.body.to; const text = req.query.text || req.body.text;
  if (!to || !text) return res.status(400).json({ ok: false, err: 'need to & text' });
  if (!connected || !sock) return res.status(503).json({ ok: false, err: 'not connected' });
  try { const jid = toJid(to); await sock.sendMessage(jid, { text: String(text) }); pushMsg({ from: jid, name: 'you', text: String(text), out: true, ts: Date.now() }); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ ok: false, err: e.message }); }
});
app.get('/ui', (req, res) => {
  if (!gate(req, res)) return;
  res.set('Cache-Control', 'no-store');
  res.send(UI.replace(/__K__/g, TOKEN));
});
app.get('/', (req, res) => { res.set('Cache-Control', 'no-store'); res.send(QRPAGE); });

const QRPAGE = "<!DOCTYPE html><html><head><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><title>Shaheen WhatsApp</title><style>body{font-family:system-ui,Arial;background:#0e4d3c;color:#f3f1e9;margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px}.card{background:#fff;border-radius:20px;padding:22px}#qr{width:340px;height:340px;background:#f2f2f2;border-radius:10px;display:block}.ok{color:#25D366;font-size:24px;font-weight:700;margin-top:14px}</style></head><body><h1>Shaheen Clinic WhatsApp</h1><div class=card><img id=qr alt='loading...'><div id=ok class=ok style='display:none'>Connected</div></div><div id=stat style='margin-top:14px;opacity:.85'>...</div><script>let done=false;async function t(){if(done)return;try{let s=await (await fetch('/status',{cache:'no-store'})).json();if(s.connected){done=true;document.getElementById('qr').style.display='none';document.getElementById('ok').style.display='block';document.getElementById('stat').textContent='Linked. Open /ui to chat.';return;}document.getElementById('stat').textContent=s.hasQr?'Scan with WhatsApp Linked Devices':'...';document.getElementById('qr').src='/qr.png?t='+Date.now();}catch(e){}setTimeout(t,3500);}t();</script></body></html>";

const UI = "<!DOCTYPE html><html><head><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><title>Shaheen WhatsApp Inbox</title>"
+ "<style>body{font-family:system-ui,Arial;margin:0;background:#e5ddd5;height:100vh;display:flex;flex-direction:column}header{background:#0e4d3c;color:#fff;padding:10px 14px;font-weight:600}#feed{flex:1;overflow-y:auto;padding:12px}"
+ ".m{max-width:75%;margin:6px 0;padding:8px 12px;border-radius:10px;background:#fff;box-shadow:0 1px 1px rgba(0,0,0,.1);font-size:14px;word-wrap:break-word}.out{background:#dcf8c6;margin-left:auto}.who{font-size:11px;color:#0e4d3c;font-weight:600;margin-bottom:2px}.t{font-size:10px;color:#888;text-align:right;margin-top:2px}"
+ "form{display:flex;gap:6px;padding:8px;background:#f0f0f0}input{padding:10px;border:1px solid #ccc;border-radius:8px;font-size:14px}#to{width:150px}#tx{flex:1}button{background:#25D366;color:#04331c;border:0;border-radius:8px;padding:0 16px;font-weight:700;cursor:pointer}</style></head>"
+ "<body><header>Shaheen Clinic WhatsApp Inbox</header><div id=feed></div>"
+ "<form onsubmit='return send()'><input id=to placeholder='92300...' inputmode=numeric><input id=tx placeholder='Type a reply...' autocomplete=off><button>Send</button></form>"
+ "<script>const K='__K__';let last=0;function esc(s){return (s+'').replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]));}"
+ "async function load(){try{let ms=await (await fetch('/messages?k='+K,{cache:'no-store'})).json();let f=document.getElementById('feed');let atBottom=f.scrollHeight-f.scrollTop-f.clientHeight<80;f.innerHTML=ms.map(m=>`<div class='m ${m.out?'out':''}'><div class='who'>${esc(m.out?'You':(m.name||m.from.split('@')[0]))}</div>${esc(m.text)}<div class='t'>${new Date(m.ts).toLocaleTimeString()}</div></div>`).join('');if(atBottom)f.scrollTop=f.scrollHeight;}catch(e){}}"
+ "async function send(){let to=document.getElementById('to').value.trim(),tx=document.getElementById('tx').value.trim();if(!to||!tx)return false;document.getElementById('tx').value='';await fetch('/send?k='+K,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to,text:tx})});setTimeout(load,400);return false;}"
+ "load();setInterval(load,3000);</script></body></html>";

app.listen(PORT, () => console.log('WA bridge (secured) on http://localhost:' + PORT));
startSock().catch(e => console.error('startSock', e.message));
