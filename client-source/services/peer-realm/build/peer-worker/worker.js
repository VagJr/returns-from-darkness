var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// security.mjs
function legacyHash(text) {
  const data = new TextEncoder().encode(text), h = [1732584193, 4023233417, 2562383102, 271733878, 3285377520];
  const rol = /* @__PURE__ */ __name((v, n) => (v << (n & 31) | v >>> 32 - (n & 31)) >>> 0, "rol");
  for (let offset = 0; offset < data.length; offset += 64) {
    const block = new Uint8Array(64);
    block.set(data.subarray(offset, offset + 64));
    const view2 = new DataView(block.buffer), w = [];
    for (let i = 0; i < 16; i++) w[i] = view2.getUint32(i * 4, true);
    for (let i = 16; i < 80; i++) w[i] = rol(1, w[i - 16] ^ w[i - 8] ^ w[i - 14] ^ w[i - 3]);
    let [a, b, c, d, e] = h;
    for (let i = 0; i < 80; i++) {
      const f = i < 20 ? b & c | ~b & d : i < 40 ? b ^ c ^ d : i < 60 ? b & c | b & d | c & d : b ^ c ^ d;
      const k = i < 20 ? 1518500249 : i < 40 ? 1859775393 : i < 60 ? 2400959708 : 3395469782;
      [a, b, c, d, e] = [rol(a, 5) + (f >>> 0) + e + w[i] + k >>> 0, a, rol(b, 30), c, d];
    }
    [a, b, c, d, e].forEach((v, i) => h[i] = h[i] + v >>> 0);
  }
  const result = new Uint8Array(20), view = new DataView(result.buffer);
  h.forEach((v, i) => view.setUint32(i * 4, v, true));
  return result;
}
__name(legacyHash, "legacyHash");
var hex = /* @__PURE__ */ __name((data) => Array.from(new Uint8Array(data), (v) => v.toString(16).padStart(2, "0")).join(""), "hex");
var random = /* @__PURE__ */ __name((size = 32) => {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}, "random");
var digest = /* @__PURE__ */ __name(async (value) => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))), "digest");
function equal(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}
__name(equal, "equal");
async function passwordKey(password, salt, scheme = "pbkdf2") {
  const raw = scheme === "legacy-pbkdf2" ? legacyHash(password.toLowerCase()) : new TextEncoder().encode(password);
  const key = await crypto.subtle.importKey("raw", raw, "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations: 1e5 }, key, 256));
}
__name(passwordKey, "passwordKey");
var validUser = /* @__PURE__ */ __name((value) => typeof value === "string" && /^[a-z][a-z0-9_-]{2,15}$/i.test(value), "validUser");
var validToken = /* @__PURE__ */ __name((value) => typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value), "validToken");
function validateSignal(input) {
  if (!input || !Number.isInteger(input.to) || input.to < 0 || input.to > 3) throw Error("Destino inv\xE1lido.");
  if (!["description", "candidate"].includes(input.op)) throw Error("Sinal inv\xE1lido.");
  if (input.op === "description" && (!["offer", "answer"].includes(input.type) || typeof input.sdp !== "string" || input.sdp.length > 32768 || !input.sdp.startsWith("v=0"))) throw Error("Descri\xE7\xE3o inv\xE1lida.");
  if (input.op === "candidate" && (typeof input.candidate !== "string" || input.candidate.length > 2048 || typeof input.mid !== "string" || input.mid.length > 32)) throw Error("Candidato inv\xE1lido.");
}
__name(validateSignal, "validateSignal");

