// ---------------- ELEMENT REFERENCES ---------------- //
const loginBtn = document.getElementById("loginBtn");
const userNameSpan = document.getElementById("userName");
const profilePic = document.getElementById("profilePic");
const greeting = document.getElementById("greeting");
const weatherInfo = document.getElementById("weatherInfo");
const moodSuggestion = document.getElementById("moodSuggestion");
const countryFlag = document.getElementById("countryFlag");
const weatherIcon = document.getElementById("weatherIcon");
const themeToggle = document.getElementById("themeToggle");
const weatherCard = document.getElementById("weatherCard");
const weatherSummary = document.getElementById("weatherSummary");

// ---------------- STATE ---------------- //
let state = {
  user: { id: "guest", displayName: "Guest", photo: "images/default-avatar.jpg", location: null }
};

// ---------------- LOGIN / LOGOUT ---------------- //
function updateLoginBtn() {
  if (state.user && state.user.id !== "guest") {
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
  localStorage.removeItem("user_logged_out");
  window.location.href = "http://localhost:5001/auth/google";
}

function logoutUser() {
  localStorage.setItem("user_logged_out", "true");

  // Optionally notify server to destroy session
  fetch("http://localhost:5001/auth/logout", { credentials: "include" }).finally(() => {
    state.user = { id: "guest", displayName: "Guest", photo: "images/default-avatar.jpg", location: null };
    renderUser();
    updateLoginBtn();
  });
}

// ---------------- THEME TOGGLE ---------------- //
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  const icon = themeToggle.querySelector("i");
  icon.classList.toggle("fa-moon");
  icon.classList.toggle("fa-sun");
});

// ---------------- GET CURRENT LOGGED-IN USER ---------------- //
async function getCurrentUser() {
  try {
    const res = await fetch("http://localhost:5001/api/user", {
      credentials: "include",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("Error fetching current user:", err);
    return null;
  }
}

// ---------------- RENDER USER ---------------- //
function renderUser() {
  userNameSpan.textContent = state.user.displayName || "Guest";
  profilePic.src = state.user.photo || "images/default-avatar.jpg";
  updateLoginBtn();
}

// ---------------- FETCH LANDING DATA ---------------- //
async function fetchLandingData() {
  try {
    const user = await getCurrentUser();
    const isLoggedOut = localStorage.getItem("user_logged_out");

    // Only update state.user if not manually logged out
    if (user && !isLoggedOut) {
      state.user = {
        id: user.id,
        displayName: user.displayName || "Guest",
        photo: user.photo ? (user.photo.startsWith("http") ? user.photo : `https:${user.photo}`) : "images/default-avatar.jpg",
        location: user.location || null
      };
    } else if (isLoggedOut) {
      state.user = { id: "guest", displayName: "Guest", photo: "images/default-avatar.jpg", location: null };
    }

    renderUser();

    // ---------------- Landing Data ---------------- //
    const res = await fetch("http://localhost:5001/api/aggregate?section=landing", {
      headers: { "x-api-key": "supersecret123" },
      credentials: "include",
    });
    const data = await res.json();

    const loc = data.location || { city: "Unknown", country: "Unknown", flag: "" };
    greeting.textContent = `Hello, ${state.user.displayName.split(" ")[0]} from ${loc.city}, ${loc.country}`;
    if (loc.flag) countryFlag.src = loc.flag;

    if (data.data?.weather) {
      const w = data.data.weather;
      weatherInfo.textContent = `${w.temp}°C, ${w.description}`;
      moodSuggestion.textContent = getMoodSuggestion(w.description);
      if (w.icon) weatherIcon.src = w.icon;
      weatherSummary.textContent = `Temp: ${w.temp}°C, Feels like: ${w.feels_like || w.temp}°C, ${w.description}`;
      weatherCard.style.display = "block";
    }

  } catch (err) {
    console.error("Error fetching landing data:", err);
  }
}

// ---------------- MOOD SUGGESTION ---------------- //
function getMoodSuggestion(description) {
  description = description.toLowerCase();
  if (description.includes("rain")) return "🌧 Cozy up with a movie!";
  if (description.includes("drizzle")) return "🌦 Light drizzle outside, maybe relax with some music!";
  if (description.includes("cloud")) return "☁️ Maybe listen to some calm music!";
  if (description.includes("clear")) return "☀️ Perfect day for upbeat songs!";
  if (description.includes("sun")) return "☀️ Perfect day for upbeat songs!";
  if (description.includes("snow")) return "❄️ Stay warm and watch some movies!";
  if (description.includes("thunder")) return "⚡ Stormy vibes, stay safe indoors!";
  if (description.includes("smoke") || description.includes("fog")) return "🌫️ Foggy outside, cozy mood recommended!";
  return "🎵 Enjoy some entertainment!";
}

// ---------------- CARD CLICK ---------------- //
function goToSection(section) {
  alert(`You clicked ${section}. Load ${section} page here!`);
}

function goToWeather() {
  const city = "Colombo";
  window.location.href = `weather.html?city=${encodeURIComponent(city)}`;
}

function goToMusic() {
  window.location.href = `music.html`;
}

function goToYoutube() {
  window.location.href = `youtube.html`;
}

function goToMovies() {
  window.location.href = `movies.html`;
}

function goToNews() {
  window.location.href = `news.html`;
}

// ---------------- INITIAL FETCH ---------------- //
fetchLandingData();
setInterval(fetchLandingData, 5 * 60 * 1000); // Refresh every 5 min
