// Helper to create NextRequest mocks for API route testing

export function createMockRequest(body?: object, searchParams?: Record<string, string>) {
  const url = new URL('http://localhost:3000/api/test');
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const request = new Request(url.toString(), {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // NextRequest extends Request with additional properties
  Object.defineProperty(request, 'nextUrl', {
    value: {
      searchParams: url.searchParams,
      pathname: '/api/test',
    },
    writable: true,
  });

  return request;
}

// Helper to parse JSON response
export async function parseJsonResponse(response: Response) {
  const data = await response.json();
  return {
    status: response.status,
    data,
    ok: response.ok,
  };
}
