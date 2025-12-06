// ================== ELEMENTS ==================
const loginBtn = document.getElementById("loginBtn");
const userNameEl = document.getElementById("userName");
const profilePicEl = document.getElementById("userAvatar");
const countryCityEl = document.getElementById("countryCity");
const countryFlagEl = document.getElementById("countryFlag");
const countryNameEl = document.getElementById("countryName");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");

const trendingGrid = document.getElementById("trendingGrid");
const popularGrid = document.getElementById("popularGrid");
const topRatedGrid = document.getElementById("topRatedGrid");

// ---------- STATE ----------
let state = {
  user: { id: "guest", name: "Guest", photo: "images/default-avatar.jpg", location: null },
  movies: []
};

// ================== USER SESSION & LOCATION ==================
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
  if(state.user.id && state.user.id!=="guest") {
    loginBtn.textContent="Logout"; loginBtn.onclick=logoutUser;
  } else { loginBtn.textContent="Login with Google"; loginBtn.onclick=()=>location.href="/auth/google"; }
}

function logoutUser() {
  fetch("/auth/logout",{credentials:"include"}).finally(()=>{
    state.user={id:"guest",name:"Guest",photo:"images/default-avatar.jpg",location:null};
    renderUser(); renderLocation(); updateLoginBtn();
  });
}

function renderUser(){
  userNameEl.textContent = state.user.name||"Guest";
  profilePicEl.src = state.user.photo||"images/default-avatar.jpg";
}

function renderLocation(){
  const loc = state.user.location||{city:"Colombo",country:"Sri Lanka",countryCode:"LK"};
  countryNameEl.textContent = loc.country;
  countryCityEl.textContent = loc.city;
  countryFlagEl.src = `https://flagcdn.com/48x36/${(loc.countryCode||"lk").toLowerCase()}.png`;
}

async function loadLocation() {
  try {
    const res = await fetch("/api/location",{credentials:"include"});
    if(res.ok) state.user.location = await res.json();
  } catch(err){ state.user.location={city:"Colombo",country:"Sri Lanka",countryCode:"LK"} }
  renderLocation();
}

// ================== TMDb API ==================
async function fetchMovies(endpoint){
  try{
    const res = await fetch(`/api/movies/${endpoint}`,{credentials:"include"});
    if(!res.ok) throw new Error(res.statusText);
    return await res.json();
  }catch(err){ console.error("TMDb fetch error:",err); return null; }
}

// ---------- RENDER GRID ----------
function renderMovieGrid(gridEl, movies){
  gridEl.innerHTML="";
  movies.forEach(m=>{
    const card = document.createElement("div");
    card.className="movie-card";
    card.innerHTML=`
      <img src="https://image.tmdb.org/t/p/w500${m.poster_path}" alt="${m.title}" />
      <div class="title">${m.title}</div>
      <div class="rating">⭐ ${m.vote_average}</div>
    `;
    card.addEventListener("click",()=>openMovieModal(m.id));
    gridEl.appendChild(card);
  });
}

// ================== MODAL ==================
async function openMovieModal(movieId){
  try{
    const movieData = await fetchMovies(movieId); // get full movie details
    const trailerData = await fetchMovies(`videos/${movieId}`);
    const trailer = trailerData.results.find(v=>v.type==="Trailer"&&v.site==="YouTube");

    // Create overlay
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";

    // Modal box
    const modalBox = document.createElement("div");
    modalBox.className = "modal-box";

    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.className = "close-btn"; 
    closeBtn.textContent="×";
    closeBtn.onclick = () => document.body.removeChild(overlay);

    // Trailer container
    const trailerDiv = document.createElement("div");
    trailerDiv.className = "trailer-container";
    const iframe = document.createElement("iframe");
    if(trailer) iframe.src = `https://www.youtube.com/embed/${trailer.key}?autoplay=1`;
    iframe.allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;
    trailerDiv.appendChild(iframe);

    // Movie info
    const infoDiv = document.createElement("div");
    infoDiv.className = "modal-info";
    const topActors = await getTopActors(movieId);
    infoDiv.innerHTML=`
      <h2>${movieData.title}</h2>
      <p><strong>Genres:</strong> ${movieData.genres.map(g=>g.name).join(", ")}</p>
      <p><strong>Release & Runtime:</strong> ${movieData.release_date} | ${movieData.runtime} min</p>
      <p><strong>Rating:</strong> ⭐ ${movieData.vote_average}</p>
      <p><strong>Overview:</strong> ${movieData.overview}</p>
      <p><strong>Top Actors:</strong> ${topActors}</p>
    `;

    modalBox.appendChild(closeBtn);
    modalBox.appendChild(trailerDiv);
    modalBox.appendChild(infoDiv);
    overlay.appendChild(modalBox);

    overlay.addEventListener("click",e=>{if(e.target===overlay) document.body.removeChild(overlay);});
    document.body.appendChild(overlay);

  } catch(err){ console.error(err); alert("Failed to load movie details"); }
}

// Fetch top 5 actors
async function getTopActors(movieId){
  try{
    const credits = await fetchMovies(`credits/${movieId}`);
    const top5 = credits.cast.slice(0,5).map(c=>c.name);
    return top5.join(", ");
  }catch(err){ console.error(err); return "N/A"; }
}

// ---------- LOAD SECTIONS ----------
async function loadSections(){
  const trending = await fetchMovies("trending");
  if(trending?.results) renderMovieGrid(trendingGrid,trending.results);

  const popular = await fetchMovies("popular");
  if(popular?.results) renderMovieGrid(popularGrid,popular.results);

  const topRated = await fetchMovies("top_rated");
  if(topRated?.results) renderMovieGrid(topRatedGrid,topRated.results);
}

// ---------- SEARCH ----------
async function onSearch(){
  const q = searchInput.value.trim();
  if(!q) return;
  const data = await fetchMovies(`search?q=${encodeURIComponent(q)}`);
  if(data?.results){
    renderMovieGrid(trendingGrid,data.results);
    popularGrid.innerHTML=""; topRatedGrid.innerHTML="";
  }
}

// ================== INIT ==================
function init(){
  loadUserSession();
  loadLocation();
  loadSections();
  searchBtn.addEventListener("click",onSearch);
  searchInput.addEventListener("keypress",e=>{if(e.key==="Enter")onSearch();});
}

init();
