window.addEventListener("load", async () => {
  resizeCanvas();
  await fetchConfig(); // fetch API key first
  await fetchWeather();
});

const forecastContainer = document.getElementById("forecastContainer");
const cityName = document.getElementById("cityName");
const countryFlag = document.getElementById("countryFlag");
const weatherIcon = document.getElementById("weatherIcon");
const temperature = document.getElementById("temperature");
const weatherDesc = document.getElementById("weatherDesc");
const moodSuggestion = document.getElementById("moodSuggestion");
const tempMin = document.getElementById("tempMin");
const tempMax = document.getElementById("tempMax");
const feelsLike = document.getElementById("feelsLike");
const humidity = document.getElementById("humidity");
const wind = document.getElementById("wind");
const pressure = document.getElementById("pressure");
const visibility = document.getElementById("visibility");
const sunrise = document.getElementById("sunrise");
const sunset = document.getElementById("sunset");
const clouds = document.getElementById("clouds");
const windDir = document.getElementById("windDir");

const canvas = document.getElementById("weatherCanvas");
const ctx = canvas.getContext("2d");

// ---------------- FETCH API KEY ---------------- //
let OPENWEATHER_KEY = "";
async function fetchConfig() {
  try {
    const res = await fetch("/api/config"); // relative path works in production
    const data = await res.json();
    OPENWEATHER_KEY = data.OPENWEATHER_KEY;
  } catch (err) {
    console.error("Error fetching API key:", err);
  }
}

// Canvas resizing
function resizeCanvas(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);

// --- Mood suggestion ---
function getMoodSuggestion(desc){
  desc = desc.toLowerCase();
  if(desc.includes("rain")) return "🌧 Grab an umbrella!";
  if(desc.includes("cloud")) return "☁️ Calm and cloudy!";
  if(desc.includes("sun")) return "☀️ Perfect sunny day!";
  if(desc.includes("snow")) return "❄️ Stay warm!";
  return "🎵 Enjoy your day!";
}

// --- Detect city dynamically ---
async function detectCity(){
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    console.log("Detected city via IP:", data.city);
    return data.city; // fallback
  } catch(err) {
    console.warn("IP detection failed, defaulting to Colombo");
    return "Colombo";
  }
}


// --- Fetch Weather ---
async function fetchWeather(){
  try{
    const city = await detectCity();

    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHER_KEY}&units=metric`);
    const data = await res.json();

    // Current weather
    cityName.textContent = data.name;
    countryFlag.src = `https://flagcdn.com/48x36/${data.sys.country.toLowerCase()}.png`;
    weatherIcon.src = `http://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
    temperature.textContent = `${data.main.temp.toFixed(1)}°C`;
    weatherDesc.textContent = data.weather[0].description;
    moodSuggestion.textContent = getMoodSuggestion(data.weather[0].description);
    tempMin.textContent = `${data.main.temp_min.toFixed(1)}°C`;
    tempMax.textContent = `${data.main.temp_max.toFixed(1)}°C`;
    feelsLike.textContent = `${data.main.feels_like.toFixed(1)}°C`;
    humidity.textContent = `${data.main.humidity}%`;
    wind.textContent = `${data.wind.speed} m/s`;
    pressure.textContent = `${data.main.pressure} hPa`;
    visibility.textContent = `${data.visibility} m`;
    sunrise.textContent = new Date(data.sys.sunrise*1000).toLocaleTimeString();
    sunset.textContent = new Date(data.sys.sunset*1000).toLocaleTimeString();
    clouds.textContent = `${data.clouds.all}%`;
    windDir.textContent = `${data.wind.deg}°`;

    setWeatherAnimation(data.weather[0].description.toLowerCase());

    // Store city for future
    localStorage.setItem("weatherCity", data.name);

    // Fetch forecast (3-hour interval)
    fetchForecast(data.name);

  }catch(err){
    console.error("Weather fetch error:", err);
  }
}

// --- Forecast ---
async function fetchForecast(city){
  try{
    const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${OPENWEATHER_KEY}`);
    const data = await res.json();

    // next 12 hours => 4 forecasts (3-hour interval)
    populateForecast(data.list.slice(0,4));

  }catch(err){
    console.error("Forecast fetch error:", err);
  }
}

function populateForecast(list){
  forecastContainer.innerHTML = "";
  list.forEach(item=>{
    const card = document.createElement("div");
    card.className = "forecast-card";

    const time = new Date(item.dt*1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    const icon = `http://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png`;
    const temp = `${item.main.temp.toFixed(1)}°C`;

    card.innerHTML = `<p>${time}</p><img src="${icon}"><p>${temp}</p>`;
    forecastContainer.appendChild(card);
  });
}

// --- Canvas Animations ---
let particles = [];

function createParticles(type){
  particles = [];
  const count = type==="rain"?200:type==="snow"?150:0;
  for(let i=0;i<count;i++){
    particles.push({
      x: Math.random()*canvas.width,
      y: Math.random()*canvas.height,
      speed: type==="rain"?4+Math.random()*4:1+Math.random()*1,
      size: type==="rain"?2:5+Math.random()*3
    });
  }
}

function animateParticles(type){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = type==="rain"?"rgba(174,194,224,0.5)":"white";
  particles.forEach(p=>{
    if(type==="rain"){
      ctx.fillRect(p.x,p.y,2,10);
      p.y+=p.speed;
      if(p.y>canvas.height)p.y=-10;
    }else if(type==="snow"){
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
      ctx.fill();
      p.y+=p.speed;
      p.x+=Math.sin(p.y/10);
      if(p.y>canvas.height)p.y=-5;
    }
  });
  requestAnimationFrame(()=>animateParticles(type));
}

function setWeatherAnimation(desc){
  if(desc.includes("rain")){
    createParticles("rain");
    animateParticles("rain");
  }else if(desc.includes("snow")){
    createParticles("snow");
    animateParticles("snow");
  }else{
    ctx.clearRect(0,0,canvas.width,canvas.height);
  }
}
