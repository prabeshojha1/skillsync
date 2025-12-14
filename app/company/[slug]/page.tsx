'use client'

import { useState, useLayoutEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getCurrentUser, type User } from '@/lib/auth'
import { getCompanyBySlug, searchCompanies, getAllCompanies, type Company } from '@/lib/companies'
import { getProblemIdFromExerciseTitle } from '@/lib/problems'
import { getAllJobs } from '@/lib/jobs'
import { HeroHeader } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Spotlight } from '@/components/motion-primitives/spotlight'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Logo } from '@/components/logo'
import { Code, Calendar, Briefcase, Heart, Search, X, Building2, Clock, Mic } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { notFound } from 'next/navigation'

// Import search data (same as dashboard)
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
  { id: 6, title: 'Two Sum Variant', company: 'Meta', tech: 'Python', time: '15m', hasVoice: false, progress: '5/20' },
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
  { id: 6, name: 'ClinIQ', logo: 'C', completed: 0, total: 3, status: 'In Progress' },
]

function ChallengeCard({ challenge, isQuickWin = false }: { challenge: Challenge; isQuickWin?: boolean }) {
  return (
    <Card className="relative min-w-[320px] h-[200px] cursor-pointer border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10">
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
            <Button size="sm" variant="ghost" className="ml-auto text-xs h-7 text-primary hover:text-primary/80 transition-colors">
              Start →
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function CompanyPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  
  const [user, setUser] = useState<User | null>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const company = useMemo(() => getCompanyBySlug(slug), [slug])

  useLayoutEffect(() => {
    setIsClient(true)
    const currentUser = getCurrentUser()
    setUser(currentUser)
    
    // Load favorites from localStorage
    const favorites = JSON.parse(localStorage.getItem('favoriteCompanies') || '[]')
    setIsFavorite(favorites.includes(company?.name))
  }, [company])

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

    // Filter companies (from company data)
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
      }
    })

    // Filter roles from centralized jobs data
    const allJobs = getAllJobs().map(job => ({
      id: job.id,
      role: job.role,
      company: job.companyId === 'cliniq' ? 'ClinIQ' : job.companyId.charAt(0).toUpperCase() + job.companyId.slice(1),
      composition: job.composition || '',
    }))
    
    const filteredRoles = allJobs.filter(job =>
      job.role.toLowerCase().includes(query) ||
      job.company.toLowerCase().includes(query)
    )

    return {
      challenges: filteredChallenges,
      companies: filteredCompanies,
      roles: filteredRoles,
    }
  }, [searchQuery, allChallenges, company])

  const hasResults = searchResults.challenges.length > 0 || searchResults.companies.length > 0 || searchResults.roles.length > 0
  const showSearchOverlay = searchQuery.trim().length > 0

  const toggleFavorite = () => {
    if (!company) return
    const favorites = JSON.parse(localStorage.getItem('favoriteCompanies') || '[]')
    if (isFavorite) {
      const updated = favorites.filter((name: string) => name !== company.name)
      localStorage.setItem('favoriteCompanies', JSON.stringify(updated))
      setIsFavorite(false)
    } else {
      favorites.push(company.name)
      localStorage.setItem('favoriteCompanies', JSON.stringify(favorites))
      setIsFavorite(true)
    }
  }

  const userInitials = user?.email?.charAt(0).toUpperCase() || 'U'
  const showDashboardHeader = isClient && user

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Company not found</h1>
          <Link href="/dashboard/applicant">
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      {showDashboardHeader ? (
        <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto flex items-center justify-between px-6 py-4">
            <Link href="/dashboard/applicant" className="transition-opacity hover:opacity-80">
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
                      e.currentTarget.focus()
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                  onFocus={(e) => {
                    e.stopPropagation()
                  }}
                  autoFocus={showSearchOverlay}
                  className="pl-10 bg-background/50 border-border/50 focus:border-primary/50"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/dashboard/applicant">
                <Button variant="ghost" size="sm">Dashboard</Button>
              </Link>
              <Link href="/profile">
                <Avatar className="cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 ring-offset-2 ring-offset-background">
                  <AvatarImage src="" alt={user.email || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">{userInitials}</AvatarFallback>
                </Avatar>
              </Link>
            </div>
          </div>
        </header>
      ) : (
        <HeroHeader />
      )}

      {/* Search Results Overlay */}
      {showSearchOverlay && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm" 
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSearchQuery('')
              }
            }} 
          />
          
          <div className="relative w-full max-w-4xl bg-card border border-border rounded-2xl shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
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

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
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

              {searchResults.companies.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Companies:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {searchResults.companies.map((comp) => {
                      const isCurrentCompany = comp.name === company.name
                      return (
                        <Card
                          key={comp.id}
                          className="relative cursor-pointer border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
                          onClick={() => {
                            if (!isCurrentCompany) {
                              const compData = getCompanyBySlug(comp.name.toLowerCase())
                              if (compData) {
                                router.push(`/company/${compData.id}`)
                              }
                            }
                          }}
                        >
                          <Spotlight size={200} />
                          <CardContent className="p-6 relative z-10">
                            <div className="flex items-center gap-4 mb-4">
                              <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
                                {comp.logo}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-lg">{comp.name}</h4>
                                {comp.status && (
                                  <p className="text-xs text-muted-foreground mt-1">{comp.status}</p>
                                )}
                              </div>
                            </div>
                            {comp.completed !== undefined && comp.total !== undefined && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>{comp.completed} of {comp.total} challenges</span>
                                  <span>{Math.round((comp.completed / comp.total) * 100)}%</span>
                                </div>
                                <div className="w-full bg-muted/30 rounded-md h-1.5 overflow-hidden">
                                  <div
                                    className={cn(
                                      "h-full rounded-md transition-all",
                                      comp.status === 'Eligible for Interview'
                                        ? "bg-gradient-to-r from-green-500 to-emerald-600"
                                        : "bg-gradient-to-r from-primary to-primary/80"
                                    )}
                                    style={{ width: `${(comp.completed / comp.total) * 100}%` }}
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
                                if (!isCurrentCompany) {
                                  const compData = getCompanyBySlug(comp.name.toLowerCase())
                                  if (compData) {
                                    router.push(`/company/${compData.id}`)
                                  }
                                }
                              }}
                            >
                              {isCurrentCompany ? 'Current Page' : 'View Company'}
                            </Button>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )}

              {searchResults.roles.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Roles:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {searchResults.roles.map((job) => {
                      const jobCompany = getCompanyBySlug(job.company.toLowerCase())
                      const isCurrentCompany = job.company === company.name
                      return (
                        <Card
                          key={job.id}
                          className="relative cursor-pointer border-border/50 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10"
                          onClick={() => {
                            if (jobCompany && !isCurrentCompany) {
                              router.push(`/company/${jobCompany.id}`)
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
                                if (jobCompany && !isCurrentCompany) {
                                  router.push(`/company/${jobCompany.id}`)
                                }
                              }}
                            >
                              {isCurrentCompany ? 'View on Page' : 'Start Application Track'}
                            </Button>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )}

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

      <main className="min-h-screen bg-background pt-24">
        <div className="mx-auto max-w-6xl px-6 py-12">
          {/* Company Header */}
          <div className="mb-12">
            <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
              <Spotlight size={400} />
              <CardContent className="relative z-10 p-8">
                <div className="flex items-start gap-6">
                  <div className="flex size-20 items-center justify-center rounded-2xl bg-primary text-3xl font-bold text-primary-foreground shadow-lg -mt-2">
                    {company.logo}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-4xl font-bold">{company.name}</h1>
                      {user && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={toggleFavorite}
                          className={isFavorite ? 'text-red-500 hover:text-red-600' : ''}
                        >
                          <Heart className={isFavorite ? 'fill-current' : ''} />
                        </Button>
                      )}
                    </div>
                    <p className="text-muted-foreground text-lg">{company.tagline}</p>
                    {company.location && (
                      <p className="text-muted-foreground text-sm mt-1">{company.location}</p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {company.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-sm">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* About Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">About</h2>
            <Card className="relative border-border/50 bg-card/50 backdrop-blur-sm">
              <Spotlight size={300} />
              <CardContent className="relative z-10 p-6">
                <p className="text-muted-foreground leading-relaxed text-base">
                  {company.description}
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Job Postings Section */}
          {company.jobs.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4">Job Postings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {company.jobs.map((job) => (
                  <Card key={job.id} className="relative border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10">
                    <Spotlight size={250} />
                    <CardHeader className="relative z-10">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl mb-2">{job.role}</CardTitle>
                          <CardDescription>{job.description.split('.')[0]}.</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="relative z-10">
                      <p className="text-sm text-muted-foreground mb-4">
                        {job.description}
                      </p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {job.skills.map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                      <Button className="w-full">Start Application Track</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Get Ready Section with Carousel */}
          {(company.projects || company.exercises) && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4">Get {company.name} Ready...</h2>
              <div className="relative">
                <Carousel className="w-full">
                  <CarouselContent>
                    {/* Projects Slide */}
                    {company.projects && company.projects.length > 0 && (
                      <CarouselItem>
                        <Card className="relative min-h-[450px] border-border/50 bg-card/50 backdrop-blur-sm">
                          <Spotlight size={350} />
                          <CardHeader className="relative z-10">
                            <div className="flex items-center gap-2">
                              <Briefcase className="size-5" />
                              <CardTitle>Projects</CardTitle>
                            </div>
                            <CardDescription>Work on real projects to understand our stack</CardDescription>
                          </CardHeader>
                          <CardContent className="relative z-10 space-y-4">
                            {company.projects.map((project) => (
                              <Card key={project.id} className="border-border/50 bg-card/80">
                                <CardContent className="p-4">
                                  <h3 className="font-semibold mb-2 text-lg">{project.title}</h3>
                                  <p className="text-sm text-muted-foreground mb-4">
                                    {project.description}
                                  </p>
                                  {project.dueDate && (
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                                      <div className="flex items-center gap-1">
                                        <Calendar className="size-4" />
                                        <span>Due: {project.dueDate}</span>
                                      </div>
                                    </div>
                                  )}
                                  <div className="flex flex-wrap gap-2 mb-4">
                                    {project.skills.map((skill, index) => (
                                      <Badge key={index} variant="outline" className="text-xs">
                                        {skill}
                                      </Badge>
                                    ))}
                                  </div>
                                  <Button className="w-full" size="lg">Work on Project</Button>
                                </CardContent>
                              </Card>
                            ))}
                          </CardContent>
                        </Card>
                      </CarouselItem>
                    )}

                    {/* Exercises Slide */}
                    {company.exercises && company.exercises.length > 0 && (
                      <CarouselItem>
                        <Card className="relative min-h-[450px] border-border/50 bg-card/50 backdrop-blur-sm">
                          <Spotlight size={350} />
                          <CardHeader className="relative z-10">
                            <div className="flex items-center gap-2">
                              <Code className="size-5" />
                              <CardTitle>Exercises</CardTitle>
                            </div>
                            <CardDescription>Practice problems chosen by our team</CardDescription>
                          </CardHeader>
                          <CardContent className="relative z-10 space-y-4">
                            {company.exercises.map((exercise) => (
                              <Card key={exercise.id} className="border-border/50 bg-card/80">
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-semibold">{exercise.title}</h3>
                                    <Badge 
                                      variant="outline" 
                                      className={cn(
                                        "text-xs",
                                        exercise.difficulty === 'Easy' && "bg-green-500/10 text-green-500 border-green-500/20",
                                        exercise.difficulty === 'Medium' && "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
                                        exercise.difficulty === 'Hard' && "bg-red-500/10 text-red-500 border-red-500/20"
                                      )}
                                    >
                                      {exercise.difficulty}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-3">
                                    {exercise.description}
                                  </p>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="w-full"
                                    onClick={() => {
                                      const problemId = getProblemIdFromExerciseTitle(exercise.title)
                                      if (problemId) {
                                        router.push(`/editor/${problemId}`)
                                      }
                                    }}
                                  >
                                    Start Challenge
                                  </Button>
                                </CardContent>
                              </Card>
                            ))}
                          </CardContent>
                        </Card>
                      </CarouselItem>
                    )}

                  </CarouselContent>
                  <CarouselPrevious className="left-4" />
                  <CarouselNext className="right-4" />
                </Carousel>
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  )
}

