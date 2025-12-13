'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, signOut, type User } from '@/lib/auth'
import { getUserProfile, type UserProfile } from '@/lib/profile'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Logo } from '@/components/logo'
import { User as UserIcon, Mail, Briefcase, Building2, Users } from 'lucide-react'
import Link from 'next/link'
import { getLanguageColor, getCompanyTypeColor, getTechnologyColor } from '@/lib/badge-colors'
import { cn } from '@/lib/utils'

// Hardcoded experience data
const EXPERIENCE = [
  {
    title: 'Senior Software Engineer',
    company: 'Tech Corp',
    duration: '2020 - Present',
    description: 'Led development of scalable web applications using React and Node.js. Managed a team of 5 developers.',
  },
  {
    title: 'Software Engineer',
    company: 'StartupXYZ',
    duration: '2018 - 2020',
    description: 'Built and maintained multiple features for a SaaS platform. Collaborated with cross-functional teams.',
  },
  {
    title: 'Junior Developer',
    company: 'Digital Agency',
    duration: '2016 - 2018',
    description: 'Developed responsive websites and web applications for clients using modern JavaScript frameworks.',
  },
]

// Hardcoded projects data
const PROJECTS = [
  {
    name: 'E-Commerce Platform',
    description: 'Full-stack e-commerce solution with payment integration',
    technologies: ['React', 'Node.js', 'PostgreSQL', 'Stripe'],
    year: '2023',
  },
  {
    name: 'Task Management App',
    description: 'Collaborative task management tool with real-time updates',
    technologies: ['Next.js', 'TypeScript', 'MongoDB', 'Socket.io'],
    year: '2022',
  },
  {
    name: 'Weather Dashboard',
    description: 'Real-time weather dashboard with interactive maps',
    technologies: ['Vue.js', 'Python', 'OpenWeather API'],
    year: '2021',
  },
]

// Hardcoded challenges data
const CHALLENGES = [
  {
    name: 'Algorithm Challenge: Path Finding',
    difficulty: 'Hard',
    completed: '2024-01-15',
    score: 95,
  },
  {
    name: 'Data Structure Challenge: Binary Trees',
    difficulty: 'Medium',
    completed: '2024-01-10',
    score: 88,
  },
  {
    name: 'Frontend Challenge: Responsive Design',
    difficulty: 'Easy',
    completed: '2024-01-05',
    score: 92,
  },
  {
    name: 'Backend Challenge: API Design',
    difficulty: 'Medium',
    completed: '2023-12-20',
    score: 90,
  },
]

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

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

    const userProfile = getUserProfile(currentUser.id)
    if (!userProfile) {
      router.push('/profile-setup')
      return
    }

    setUser(currentUser)
    setProfile(userProfile)
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

  if (!user || !profile) {
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
            <Link href="/dashboard/applicant">
              <Button variant="ghost" size="sm">
                Dashboard
              </Button>
            </Link>
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Pane - Profile Info */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <Avatar className="size-24">
                    <AvatarFallback className="bg-muted text-muted-foreground text-2xl">
                      <UserIcon className="size-12" />
                    </AvatarFallback>
                  </Avatar>
                </div>
                <CardTitle className="text-xl">
                  {profile.firstName && profile.lastName
                    ? `${profile.firstName} ${profile.lastName}`
                    : user.email.split('@')[0]}
                </CardTitle>
                <CardDescription>{user.email}</CardDescription>
                <CardDescription className="mt-1">Software Developer</CardDescription>
              </CardHeader>
            </Card>

            {/* Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="size-5" />
                  Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Programming Languages */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Programming Languages</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.programmingLanguages.map((lang) => (
                      <Badge
                        key={lang}
                        variant="outline"
                        className={cn('border', getLanguageColor(lang))}
                      >
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Company Types */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Building2 className="size-4" />
                    Company Types
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.companyTypes.map((type) => (
                      <Badge
                        key={type}
                        variant="outline"
                        className={cn('border', getCompanyTypeColor(type))}
                      >
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Company Size */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Users className="size-4" />
                    Preferred Company Size
                  </h3>
                  <p className="text-sm text-muted-foreground">{profile.companySize}</p>
                </div>

                {/* Resume */}
                {profile.resumeFileName && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Resume</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="size-4" />
                      <span>{profile.resumeFileName}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Experience */}
            <Card>
              <CardHeader>
                <CardTitle>Experience</CardTitle>
                <CardDescription>Professional work experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {EXPERIENCE.map((exp, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{exp.title}</h3>
                        <p className="text-sm text-muted-foreground">{exp.company}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {exp.duration}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{exp.description}</p>
                    {index < EXPERIENCE.length - 1 && (
                      <div className="border-t pt-4 mt-4" />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Pane - Projects & Challenges */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-3xl">Portfolio</CardTitle>
                <CardDescription>Projects and challenges you've completed</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="projects" className="w-full">
                  <TabsList className="w-full">
                    <TabsTrigger value="projects" className="flex-1">Projects</TabsTrigger>
                    <TabsTrigger value="challenges" className="flex-1">Challenges</TabsTrigger>
                  </TabsList>

                  <TabsContent value="projects" className="mt-6 space-y-4">
                    {PROJECTS.map((project, index) => (
                      <Card key={index}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">{project.name}</CardTitle>
                              <CardDescription>{project.year}</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm text-muted-foreground">{project.description}</p>
                          <div className="flex flex-wrap gap-2">
                            {project.technologies.map((tech) => (
                              <Badge
                                key={tech}
                                variant="outline"
                                className={cn('border', getTechnologyColor(tech))}
                              >
                                {tech}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>

                  <TabsContent value="challenges" className="mt-6 space-y-4">
                    {CHALLENGES.map((challenge, index) => (
                      <Card key={index}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">{challenge.name}</CardTitle>
                              <CardDescription>
                                Completed on {new Date(challenge.completed).toLocaleDateString()}
                              </CardDescription>
                            </div>
                            <Badge
                              variant={
                                challenge.difficulty === 'Easy'
                                  ? 'default'
                                  : challenge.difficulty === 'Medium'
                                  ? 'secondary'
                                  : 'destructive'
                              }
                            >
                              {challenge.difficulty}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-4">
                            <div>
                              <span className="text-sm text-muted-foreground">Score: </span>
                              <span className="text-sm font-semibold">{challenge.score}%</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
