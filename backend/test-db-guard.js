const REQUIRED_ACKNOWLEDGEMENT = '1';
const TEST_NAME_PATTERN = /_test$/;
const NEON_HOST_PATTERN = /(?:^|\.)neon\.tech$/;

function neonEndpointId(hostname) {
  return hostname.split('.')[0]?.replace(/-pooler$/, '') ?? '';
}

function redactUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.password) {
      url.password = 'REDACTED';
    }
    return url.toString();
  } catch {
    return '<invalid URL>';
  }
}

export function redactErrorMessage(message, rawUrl) {
  if (!rawUrl) {
    return message;
  }
  let redacted = message;
  try {
    const url = new URL(rawUrl);
    if (url.password) {
      redacted = redacted.replaceAll(url.password, 'REDACTED');
      redacted = redacted.replaceAll(encodeURIComponent(url.password), 'REDACTED');
    }
  } catch {
    // URL validation reports a stable message without echoing the input.
  }
  return redacted.replaceAll(rawUrl, redactUrl(rawUrl));
}

export function validateTestDatabaseEnvironment(environment) {
  const rawUrl = environment.TEST_DATABASE_URL;

  if (!rawUrl) {
    throw new Error('TEST_DATABASE_URL is required.');
  }
  if (environment.ALLOW_TEST_DATABASE_RESET !== REQUIRED_ACKNOWLEDGEMENT) {
    throw new Error('ALLOW_TEST_DATABASE_RESET must be exactly "1".');
  }

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('TEST_DATABASE_URL must be a valid URL.');
  }

  if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
    throw new Error('TEST_DATABASE_URL must use PostgreSQL.');
  }

  const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
  const role = decodeURIComponent(url.username);

  const conventionalDisposableDatabase =
    !!database && TEST_NAME_PATTERN.test(database) &&
    !!role && TEST_NAME_PATTERN.test(role);
  if (!conventionalDisposableDatabase) {
    if (environment.ALLOW_NEON_BRANCH_RESET !== REQUIRED_ACKNOWLEDGEMENT) {
      if (!database || !TEST_NAME_PATTERN.test(database)) {
        throw new Error('The test database name must end in "_test".');
      }
      throw new Error('The test database role must end in "_test".');
    }
    if (!NEON_HOST_PATTERN.test(url.hostname)) {
      throw new Error('Neon branch resets require a neon.tech TEST_DATABASE_URL.');
    }

    let productionUrl;
    try {
      productionUrl = new URL(environment.PRODUCTION_DATABASE_URL);
    } catch {
      throw new Error('PRODUCTION_DATABASE_URL is required for Neon branch reset verification.');
    }
    if (!NEON_HOST_PATTERN.test(productionUrl.hostname)) {
      throw new Error('PRODUCTION_DATABASE_URL must use neon.tech for Neon branch verification.');
    }
    if (neonEndpointId(url.hostname) === neonEndpointId(productionUrl.hostname)) {
      throw new Error('The Neon test branch endpoint must differ from production.');
    }
  }

  return { rawUrl, database, role };
}

export function validateConnectedIdentity(expected, actual) {
  if (actual.database !== expected.database) {
    throw new Error('Connected database does not match TEST_DATABASE_URL.');
  }
  if (actual.role !== expected.role) {
    throw new Error('Connected database role does not match TEST_DATABASE_URL.');
  }
}

export { redactUrl };
