/**
 * Apidog pre-request script for protected requests.
 * It refreshes the rotated token pair before the request is sent when the
 * access token is expired or is within refreshSkewSeconds of expiry.
 */

function environmentValue(name) {
  return pm.environment.get(name) || '';
}

function clearAuthState() {
  pm.environment.unset('accessToken');
  pm.environment.unset('refreshToken');
  pm.environment.unset('accessTokenExpiresAt');
}

function decodeAccessTokenExpiry(accessToken) {
  try {
    var payload = accessToken.split('.')[1];
    var normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    while (normalized.length % 4) normalized += '=';
    var claims = JSON.parse(atob(normalized));
    return claims.exp ? Number(claims.exp) * 1000 : 0;
  } catch (error) {
    return 0;
  }
}

function saveTokenPair(data) {
  if (!data || !data.accessToken || !data.refreshToken) {
    throw new Error('Refresh response does not contain a complete token pair');
  }

  pm.environment.set('accessToken', data.accessToken);
  pm.environment.set('refreshToken', data.refreshToken);
  pm.environment.set(
    'accessTokenExpiresAt',
    String(decodeAccessTokenExpiry(data.accessToken)),
  );
}

function shouldSkipRefresh() {
  var requestUrl = String(pm.request.url);
  return requestUrl.indexOf('/auth/login') !== -1 ||
    requestUrl.indexOf('/auth/refresh') !== -1 ||
    requestUrl.indexOf('/auth/register') !== -1;
}

function attachAccessToken() {
  var accessToken = environmentValue('accessToken');
  if (!accessToken) {
    throw new Error('No access token available; call /auth/login first');
  }

  pm.request.headers.upsert({
    key: 'Authorization',
    value: 'Bearer ' + accessToken,
  });
}

function refreshAccessToken(refreshToken) {
  var baseUrl = pm.variables.replaceIn('{{BASE_URL}}');

  pm.sendRequest({
    url: baseUrl + '/auth/refresh',
    method: 'POST',
    header: {
      'Content-Type': 'application/json',
    },
    body: {
      mode: 'raw',
      raw: JSON.stringify({ refreshToken: refreshToken }),
    },
  }, function (error, response) {
    if (error || !response || response.code < 200 || response.code >= 300) {
      clearAuthState();
      throw new Error('Refresh token failed; login again');
    }

    var body;
    try {
      body = response.json();
    } catch (parseError) {
      clearAuthState();
      throw new Error('Refresh response is not valid JSON; login again');
    }

    try {
      // Current API response: { statusCode, code, data: { ... } }
      saveTokenPair(body.data && body.data.accessToken ? body.data : body);
      attachAccessToken();
    } catch (saveError) {
      clearAuthState();
      throw saveError;
    }
  });
}

if (!shouldSkipRefresh()) {
  var accessToken = environmentValue('accessToken');
  var refreshToken = environmentValue('refreshToken');
  var expiresAt = Number(environmentValue('accessTokenExpiresAt')) ||
    decodeAccessTokenExpiry(accessToken);
  var skewSeconds = Number(environmentValue('refreshSkewSeconds')) || 30;
  var isUsable = accessToken && expiresAt > Date.now() + skewSeconds * 1000;

  if (isUsable) {
    attachAccessToken();
  } else if (refreshToken) {
    refreshAccessToken(refreshToken);
  } else {
    clearAuthState();
    throw new Error('No refresh token available; call /auth/login first');
  }
}
