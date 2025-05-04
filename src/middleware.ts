import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Get basic auth credentials from environment variables
const USERNAME = process.env.BASIC_AUTH_USERNAME || 'modestas';
const PASSWORD = process.env.BASIC_AUTH_PASSWORD || 'TMog7pdkfpQM';

export function middleware(request: NextRequest) {
  // Skip authentication for public assets
  if (
    request.nextUrl.pathname.startsWith('/_next') || 
    request.nextUrl.pathname.includes('/public/') ||
    request.nextUrl.pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get('authorization');

  if (authHeader) {
    const encodedCredentials = authHeader.split(' ')[1];
    const decodedCredentials = Buffer.from(encodedCredentials, 'base64').toString('utf-8');
    const [username, password] = decodedCredentials.split(':');

    if (username === USERNAME && password === PASSWORD) {
      return NextResponse.next();
    }
  }

  // Return 401 Unauthorized response with WWW-Authenticate header
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  });
}

// Apply middleware to all routes
export const config = {
  matcher: ['/((?!api/auth).*)'],
}; 