// worker.mjs
var TTL = 18e4;
var SESSION = 54e5;
var CHANNELS = ["Tristram", "Procurando Grupo", "Comercio", "Arena"];
var json = /* @__PURE__ */ __name((data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } }), "json");
var fail = /* @__PURE__ */ __name((message, status = 400) => {
  throw Object.assign(Error(message), { status });
}, "fail");
async function body(req, limit = 8192) {
  const text = await req.text();
  if (text.length > limit) fail("Mensagem acima do limite.", 413);
  try {
    return JSON.parse(text || "{}");
  } catch {
    fail("Mensagem inv\xE1lida.");
  }
}
__name(body, "body");
function bearer(req) {
  const value = req.headers.get("Authorization") || "";
  return /^Bearer [A-Za-z0-9_-]{43}$/.test(value) ? value.slice(7) : "";
}
__name(bearer, "bearer");
var roomStub = /* @__PURE__ */ __name((env, id) => env.SIGNALS.get(env.SIGNALS.idFromName(id)), "roomStub");
var community = /* @__PURE__ */ __name((env) => env.COMMUNITY.get(env.COMMUNITY.idFromName("realm-v1")), "community");
var call = /* @__PURE__ */ __name((stub, path, input) => stub.fetch(new Request("https://internal" + path, { method: "POST", body: JSON.stringify(input) })), "call");
var publicRoom = /* @__PURE__ */ __name((r) => ({ id: r.id, name: r.name, creator: r.creator, mode: r.mode, difficulty: r.difficulty, capacity: 4, locked: !!r.passwordHash, contentHash: r.contentHash, players: r.members.map((m) => ({ user: m.user, slot: m.slot, connected: (r.connected || []).includes(m.slot) })), createdAt: r.createdAt, hostReady: (r.connected || []).includes(0) }), "publicRoom");
var worker_default = {
  async fetch(req, env) {
    const url = new URL(req.url), origin = req.headers.get("Origin");
    if (origin && origin !== env.SITE_ORIGIN) return json({ error: "Origem n\xE3o autorizada." }, 403);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": env.SITE_ORIGIN, "Access-Control-Allow-Methods": "GET, POST", "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Max-Age": "600" } });
    let result;
    try {
      const signal = /^\/signal\/([a-f0-9-]{36})(\/bootstrap)?$/.exec(url.pathname);
      if (signal) {
        if (signal[2] && req.method !== "POST" || !signal[2] && req.headers.get("Upgrade") !== "websocket") return json({ error: "Rota indispon\xEDvel." }, 404);
        result = await roomStub(env, signal[1]).fetch(req);
      } else if (url.pathname === "/health" || /^\/api\/(login|register|state|channel|chat|rooms\/(create|join|leave)|logout|launch|native\/connect)$/.test(url.pathname)) result = await community(env).fetch(req);
      else if (url.pathname === "/migration" && env.MIGRATION_ENABLED === "true" && env.MIGRATION_TOKEN && equal(req.headers.get("Authorization"), "Bearer " + env.MIGRATION_TOKEN)) result = await community(env).fetch(req);
      else return json({ error: "Rota indispon\xEDvel." }, 404);
    } catch (error) {
      result = json({ error: error.status ? error.message : "N\xE3o foi poss\xEDvel concluir a opera\xE7\xE3o." }, error.status || 503);
    }
    if (result.status === 101) return result;
    const response = new Response(result.body, result);
    response.headers.set("Access-Control-Allow-Origin", env.SITE_ORIGIN);
    response.headers.set("Vary", "Origin");
    return response;
  }
};
var Community = class {
  static {
    __name(this, "Community");
  }
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS accounts (name TEXT PRIMARY KEY, display TEXT NOT NULL, salt TEXT NOT NULL, verifier TEXT NOT NULL, scheme TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, user TEXT NOT NULL, channel TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, record TEXT NOT NULL, updated INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, channel TEXT NOT NULL, user TEXT NOT NULL, text TEXT NOT NULL, at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, until INTEGER NOT NULL);`);
  }
  rows(query, ...args) {
    return this.sql.exec(query, ...args).toArray();
  }
  async limit(key, max, window = 6e4) {
    const now = Date.now(), r = this.rows("SELECT count,until FROM limits WHERE key=?", key)[0];
    if (r && r.until > now && r.count >= max) fail("Aguarde um instante.", 429);
    this.sql.exec("INSERT OR REPLACE INTO limits VALUES (?,?,?)", key, r && r.until > now ? r.count + 1 : 1, r && r.until > now ? r.until : now + window);
  }
  rooms() {
    return this.rows("SELECT record FROM rooms WHERE updated>?", Date.now() - TTL).map((r) => JSON.parse(r.record));
  }
  save(room) {
    this.sql.exec("INSERT OR REPLACE INTO rooms VALUES (?,?,?)", room.id, JSON.stringify(room), room.updated);
  }
  async session(req) {
    const token = bearer(req);
    if (!token) fail("Entre em sua conta.", 401);
    const hash = await digest(token), s = this.rows("SELECT * FROM sessions WHERE hash=? AND expires>?", hash, Date.now())[0];
    if (!s) fail("Entre em sua conta.", 401);
    if (s.expires < Date.now() + SESSION - 9e5) this.sql.exec("UPDATE sessions SET expires=? WHERE hash=?", Date.now() + SESSION, hash);
    return s;
  }
  async leave(user, room) {
    if (room.creator.toLowerCase() === user.toLowerCase()) {
      await call(roomStub(this.env, room.id), "/internal/close", {});
      this.sql.exec("DELETE FROM rooms WHERE id=?", room.id);
    } else {
      room.members = room.members.filter((m) => m.user.toLowerCase() !== user.toLowerCase());
      await call(roomStub(this.env, room.id), "/internal/members", { members: room.members });
      room.connected = (room.connected || []).filter((slot) => room.members.some((m) => m.slot === slot));
      this.save(room);
    }
  }
  async fetch(req) {
    const path = new URL(req.url).pathname, now = Date.now();
    try {
      if (path === "/internal/heartbeat") {
        const input2 = await body(req);
        const row = this.rows("SELECT record FROM rooms WHERE id=?", input2.id)[0];
        if (row) {
          const room = JSON.parse(row.record);
          room.updated = now;
          room.connected = input2.connected;
          this.save(room);
        }
        return json({ ok: true });
      }
      if (path === "/internal/close") {
        const input2 = await body(req);
        this.sql.exec("DELETE FROM rooms WHERE id=?", input2.id);
        return json({ ok: true });
      }
      if (path === "/health") {
        const rooms = this.rooms();
        return json({ service: "Returns from Darkness community", gatewayListening: true, lobbySessions: this.rows("SELECT COUNT(DISTINCT user) AS n FROM sessions WHERE expires>?", now)[0].n, rooms: rooms.length, connectedGamePlayers: rooms.reduce((n, r) => n + (r.connected?.length || 0), 0), transport: "native-webrtc-host", playersPerRoom: 4, contentHash: this.env.CONTENT_HASH, dependsOnLocalPc: false, turnRelayConfigured: !!this.env.TURN_KEY_ID });
      }
      if (path === "/migration") {
        const input2 = await body(req, 262144);
        if (!Array.isArray(input2.accounts) || input2.accounts.length > 500) fail("Importa\xE7\xE3o inv\xE1lida.");
        let imported = 0;
        for (const a of input2.accounts) {
          if (!validUser(a.name) || !/^[a-f0-9]{64}$/.test(a.verifier) || !/^[a-f0-9]{32}$/.test(a.salt) || a.scheme !== "legacy-pbkdf2") fail("Importa\xE7\xE3o inv\xE1lida.");
          if (this.rows("SELECT name FROM accounts WHERE name=?", a.name.toLowerCase()).length) continue;
          this.sql.exec("INSERT INTO accounts VALUES (?,?,?,?,?)", a.name.toLowerCase(), a.name, a.salt, a.verifier, a.scheme);
          imported++;
        }
        return json({ imported });
      }
      if (["/api/login", "/api/register"].includes(path)) {
        if (req.method !== "POST") fail("M\xE9todo inv\xE1lido.", 405);
        const input2 = await body(req);
        const ip = await digest(req.headers.get("CF-Connecting-IP") || "proxy");
        await this.limit("auth:" + ip, 12);
        if (!validUser(input2.username) || typeof input2.password !== "string" || !/^[\x21-\x7e]{8,64}$/.test(input2.password)) fail("Use uma conta v\xE1lida e uma senha de 8 a 64 caracteres.");
        const name = input2.username.toLowerCase();
        let account = this.rows("SELECT * FROM accounts WHERE name=?", name)[0];
        if (path === "/api/register") {
          if (account) fail("Conta j\xE1 existe.", 409);
          if (this.rows("SELECT COUNT(*) AS n FROM accounts")[0].n >= 1e4) fail("Limite de contas atingido.", 429);
          const salt = random(16), verifier = await passwordKey(input2.password, salt);
          account = { name, display: input2.username, salt, verifier, scheme: "pbkdf2" };
          this.sql.exec("INSERT INTO accounts VALUES (?,?,?,?,?)", name, input2.username, salt, verifier, "pbkdf2");
        } else {
          const candidate = await passwordKey(input2.password, account?.salt || "missing-account-salt", account?.scheme || "pbkdf2");
          if (!account || !equal(account.verifier, candidate)) fail("Conta ou senha inv\xE1lida.", 401);
        }
        const token = random();
        this.sql.exec("INSERT INTO sessions VALUES (?,?,?,?)", await digest(token), account.display, "Tristram", now + SESSION);
        await this.ctx.storage.setAlarm(now + TTL);
        return json({ username: account.display, sessionToken: token });
      }
      const s = await this.session(req), user = s.user;
      if (path === "/api/state" && req.method === "GET") {
        const events = this.rows("SELECT user,text,at FROM messages WHERE channel=? ORDER BY id DESC LIMIT 100", s.channel).reverse().map((e) => ({ ...e, type: 5 }));
        const users = this.rows("SELECT DISTINCT user FROM sessions WHERE channel=? AND expires>?", s.channel, now).map((r) => r.user);
        return json({ username: user, channel: s.channel, channels: CHANNELS, users, events, rooms: this.rooms().map(publicRoom), contentHash: this.env.CONTENT_HASH, transport: "native-webrtc-host", clientVersion: this.env.CLIENT_VERSION, clientOpen: false });
      }
      if (req.method !== "POST") fail("M\xE9todo inv\xE1lido.", 405);
      const input = await body(req);
      await this.limit("action:" + s.hash, 40, 1e4);
      if (path === "/api/channel") {
        if (!CHANNELS.includes(input.channel)) fail("Canal inv\xE1lido.");
        this.sql.exec("UPDATE sessions SET channel=? WHERE hash=?", input.channel, s.hash);
        return json({ ok: true });
      }
      if (path === "/api/chat") {
        await this.limit("chat:" + user.toLowerCase(), 5, 1e4);
        if (typeof input.text !== "string" || input.text.trim().length < 1 || input.text.length > 240 || /[\x00-\x1f]/.test(input.text)) fail("Mensagem inv\xE1lida.");
        this.sql.exec("INSERT INTO messages(channel,user,text,at) VALUES (?,?,?,?)", s.channel, user, input.text.trim(), now);
        this.sql.exec("DELETE FROM messages WHERE channel=? AND id NOT IN (SELECT id FROM messages WHERE channel=? ORDER BY id DESC LIMIT 100)", s.channel, s.channel);
        return json({ ok: true });
      }
      const current = this.rooms().find((r) => r.members.some((m) => m.user.toLowerCase() === user.toLowerCase()));
      if (path === "/api/logout") {
        this.sql.exec("DELETE FROM sessions WHERE hash=?", s.hash);
        if (!this.rows("SELECT hash FROM sessions WHERE user=? AND expires>?", user, now).length && current && !current.connected?.length) await this.leave(user, current);
        return json({ ok: true });
      }
      if (path === "/api/rooms/create") {
        if (current) fail("Saia da sala atual antes de criar outra.");
        if (input.contentHash !== this.env.CONTENT_HASH) fail("Pacote de conte\xFAdo incompat\xEDvel.");
        if (typeof input.name !== "string" || input.name.trim().length < 2 || input.name.length > 40 || /[\x00-\x1f]/.test(input.name)) fail("Nome de sala inv\xE1lido.");
        if (this.rooms().length >= 64) fail("Limite de salas atingido.", 429);
        if (!["campaign-coop", "coliseum-pvp"].includes(input.mode || "campaign-coop")) fail("Modo inv\xE1lido.");
        if (![0, 1, 2].includes(input.difficulty || 0)) fail("Dificuldade inv\xE1lida.");
        const password = input.password || "";
        if (typeof password !== "string" || password.length > 64) fail("Senha de sala inv\xE1lida.");
        const room = { id: crypto.randomUUID(), name: input.name.trim(), creator: user, mode: input.mode || "campaign-coop", difficulty: input.difficulty || 0, seed: crypto.getRandomValues(new Uint32Array(1))[0], contentHash: this.env.CONTENT_HASH, members: [{ user, slot: 0 }], connected: [], passwordSalt: random(16), passwordHash: null, createdAt: now, updated: now };
        if (password) room.passwordHash = await passwordKey(password, room.passwordSalt);
        const response = await call(roomStub(this.env, room.id), "/internal/init", room);
        if (!response.ok) fail("N\xE3o foi poss\xEDvel abrir a sala.", 503);
        this.save(room);
        return json({ room: publicRoom(room) });
      }
      if (path === "/api/rooms/join") {
        const room = this.rooms().find((r) => r.id === input.roomId);
        if (!room) fail("Sala n\xE3o encontrada.", 404);
        if (current && current.id !== room.id) fail("Saia da sala atual antes de entrar em outra.");
        if (room.contentHash !== input.contentHash) fail("Pacote de conte\xFAdo incompat\xEDvel.");
        if (room.passwordHash && !equal(room.passwordHash, await passwordKey(input.password || "", room.passwordSalt))) fail("Senha da sala incorreta.", 403);
        if (!room.members.some((m) => m.user.toLowerCase() === user.toLowerCase())) {
          if (room.members.length >= 4) fail("Sala cheia: quatro jogadores.", 409);
          let slot = 1;
          while (room.members.some((m) => m.slot === slot)) slot++;
          room.members.push({ user, slot });
          await call(roomStub(this.env, room.id), "/internal/members", { members: room.members });
          this.save(room);
        }
        return json({ room: publicRoom(room) });
      }
      if (path === "/api/rooms/leave") {
        if (!current || current.id !== input.roomId) fail("Sala n\xE3o encontrada.", 404);
        await this.leave(user, current);
        return json({ ok: true });
      }
      if (["/api/launch", "/api/native/connect"].includes(path)) {
        if (!current || current.id !== input.roomId) fail("Entre na sala primeiro.");
        const member = current.members.find((m) => m.user.toLowerCase() === user.toLowerCase()), ticket = random();
        const result = await call(roomStub(this.env, current.id), "/internal/ticket", { slot: member.slot, ticketHash: await digest(ticket), expires: now + 12e4 });
        if (!result.ok) fail("Seu cliente j\xE1 est\xE1 conectado. Feche-o antes de entrar novamente.", 409);
        const payload = { transport: "webrtc", signalUrl: "https://returns-darkness-realm.oblique-tactical.workers.dev", roomId: current.id, ticket, contentHash: this.env.CONTENT_HASH, username: user, room: current.name, expires: now + 12e4 };
        const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload)))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
        return json({ launchUri: "rfd://play/" + encoded, message: member.slot === 0 ? "Abra seu personagem para hospedar a partida." : "Abra seu personagem para reunir-se ao grupo." });
      }
      fail("Rota indispon\xEDvel.", 404);
    } catch (error) {
      return json({ error: error.status ? error.message : "N\xE3o foi poss\xEDvel concluir a opera\xE7\xE3o." }, error.status || 503);
    }
  }
  async alarm() {
    const now = Date.now();
    this.sql.exec("DELETE FROM sessions WHERE expires<?", now);
    this.sql.exec("DELETE FROM limits WHERE until<?", now);
    this.sql.exec("DELETE FROM rooms WHERE updated<?", now - TTL);
    if (this.rows("SELECT COUNT(*) AS n FROM sessions")[0].n || this.rows("SELECT COUNT(*) AS n FROM rooms")[0].n) await this.ctx.storage.setAlarm(now + TTL);
  }
};
var SignalRoom = class {
  static {
    __name(this, "SignalRoom");
  }
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }
  async notify(input) {
    return call(community(this.env), "/internal/heartbeat", input);
  }
  async fetch(req) {
    const path = new URL(req.url).pathname;
    try {
      if (path === "/internal/init") {
        await this.ctx.storage.put("room", await body(req));
        await this.ctx.storage.setAlarm(Date.now() + TTL);
        return json({ ok: true });
      }
      if (path === "/internal/close") {
        await this.close();
        return json({ ok: true });
      }
      const room = await this.ctx.storage.get("room");
      if (!room || Date.now() - room.updated > TTL) fail("A sala foi encerrada.", 410);
      if (path === "/internal/members") {
        const { members } = await body(req);
        room.members = members;
        for (const ws of this.ctx.getWebSockets()) {
          const a = ws.deserializeAttachment();
          if (a?.slot !== void 0 && !members.some((m) => m.slot === a.slot && m.user === a.user)) ws.close(1e3, "Voc\xEA saiu da sala");
        }
        await this.ctx.storage.put("room", room);
        return json({ ok: true });
      }
      if (path === "/internal/ticket") {
        const input = await body(req);
        if (this.ctx.getWebSockets().some((ws) => ws.deserializeAttachment()?.slot === input.slot && ws.deserializeAttachment()?.authenticated)) return json({ error: "Cliente conectado." }, 409);
        await this.ctx.storage.put("ticket:" + input.slot, input);
        return json({ ok: true });
      }
      if (path.endsWith("/bootstrap")) {
        const input = await body(req), hash = validToken(input.ticket) ? await digest(input.ticket) : "";
        return await this.ctx.blockConcurrencyWhile(async () => {
          const tickets = await this.ctx.storage.list({ prefix: "ticket:" });
          let found;
          for (const [key, t] of tickets) if (t.expires > Date.now() && equal(t.ticketHash, hash)) {
            await this.ctx.storage.delete(key);
            found = t;
            break;
          }
          if (!found) fail("Convite expirado. Abra a sala novamente.", 403);
          const member = room.members.find((m) => m.slot === found.slot);
          if (!member) fail("Participante inv\xE1lido.", 403);
          const token = random();
          await this.ctx.storage.put("peer:" + member.slot, { hash: await digest(token), user: member.user, expires: Date.now() + 288e5 });
          return json({ token, slot: member.slot, host: member.slot === 0, seed: room.seed, difficulty: room.difficulty, mode: room.mode, contentHash: room.contentHash, members: room.members, iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun.cloudflare.com:3478" }], turnConfigured: false });
        });
      }
      if (req.headers.get("Upgrade") === "websocket") {
        if (this.ctx.getWebSockets().length >= 12) fail("Sala ocupada.", 429);
        const pair = new WebSocketPair();
        this.ctx.acceptWebSocket(pair[1]);
        pair[1].serializeAttachment({ authenticated: false, created: Date.now(), window: Date.now(), count: 0 });
        return new Response(null, { status: 101, webSocket: pair[0] });
      }
      fail("Rota indispon\xEDvel.", 404);
    } catch (error) {
      return json({ error: error.status ? error.message : "N\xE3o foi poss\xEDvel concluir a opera\xE7\xE3o." }, error.status || 503);
    }
  }
  async close() {
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(JSON.stringify({ op: "room-closed" }));
        ws.close(1e3, "Sala encerrada");
      } catch {
      }
    }
    await this.ctx.storage.deleteAll();
  }
  async webSocketMessage(ws, message) {
    try {
      if (typeof message !== "string" || message.length > 35e3) fail("Mensagem inv\xE1lida.");
      const input = JSON.parse(message), a = ws.deserializeAttachment(), now = Date.now(), room = await this.ctx.storage.get("room");
      if (!room) fail("Sala encerrada.");
      if (now - a.window > 6e4) {
        a.window = now;
        a.count = 0;
      }
      if (++a.count > 180) fail("Limite de sinais.");
      ws.serializeAttachment(a);
      if (input.op === "auth") {
        if (!Number.isInteger(input.slot) || !validToken(input.token)) fail("Credencial inv\xE1lida.");
        const grant = await this.ctx.storage.get("peer:" + input.slot);
        if (!grant || grant.expires < now || !equal(grant.hash, await digest(input.token)) || !room.members.some((m) => m.slot === input.slot && m.user === grant.user)) fail("Credencial inv\xE1lida.");
        for (const other of this.ctx.getWebSockets()) if (other !== ws && other.deserializeAttachment()?.authenticated && other.deserializeAttachment()?.slot === input.slot) other.close(1e3, "Reconectado");
        Object.assign(a, { authenticated: true, slot: input.slot, user: grant.user });
        ws.serializeAttachment(a);
        ws.send(JSON.stringify({ op: "ready", members: room.members }));
        if (a.slot !== 0) {
          for (const host of this.ctx.getWebSockets()) if (host.deserializeAttachment()?.authenticated && host.deserializeAttachment()?.slot === 0) host.send(JSON.stringify({ op: "guest-ready", slot: a.slot }));
        } else {
          for (const peer of this.ctx.getWebSockets()) if (peer !== ws && peer.deserializeAttachment()?.authenticated) ws.send(JSON.stringify({ op: "guest-ready", slot: peer.deserializeAttachment().slot }));
        }
        return;
      }
      if (!a.authenticated) fail("Credencial inv\xE1lida.");
      if (input.op === "heartbeat") {
        if (a.slot === 0) {
          room.updated = now;
          if (Array.isArray(input.connected) && input.connected.length <= 4 && input.connected.every((n) => Number.isInteger(n) && room.members.some((m) => m.slot === n))) room.connected = input.connected;
          await this.ctx.storage.put("room", room);
          await this.notify({ id: room.id, connected: room.connected || [] });
          await this.ctx.storage.setAlarm(now + TTL);
        }
        ws.send(JSON.stringify({ op: "heartbeat-ok" }));
        return;
      }
      validateSignal(input);
      if (input.to === a.slot || a.slot !== 0 && input.to !== 0 || !room.members.some((m) => m.slot === input.to)) fail("Destino inv\xE1lido.");
      const target = this.ctx.getWebSockets().find((other) => other.deserializeAttachment()?.authenticated && other.deserializeAttachment()?.slot === input.to);
      if (!target) {
        ws.send(JSON.stringify({ op: "peer-unavailable", slot: input.to }));
        return;
      }
      const outgoing = input.op === "description" ? { op: input.op, from: a.slot, to: input.to, type: input.type, sdp: input.sdp } : { op: input.op, from: a.slot, to: input.to, candidate: input.candidate, mid: input.mid };
      target.send(JSON.stringify(outgoing));
    } catch {
      ws.close(1008, "Sinal n\xE3o autorizado");
    }
  }
  async webSocketClose(ws) {
    const a = ws.deserializeAttachment();
    if (!a?.authenticated || a.slot === 0) return;
    for (const host of this.ctx.getWebSockets()) if (host.deserializeAttachment()?.slot === 0) try {
      host.send(JSON.stringify({ op: "signal-disconnected", slot: a.slot }));
    } catch {
    }
  }
  async webSocketError(ws) {
    ws.close(1011, "Sinal interrompido");
  }
  async alarm() {
    const room = await this.ctx.storage.get("room");
    if (!room || Date.now() - room.updated > TTL) {
      if (room) await call(community(this.env), "/internal/close", { id: room.id });
      await this.close();
      return;
    }
    for (const ws of this.ctx.getWebSockets()) {
      const a = ws.deserializeAttachment();
      if (!a.authenticated && Date.now() - a.created > 15e3) ws.close(1008, "Autentica\xE7\xE3o expirada");
    }
    await this.ctx.storage.setAlarm(room.updated + TTL);
  }
};
export {
  Community,
  SignalRoom,
  worker_default as default
};
//# sourceMappingURL=worker.js.map
