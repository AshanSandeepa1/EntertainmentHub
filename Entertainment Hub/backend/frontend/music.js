// ====== music.js ======
// Music frontend logic for Entertainment Hub using Spotify Embed IFrame API

const APP_API_KEY = "supersecret123";

// ---------- Elements ----------
const trendingList = document.getElementById("trendingList");
const favoritesList = document.getElementById("favoritesList");
const queueList = document.getElementById("queueList");
const searchBtn = document.getElementById("searchBtn");
const searchInput = document.getElementById("searchInput");
const userNameEl = document.getElementById("userName");
const userAvatarEl = document.getElementById("userAvatar");
const countryNameEl = document.getElementById("countryName");
const countryCityEl = document.getElementById("countryCity");
const countryFlagEl = document.getElementById("countryFlag");
const loginBtn = document.getElementById("loginBtn");
const playBtn = document.getElementById("playBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const nowAlbum = document.getElementById("nowAlbum");
const nowTitle = document.getElementById("nowTitle");
const nowArtist = document.getElementById("nowArtist");
const favToggle = document.getElementById("favToggle");
const visualizer = document.getElementById("visualizer");

// Spotify Embed container
const spotifyEmbedContainer = document.createElement("div");
spotifyEmbedContainer.id = "spotifyEmbed";
spotifyEmbedContainer.style.width = "100%";
spotifyEmbedContainer.style.height = "380px";
document.querySelector(".player-card").appendChild(spotifyEmbedContainer);

// ---------- State ----------
let state = {
  trending: [],
  favorites: [],
  queue: [],
  nowIndex: -1,        // index in queue of currently playing track
  isPlaying: false,    // track play/pause state
  user: { id: "guest", name: "Guest", photo: "images/default-avatar.jpg", location: null },
  spotifyEmbedController: null
};

// ---------- Helper ----------
function apiFetch(path, options = {}) {
  options.headers = { ...(options.headers || {}), "x-api-key": APP_API_KEY, "Content-Type": "application/json" };
  if (options.body && typeof options.body !== "string") options.body = JSON.stringify(options.body);
  return fetch(path, options).then(r => r.json());
}

// ---------- User Session ----------
function loadUserSession() {
  const storedUser = localStorage.getItem("user_session");
  if (storedUser) state.user = { ...state.user, ...JSON.parse(storedUser) };
  updateLoginBtn();
}

// Update login button dynamically
function updateLoginBtn() {
  if (state.user && state.user.id && state.user.id !== "guest") {
    loginBtn.textContent = "Logout";
    loginBtn.removeEventListener("click", redirectToLogin);
    loginBtn.addEventListener("click", logoutUser);
  } else {
    loginBtn.textContent = "Login with Google";
    loginBtn.removeEventListener("click", logoutUser);
    loginBtn.addEventListener("click", redirectToLogin);
  }
}

function redirectToLogin() {
  // Remove the manual logout flag if user goes to login
  localStorage.removeItem("user_logged_out");
  window.location.href = "/auth/google";
}

function logoutUser() {
  localStorage.removeItem("user_session");
  localStorage.setItem("user_logged_out", "true"); // mark as logged out
  state.user = { id: "guest", name: "Guest", photo: "images/default-avatar.jpg", location: null };
  renderUser();
  renderLocation();
  updateLoginBtn();
}

// ---------- INIT ----------
async function init() {
  console.log("[INIT] Music.js Loaded");
  loadUserSession();
  attachUI();
  await loadAggregate();
  initSpotifyEmbed();
}

// ---------- UI Events ----------
function attachUI() {
  updateLoginBtn();

  searchBtn.addEventListener("click", onSearch);
  searchInput.addEventListener("keypress", (e) => { if (e.key === "Enter") onSearch(); });

  playBtn.addEventListener("click", togglePlay);
  prevBtn.addEventListener("click", playPrev);
  nextBtn.addEventListener("click", playNext);

  setInterval(() => {
    document.querySelectorAll(".visualizer .bar").forEach(b => b.style.height = (6 + Math.random()*34) + "px");
  }, 180);
}

// ---------- Load trending + favorites ----------
async function loadAggregate() {
  try {
    const resp = await apiFetch("/api/music/aggregate");
    if (resp.error) throw new Error(resp.error);

    state.trending = resp.trending || [];
    state.favorites = resp.favorites || [];

    const isLoggedOut = localStorage.getItem("user_logged_out");

    // Only update user if they are not manually logged out
    if (!isLoggedOut) {
      state.user = {
        ...state.user,
        id: resp.userId,
        name: resp.userName,
        photo: resp.userPhoto,
        location: resp.location
      };
    }

    renderUser();
    renderLocation();
    renderTrending();
    renderFavorites();

    state.queue = state.trending.slice(0, 8);
    renderQueue();
    updateLoginBtn();
  } catch (err) { console.error("[AGGREGATE] load failed", err); }
}

// ---------- Renderers ----------
function renderUser() {
  userNameEl.textContent = state.user.name || "Guest";
  userAvatarEl.src = state.user.photo || "images/default-avatar.jpg";
}

function renderLocation() {
  const loc = state.user.location || { city: "Colombo", country: "Sri Lanka", countryCode: "LK" };
  countryNameEl.textContent = loc.country;
  countryCityEl.textContent = loc.city;
  countryFlagEl.src = `https://flagcdn.com/48x36/${(loc.countryCode || "lk").toLowerCase()}.png`;
}

function renderTrending() {
  trendingList.innerHTML = "";
  state.trending.forEach((t, idx) => trendingList.appendChild(trackItem(t, idx, false)));
}

function renderFavorites() {
  favoritesList.innerHTML = "";
  state.favorites.forEach(f => favoritesList.appendChild(trackItem(f, null, true)));
}

function renderQueue() {
  queueList.innerHTML = "";
  state.queue.forEach((t, i) => queueList.appendChild(trackItem(t, i, false, true)));
  highlightNowPlaying();
}

// ---------- Track Item ----------
function trackItem(t, idx, isFav=false, compact=false) {
  const item = document.createElement("div");
  item.className = "track-item";
  item.dataset.trackId = t.trackId;
  item.innerHTML = `
    <img class="track-thumb" src="${t.albumArt || 'placeholder.jpg'}" />
    <div class="track-meta">
      <div class="title">${t.trackName || t.name}</div>
      <div class="sub">${t.artistName || t.artists}</div>
    </div>
    <div class="track-actions">
      <button class="icon-btn play" title="Play"><i class="fa-solid fa-play"></i></button>
      <button class="icon-btn fav" title="Favorite">${ isFav ? '<i class="fa-solid fa-heart"></i>' : '<i class="fa-regular fa-heart"></i>' }</button>
    </div>
  `;

  item.querySelector(".play").addEventListener("click", () => {
    const target = isFav ? t : (state.trending[idx] || t);
    if (!target.uri && target.trackId) target.uri = `spotify:track:${target.trackId}`;
    playTrackFromObject(target);

    const qIndex = state.queue.findIndex(q => q.trackId === target.trackId);
    if (qIndex >= 0) state.nowIndex = qIndex;
    else {
      state.queue.push(target);
      state.nowIndex = state.queue.length - 1;
      renderQueue();
    }
    state.isPlaying = true;
    playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    highlightNowPlaying();
  });

  item.querySelector(".fav").addEventListener("click", async (e) => {
    e.stopPropagation();
    if (isFav) await removeFavorite(t.trackId);
    else await addFavorite(t);
    await loadAggregate();
  });

  return item;
}

// ---------- Highlight currently playing track ----------
function highlightNowPlaying() {
  document.querySelectorAll(".track-item").forEach(item => {
    if (state.queue[state.nowIndex] && item.dataset.trackId === state.queue[state.nowIndex].trackId) {
      item.classList.add("playing");
    } else {
      item.classList.remove("playing");
    }
  });
}

// ---------- Spotify Embed API ----------
function initSpotifyEmbed() {
  const script = document.createElement("script");
  script.src = "https://open.spotify.com/embed/iframe-api/v1";
  script.async = true;
  document.body.appendChild(script);

  window.onSpotifyIframeApiReady = (SpotifyIframeApi) => {
    SpotifyIframeApi.createController(
      spotifyEmbedContainer,
      { width: "100%", height: "380", uri: "spotify:playlist:37i9dQZF1DZ06evO3eIivx" },
      (controller) => {
        state.spotifyEmbedController = controller;
        controller.addListener("ready", () => console.log("[SPOTIFY EMBED] Player ready"));
        controller.addListener("playback_update", (e) => {
          const { isPaused } = e.data;
          state.isPlaying = !isPaused;
          playBtn.innerHTML = state.isPlaying ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
        });
      }
    );
  };
}

// ---------- Playback ----------
function playTrackFromObject(track){
  if (!track || !track.uri) return console.warn("[PLAYBACK] Track missing URI:", track);
  if (!state.spotifyEmbedController) return;

  state.spotifyEmbedController.loadUri(track.uri);
  nowAlbum.src = track.albumArt || "placeholder.jpg";
  nowTitle.textContent = track.trackName || track.name;
  nowArtist.textContent = track.artistName || track.artists || "";

  highlightNowPlaying();
}

// ---------- Play/Pause ----------
function togglePlay() {
  if (!state.spotifyEmbedController) return;

  if (!state.isPlaying) {
    const track = state.queue[state.nowIndex >= 0 ? state.nowIndex : 0];
    if (track) playTrackFromObject(track);
    state.spotifyEmbedController.play();
    state.isPlaying = true;
  } else {
    state.spotifyEmbedController.pause();
    state.isPlaying = false;
  }

  playBtn.innerHTML = state.isPlaying ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
}

// ---------- Play Next / Prev ----------
function playPrev(){ 
  if (state.nowIndex > 0) {
    state.nowIndex--;
    playTrackFromObject(state.queue[state.nowIndex]);
    state.isPlaying = true;
    playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
  }
}

function playNext(){ 
  if (state.nowIndex < state.queue.length - 1) {
    state.nowIndex++;
    playTrackFromObject(state.queue[state.nowIndex]);
    state.isPlaying = true;
    playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
  }
}

// ---------- Favorites ----------
async function addFavorite(track){
  try {
    await apiFetch("/api/music/favorites", { method: "POST", body: track });
  } catch(err){ console.error("[FAVORITES] add error", err); }
}

async function removeFavorite(trackId){
  try {
    await fetch(`/api/music/favorites/${encodeURIComponent(trackId)}`, { 
      method: "DELETE",
      headers: { "x-api-key": APP_API_KEY } 
    });
  } catch(err){ console.error("[FAVORITES] remove error", err); }
}

// ---------- Search ----------
async function onSearch(){
  const q = searchInput.value.trim();
  if (!q) return;
  try {
    let results = await apiFetch(`/api/music/search?q=${encodeURIComponent(q)}`);
    results = results.map(track => ({
      ...track,
      uri: track.uri || (track.trackId ? `spotify:track:${track.trackId}` : null)
    }));

    state.trending = results;
    renderTrending();

    results.slice(0,5).forEach(track => {
      if (!state.queue.find(q => q.trackId === track.trackId)) state.queue.push(track);
    });
    renderQueue();
  } catch(err){ console.error("[SEARCH] error", err); }
}


// ---------- Start ----------
init();
