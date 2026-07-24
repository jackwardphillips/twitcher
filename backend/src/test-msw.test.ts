import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './test/mocks/server';
import { rejectUnhandledExternalRequest } from './test/network-policy';

describe('MSW Network Mocking', () => {
  it('should mock a network call', async () => {
    server.use(
      http.get('https://api.example.com/data', () => {
        return HttpResponse.json({ success: true });
      })
    );
    
    const response = await fetch('https://api.example.com/data');
    const data = await response.json();
    
    expect(data).toEqual({ success: true });
  });

  it('allows intentional loopback integration requests', () => {
    expect(() => rejectUnhandledExternalRequest(
      new Request('http://127.0.0.1:43210/health'),
    )).not.toThrow();
    expect(() => rejectUnhandledExternalRequest(
      new Request('http://localhost:43210/health'),
    )).not.toThrow();
  });

  it('rejects unhandled external requests', () => {
    expect(() => rejectUnhandledExternalRequest(
      new Request('https://unhandled.invalid/example'),
    )).toThrow(
      'Unhandled external request in test',
    );
  });
});
