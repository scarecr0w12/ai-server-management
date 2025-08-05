// configService.ts
import axios from 'axios';

// Default configuration
const defaultConfig = {
  REACT_APP_API_URL: 'http://localhost:5000',
  REACT_APP_WS_URL: 'http://localhost:5000'
};

// Global configuration object
let config: typeof defaultConfig | null = null;

// Function to load configuration from config.json
export async function loadConfig() {
  try {
    // Try to fetch config from config.json
    const response = await axios.get('/config.json');
    config = { ...defaultConfig, ...response.data };
    console.log('Configuration loaded:', config);
  } catch (error) {
    console.warn('Failed to load config.json, using default configuration:', error);
    config = defaultConfig;
  }
  return config;
}

// Function to get configuration
export function getConfig() {
  if (!config) {
    throw new Error('Configuration not loaded. Call loadConfig() first.');
  }
  return config;
}

// Function to get API URL - dynamic based on current hostname
export function getApiUrl() {
  const config = getConfig();
  
  // If we have a configured API URL and it's not localhost, use it
  if (config.REACT_APP_API_URL && !config.REACT_APP_API_URL.includes('localhost')) {
    return config.REACT_APP_API_URL;
  }
  
  // Otherwise, construct URL based on current hostname
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  // Use same hostname as frontend but port 5000 for backend
  return `${protocol}//${hostname}:5000`;
}

// Function to get WebSocket URL
export function getWsUrl() {
  const config = getConfig();
  return config.REACT_APP_WS_URL;
}
