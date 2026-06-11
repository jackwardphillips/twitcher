import 'dotenv/config';

export function pass(message: string) {
  console.log(`PASS ${message}`);
}

export function fail(message: string) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

export function info(message: string) {
  console.log(`INFO ${message}`);
}

export function safeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const redacted = message
    .replace(/postgresql:\/\/\S+/gi, '[redacted-postgres-url]')
    .replace(/password\s*=\s*\S+/gi, 'password=[redacted]')
    .split('\n')
    .find(line => line.trim().length > 0) ?? 'unknown error';

  if (/DATABASE_URL|secret/i.test(redacted)) {
    return 'internal error details hidden';
  }
  return redacted;
}

export async function fetchJson(url: string) {
  const response = await fetch(url);
  const text = await response.text();
  let body: unknown = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    body,
  };
}
