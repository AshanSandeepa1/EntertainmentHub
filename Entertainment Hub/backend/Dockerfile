FROM node:20

WORKDIR /usr/src/app

# Copy package.json and install dependencies inside container
COPY package*.json ./
RUN npm install

# Copy the rest of the backend code
COPY . .


EXPOSE 5000

CMD ["node", "server.js"]
