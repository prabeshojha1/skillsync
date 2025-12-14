'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ClinIQRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/company/cliniq')
  }, [router])
  
  return null
}
