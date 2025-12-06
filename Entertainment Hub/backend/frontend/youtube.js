// ---------- ELEMENTS ----------
const loginBtn = document.getElementById("loginBtn");
const userNameEl = document.getElementById("userName");
const profilePicEl = document.getElementById("userAvatar");
const countryCityEl = document.getElementById("countryCity");
const countryFlagEl = document.getElementById("countryFlag");
const countryNameEl = document.getElementById("countryName");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const trendingList = document.getElementById("trendingList");

// ---------- STATE ----------
let state = {
  user: { id: "guest", name: "Guest", photo: "images/default-avatar.jpg", location: null },
  videos: [],
};

// ================== USER SESSION ==================
async function loadUserSession() {
  try {
    const res = await fetch("/api/user", { credentials: "include" });
    if (res.ok) {
      const user = await res.json();
      if (user?.id) {
        state.user = {
          id: user.id,
          name: user.name || user.displayName || "User",
          photo: user.photo,
          location: user.location || state.user.location
        };
      }
    }
  } catch (err) {
    console.error("Failed to fetch user session:", err);
  } finally {
    renderUser();
    updateLoginBtn();
  }
}


function updateLoginBtn() {
  console.log("updateLoginBtn called, state.user:", state.user);
  if (state.user.id && state.user.id !== "guest") {
    loginBtn.textContent = "Logout";
    loginBtn.onclick = logoutUser;
  } else {
    loginBtn.textContent = "Login with Google";
    loginBtn.onclick = () => window.location.href = "/auth/google";
  }
}

function logoutUser() {
  console.log("logoutUser called");
  fetch("/auth/logout", { credentials: "include" })
    .finally(() => {
      state.user = { id: "guest", name: "Guest", photo: "images/default-avatar.jpg", location: null };
      renderUser();
      renderLocation();
      updateLoginBtn();
    });
}

function renderUser() {
  console.log("renderUser called with state.user:", state.user);
  userNameEl.textContent = state.user.name || "Guest";
  profilePicEl.src = state.user.photo || "images/default-avatar.jpg";
}

function renderLocation() {
  const loc = state.user.location || { city: "Colombo", country: "Sri Lanka", countryCode: "LK" };
  countryNameEl.textContent = loc.country;
  countryCityEl.textContent = loc.city;
  countryFlagEl.src = `https://flagcdn.com/48x36/${(loc.countryCode || "lk").toLowerCase()}.png`;
}

// ================== LOCATION FETCH ==================
async function loadLocation() {
  console.log("loadLocation called");
  try {
    const res = await fetch("/api/location", { credentials: "include" });
    if (res.ok) {
      const loc = await res.json();
      console.log("Location fetched:", loc);
      state.user.location = loc;
    } else {
      console.warn("Location fetch failed, using fallback");
      state.user.location = { city: "Colombo", country: "Sri Lanka", countryCode: "LK" };
    }
  } catch (err) {
    console.error("Failed to fetch location:", err);
    state.user.location = { city: "Colombo", country: "Sri Lanka", countryCode: "LK" };
  } finally {
    renderLocation();
  }
}

// ================== YOUTUBE API ==================
async function fetchYouTube(endpoint) {
  console.log("fetchYouTube called with endpoint:", endpoint);
  try {
    const res = await fetch(`/api/youtube?endpoint=${encodeURIComponent(endpoint)}`, { credentials: "include" });
    console.log("YouTube API raw response:", res);
    if (!res.ok) {
      console.error("YouTube API request failed:", res.status, res.statusText);
      throw new Error("YouTube API request failed");
    }
    const data = await res.json();
    console.log("YouTube API data:", data);
    return data;
  } catch (err) {
    console.error("YouTube API error:", err);
    return null;
  }
}

