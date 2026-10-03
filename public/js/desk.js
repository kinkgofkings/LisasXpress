const ICE = { iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }] };
let deps = {};
let audioCtx = null;
let ringTimer = null;
let ticking = false;

export function bindDesk(next) {
  deps = next;
}

function esc(value) {
  return deps.esc(value);
}

export function warmRinger() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  audioCtx = audioCtx || new Ctx();
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
}

function ringPulse() {
  if (!audioCtx || audioCtx.state !== "running") return;
  const now = audioCtx.currentTime;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
  gain.gain.setValueAtTime(0.2, now + 0.4);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
  gain.gain.setValueAtTime(0.0001, now + 0.62);
  gain.gain.exponentialRampToValueAtTime(0.2, now + 0.64);
  gain.gain.setValueAtTime(0.2, now + 1.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
  gain.connect(audioCtx.destination);
  for (const freq of [440, 480]) {
    const osc = audioCtx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 1.2);
  }
}

function startRing(person, mode) {
  warmRinger();
  if (!ringTimer) {
    ringPulse();
    ringTimer = setInterval(() => {
      ringPulse();
      navigator.vibrate?.([300, 140, 300, 140, 300]);
    }, 2800);
  }
  document.title = `${person?.name || "Someone"} is calling`;
  if ("Notification" in window && Notification.permission === "granted") {
    const body = mode === "video" ? "Video call. Open the book to answer." : "Phone call. Open the book to answer.";
    navigator.serviceWorker?.ready.then((registration) => {
      registration.showNotification(`${person?.name || "Someone"} is calling`, {
        body,
        tag: "lisa-call",
        renotify: true,
        requireInteraction: true,
        vibrate: [300, 140, 300, 140, 300]
      });
    }).catch(() => {});
  }
}

export function stopRing() {
  if (ringTimer) clearInterval(ringTimer);
  ringTimer = null;
  navigator.vibrate?.(0);
  navigator.serviceWorker?.ready.then((registration) => {
    registration.getNotifications({ tag: "lisa-call" }).then((notes) => notes.forEach((note) => note.close()));
  }).catch(() => {});
}

export function linkTools(url, title) {
  const text = `${title}\n${url}`;
  return `<button class="btn quiet" type="button" data-action="copy" data-text="${esc(text)}">Copy link</button>
    <button class="btn quiet" type="button" data-action="send-link" data-url="${esc(url)}" data-title="${esc(title)}">Send in a message</button>`;
}

export function pageLink(hash) {
  return `${location.origin}${location.pathname}${hash}`;
}

function bubble(body) {
  const safe = esc(body);
  return safe.replace(/https?:\/\/[^\s<]+/g, (url) => {
    const hashAt = url.indexOf("#/");
    if (hashAt >= 0) return `<a href="${url.slice(hashAt)}">${url}</a>`;
    return `<a href="${url}" target="_blank" rel="noreferrer">${url}</a>`;
  });
}

export function messagesView() {
  if (!deps.state.user) return "";
  if (deps.route().id) return threadView(deps.route().id);
  return threadList();
}

function crumbs(parts) {
  const bits = parts.map((part, index) => {
    const last = index === parts.length - 1;
    const label = esc(part.label);
    if (last || !part.href) return `<span aria-current="page">${label}</span>`;
    return `<a href="${esc(part.href)}">${label}</a>`;
  }).join(`<span class="crumb-gap" aria-hidden="true">/</span>`);
  return `<nav class="crumbs" aria-label="Breadcrumb">${bits}</nav>`;
}

function threadList() {
  const state = deps.state;
  if (!state.threadListReady) {
    state.threadListReady = "loading";
    deps.api("/api/messages").then((data) => {
      state.threads = data.threads || [];
      state.unread = data.unread || 0;
      state.activeUsers = data.active || [];
      state.threadListReady = "ready";
      if (deps.route().name === "messages" && !deps.route().id) deps.render();
    }).catch((error) => {
      state.threadListReady = "ready";
      deps.say(error.message);
    });
  }
  const active = state.activeUsers || [];
  const draft = state.shareDraft
    ? `<div class="panel"><p>Choose someone to send <strong>${esc(state.shareDraft.title)}</strong>.</p><button class="btn quiet" type="button" data-action="clear-share">Don't send</button></div>`
    : "";
  const ringer = Notification.permission === "granted"
    ? ""
    : `<button class="btn moss" type="button" data-action="enable-ringer">Turn on the ringer</button>`;
  return `${crumbs([{ label: "Home", href: "#/" }, { label: "Messages" }])}
    <h2 class="page-title">Messages</h2>
    <p>Write to someone in the family, or call. While the book is open, the phone rings until they answer or the call passes. Turn on the ringer if you also want an alert.</p>
    <div class="actions">${ringer}</div>
    ${draft}
    <h3>Active now</h3>
    <div class="active-row">
      ${active.length ? active.map((person) => `<span class="active-person">${deps.face({ ...person, active: true })}<a href="#/messages/${esc(person.id)}">${esc(person.name.split(" ")[0])}</a></span>`).join("") : `<p class="empty">Nobody else is in the book this minute.</p>`}
    </div>
    <div class="stack">
      ${(state.threads || []).map(threadRow).join("") || (state.threadListReady === "ready" ? `<p class="empty">No other accounts yet.</p>` : `<p class="empty">Opening messages…</p>`)}
    </div>`;
}

