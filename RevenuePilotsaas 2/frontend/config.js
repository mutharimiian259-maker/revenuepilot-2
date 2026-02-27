const API_BASE = window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "";

export default API_BASE;