// ================== MINI PLAYER ==================
function createMiniPlayer(videoId) {
  // Create overlay
  const overlay = document.createElement("div");
  overlay.id = "yt-mini-overlay";
  overlay.style.position = "fixed";
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";
  overlay.style.background = "rgba(0,0,0,0.7)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = 9999;
  overlay.style.backdropFilter = "blur(3px)";

  // Player container (80% screen size)
  const playerContainer = document.createElement("div");
  playerContainer.style.position = "relative";
  playerContainer.style.width = "80vw";
  playerContainer.style.height = "80vh";
  playerContainer.style.maxWidth = "1400px";
  playerContainer.style.background = "#000";
  playerContainer.style.borderRadius = "10px";
  playerContainer.style.overflow = "hidden";
  playerContainer.style.boxShadow = "0 0 30px rgba(0,0,0,0.4)";

  // Smooth open animation
  playerContainer.style.transform = "scale(0.8)";
  playerContainer.style.opacity = "0";
  playerContainer.style.transition = "all 0.25s ease";

  setTimeout(() => {
    playerContainer.style.transform = "scale(1)";
    playerContainer.style.opacity = "1";
  }, 10);

  // Close button
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "×";
  closeBtn.style.position = "absolute";
  closeBtn.style.top = "10px";
  closeBtn.style.right = "15px";
  closeBtn.style.fontSize = "32px";
  closeBtn.style.background = "transparent";
  closeBtn.style.color = "#fff";
  closeBtn.style.border = "none";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.zIndex = 10000;
  closeBtn.addEventListener("click", () => document.body.removeChild(overlay));

  // Iframe video player
  const iframe = document.createElement("iframe");
  iframe.width = "100%";
  iframe.height = "100%";
  iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  iframe.frameBorder = "0";
  iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
  iframe.allowFullscreen = true;

  playerContainer.appendChild(closeBtn);
  playerContainer.appendChild(iframe);
  overlay.appendChild(playerContainer);

  // Close on background click
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  });

  document.body.appendChild(overlay);
}


// ================== RENDER VIDEOS WITH MINI PLAYER ==================
function renderVideos() {
  console.log("renderVideos called with", state.videos.length, "videos");
  trendingList.innerHTML = "";

  state.videos.forEach(video => {
    const item = document.createElement("div");
    item.className = "yt-video-card";

    item.innerHTML = `
      <div class="thumbnail">
        <img src="${video.snippet.thumbnails.medium.url}" alt="${video.snippet.title}" />
        <button class="play-btn">▶</button>
      </div>
      <div class="video-meta">
        <div class="title">${video.snippet.title}</div>
        <div class="channel">${video.snippet.channelTitle}</div>
      </div>
    `;

    const playBtn = item.querySelector(".play-btn");
    playBtn.addEventListener("click", () => createMiniPlayer(video.id));

    const thumbnails = item.querySelector(".thumbnail img");
    thumbnails.addEventListener("click", () => createMiniPlayer(video.id));

    trendingList.appendChild(item);
  });
}

// ================== LOAD TRENDING ==================
async function loadTrending() {
  console.log("loadTrending called");
  const endpoint = "videos?part=snippet,statistics&chart=mostPopular&regionCode=US&maxResults=20";
  const data = await fetchYouTube(endpoint);
  if (data?.items) {
    console.log("Trending videos loaded:", data.items.length);
    state.videos = data.items;
    renderVideos();
  } else {
    console.warn("No trending videos data received");
  }
}

// ================== SEARCH ==================
async function onSearch() {
  const q = searchInput.value.trim();
  console.log("onSearch called with query:", q);
  if (!q) return;

  const endpoint = `search?part=snippet&type=video&maxResults=20&q=${encodeURIComponent(q)}`;
  const data = await fetchYouTube(endpoint);
  if (data?.items) {
    console.log("Search results:", data.items.length);
    // Map search results to consistent video object
    state.videos = data.items.map(item => ({
      ...item,
      id: item.id.videoId
    }));
    renderVideos();
  } else {
    console.warn("No search results received");
  }
}

// ================== INIT ==================
function init() {
  console.log("init called");
  loadUserSession();
  loadLocation(); // fetch location
  loadTrending();

  searchBtn.addEventListener("click", onSearch);
  searchInput.addEventListener("keypress", e => { if (e.key === "Enter") onSearch(); });
}

init();
