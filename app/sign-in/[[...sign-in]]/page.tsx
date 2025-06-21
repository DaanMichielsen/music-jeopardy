"use client"

import { SignIn } from '@clerk/nextjs'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Page() {
  const router = useRouter()
  
  useEffect(() => {
    // Check if there's a return URL stored in session storage
    const returnToGame = sessionStorage.getItem('returnToGame');
    if (returnToGame) {
      // Clear the stored return URL and redirect
      sessionStorage.removeItem('returnToGame');
      router.push(returnToGame);
    }
  }, [router])
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 flex items-center justify-center">
      <SignIn />
    </div>
  )
}