'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, type User } from '@/lib/auth'
import { hasCompletedProfile } from '@/lib/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Spotlight } from '@/components/motion-primitives/spotlight'
import { Tilt } from '@/components/motion-primitives/tilt'
import { GridPattern } from '@/components/ui/shadcn-io/grid-pattern'
import { Logo } from '@/components/logo'
import { Search, Mic, Clock, Building2, Briefcase, CheckCircle2, X } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useMemo } from 'react'
import { getCompanyBySlug, searchCompanies, getAllCompanies } from '@/lib/companies'
import { getAllJobs } from '@/lib/jobs'

// Types
type Challenge = {
  id: number
  title: string
  company: string
  tech: string
  time: string
  hasVoice: boolean
  progress: string
  category?: string
}

type Job = {
  id: number | string
  role: string
  company: string
  composition: string
  companySlug?: string
}

type Company = {
  id: number
  name: string
  logo: string
  completed: number
  total: number
  status: string
}

// Mock data - replace with real data later
const dailyChallenge = {
  id: 0,
  title: 'Design a Distributed URL Shortener',
  type: 'System Design',
  duration: '45m',
  hasVoice: true,
  company: 'Daily Challenge',
  tech: 'System Design',
  progress: '0/1',
}

const recommendedChallenges = [
  { id: 1, title: 'Merge Log Streams', company: 'Atlassian', tech: 'Python, Go', time: '30m', hasVoice: true, progress: '1/15' },
  { id: 2, title: 'Rate Limiter API', company: 'Stripe', tech: 'Node.js, Redis', time: '25m', hasVoice: true, progress: '3/12' },
  { id: 3, title: 'Distributed Cache', company: 'Amazon', tech: 'Java, DynamoDB', time: '40m', hasVoice: true, progress: '2/20' },
  { id: 4, title: 'Real-time Chat System', company: 'Discord', tech: 'WebSockets, Go', time: '35m', hasVoice: true, progress: '0/8' },
  { id: 5, title: 'Search Index Design', company: 'Google', tech: 'Elasticsearch, Python', time: '50m', hasVoice: true, progress: '1/10' },
]

const quickWins = [
  { id: 6, title: 'Two Sum', company: 'Meta', tech: 'Python', time: '15m', hasVoice: false, progress: '5/20' },
  { id: 7, title: 'Binary Tree Traversal', company: 'Apple', tech: 'Swift', time: '20m', hasVoice: false, progress: '3/15' },
  { id: 8, title: 'Array Rotation', company: 'Microsoft', tech: 'C#', time: '10m', hasVoice: false, progress: '7/25' },
  { id: 9, title: 'String Permutations', company: 'Netflix', tech: 'JavaScript', time: '12m', hasVoice: false, progress: '4/18' },
]


const companyProgress = [
  { id: 1, name: 'Atlassian', logo: 'A', completed: 2, total: 5, status: 'In Progress' },
  { id: 2, name: 'Stripe', logo: 'S', completed: 3, total: 5, status: 'In Progress' },
  { id: 3, name: 'Amazon', logo: 'A', completed: 4, total: 5, status: 'Eligible for Interview' },
  { id: 4, name: 'Meta', logo: 'M', completed: 5, total: 20, status: 'In Progress' },
  { id: 5, name: 'Google', logo: 'G', completed: 1, total: 10, status: 'In Progress' },
  { id: 6, name: 'ClinIQ', logo: 'C', completed: 0, total: 4, status: 'In Progress' },
]

