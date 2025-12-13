'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, signOut, type User } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/logo'
import Link from 'next/link'

export default function ApplicantDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const currentUser = getCurrentUser()
    
    if (!currentUser) {
      router.push('/login')
      return
    }

    if (currentUser.role !== 'applicant') {
      router.push('/dashboard/recruiter')
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
          <h1 className="text-4xl font-semibold mb-2">Welcome, Applicant!</h1>
          <p className="text-muted-foreground mb-8">
            This is your dashboard. Here you can view job opportunities, track your applications, and showcase your skills.
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-2">My Applications</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Track your job applications and their status
              </p>
              <Button variant="outline" size="sm">
                View Applications
              </Button>
            </div>

            <div className="rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-2">Skill Validation</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Prove your technical skills to employers
              </p>
              <Button variant="outline" size="sm">
                Take Assessment
              </Button>
            </div>

            <div className="rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-2">Job Opportunities</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Browse available positions
              </p>
              <Button variant="outline" size="sm">
                Browse Jobs
              </Button>
            </div>

            <div className="rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-2">Profile</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Manage your profile and preferences
              </p>
              <Button variant="outline" size="sm">
                Edit Profile
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
