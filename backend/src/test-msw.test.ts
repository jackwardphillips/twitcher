import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './test/mocks/server';

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
});
