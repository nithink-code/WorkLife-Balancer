/**
 * API Configuration - Handles environment-aware API base URL
 * This file ensures the frontend uses the correct backend URL
 * based on the current environment (development vs production)
 */

// Detect if running in production (Render deployment)
const isProduction = window.location.hostname !== 'localhost' && 
                     window.location.hostname !== '127.0.0.1';

// Set API base URL based on environment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL 
  ? 'http://localhost:8080'
  : 'https://worklife-balancer.onrender.com';

(`[API Config] Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
(`[API Config] API Base URL: ${API_BASE_URL}`);

export default API_BASE_URL;
