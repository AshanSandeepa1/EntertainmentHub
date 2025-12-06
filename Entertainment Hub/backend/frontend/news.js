// Elements
const newsGrid = document.getElementById("newsGrid");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const chips = document.querySelectorAll(".chip");
const userNameEl = document.getElementById("userName");
const userAvatarEl = document.getElementById("userAvatar");
const countryNameEl = document.getElementById("countryName");
const countryCityEl = document.getElementById("countryCity");
const countryFlagEl = document.getElementById("countryFlag");

// Modal Elements
const newsModal = document.getElementById("newsModal");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalImage = document.getElementById("modalImage");
const modalTitle = document.getElementById("modalTitle");
const modalAuthor = document.getElementById("modalAuthor");
const modalDate = document.getElementById("modalDate");
const modalDesc = document.getElementById("modalDesc");
const modalLink = document.getElementById("modalLink");

// State
let page = 1;
let mode = "entertainment"; // "search" | "topic"
let currentQuery = "";

let state = {
  user: { id: "guest", name: "Guest", photo: "images/default-avatar.jpg", location: null },
    news: []
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

// ---------------- API HELPERS ----------------
async function fetchNews(url) {
  try {
    const res = await fetch(url);
    return await res.json();
  } catch (err) {
    console.error("NEWS API ERROR:", err);
    return null;
  }
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

// ---------------- LOAD NEWS ----------------
async function loadEntertainment(reset = false) {
  mode = "entertainment";
  if (reset) page = 1;

  const data = await fetchNews(`/api/news/entertainment?country=us&page=${page}`);
  if (!data?.articles) return;

  renderNews(data.articles, reset);
  loadLocation();
}

async function searchNews(q, reset = false) {
  mode = "search";
  currentQuery = q;
  if (reset) page = 1;

  const data = await fetchNews(`/api/news/search?q=${encodeURIComponent(q)}&page=${page}`);
  renderNews(data.articles, reset);
}

async function loadTopic(tag, reset = false) {
  mode = "topic";
  currentQuery = tag;
  if (reset) page = 1;

  const data = await fetchNews(`/api/news/topic?tag=${tag}&page=${page}`);
  renderNews(data.articles, reset);
}

// ---------------- RENDER NEWS ----------------
function renderNews(articles, reset = false) {
  if (reset) newsGrid.innerHTML = "";

  articles.forEach(a => {
    const card = document.createElement("div");
    card.className = "news-card";

    card.innerHTML = `
      <img src="${a.urlToImage || "images/noimg-news.jpg"}" />
      <div class="title">${a.title}</div>
      <div class="meta">${a.source.name} • ${new Date(a.publishedAt).toLocaleDateString()}</div>
    `;

    card.addEventListener("click", () => openModal(a));

    newsGrid.appendChild(card);
  });
}

// ---------------- MODAL ----------------
function openModal(article) {
  modalImage.src = article.urlToImage || "images/noimg.jpg";
  modalTitle.textContent = article.title;
  modalAuthor.textContent = `By: ${article.author || "Unknown"}`;
  modalDate.textContent = new Date(article.publishedAt).toLocaleString();
  modalDesc.textContent = article.description || "No description available.";
  modalLink.href = article.url;

  newsModal.classList.remove("hidden");
}

modalCloseBtn.addEventListener("click", () => {
  newsModal.classList.add("hidden");
});
newsModal.addEventListener("click", (e) => {
  if (e.target === newsModal) newsModal.classList.add("hidden");
});

// ---------------- EVENTS ----------------
searchBtn.addEventListener("click", () => {
  const q = searchInput.value.trim();
  if (q) searchNews(q, true);
});

searchInput.addEventListener("keypress", (e) => { if (e.key === "Enter") searchNews(searchInput.value.trim(), true); });

chips.forEach(c => {
  c.addEventListener("click", () => {
    loadTopic(c.dataset.tag, true);
  });
});

loadMoreBtn.addEventListener("click", () => {
  page++;
  if (mode === "entertainment") loadEntertainment();
  if (mode === "search") searchNews(currentQuery);
  if (mode === "topic") loadTopic(currentQuery);
});

// ---------------- INIT ----------------

loadEntertainment(true);
