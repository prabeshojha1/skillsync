'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, signOut, type User } from '@/lib/auth'
import { getRecruiterJobs, getRecruiterChallenges, type RecruiterJob, type RecruiterChallenge } from '@/lib/recruiter-data'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Spotlight } from '@/components/motion-primitives/spotlight'
import { Logo } from '@/components/logo'
import { 
  Briefcase, 
  Code2, 
  Users, 
  Clock, 
  Plus, 
  Calendar,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

function JobCard({ job, onViewApplicants }: { job: RecruiterJob; onViewApplicants: (jobId: string) => void }) {
  const statusColors = {
    active: 'bg-green-500/10 text-green-500 border-green-500/20',
    closed: 'bg-red-500/10 text-red-500 border-red-500/20',
    draft: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  }

  return (
    <Card className="relative min-w-[380px] cursor-pointer border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10">
      <Spotlight size={250} />
      <CardContent className="p-6 h-full flex flex-col justify-between relative z-10">
        <div>
          <div className="flex items-start justify-between mb-3">
            <Badge 
              variant="outline" 
              className={cn("text-xs capitalize", statusColors[job.status])}
            >
              {job.status}
            </Badge>
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <Calendar className="h-3 w-3" />
              <span>{new Date(job.postedAt).toLocaleDateString()}</span>
            </div>
          </div>
          
          <h3 className="font-bold text-xl mb-2">{job.role}</h3>
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{job.description}</p>
          
          <div className="flex flex-wrap gap-1.5 mb-4">
            {job.skills.slice(0, 3).map((skill, idx) => (
              <Badge key={idx} variant="outline" className="text-xs font-normal">
                {skill}
              </Badge>
            ))}
            {job.skills.length > 3 && (
              <Badge variant="outline" className="text-xs font-normal">
                +{job.skills.length - 3}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{job.applicantCount} applicants</span>
          </div>
          <Button 
            size="sm" 
            variant="ghost" 
            className="text-xs h-7 text-primary hover:text-primary/80"
            onClick={(e) => {
              e.stopPropagation()
              onViewApplicants(job.id)
            }}
          >
            View Applicants <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ChallengeCard({ challenge, onClick }: { challenge: RecruiterChallenge; onClick: () => void }) {
  const difficultyColors = {
    Easy: 'bg-green-500/10 text-green-500 border-green-500/20',
    Medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    Hard: 'bg-red-500/10 text-red-500 border-red-500/20',
  }

  return (
    <Card 
      className="relative min-w-[380px] cursor-pointer border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
      onClick={onClick}
    >
      <Spotlight size={250} />
      <CardContent className="p-6 h-full flex flex-col justify-between relative z-10">
        <div className="flex items-start justify-between mb-3">
          <Badge 
            variant="outline" 
            className={cn("text-xs", difficultyColors[challenge.difficulty])}
          >
            {challenge.difficulty}
          </Badge>
          <div className="flex items-center gap-1.5 text-primary text-xs font-medium">
            <Clock className="h-3 w-3" />
            <span>{challenge.timeLimit}</span>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col justify-center mb-4">
          <h3 className="font-bold text-lg leading-tight mb-1">{challenge.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{challenge.description}</p>
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{challenge.applicantCount} submissions</span>
          </div>
          <Button size="sm" variant="ghost" className="text-xs h-7 text-primary hover:text-primary/80">
            View Results <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function AddCard({ label, icon: Icon, onClick }: { label: string; icon: React.ElementType; onClick: () => void }) {
  return (
    <Card 
      className="relative min-w-[200px] h-[200px] cursor-pointer border-dashed border-2 border-border/50 bg-card/30 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:bg-card/50"
      onClick={onClick}
    >
      <CardContent className="p-5 h-full flex flex-col items-center justify-center gap-3 relative z-10">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  )
}

export default function RecruiterDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState<RecruiterJob[]>([])
  const [challenges, setChallenges] = useState<RecruiterChallenge[]>([])
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
    setJobs(getRecruiterJobs())
    setChallenges(getRecruiterChallenges())
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

  const userInitials = user.email?.charAt(0).toUpperCase() || 'R'
  const totalApplicants = jobs.reduce((sum, job) => sum + job.applicantCount, 0)
  const totalSubmissions = challenges.reduce((sum, c) => sum + c.applicantCount, 0)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="transition-opacity hover:opacity-80">
            <Logo />
          </Link>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              Sign Out
            </Button>
            <Link href="/profile">
              <Avatar className="cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 ring-offset-2 ring-offset-background">
                <AvatarImage src="" alt={user.email || ''} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">{userInitials}</AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
      </header>

      <main className="pb-16">
        {/* Stats Bar */}
        <section className="container mx-auto px-6 py-8">
          <div className="flex flex-wrap items-center gap-6 border-b border-border/50 pb-6">
            <div className="flex items-center gap-3 pr-6 border-r border-border/50">
              <Briefcase className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-semibold">{jobs.length}</p>
                <p className="text-xs text-muted-foreground">Active Jobs</p>
              </div>
            </div>
            <div className="flex items-center gap-3 pr-6 border-r border-border/50">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-semibold">{totalApplicants}</p>
                <p className="text-xs text-muted-foreground">Total Applicants</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Code2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-semibold">{totalSubmissions}</p>
                <p className="text-xs text-muted-foreground">Challenge Submissions</p>
              </div>
            </div>
          </div>
        </section>

        {/* Job Postings */}
        <section className="container mx-auto px-6 mb-16">
          <div className="flex items-center gap-3 mb-6">
            <Briefcase className="h-7 w-7 text-primary" />
            <h2 className="text-3xl font-bold">Job Postings</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
          </div>
          <div className="flex gap-5 overflow-x-auto pb-6 scrollbar-hide -mx-6 px-6">
            <AddCard
              label="Add New Job"
              icon={Plus}
              onClick={() => router.push('/dashboard/recruiter/job/new')}
            />
            {jobs.map((job) => (
              <JobCard 
                key={job.id} 
                job={job} 
                onViewApplicants={(jobId) => router.push(`/dashboard/recruiter/job/${jobId}/applicants`)}
              />
            ))}
          </div>
        </section>

        {/* Challenges */}
        <section className="container mx-auto px-6 mb-16">
          <div className="flex items-center gap-3 mb-6">
            <Code2 className="h-7 w-7 text-primary" />
            <h2 className="text-3xl font-bold">Challenges</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
          </div>
          <div className="flex gap-5 overflow-x-auto pb-6 scrollbar-hide -mx-6 px-6">
            <AddCard 
              label="Add Challenge" 
              icon={Plus} 
              onClick={() => router.push('/dashboard/recruiter/challenge/new')} 
            />
            {challenges.map((challenge) => (
              <ChallengeCard 
                key={challenge.id} 
                challenge={challenge} 
                onClick={() => router.push(`/dashboard/recruiter/challenge/${challenge.id}`)}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
