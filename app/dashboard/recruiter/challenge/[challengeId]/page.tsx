'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getCurrentUser, type User } from '@/lib/auth'
import { 
  getChallengeById, 
  getChallengeSubmissions,
  deleteChallengeSubmission,
  type RecruiterChallenge, 
  type ApplicantSubmission 
} from '@/lib/recruiter-data'
import { CheatingDetailModal, useCheatingModal } from '@/components/cheating-detail-modal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Logo } from '@/components/logo'
import { 
  ArrowLeft, 
  Clock, 
  Users, 
  AlertTriangle,
  Calendar,
  Mail,
  Timer,
  BarChart3,
  Trash2,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

function ScoreBadge({ score }: { score: number }) {
  const getScoreColor = (score: number) => {
    if (score >= 9) return 'bg-green-500/10 text-green-500 border-green-500/20'
    if (score >= 7) return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    if (score >= 5) return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
    return 'bg-red-500/10 text-red-500 border-red-500/20'
  }

  return (
    <Badge variant="outline" className={cn("text-sm font-bold px-3 py-1", getScoreColor(score))}>
      {score.toFixed(1)}/10
    </Badge>
  )
}

function ApplicantRow({ 
  submission, 
  rank, 
  onFlagClick,
  onDelete,
  challengeId,
  router
}: { 
  submission: ApplicantSubmission
  rank: number
  onFlagClick: () => void
  onDelete: () => void
  challengeId: string
  router: ReturnType<typeof useRouter>
}) {
  const hasCheatingFlags = submission.cheatingFlags.length > 0
  const initials = submission.applicantName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()

  return (
    <Card className={cn(
      "relative border-border/50 bg-card/50 transition-all duration-200 hover:bg-card/80",
      hasCheatingFlags && "border-red-500/30"
    )}>
      <CardContent className="p-4 relative z-10">
        <div className="flex items-center gap-4">
          {/* Rank */}
          <div className="flex size-8 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground font-mono text-sm font-medium">
            #{rank}
          </div>

          {/* Avatar */}
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-base truncate">{submission.applicantName}</h3>
              {hasCheatingFlags && (
                <button
                  onClick={onFlagClick}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-xs font-medium hover:bg-red-500/20 transition-colors"
                >
                  <AlertTriangle className="h-3 w-3" />
                  <span>{submission.cheatingFlags.length} flag{submission.cheatingFlags.length > 1 ? 's' : ''}</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1 truncate">
                <Mail className="h-3 w-3 shrink-0" />
                {submission.applicantEmail}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={(e) => {
                e.stopPropagation()
                // Navigate to review page for patient-monitoring-system
                if (challengeId === 'patient-monitoring-system') {
                  router.push(`/dashboard/recruiter/challenge/${challengeId}/review?submissionId=${submission.id}`)
                } else {
                  // Placeholder for other challenges
                  console.log('Review not yet implemented for this challenge')
                }
              }}
            >
              Review submission
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 shrink-0">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Time Spent</p>
              <div className="flex items-center gap-1 text-sm font-medium">
                <Timer className="h-3 w-3 text-muted-foreground" />
                {submission.timeSpent}
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Submitted</p>
              <div className="flex items-center gap-1 text-sm font-medium">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                {new Date(submission.submittedAt).toLocaleDateString()}
              </div>
            </div>
            <ScoreBadge score={submission.score} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ChallengeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const challengeId = params.challengeId as string
  
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [challenge, setChallenge] = useState<RecruiterChallenge | null>(null)
  const [submissions, setSubmissions] = useState<ApplicantSubmission[]>([])
  
  const { isOpen, selectedApplicant, openModal, closeModal } = useCheatingModal()

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

    const challengeData = getChallengeById(challengeId)
    if (!challengeData) {
      router.push('/dashboard/recruiter')
      return
    }

    setUser(currentUser)
    setChallenge(challengeData)
    
    // Load submissions from API
    const loadSubmissions = async () => {
      try {
        const subs = await getChallengeSubmissions(challengeId)
        console.log('Loading submissions for', challengeId, ':', subs)
        setSubmissions(subs)
      } catch (error) {
        console.error('Error loading submissions:', error)
      }
    }
    
    loadSubmissions().then(() => setLoading(false))
    
    // Listen for custom event when submission is added (same window)
    const handleSubmissionAdded = (e: CustomEvent) => {
      if (e.detail?.challengeId === challengeId) {
        console.log('Submission added event received, refreshing submissions')
        loadSubmissions()
      }
    }
    
    // Poll for changes every 2 seconds (for cross-browser scenarios)
    const pollInterval = setInterval(() => {
      loadSubmissions()
    }, 2000)
    
    window.addEventListener('submissionAdded', handleSubmissionAdded as EventListener)
    
    // Also refresh on focus
    const handleFocus = () => {
      loadSubmissions()
    }
    window.addEventListener('focus', handleFocus)
    
    return () => {
      clearInterval(pollInterval)
      window.removeEventListener('submissionAdded', handleSubmissionAdded as EventListener)
      window.removeEventListener('focus', handleFocus)
    }
  }, [router, challengeId])

  const handleDeleteSubmission = async (submissionId: string) => {
    try {
      await deleteChallengeSubmission(challengeId, submissionId)
      // Refresh submissions
      const subs = await getChallengeSubmissions(challengeId)
      setSubmissions(subs)
    } catch (error) {
      console.error('Error deleting submission:', error)
    }
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

  if (!user || !challenge) {
    return null
  }

  const difficultyColors = {
    Easy: 'bg-green-500/10 text-green-500 border-green-500/20',
    Medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    Hard: 'bg-red-500/10 text-red-500 border-red-500/20',
  }

  const averageScore = submissions.length > 0
    ? submissions.reduce((sum, s) => sum + s.score, 0) / submissions.length
    : 0

  const flaggedCount = submissions.filter(s => s.cheatingFlags.length > 0).length

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => router.push('/dashboard/recruiter')}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Link href="/" className="transition-opacity hover:opacity-80">
              <Logo />
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.email}</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Challenge Info Header */}
        <Card className="relative mb-8 border-border/50 bg-card/80 overflow-hidden">
          <CardHeader className="relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <CardTitle className="text-3xl">{challenge.title}</CardTitle>
                  <Badge 
                    variant="outline" 
                    className={cn("text-sm", difficultyColors[challenge.difficulty])}
                  >
                    {challenge.difficulty}
                  </Badge>
                </div>
                <CardDescription className="text-base max-w-2xl">
                  {challenge.description}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 text-primary text-sm font-medium">
                <Clock className="h-4 w-4" />
                <span>{challenge.timeLimit}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold">{submissions.length}</p>
                  <p className="text-xs text-muted-foreground">Submissions</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold">{averageScore.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">Avg Score</p>
                </div>
              </div>
              {flaggedCount > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-red-500/10">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-red-500">{flaggedCount}</p>
                    <p className="text-xs text-muted-foreground">Flagged</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Applicant Rankings */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-2xl font-bold mb-2">Applicant Rankings</h2>
              <p className="text-muted-foreground">
                Candidates ranked by their performance score. Click on red flags to view integrity concerns.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const subs = await getChallengeSubmissions(challengeId)
                  console.log('Manual refresh - submissions:', subs)
                  setSubmissions(subs)
                } catch (error) {
                  console.error('Error refreshing submissions:', error)
                }
              }}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {submissions.map((submission, index) => (
            <ApplicantRow
              key={submission.id}
              submission={submission}
              rank={index + 1}
              onFlagClick={() => openModal(submission.applicantName, submission.cheatingFlags)}
              onDelete={() => handleDeleteSubmission(submission.id)}
              challengeId={challengeId}
              router={router}
            />
          ))}
        </div>

        {submissions.length === 0 && (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Submissions Yet</h3>
              <p className="text-muted-foreground">
                No candidates have attempted this challenge yet.
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Cheating Detail Modal */}
      {selectedApplicant && (
        <CheatingDetailModal
          isOpen={isOpen}
          onClose={closeModal}
          applicantName={selectedApplicant.name}
          cheatingFlags={selectedApplicant.flags}
        />
      )}
    </div>
  )
}
