// Generated runtime config with extended configuration
window.appConfig = {
  // Your Google Maps API key (from environment variable or fallback)
  googleMapsApiKey: "AIzaSyCHKhYZwQR37M_0QctXUQe6VFRFrlhaYj8",

  // Map ID for Advanced Markers (from environment variable or fallback)
  googleMapsMapId: "ebe8ec43a7bc252d",

  // Other configuration settings can be added here
  environment: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'development'
    : 'production'
};