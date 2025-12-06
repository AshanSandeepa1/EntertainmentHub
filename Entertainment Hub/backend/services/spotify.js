const axios = require("axios");

let cachedToken = null;
let tokenExpiry = null;

// ---------------- Get Spotify Access Token ---------------- //
async function getSpotifyToken() {
  const now = Date.now();

  // Reuse token if valid
  if (cachedToken && tokenExpiry && now < tokenExpiry) {
    return cachedToken;
  }

  const res = await axios.post(
    "https://accounts.spotify.com/api/token",
    "grant_type=client_credentials",
    {
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
          ).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  cachedToken = res.data.access_token;
  tokenExpiry = now + res.data.expires_in * 1000;

  return cachedToken;
}

// ---------------- Fetch Spotify Playlist ---------------- //
async function getPlaylistTracks(playlistId) {
  const token = await getSpotifyToken();

  const res = await axios.get(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return res.data.items.map((item) => {
    const t = item.track;
    return {
      trackId: t.id,
      trackName: t.name,
      artistName: t.artists.map((a) => a.name).join(", "),
      albumArt: t.album.images[0]?.url || "",
      previewUrl: t.preview_url,
      uri: t.uri
    };
  });
}

module.exports = {
  getSpotifyToken,
  getPlaylistTracks,
};
