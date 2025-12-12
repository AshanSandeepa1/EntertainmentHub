Global Entertainment Hub – Full Stack (Docker Deployment)

A full-stack entertainment aggregation platform integrating multiple external APIs including TMDB, Spotify, YouTube, NewsAPI, OpenWeather, IPAPI, and Google OAuth.
This project is fully containerized and runs using Docker + Docker Compose with no npm installation required on the host machine.

Features

Unified backend API (Node.js + Express)
MongoDB database
Google OAuth login flow
Entertainment, weather, music, news, and geolocation data integrations
Works entirely with Docker

Requirements

Docker installed
Docker Compose plugin installed 
(No need to install Node.js, npm, or MongoDB locally.)


How to Run

Create .env file with the API keys as per the given template

Start all containers
From project root:
docker compose up -d --build


This will start:
Backend (Express API)
Frontend (React)
MongoDB

Access the Application

Frontend (React App)	http://localhost:5001
Backend API	http://localhost:3000/api/
MongoDB container internal hostname	mongo:27017
