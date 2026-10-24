/**
 * Apidog post-response script for POST /auth/login.
 * Store this in the request's Post Processors tab or Script Library.
 */

function readResponseBody() {
  try {
    return pm.response.json();
  } catch (error) {
    throw new Error('Login response is not valid JSON');
  }
}

function extractAuthData(body) {
  // Current API response: { statusCode, code, data: { accessToken, refreshToken } }
  if (body && body.data && body.data.accessToken) return body.data;

  // Keep the script useful if a raw DTO is returned by a direct service call.
  if (body && body.accessToken) return body;

  throw new Error('Login response does not contain accessToken and refreshToken');
}

function decodeAccessTokenExpiry(accessToken) {
  try {
    var payload = accessToken.split('.')[1];
    var normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    while (normalized.length % 4) normalized += '=';
    var claims = JSON.parse(atob(normalized));
    return claims.exp ? String(Number(claims.exp) * 1000) : '';
  } catch (error) {
    return '';
  }
}

var body = readResponseBody();
var auth = extractAuthData(body);

if (!auth.refreshToken) {
  throw new Error('Login response does not contain refreshToken');
}

pm.environment.set('accessToken', auth.accessToken);
pm.environment.set('refreshToken', auth.refreshToken);
pm.environment.set('accessTokenExpiresAt', decodeAccessTokenExpiry(auth.accessToken));
