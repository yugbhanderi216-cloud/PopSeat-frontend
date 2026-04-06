/**
 * Lightweight JWT decoder for PopSeat session tokens.
 * Decodes the payload from a standard JWT without verification.
 * @param {string} token 
 * @returns {object|null}
 */
export const jwt_decode = (token) => {
  try {
    if (!token) return null;
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error("JWT Decode error:", err);
    return null;
  }
};
