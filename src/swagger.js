
import dotenv from "dotenv";
import swaggerAutogen from 'swagger-autogen';

dotenv.config();

const API_URL = process.env.API_URL || "http://localhost:8081";
const doc = {
  info: {
    title: 'API Documentation',
    description: 'API SkinLeLe',
    version: '1.0.0'
  },
  host: API_URL, 
  schemes: ['http', 'https'], 
  tags: [
    {
      name: 'Authentication',
      description: 'APIs related to user authentication (login, register, etc.)',
    },
    {
      name: 'Brands',
      description: 'APIs related to managing brands',
    },
    {
      name: 'Categories',
      description: 'APIs related to product categories',
    },
    {
      name: 'Orders',
      description: 'APIs related to managing orders',
    },
    {
      name: 'Products',
      description: 'APIs related to managing products',
    },
    {
      name: 'Reviews',
      description: 'APIs related to product reviews',
    },
    {
      name: 'Doctors',
      description: 'APIs related to managing doctors',
    },
    {
      name: 'Bookings',
      description: 'APIs related to booking appointments',
    },
    {
      name: 'Clinics',
      description: 'APIs related to managing clinics',
    },
    {
      name: 'Notifications',
      description: 'APIs related to notifications',
    },
  ],
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['./index.js']; 

swaggerAutogen({ openapi: '3.0.0' })(outputFile, endpointsFiles, doc).then(() => {
  console.log('Swagger Initialized');
});

  