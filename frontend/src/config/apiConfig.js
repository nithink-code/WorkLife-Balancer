/**
 * API Configuration - Handles environment-aware API base URL
 * This file ensures the frontend uses the correct backend URL
 * based on the current environment (development vs production)
 */

// Detect if running in production (Render deployment)
const isProduction = window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1';

// Set API base URL based on environment
// In production on Render, frontend and backend are served from the same domain
// In development, use localhost:8080
const API_BASE_URL = isProduction
  ? window.location.origin  // Use same origin in production (e.g., https://worklife-balancer.onrender.com)
  : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080');  // Use localhost in dev

console.log(`[API Config] Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
console.log(`[API Config] Hostname: ${window.location.hostname}`);
console.log(`[API Config] API Base URL: ${API_BASE_URL}`);

export default API_BASE_URL;