function threadRow(thread) {
  const person = thread.person;
  const preview = thread.last ? `${thread.last.mine ? "You: " : ""}${thread.last.body}` : "No messages yet";
  return `<div class="panel thread-row">
    <span class="presence ${person.active ? "on" : ""}">${deps.face(person)}</span>
    <a class="thread-main" href="#/messages/${esc(person.id)}">
      <strong>${esc(person.name)}</strong>
      ${person.active ? `<span class="live-dot">Active</span>` : ""}
      ${thread.unread ? `<span class="live-dot">${thread.unread} new</span>` : ""}
      <span class="empty">${esc(preview.slice(0, 90))}</span>
    </a>
  </div>`;
}

function threadView(id) {
  const state = deps.state;
  if (state.threadFor !== String(id)) {
    state.threadFor = String(id);
    state.threadMessages = [];
    state.threadPerson = null;
    deps.api(`/api/messages?with=${encodeURIComponent(id)}`).then((data) => {
      if (deps.route().name !== "messages" || deps.route().id !== String(id)) return;
      state.threadPerson = data.person;
      state.threadMessages = data.messages || [];
      deps.render();
    }).catch((error) => deps.say(error.message));
  }
  const person = state.threadPerson;
  const draft = state.shareDraft ? `${state.shareDraft.title}\n${state.shareDraft.url}` : "";
  const trail = crumbs([
    { label: "Home", href: "#/" },
    { label: "Messages", href: "#/messages" },
    { label: person?.name || "Conversation" }
  ]);
  if (!person) return `${trail}<h2 class="page-title">Messages</h2><p class="empty">Opening the conversation…</p>`;
  return `${trail}
    <div class="thread-head">
      <span class="presence ${person.active ? "on" : ""}">${deps.face(person)}</span>
      <div>
        <h2 class="page-title" style="font-size:clamp(32px,6vw,48px)">${esc(person.name)}</h2>
        <p class="empty">${person.active ? "Active now" : "Not in the book this minute"}</p>
      </div>
    </div>
    <div class="actions">
      <button class="btn" type="button" data-action="start-call" data-mode="audio" data-id="${esc(person.id)}" data-name="${esc(person.name)}"><i class="bi bi-telephone" aria-hidden="true"></i> Phone call</button>
      <button class="btn moss" type="button" data-action="start-call" data-mode="video" data-id="${esc(person.id)}" data-name="${esc(person.name)}"><i class="bi bi-camera-video" aria-hidden="true"></i> Video call</button>
    </div>
    <div class="bubbles">
      ${(state.threadMessages || []).map((item) => `<p class="bubble ${item.mine ? "mine" : ""}">${bubble(item.body)}</p>`).join("") || `<p class="empty">Say hello.</p>`}
    </div>
    <form id="message-form" class="message-form">
      <input type="hidden" name="to" value="${esc(person.id)}">
      <textarea name="body" required maxlength="1000" placeholder="Write a message">${esc(draft)}</textarea>
      <button class="btn" type="submit">Send</button>
    </form>`;
}

