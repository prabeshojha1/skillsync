'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAllProblemIds } from '@/lib/problems'

export default function EditorRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    // Get all available problem IDs and redirect to the first one (default)
    const problemIds = getAllProblemIds()
    const defaultProblemId = problemIds.length > 0 ? problemIds[0] : 'two-sum'
    router.replace(`/editor/${defaultProblemId}`)
  }, [router])

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Loading...</h1>
        <p className="text-muted-foreground">Redirecting to editor...</p>
      </div>
    </div>
  )
}
