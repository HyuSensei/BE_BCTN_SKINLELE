FROM node:18-alpine

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./

RUN npm install

COPY . .

RUN npm install -g nodemon

CMD ["npm", "run", "dev"]

EXPOSE 8081
