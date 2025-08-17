// Function to get the correct API URL for all components
export const getApiUrl = () => {
  // If VITE_API_URL is set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // In production (when served from the same domain), use relative URLs
  if (import.meta.env.PROD) {
    return window.location.origin;
  }
  
  // Development fallback
  return 'http://localhost:5000';
};
