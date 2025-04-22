# Development
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Cài đặt nodemon globally
RUN npm install -g nodemon

# Expose port
EXPOSE 8000

# Command to run app
CMD ["npm", "run", "start", "dev"]