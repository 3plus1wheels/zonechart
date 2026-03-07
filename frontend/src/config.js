// Empty string = same-origin (production). Falls back to local dev server.
const API_BASE = process.env.REACT_APP_API_BASE_URL ?? 'http://127.0.0.1:8000';
export default API_BASE;
