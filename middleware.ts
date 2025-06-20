import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)', 
  '/sign-up(.*)', 
  '/upload-avatar(.*)',
  '/test-upload(.*)',
  '/buzzer(.*)',
  '/api/upload-avatar(.*)',
  '/api/notify-avatar-update(.*)',
  '/api/socket(.*)',
  '/spotify-auth(.*)',
  '/spotify-status(.*)',
  '/api/spotify(.*)'
])

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth()
  const { pathname } = req.nextUrl

  // Redirect base URL to lobbies page for authenticated users
  if (pathname === '/' && userId) {
    return NextResponse.redirect(new URL('/lobbies', req.url))
  }

  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}