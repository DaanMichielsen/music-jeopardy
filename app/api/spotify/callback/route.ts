import { NextRequest, NextResponse } from 'next/server';
import { spotifyAuth } from '@/lib/spotify';

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // Determine the base URL for redirects
  const baseUrl = process.env.NODE_ENV === 'production'
    ? process.env.NEXT_PUBLIC_PRODUCTION_API_BASE_URL || 'https://music-jeopardy-git-main-daan-michielsen.vercel.app'
    : process.env.NEXT_PUBLIC_NGROK_BASE_URL || 'https://9eb9-2a02-1810-440a-6000-f8b3-228a-3482-a5b5.ngrok-free.app';

  if (error) {
    return NextResponse.redirect(new URL(`/spotify-auth?error=${error}`, baseUrl));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/spotify-auth?error=no_code', baseUrl));
  }

  try {
    // Exchange the authorization code for an access token
    const tokenData = await spotifyAuth.exchangeCodeForToken(code);
    
    // Store the tokens securely (you might want to store these in a database)
    // For now, we'll redirect with the tokens in the URL (not secure for production)
    const redirectUrl = new URL('/spotify-auth', baseUrl);
    redirectUrl.searchParams.set('access_token', tokenData.access_token);
    redirectUrl.searchParams.set('refresh_token', tokenData.refresh_token);
    redirectUrl.searchParams.set('expires_in', tokenData.expires_in.toString());
    
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    return NextResponse.redirect(new URL('/spotify-auth?error=token_exchange_failed', baseUrl));
  }
} 