'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import SignupForm from './signup-form'

export default function SignupPage() {
  const router = useRouter()

  useEffect(() => {
    // If user is already logged in, redirect to appropriate dashboard
    const user = getCurrentUser()
    if (user) {
      if (user.role === 'recruiter') {
        router.push('/dashboard/recruiter')
      } else {
        router.push('/dashboard/applicant')
      }
    }
  }, [router])

  return <SignupForm />
}