function ChallengeCard({ challenge, isQuickWin = false }: { challenge: Challenge; isQuickWin?: boolean }) {
  const router = useRouter()
  
  const handleClick = () => {
    if (challenge.title === 'Two Sum') {
      router.push('/editor/two-sum')
    }
  }
  
  return (
    <Card 
      className="relative min-w-[320px] h-[200px] cursor-pointer border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
      onClick={handleClick}
    >
      <Spotlight size={250} />
      <CardContent className="p-5 h-full flex flex-col justify-between relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-1.5 text-primary text-xs font-medium">
            <Clock className="h-3 w-3" />
            <span>{challenge.time}</span>
          </div>
          {challenge.hasVoice && !isQuickWin && (
            <Mic className="h-4 w-4 text-primary" />
          )}
        </div>
        
        <div className="flex-1 flex flex-col justify-center mb-3">
          <h3 className="font-bold text-lg leading-tight mb-1">{challenge.title}</h3>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground font-medium">{challenge.company}</span>
            <span className="text-xs text-muted-foreground/60 font-medium">• {challenge.progress} solved</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-normal">
              {challenge.tech}
            </Badge>
            <Button 
              size="sm" 
              variant="ghost" 
              className="ml-auto text-xs h-7 text-primary hover:text-primary/80 transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                handleClick()
              }}
            >
              Start →
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function JobCard({ job }: { job: Job & { companySlug?: string } }) {
  const router = useRouter()
  const companySlug = (job as Job & { companySlug?: string }).companySlug || job.company.toLowerCase().replace(/\s+/g, '-')
  const companyData = getCompanyBySlug(companySlug)
  const hasCompanyPage = !!companyData || job.company === 'ClinIQ'
  
  return (
    <Card 
      className="relative min-w-[420px] cursor-pointer border-border/50 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10"
      onClick={() => {
        if (hasCompanyPage) {
          if (job.company === 'ClinIQ') {
            router.push('/company/cliniq')
          } else if (companyData) {
            router.push(`/company/${companyData.id}`)
          }
        }
      }}
    >
      <Spotlight size={300} />
      <CardContent className="p-6 relative z-10">
        <div className="mb-5">
          <div className="mb-3">
            <h3 className="text-2xl font-bold mb-2">{job.role}</h3>
            <p className="text-muted-foreground flex items-center gap-2 font-medium">
              <Building2 className="h-4 w-4" />
              {job.company}
            </p>
          </div>
          
          <p className="text-sm text-muted-foreground leading-relaxed">{job.composition}</p>
        </div>
        
        <Button 
          className="w-full hover:bg-secondary hover:text-secondary-foreground transition-colors" 
          size="lg"
          onClick={(e) => {
            e.stopPropagation()
            if (hasCompanyPage) {
              if (job.company === 'ClinIQ') {
                router.push('/company/cliniq')
              } else if (companyData) {
                router.push(`/company/${companyData.id}`)
              }
            }
          }}
        >
          {hasCompanyPage ? 'View Company' : 'Start Application Track'}
        </Button>
      </CardContent>
    </Card>
  )
}

