export function rejectUnhandledExternalRequest(request: Request): void {
  const hostname = new URL(request.url).hostname;
  if (hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '::1') {
    return;
  }

  throw new Error(`Unhandled external request in test: ${request.method} ${request.url}`);
}