export function searchView() {
  const state = deps.state;
  const found = state.searchResult;
  const host = state.hostAnswer;
  return `<h2 class="page-title">Search</h2>
    <p>Look through this book, the notes, the films, and the open library. Ask the host a question and it answers from those real plates.</p>
    <form id="search-form" class="toolbar">
      <input name="q" required placeholder="Search the book" value="${esc(state.searchQ || "")}">
      <button class="btn" type="submit">Search</button>
    </form>
    <form id="host-form" class="panel">
      <h3>Ask the host</h3>
      <div class="field"><label>Question<textarea name="question" required maxlength="300" placeholder="How do I make peach cobbler?">${esc(state.hostQ || "")}</textarea></label></div>
      <button class="btn moss" type="submit">${state.hostBusy ? "Looking…" : "Ask"}</button>
    </form>
    ${host ? `<section class="panel host-answer"><p>${esc(host.answer)}</p>${host.notice ? `<p class="empty">${esc(host.notice)}</p>` : ""}${hitList(host.recipes, host.meals)}</section>` : ""}
    ${found ? `<div class="stack">
      ${found.notice ? `<p class="empty">${esc(found.notice)}</p>` : ""}
      ${group("In the book", found.recipes)}
      ${group("Open library", found.meals)}
      ${group("Notes", found.notes)}
      ${group("Films", found.films)}
      ${group("Messages", found.messages)}
      ${!(found.recipes?.length || found.meals?.length || found.notes?.length || found.films?.length || found.messages?.length) ? `<p class="empty">Nothing matched that search.</p>` : ""}
    </div>` : ""}`;
}

function group(title, rows) {
  if (!rows?.length) return "";
  return `<section><h3>${esc(title)}</h3><div class="stack">${rows.map(hit).join("")}</div></section>`;
}

function hitList(recipes, meals) {
  return `<div class="stack">${(recipes || []).concat(meals || []).map(hit).join("")}</div>`;
}

function hit(item) {
  const title = item.title || item.body || "Open";
  const meta = [item.category, item.area, item.name].filter(Boolean).join(" · ");
  const external = String(item.href || "").startsWith("http");
  return `<a class="panel search-hit" href="${esc(item.href)}" ${external ? 'target="_blank" rel="noreferrer"' : ""}>
    <strong>${esc(String(title).slice(0, 140))}</strong>
    ${item.summary ? `<span class="empty">${esc(item.summary)}</span>` : ""}
    ${meta ? `<span class="empty">${esc(meta)}</span>` : ""}
  </a>`;
}

export function callLayer() {
  if (!deps.state) return "";
  const call = deps.state.call;
  const incoming = deps.state.incoming;
  if (call) return liveCall(call);
  if (incoming) return incomingCall(incoming);
  return "";
}

function incomingCall(incoming) {
  const video = incoming.mode === "video";
  return `<div class="call-screen" role="dialog" aria-label="Incoming call" data-ringing="1">
    <p class="kicker">${video ? "Video call" : "Phone call"}</p>
    <div class="call-face">${deps.face(incoming.person, { link: false })}</div>
    <h2>${esc(incoming.person?.name || "Someone")} is calling</h2>
    <div class="actions">
      <button class="btn moss" type="button" data-action="answer-call">Answer</button>
      <button class="btn danger" type="button" data-action="decline-call">Decline</button>
    </div>
  </div>`;
}

function liveCall(call) {
  const waiting = call.phase !== "live";
  const video = call.mode === "video";
  return `<div class="call-screen" role="dialog" aria-label="Call">
    <p class="kicker">${waiting ? "Calling" : "On the call"} · ${video ? "Video" : "Phone"}</p>
    <h2>${esc(call.person?.name || "")}</h2>
    ${video ? `<video id="call-remote" autoplay playsinline></video><video id="call-local" autoplay playsinline muted></video>` : `<audio id="call-remote" autoplay></audio><div class="call-face">${deps.face(call.person, { link: false })}</div>`}
    <p class="empty">${waiting ? "Ringing until they answer." : "You are connected."}</p>
    <div class="actions">
      <button class="btn quiet" type="button" data-action="mute-call">${call.muted ? "Unmute" : "Mute"}</button>
      <button class="btn danger" type="button" data-action="end-call">${waiting ? "Cancel" : "End call"}</button>
    </div>
  </div>`;
}

export function attachCallMedia() {
  const call = deps.state.call;
  if (!call) return;
  const remote = document.getElementById("call-remote");
  const local = document.getElementById("call-local");
  if (remote && call.remoteStream) {
    if (remote.srcObject !== call.remoteStream) remote.srcObject = call.remoteStream;
    remote.play?.().catch(() => {});
  }
  if (local && call.stream) {
    local.srcObject = call.stream;
    local.muted = true;
    local.play?.().catch(() => {});
  }
}

export function paintDeskBadge() {
  if (!deps.state) return;
  document.querySelectorAll("[data-badge='messages']").forEach((dot) => {
    dot.hidden = !(deps.state.unread || deps.state.incoming);
  });
}

