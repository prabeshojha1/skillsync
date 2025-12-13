'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, signOut, type User } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/logo'
import Link from 'next/link'

export default function RecruiterDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const currentUser = getCurrentUser()
    
    if (!currentUser) {
      router.push('/login')
      return
    }

    if (currentUser.role !== 'recruiter') {
      router.push('/dashboard/applicant')
      return
    }

    setUser(currentUser)
    setLoading(false)
  }, [router])

  const handleSignOut = () => {
    signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-4xl">
          <h1 className="text-4xl font-semibold mb-2">Welcome, Recruiter!</h1>
          <p className="text-muted-foreground mb-8">
            This is your dashboard. Here you can post jobs, review applicants, and find qualified talent quickly.
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-2">Post a Job</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Create a new job posting to attract qualified candidates
              </p>
              <Button variant="outline" size="sm">
                Create Job Post
              </Button>
            </div>

            <div className="rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-2">Review Applicants</h2>
              <p className="text-sm text-muted-foreground mb-4">
                View and evaluate candidates who have applied
              </p>
              <Button variant="outline" size="sm">
                View Applicants
              </Button>
            </div>

            <div className="rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-2">Find Talent</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Search for candidates with validated skills
              </p>
              <Button variant="outline" size="sm">
                Search Candidates
              </Button>
            </div>

            <div className="rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-2">Company Settings</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Manage your company profile and preferences
              </p>
              <Button variant="outline" size="sm">
                Settings
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
