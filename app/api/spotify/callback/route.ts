import { NextRequest, NextResponse } from 'next/server';
import { spotifyAuth } from '@/lib/spotify';

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // Determine the base URL for redirects
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? process.env.NEXT_PUBLIC_BASE_URL ?? ''
    : 'https://7458-2a02-1810-440a-6000-c246-6bd0-4aae-d904.ngrok-free.app';

  if (error) {
    return NextResponse.redirect(new URL(`/spotify-auth?error=${error}`, baseUrl));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/spotify-auth?error=no_code', baseUrl));
  }

  try {
    // Exchange the authorization code for an access token
    const tokenData = await spotifyAuth.exchangeCodeForToken(code);
    
    // Redirect back to the original page (stored in session before auth)
    // We use the hash to pass tokens to the client-side without them being in browser history
    // In a real app, you'd have a dedicated page to handle this and not expose tokens in the URL
    const redirectPath = '/spotify-auth'; // Fallback to a safe page
    const hash = `access_token=${tokenData.access_token}&refresh_token=${tokenData.refresh_token}&expires_in=${tokenData.expires_in}`;
    
    const redirectUrl = new URL(`${redirectPath}#${hash}`, baseUrl);
    
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    return NextResponse.redirect(new URL('/spotify-auth?error=token_exchange_failed', baseUrl));
  }
} 