function wireIce(call) {
  call.pc.onicecandidate = (event) => {
    if (!event.candidate) return;
    const payload = event.candidate.toJSON();
    if (!call.id) {
      call.queued.push(payload);
      return;
    }
    deps.api(`/api/calls/${call.id}/signals`, { method: "POST", json: { payload } }).catch(() => {});
  };
  call.pc.ontrack = (event) => {
    const tracks = event.streams[0]?.getTracks() || [event.track];
    tracks.forEach((track) => {
      if (!call.remoteStream.getTracks().some((saved) => saved.id === track.id)) call.remoteStream.addTrack(track);
    });
    attachCallMedia();
  };
  call.pc.onconnectionstatechange = () => {
    if (call.pc.connectionState === "failed") deps.say("The call could not get through. Try again on the same Wi-Fi.");
  };
}

async function openMedia(mode) {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("This phone cannot open the microphone from the book.");
  return navigator.mediaDevices.getUserMedia({ audio: true, video: mode === "video" });
}

async function flushIce(call) {
  if (!call.pc?.remoteDescription) return;
  for (const payload of call.pendingIce) {
    await call.pc.addIceCandidate(payload).catch(() => {});
  }
  call.pendingIce = [];
}

async function takeSignals(call) {
  const data = await deps.api(`/api/calls/${call.id}/signals?after=${call.signalAfter || 0}`);
  for (const row of data.signals || []) {
    call.signalAfter = row.id;
    if (!call.pc.remoteDescription) call.pendingIce.push(row.payload);
    else await call.pc.addIceCandidate(row.payload).catch(() => {});
  }
  await flushIce(call);
}

async function finishCall(tellServer) {
  const call = deps.state.call;
  stopRing();
  call?.stream?.getTracks().forEach((track) => track.stop());
  try { call?.pc?.close(); } catch { /* already closed */ }
  if (tellServer && call?.id) {
    await deps.api(`/api/calls/${call.id}`, { method: "POST", json: { action: "end" } }).catch(() => {});
  }
  deps.state.call = null;
  deps.state.incoming = null;
  deps.state.ringingFor = "";
  deps.render();
}

async function pollLive() {
  const call = deps.state.call;
  if (!call?.id) return;
  const data = await deps.api(`/api/calls/${call.id}`);
  const row = data.call;
  if (["declined", "ended", "missed"].includes(row.state)) {
    const reason = row.state === "declined" ? "The call was declined." : row.state === "missed" ? "No answer." : "The call ended.";
    await finishCall(false);
    deps.say(reason);
    return;
  }
  if (call.role === "caller" && row.answer && call.phase !== "live") {
    await call.pc.setRemoteDescription({ type: "answer", sdp: row.answer });
    call.phase = "live";
    await flushIce(call);
    deps.render();
  }
  await takeSignals(call);
  attachCallMedia();
}

export async function deskTick() {
  if (ticking || !deps.state.user || !deps.api) return;
  ticking = true;
  try {
    if (deps.state.call?.id) {
      await pollLive();
      return;
    }
    const data = await deps.api("/api/desk");
    deps.state.unread = data.unread || 0;
    if (data.active) deps.state.activeUsers = data.active;
    const incoming = data.incoming || null;
    if (incoming && deps.state.ringingFor !== String(incoming.id)) {
      deps.state.incoming = incoming;
      deps.state.ringingFor = String(incoming.id);
      startRing(incoming.person, incoming.mode);
      deps.render();
    } else if (!incoming && deps.state.incoming) {
      deps.state.incoming = null;
      deps.state.ringingFor = "";
      stopRing();
      deps.render();
    } else {
      paintDeskBadge();
    }
    if (!deps.state.call && data.open && !incoming && (data.open.state === "live" || data.open.role === "caller")) {
      await deps.api(`/api/calls/${data.open.id}`, { method: "POST", json: { action: "end" } }).catch(() => {});
    }
  } catch { /* try again on the next tick */ }
  finally { ticking = false; }
}

export function deskNavigated() {
  if (!deps.state) return;
  deps.state.threadListReady = "";
  if (deps.route().name !== "messages") deps.state.threadFor = "";
}