function CompanyProgressCard({ company }: { company: Company & { slug?: string } }) {
  const router = useRouter()
  const progress = (company.completed / company.total) * 100
  const isEligible = company.status === 'Eligible for Interview' && company.name !== 'Amazon'
  const companySlug = (company as Company & { slug?: string }).slug || company.name.toLowerCase().replace(/\s+/g, '-')
  const companyData = getCompanyBySlug(companySlug)
  const hasCompanyPage = !!companyData || company.name === 'ClinIQ' // Support legacy ClinIQ route
  
  return (
    <Card 
      className="relative min-w-[280px] cursor-pointer border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
      onClick={() => {
        if (hasCompanyPage) {
          if (company.name === 'ClinIQ') {
            router.push('/company/cliniq')
          } else if (companyData) {
            router.push(`/company/${companyData.id}`)
          }
        }
      }}
    >
      <Spotlight size={200} />
      <CardContent className="p-6 relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="font-bold text-xl mb-1">{company.name}</h3>
            <p className="text-xs text-muted-foreground mb-3">
              {company.completed} of {company.total} challenges completed
            </p>
          </div>
          {isEligible && (
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
          )}
        </div>
        
        <div className="space-y-4">
          <div className="w-full bg-muted/30 rounded-md h-2 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-md transition-all duration-500",
                isEligible 
                  ? "bg-gradient-to-r from-green-500 to-emerald-600" 
                  : "bg-gradient-to-r from-primary to-primary/80"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              {Math.round(progress)}% Complete
            </span>
            <Button
              variant={isEligible ? "default" : "outline"}
              size="sm"
              className={cn(
                "text-xs h-7",
                isEligible && "bg-green-500 hover:bg-green-600 text-white border-green-500 hover:border-green-600"
              )}
              onClick={(e) => {
                e.stopPropagation()
                if (hasCompanyPage) {
                  if (company.name === 'ClinIQ') {
                    router.push('/company/cliniq')
                  } else if (companyData) {
                    router.push(`/company/${companyData.id}`)
                  }
                }
              }}
            >
              {hasCompanyPage ? 'View Company' : 'View Progress'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ApplicantDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [favoriteCompanies] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      return JSON.parse(localStorage.getItem('favoriteCompanies') || '[]')
    }
    return []
  })
  const router = useRouter()

  // Combine all challenges including daily challenge
  const allChallenges = useMemo(() => [
    {
      ...dailyChallenge,
      time: dailyChallenge.duration,
      category: 'daily',
    },
    ...recommendedChallenges.map(c => ({ ...c, category: 'recommended' })),
    ...quickWins.map(c => ({ ...c, category: 'quickWin' })),
  ], [])

  // Get all jobs from centralized jobs data
  const allJobs = useMemo(() => {
    const jobs = getAllJobs()
    // Map to the format expected by the UI
    return jobs.map(job => ({
      id: job.id,
      role: job.role,
      company: job.companyId === 'cliniq' ? 'ClinIQ' : job.companyId.charAt(0).toUpperCase() + job.companyId.slice(1),
      composition: job.composition || '',
      companySlug: job.companyId,
    }))
  }, [])

  // Filter search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return { challenges: [], companies: [], roles: [] }
    }

    const query = searchQuery.toLowerCase().trim()

    // Filter challenges
    const filteredChallenges = allChallenges.filter(challenge =>
      challenge.title.toLowerCase().includes(query) ||
      challenge.company.toLowerCase().includes(query) ||
      challenge.tech.toLowerCase().includes(query)
    )

    // Filter companies (from both companyProgress and companies data)
    const searchedCompanies = searchCompanies(query)
    const filteredCompanies = searchedCompanies.map(comp => {
      const progress = companyProgress.find(c => c.name === comp.name)
      return {
        id: progress?.id || 0,
        name: comp.name,
        logo: comp.logo,
        completed: progress?.completed || 0,
        total: progress?.total || 0,
        status: progress?.status || 'In Progress',
        slug: comp.id, // Add slug for navigation
      }
    })
    
    // Also include companies from companyProgress that match
    const progressMatches = companyProgress.filter(company =>
      company.name.toLowerCase().includes(query) &&
      !searchedCompanies.some(c => c.name === company.name)
    ).map(comp => ({
      ...comp,
      slug: comp.name.toLowerCase().replace(/\s+/g, '-'),
    }))
    
    const allFilteredCompanies = [...filteredCompanies, ...progressMatches]

    // Filter roles from combined jobs
    const filteredRoles = allJobs.filter(job =>
      job.role.toLowerCase().includes(query) ||
      job.company.toLowerCase().includes(query)
    )

    return {
      challenges: filteredChallenges,
      companies: allFilteredCompanies,
      roles: filteredRoles,
    }
  }, [searchQuery, allChallenges, allJobs])

  const hasResults = searchResults.challenges.length > 0 || searchResults.companies.length > 0 || searchResults.roles.length > 0
  const showSearchOverlay = searchQuery.trim().length > 0

  useEffect(() => {
    const checkAuth = () => {
      const currentUser = getCurrentUser()
      
      if (!currentUser) {
        router.push('/login')
        return
      }

      if (currentUser.role !== 'applicant') {
        router.push('/dashboard/recruiter')
        return
      }

      if (!hasCompletedProfile(currentUser.id)) {
        router.push('/profile-setup')
        return
      }

      setUser(currentUser)
      setLoading(false)
    }

    checkAuth()
  }, [router])

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

  const userInitials = user.email?.charAt(0).toUpperCase() || 'U'

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="transition-opacity hover:opacity-80">
            <Logo />
          </Link>
          
          <div className="flex-1 max-w-2xl mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search challenges, companies, or roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    // Keep focus on input
                    e.currentTarget.focus()
                  }
                }}
                onClick={(e) => {
                  // Prevent closing when clicking the input
                  e.stopPropagation()
                }}
                onFocus={(e) => {
                  // Ensure overlay stays open when focusing
                  e.stopPropagation()
                }}
                autoFocus={showSearchOverlay}
                className="pl-10 bg-background/50 border-border/50 focus:border-primary/50"
              />
            </div>
          </div>
          
          <Link href="/profile">
            <Avatar className="cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 ring-offset-2 ring-offset-background">
              <AvatarImage src="" alt={user.email || ''} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">{userInitials}</AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </header>

      {/* Search Results Overlay */}
      {showSearchOverlay && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm" 
            onClick={(e) => {
              // Only close if clicking the backdrop itself, not the modal
              if (e.target === e.currentTarget) {
                setSearchQuery('')
              }
            }} 
          />
          
          {/* Search Results Modal */}
          <div className="relative w-full max-w-4xl bg-card border border-border rounded-2xl shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold">
                Results matching &quot;{searchQuery}&quot;
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchQuery('')}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Results Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Challenges Section */}
              {searchResults.challenges.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Challenges:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {searchResults.challenges.map((challenge) => (
                      <ChallengeCard 
                        key={challenge.id} 
                        challenge={challenge} 
                        isQuickWin={challenge.category === 'quickWin'}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Companies Section */}
              {searchResults.companies.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Companies:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {searchResults.companies.map((company) => {
                      const companySlug = (company as Company & { slug?: string }).slug || company.name.toLowerCase().replace(/\s+/g, '-')
                      const companyData = getCompanyBySlug(companySlug)
                      const hasCompanyPage = !!companyData || company.name === 'ClinIQ'
                      
                      return (
                        <Card
                          key={company.id}
                          className="relative cursor-pointer border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
                          onClick={() => {
                            if (hasCompanyPage) {
                              if (company.name === 'ClinIQ') {
                                router.push('/company/cliniq')
                              } else if (companyData) {
                                router.push(`/company/${companyData.id}`)
                              }
                            }
                          }}
                        >
                          <Spotlight size={200} />
                          <CardContent className="p-6 relative z-10">
                            <div className="flex items-center gap-4 mb-4">
                              <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
                                {company.logo}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-lg">{company.name}</h4>
                                {company.status && (
                                  <p className="text-xs text-muted-foreground mt-1">{company.status}</p>
                                )}
                              </div>
                            </div>
                            {company.completed !== undefined && company.total !== undefined && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>{company.completed} of {company.total} challenges</span>
                                  <span>{Math.round((company.completed / company.total) * 100)}%</span>
                                </div>
                                <div className="w-full bg-muted/30 rounded-md h-1.5 overflow-hidden">
                                  <div
                                    className={cn(
                                      "h-full rounded-md transition-all",
                                      company.status === 'Eligible for Interview'
                                        ? "bg-gradient-to-r from-green-500 to-emerald-600"
                                        : "bg-gradient-to-r from-primary to-primary/80"
                                    )}
                                    style={{ width: `${(company.completed / company.total) * 100}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full mt-4"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (hasCompanyPage) {
                                  if (company.name === 'ClinIQ') {
                                    router.push('/company/cliniq')
                                  } else if (companyData) {
                                    router.push(`/company/${companyData.id}`)
                                  }
                                }
                              }}
                            >
                              {hasCompanyPage ? 'View Company' : 'View'}
                            </Button>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Roles Section */}
              {searchResults.roles.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Roles:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {searchResults.roles.map((job) => {
                      const jobCompanySlug = (job as Job & { companySlug?: string }).companySlug || job.company.toLowerCase().replace(/\s+/g, '-')
                      const jobCompanyData = getCompanyBySlug(jobCompanySlug)
                      const hasCompanyPage = !!jobCompanyData || job.company === 'ClinIQ'
                      
                      return (
                        <Card
                          key={job.id}
                          className="relative cursor-pointer border-border/50 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10"
                          onClick={() => {
                            if (hasCompanyPage) {
                              if (job.company === 'ClinIQ') {
                                router.push('/company/cliniq')
                              } else if (jobCompanyData) {
                                router.push(`/company/${jobCompanyData.id}`)
                              }
                            }
                          }}
                        >
                          <Spotlight size={300} />
                          <CardContent className="p-6 relative z-10">
                            <div className="mb-5">
                              <div className="mb-3">
                                <h3 className="text-2xl font-bold mb-2">{job.role}</h3>
                                <p className="text-muted-foreground flex items-center gap-2 font-medium">
                                  <Building2 className="h-4 w-4" />
                                  {job.company}
                                </p>
                              </div>
                              <p className="text-sm text-muted-foreground leading-relaxed">{job.composition}</p>
                            </div>
                            <Button
                              className="w-full hover:bg-secondary hover:text-secondary-foreground transition-colors"
                              size="lg"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (hasCompanyPage) {
                                  if (job.company === 'ClinIQ') {
                                    router.push('/company/cliniq')
                                  } else if (jobCompanyData) {
                                    router.push(`/company/${jobCompanyData.id}`)
                                  }
                                }
                              }}
                            >
                              {hasCompanyPage ? 'View Company' : 'Start Application Track'}
                            </Button>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* No Results */}
              {!hasResults && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">
                    No results found for &quot;{searchQuery}&quot;
                  </p>
                  <p className="text-muted-foreground/60 text-sm mt-2">
                    Try searching for challenges, companies, or roles
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="pb-16">
        {/* Hero Section */}
        <section className="container mx-auto px-6 py-16">
          <Tilt rotationFactor={2} isRevese>
            <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-background/50 to-background/80" />
              <GridPattern
                width={40}
                height={40}
                x={-1}
                y={-1}
                className={cn(
                  "[mask-image:radial-gradient(700px_circle_at_right,white,transparent)]",
                  "opacity-40 dark:opacity-50"
                )}
              />
              <CardContent className="relative z-10 p-12 md:p-16">
                <div className="max-w-4xl">
                  <div className="mb-8">
                    <Badge variant="outline" className="text-sm font-medium px-4 py-2 mb-6">
                      {dailyChallenge.type}
                    </Badge>
                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-6">
                      {dailyChallenge.title}
                    </h1>
                    <div className="flex items-center gap-6 mb-8">
                      <div className="flex items-center gap-2 text-primary text-base font-medium">
                        <Clock className="h-5 w-5" />
                        <span>{dailyChallenge.duration}</span>
                      </div>
                      {dailyChallenge.hasVoice && (
                        <div className="flex items-center gap-2 text-primary text-base font-medium">
                          <Mic className="h-5 w-5" />
                          <span>Voice required</span>
                        </div>
                      )}
                    </div>
                    <Button size="lg" className="text-base">
                      Start Challenge →
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Tilt>
        </section>

        {/* Recommended Challenges */}
        <section className="container mx-auto px-6 mb-16">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-3xl font-bold">Recommended</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
          </div>
          <div className="flex gap-5 overflow-x-auto pb-6 scrollbar-hide -mx-6 px-6">
            {recommendedChallenges.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))}
          </div>
        </section>

        {/* Quick Wins */}
        <section className="container mx-auto px-6 mb-16">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-3xl font-bold">Quick Wins</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
          </div>
          <div className="flex gap-5 overflow-x-auto pb-6 scrollbar-hide -mx-6 px-6">
            {quickWins.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} isQuickWin />
            ))}
          </div>
        </section>

        {/* Job Postings */}
        <section className="container mx-auto px-6 mb-16">
          <div className="flex items-center gap-3 mb-6">
            <Briefcase className="h-7 w-7 text-primary" />
            <h2 className="text-3xl font-bold">Open Roles & Assessment Tracks</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
          </div>
          <div className="flex gap-5 overflow-x-auto pb-6 scrollbar-hide -mx-6 px-6">
            {allJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </section>

        {/* Favorite Companies */}
        {favoriteCompanies.length > 0 && (
          <section className="container mx-auto px-6 mb-16">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-3xl font-bold">Favorite Companies</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
            </div>
            <div className="flex gap-5 overflow-x-auto pb-6 scrollbar-hide -mx-6 px-6">
              {companyProgress
                .filter(company => favoriteCompanies.includes(company.name))
                .map((company) => (
                  <CompanyProgressCard key={company.id} company={company} />
                ))}
            </div>
          </section>
        )}

        {/* Company Progress */}
        <section className="container mx-auto px-6">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-3xl font-bold">Explore Companies</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
          </div>
          <div className="flex gap-5 overflow-x-auto pb-6 scrollbar-hide -mx-6 px-6">
            {companyProgress.map((company) => (
              <CompanyProgressCard key={company.id} company={company} />
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
