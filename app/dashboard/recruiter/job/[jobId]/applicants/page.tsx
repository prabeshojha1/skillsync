'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getCurrentUser, type User } from '@/lib/auth'
import { getJobApplicants, getJobRequiredChallenges, getRecruiterJobs, type JobApplicant } from '@/lib/recruiter-data'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Logo } from '@/components/logo'
import { ArrowLeft, Users, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type SortOption = 'best-performance' | 'resume-fitness-performance'

export default function JobApplicantsPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params?.jobId as string
  
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [applicants, setApplicants] = useState<JobApplicant[]>([])
  const [highIntegrityOnly, setHighIntegrityOnly] = useState(false)
  const [completedAllProblems, setCompletedAllProblems] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('best-performance')
  const [showResumeAnalysisModal, setShowResumeAnalysisModal] = useState(false)
  
  const job = useMemo(() => {
    const jobs = getRecruiterJobs()
    return jobs.find(j => j.id === jobId)
  }, [jobId])
  
  const requiredChallenges = useMemo(() => getJobRequiredChallenges(jobId), [jobId])
  const totalChallenges = requiredChallenges.length

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
    setApplicants(getJobApplicants(jobId))
    setLoading(false)
  }, [router, jobId])

  // Handle resume analysis modal when sorting changes
  useEffect(() => {
    if (sortBy === 'resume-fitness-performance') {
      setShowResumeAnalysisModal(true)
      // Auto-close after 2.5 seconds
      const timer = setTimeout(() => {
        setShowResumeAnalysisModal(false)
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [sortBy])

  // Filter and sort applicants
  const filteredAndSortedApplicants = useMemo(() => {
    let filtered = [...applicants]

    // Apply filters
    if (highIntegrityOnly) {
      filtered = filtered.filter(applicant => {
        const totalViolations = applicant.submissions.reduce((sum, sub) => sum + sub.violations, 0)
        return totalViolations < 5
      })
    }

    if (completedAllProblems) {
      filtered = filtered.filter(applicant => applicant.submissions.length === totalChallenges)
    }

    // Apply sorting
    if (sortBy === 'best-performance') {
      filtered.sort((a, b) => {
        const avgScoreA = a.submissions.length > 0
          ? a.submissions.reduce((sum, sub) => sum + sub.score, 0) / a.submissions.length
          : 0
        const avgScoreB = b.submissions.length > 0
          ? b.submissions.reduce((sum, sub) => sum + sub.score, 0) / b.submissions.length
          : 0
        return avgScoreB - avgScoreA
      })
    } else if (sortBy === 'resume-fitness-performance') {
      filtered.sort((a, b) => {
        const avgScoreA = a.submissions.length > 0
          ? a.submissions.reduce((sum, sub) => sum + sub.score, 0) / a.submissions.length
          : 0
        const avgScoreB = b.submissions.length > 0
          ? b.submissions.reduce((sum, sub) => sum + sub.score, 0) / b.submissions.length
          : 0
        
        const combinedScoreA = (avgScoreA * 0.6) + (a.resumeFitness * 0.4)
        const combinedScoreB = (avgScoreB * 0.6) + (b.resumeFitness * 0.4)
        return combinedScoreB - combinedScoreA
      })
    }

    return filtered
  }, [applicants, highIntegrityOnly, completedAllProblems, sortBy, totalChallenges])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    )
  }

  if (!user || !job) {
    return null
  }

  const userInitials = user.email?.charAt(0).toUpperCase() || 'R'

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/dashboard/recruiter" className="transition-opacity hover:opacity-80">
            <Logo />
          </Link>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <Link href="/profile">
              <Avatar className="cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 ring-offset-2 ring-offset-background">
                <AvatarImage src="" alt={user.email || ''} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">{userInitials}</AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Back button and title */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/recruiter')}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{job.role}</h1>
            <p className="text-sm text-muted-foreground mt-1">{job.description}</p>
          </div>
        </div>

        {/* Filters and Sort */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-card border rounded-lg">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="high-integrity"
                checked={highIntegrityOnly}
                onCheckedChange={(checked) => setHighIntegrityOnly(checked === true)}
              />
              <label
                htmlFor="high-integrity"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                High integrity only
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="completed-all"
                checked={completedAllProblems}
                onCheckedChange={(checked) => setCompletedAllProblems(checked === true)}
              />
              <label
                htmlFor="completed-all"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Completed all problems
              </label>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <label htmlFor="sort" className="text-sm font-medium">Sort by:</label>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger id="sort" className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="best-performance">Best performance</SelectItem>
                <SelectItem value="resume-fitness-performance">Resume fitness + performance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Applicants List */}
        <div className="space-y-4">
          {filteredAndSortedApplicants.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No applicants match the current filters.</p>
              </CardContent>
            </Card>
          ) : (
            filteredAndSortedApplicants.map((applicant) => {
              const completedCount = applicant.submissions.length
              const totalViolations = applicant.submissions.reduce((sum, sub) => sum + sub.violations, 0)
              const avgScore = applicant.submissions.length > 0
                ? applicant.submissions.reduce((sum, sub) => sum + sub.score, 0) / applicant.submissions.length
                : 0

              return (
                <Card key={applicant.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {applicant.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">{applicant.name}</h3>
                          <p className="text-sm text-muted-foreground mb-3">{applicant.email}</p>
                          <div className="flex flex-wrap gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Challenges:</span>
                              <span className="font-medium">
                                {completedCount}/{totalChallenges}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {totalViolations === 0 ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              <span className="text-muted-foreground">Violations:</span>
                              <span className={cn(
                                "font-medium",
                                totalViolations === 0 ? "text-green-500" : totalViolations < 5 ? "text-yellow-500" : "text-red-500"
                              )}>
                                {totalViolations}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Avg Score:</span>
                              <span className="font-medium">{avgScore.toFixed(1)}/10</span>
                            </div>
                            {sortBy === 'resume-fitness-performance' && (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Resume Fit:</span>
                                <span className="font-medium">{applicant.resumeFitness.toFixed(1)}/10</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </main>

      {/* Resume Analysis Modal */}
      {showResumeAnalysisModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={() => setShowResumeAnalysisModal(false)}
        >
          <Card 
            className="w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent className="p-8 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Analyzing Resumes</h3>
              <p className="text-muted-foreground">
                Please give us a moment as we analyse resumes...
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