export async function deskAction(action, button) {
  if (!deps.state) return false;
  if (action === "send-link") {
    if (!deps.state.user) {
      deps.say("Log in to send this in a message.");
      deps.go("#/account");
      return true;
    }
    deps.state.shareDraft = { title: button.dataset.title || "A plate", url: button.dataset.url || "" };
    deps.state.threadListReady = "";
    deps.go("#/messages");
    if (deps.route().name === "messages") deps.render();
    return true;
  }
  if (action === "clear-share") {
    deps.state.shareDraft = null;
    deps.render();
    return true;
  }
  if (action === "enable-ringer") {
    warmRinger();
    if (!("Notification" in window)) {
      deps.say("The phone will ring while this book is open.");
      return true;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") deps.say("The ringer is on.");
    else deps.say("The phone will ring while this book is open.");
    deps.render();
    return true;
  }
  if (action === "start-call") {
    try {
      warmRinger();
      await startCall(button.dataset.id, button.dataset.mode, button.dataset.name);
    } catch (error) {
      await finishCall(false);
      deps.say(error.message || "The call did not start.");
    }
    return true;
  }
  if (action === "answer-call") {
    try {
      await answerCall();
    } catch (error) {
      await finishCall(true);
      deps.say(error.message || "The call did not connect.");
    }
    return true;
  }
  if (action === "decline-call") {
    const incoming = deps.state.incoming;
    stopRing();
    if (incoming?.id) await deps.api(`/api/calls/${incoming.id}`, { method: "POST", json: { action: "decline" } }).catch(() => {});
    deps.state.incoming = null;
    deps.state.ringingFor = "";
    deps.render();
    return true;
  }
  if (action === "end-call") {
    await finishCall(true);
    return true;
  }
  if (action === "mute-call") {
    const call = deps.state.call;
    if (!call?.stream) return true;
    call.muted = !call.muted;
    call.stream.getAudioTracks().forEach((track) => { track.enabled = !call.muted; });
    deps.render();
    return true;
  }
  return false;
}

async function startCall(to, mode, name) {
  const stream = await openMedia(mode);
  const pc = new RTCPeerConnection(ICE);
  const call = {
    id: "",
    role: "caller",
    phase: "outgoing",
    mode,
    person: { id: to, name: name || "Family" },
    pc,
    stream,
    remoteStream: new MediaStream(),
    signalAfter: 0,
    pendingIce: [],
    queued: [],
    muted: false
  };
  deps.state.call = call;
  wireIce(call);
  stream.getTracks().forEach((track) => pc.addTrack(track, stream));
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  try {
    const saved = await deps.api("/api/calls", { method: "POST", json: { to, mode, offer: offer.sdp } });
    call.id = saved.call.id;
    call.person = saved.call.person || call.person;
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    pc.close();
    deps.state.call = null;
    throw error;
  }
  for (const payload of call.queued) {
    await deps.api(`/api/calls/${call.id}/signals`, { method: "POST", json: { payload } }).catch(() => {});
  }
  call.queued = [];
  deps.render();
}

async function answerCall() {
  const incoming = deps.state.incoming;
  if (!incoming?.offer) throw new Error("That call is no longer ringing.");
  stopRing();
  warmRinger();
  const stream = await openMedia(incoming.mode);
  const pc = new RTCPeerConnection(ICE);
  const call = {
    id: incoming.id,
    role: "callee",
    phase: "live",
    mode: incoming.mode,
    person: incoming.person,
    pc,
    stream,
    remoteStream: new MediaStream(),
    signalAfter: 0,
    pendingIce: [],
    queued: [],
    muted: false
  };
  deps.state.call = call;
  deps.state.incoming = null;
  wireIce(call);
  stream.getTracks().forEach((track) => pc.addTrack(track, stream));
  await pc.setRemoteDescription({ type: "offer", sdp: incoming.offer });
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  await deps.api(`/api/calls/${call.id}`, { method: "POST", json: { action: "accept", answer: answer.sdp } });
  await flushIce(call);
  deps.render();
}

export async function deskSubmit(form, data) {
  if (!deps.state) return false;
  if (form.id === "message-form") {
    const body = String(data.body || "").trim();
    if (!body) throw new Error("Write a message first.");
    await deps.api("/api/messages", { method: "POST", json: { to: data.to, body } });
    deps.state.shareDraft = null;
    deps.state.threadFor = "";
    deps.render();
    return true;
  }
  if (form.id === "search-form") {
    deps.state.searchQ = String(data.q || "");
    deps.state.searchResult = await deps.api(`/api/search?q=${encodeURIComponent(deps.state.searchQ)}`);
    deps.render();
    return true;
  }
  if (form.id === "host-form") {
    deps.state.hostQ = String(data.question || "");
    deps.state.hostBusy = true;
    deps.render();
    try {
      deps.state.hostAnswer = await deps.api("/api/ask", { method: "POST", json: { question: deps.state.hostQ } });
    } finally {
      deps.state.hostBusy = false;
    }
    deps.render();
    return true;
  }
  return false;
}
