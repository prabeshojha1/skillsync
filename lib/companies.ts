// Company data structure and management

export type CompanyJob = {
  id: number
  role: string
  description: string
  skills: string[]
  composition?: string
}

export type CompanyProject = {
  id: number
  title: string
  description: string
  dueDate?: string
  skills: string[]
}

export type CompanyExercise = {
  id: number
  title: string
  description: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
}

export type CompanyRoadmapItem = {
  id: number
  title: string
  description: string
  children?: CompanyRoadmapItem[]
}

export type Company = {
  id: string // slug/identifier (e.g., 'cliniq', 'atlassian')
  name: string
  logo: string // single character or emoji
  description: string
  tagline: string
  tags: string[]
  location?: string
  jobs: CompanyJob[]
  projects?: CompanyProject[]
  exercises?: CompanyExercise[]
  roadmap?: CompanyRoadmapItem[]
}

// Company data
export const companies: Company[] = [
  {
    id: 'cliniq',
    name: 'ClinIQ',
    logo: 'C',
    description: 'ClinIQ is a leading healthcare technology company dedicated to revolutionizing patient care through innovative software solutions. We specialize in developing cutting-edge medical applications that improve healthcare delivery, patient outcomes, and operational efficiency. Our team of passionate engineers and healthcare professionals work together to create products that make a real difference in people\'s lives.',
    tagline: 'Healthcare Technology Solutions',
    tags: ['Healthcare Tech', 'Medical Software', 'Patient Care'],
    location: 'San Francisco, CA',
    jobs: [
      {
        id: 1,
        role: 'Front End Developer',
        description: 'We\'re looking for a talented Front End Developer to join our team. You\'ll work with React, TypeScript, and modern UI frameworks to create exceptional user experiences for healthcare professionals and patients.',
        skills: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS'],
        composition: 'Contains 3 Assessments: 1 System Design + 2 Algo',
      },
      {
        id: 2,
        role: 'Back End Developer',
        description: 'Join our backend team to build secure, HIPAA-compliant APIs and services that power our healthcare platform. Experience with Node.js, Python, or Go preferred.',
        skills: ['Node.js', 'Python', 'Go', 'HIPAA'],
        composition: 'Contains 4 Assessments: 2 System Design + 2 Algo',
      },
    ],
    projects: [
      {
        id: 1,
        title: 'Patient Portal Dashboard',
        description: 'Build a patient portal dashboard using React, TypeScript, and Tailwind CSS. This project will help you understand our frontend architecture and design patterns.',
        dueDate: 'March 15, 2025',
        skills: ['React', 'TypeScript', 'Tailwind CSS'],
      },
    ],
    exercises: [
      {
        id: 1,
        title: 'Two Sum',
        description: 'A classic problem to test your problem-solving skills and understanding of data structures.',
        difficulty: 'Easy',
      },
      {
        id: 2,
        title: 'Merge Intervals',
        description: 'Practice working with intervals - a common pattern in healthcare scheduling systems.',
        difficulty: 'Medium',
      },
      {
        id: 3,
        title: 'Binary Tree Maximum Path Sum',
        description: 'Challenge yourself with advanced tree algorithms used in medical data structures.',
        difficulty: 'Hard',
      },
    ],
    roadmap: [
      {
        id: 1,
        title: 'Foundation',
        description: 'JavaScript, TypeScript, React basics',
        children: [
          {
            id: 2,
            title: 'State Management',
            description: 'Redux, Context API, Zustand',
          },
          {
            id: 3,
            title: 'API Integration',
            description: 'REST, GraphQL, WebSockets',
          },
          {
            id: 4,
            title: 'Healthcare Standards',
            description: 'HL7, FHIR, HIPAA compliance',
          },
        ],
      },
    ],
  },
  {
    id: 'atlassian',
    name: 'Atlassian',
    logo: 'A',
    description: 'Atlassian is a leading provider of team collaboration and productivity software. We build tools like Jira, Confluence, Bitbucket, and Trello that help millions of teams worldwide work together more effectively. Our products are used by over 200,000 customers, from small startups to Fortune 500 companies.',
    tagline: 'Team Collaboration & Productivity Software',
    tags: ['SaaS', 'Developer Tools', 'Team Collaboration'],
    location: 'Sydney, Australia',
    jobs: [
      {
        id: 1,
        role: 'Backend Engineer',
        description: 'Join our backend engineering team to build scalable, high-performance services that power millions of users. You\'ll work with Java, microservices architecture, and cloud infrastructure to deliver reliable and fast experiences.',
        skills: ['Java', 'Microservices', 'AWS', 'PostgreSQL'],
        composition: 'Contains 3 Assessments: 1 System Design + 2 Algo',
      },
    ],
    projects: [
      {
        id: 1,
        title: 'Distributed Task Queue System',
        description: 'Design and implement a distributed task queue system using Java and Redis. This project will help you understand our microservices architecture and async processing patterns.',
        dueDate: 'April 1, 2025',
        skills: ['Java', 'Redis', 'Microservices', 'Distributed Systems'],
      },
    ],
    exercises: [
      {
        id: 1,
        title: 'Merge Log Streams',
        description: 'Practice working with streaming data and log processing - essential skills for backend engineers at Atlassian.',
        difficulty: 'Medium',
      },
      {
        id: 2,
        title: 'Design Rate Limiter',
        description: 'Implement a distributed rate limiter to handle high-throughput API requests.',
        difficulty: 'Hard',
      },
    ],
    roadmap: [
      {
        id: 1,
        title: 'Backend Fundamentals',
        description: 'Java, Spring Boot, REST APIs',
        children: [
          {
            id: 2,
            title: 'Microservices Architecture',
            description: 'Service discovery, API gateways, inter-service communication',
          },
          {
            id: 3,
            title: 'Data Storage',
            description: 'PostgreSQL, Redis, Elasticsearch',
          },
          {
            id: 4,
            title: 'Cloud Infrastructure',
            description: 'AWS, Docker, Kubernetes',
          },
        ],
      },
    ],
  },
  {
    id: 'stripe',
    name: 'Stripe',
    logo: 'S',
    description: 'Stripe is a financial technology company that builds economic infrastructure for the internet. We provide payment processing, billing, and financial services APIs that power millions of businesses worldwide. Our mission is to increase the GDP of the internet by making online commerce accessible to everyone.',
    tagline: 'Economic Infrastructure for the Internet',
    tags: ['FinTech', 'Payments', 'API'],
    location: 'San Francisco, CA',
    jobs: [
      {
        id: 1,
        role: 'Senior Software Engineer',
        description: 'Build the financial infrastructure that powers millions of businesses. You\'ll work on high-scale systems handling billions in transactions, ensuring reliability, security, and performance at every level.',
        skills: ['Ruby', 'Go', 'PostgreSQL', 'Redis'],
        composition: 'Contains 4 Assessments: 2 System Design + 2 Algo',
      },
    ],
    projects: [
      {
        id: 1,
        title: 'Payment Processing API',
        description: 'Design a payment processing API that handles high-volume transactions with strong consistency guarantees. This project will help you understand our payment infrastructure.',
        dueDate: 'April 5, 2025',
        skills: ['API Design', 'Distributed Systems', 'Transaction Processing'],
      },
    ],
    exercises: [
      {
        id: 1,
        title: 'Rate Limiter API',
        description: 'Implement a rate limiting system to protect APIs from abuse while maintaining high availability.',
        difficulty: 'Medium',
      },
      {
        id: 2,
        title: 'Idempotent API Design',
        description: 'Design APIs that can be safely retried without side effects - critical for payment systems.',
        difficulty: 'Hard',
      },
    ],
    roadmap: [
      {
        id: 1,
        title: 'API Development',
        description: 'RESTful APIs, GraphQL, API design principles',
        children: [
          {
            id: 2,
            title: 'Payment Systems',
            description: 'Payment processing, fraud detection, compliance',
          },
          {
            id: 3,
            title: 'High-Scale Systems',
            description: 'Distributed systems, caching, database optimization',
          },
          {
            id: 4,
            title: 'Security & Compliance',
            description: 'PCI DSS, encryption, secure coding practices',
          },
        ],
      },
    ],
  },
  {
    id: 'amazon',
    name: 'Amazon',
    logo: 'A',
    description: 'Amazon is one of the world\'s largest e-commerce and cloud computing companies. We operate Amazon.com, AWS (Amazon Web Services), and numerous other services. Our engineering teams build systems that serve hundreds of millions of customers worldwide, from retail platforms to cloud infrastructure.',
    tagline: 'Earth\'s Most Customer-Centric Company',
    tags: ['E-Commerce', 'Cloud Computing', 'AWS'],
    location: 'Seattle, WA',
    jobs: [
      {
        id: 1,
        role: 'Full Stack Developer',
        description: 'Join Amazon\'s engineering team to build customer-facing features and internal tools. You\'ll work across the stack, from React frontends to Java/Python backends, building scalable solutions that serve millions of users.',
        skills: ['Java', 'Python', 'React', 'AWS'],
        composition: 'Contains 5 Assessments: 2 System Design + 3 Algo',
      },
    ],
    projects: [
      {
        id: 1,
        title: 'Distributed Cache System',
        description: 'Build a distributed caching layer using DynamoDB and ElastiCache. This project will help you understand Amazon\'s distributed systems architecture.',
        dueDate: 'April 10, 2025',
        skills: ['DynamoDB', 'ElastiCache', 'Java', 'Distributed Systems'],
      },
    ],
    exercises: [
      {
        id: 1,
        title: 'Distributed Cache',
        description: 'Design and implement a distributed caching system that handles millions of requests per second.',
        difficulty: 'Hard',
      },
      {
        id: 2,
        title: 'Load Balancer Design',
        description: 'Design a load balancer that distributes traffic across multiple servers efficiently.',
        difficulty: 'Medium',
      },
    ],
    roadmap: [
      {
        id: 1,
        title: 'Full Stack Development',
        description: 'Frontend (React), Backend (Java/Python), Databases',
        children: [
          {
            id: 2,
            title: 'AWS Services',
            description: 'EC2, S3, DynamoDB, Lambda, CloudFront',
          },
          {
            id: 3,
            title: 'Distributed Systems',
            description: 'Microservices, service mesh, distributed databases',
          },
          {
            id: 4,
            title: 'Scalability',
            description: 'Load balancing, caching, CDN, auto-scaling',
          },
        ],
      },
    ],
  },
  {
    id: 'meta',
    name: 'Meta',
    logo: 'M',
    description: 'Meta builds technologies that help people connect, find communities, and grow businesses. We develop platforms like Facebook, Instagram, WhatsApp, and the metaverse that connect billions of people worldwide. Our engineering teams work on some of the largest-scale systems in the world.',
    tagline: 'Connect the World',
    tags: ['Social Media', 'VR/AR', 'Large-Scale Systems'],
    location: 'Menlo Park, CA',
    jobs: [
      {
        id: 1,
        role: 'Software Engineer',
        description: 'Build products that connect billions of people. You\'ll work on large-scale distributed systems, machine learning infrastructure, or user-facing features across our family of apps.',
        skills: ['C++', 'Python', 'React', 'Distributed Systems'],
        composition: 'Contains 4 Assessments: 2 System Design + 2 Algo',
      },
    ],
    projects: [
      {
        id: 1,
        title: 'Real-Time Feed System',
        description: 'Design a real-time social media feed system that serves personalized content to millions of users simultaneously. This project will help you understand our news feed architecture.',
        dueDate: 'April 15, 2025',
        skills: ['Distributed Systems', 'Real-time Processing', 'Caching'],
      },
    ],
    exercises: [
      {
        id: 1,
        title: 'Two Sum Variant',
        description: 'A classic algorithmic problem with optimizations for large-scale data processing.',
        difficulty: 'Easy',
      },
      {
        id: 2,
        title: 'Graph Algorithms',
        description: 'Work with social graphs - essential for understanding connections and recommendations.',
        difficulty: 'Hard',
      },
    ],
    roadmap: [
      {
        id: 1,
        title: 'Large-Scale Systems',
        description: 'Distributed systems, scalability, performance optimization',
        children: [
          {
            id: 2,
            title: 'Machine Learning',
            description: 'ML infrastructure, recommendation systems, personalization',
          },
          {
            id: 3,
            title: 'Real-Time Systems',
            description: 'Streaming data, real-time updates, WebSockets',
          },
          {
            id: 4,
            title: 'Frontend at Scale',
            description: 'React, performance optimization, mobile development',
          },
        ],
      },
    ],
  },
  {
    id: 'google',
    name: 'Google',
    logo: 'G',
    description: 'Google is a technology company that specializes in Internet-related services and products. We develop search engines, cloud computing, software, and hardware. Our engineering teams work on products used by billions of people, from Google Search to YouTube, Gmail, and Google Cloud Platform.',
    tagline: 'Organize the World\'s Information',
    tags: ['Search', 'Cloud Computing', 'AI/ML'],
    location: 'Mountain View, CA',
    jobs: [
      {
        id: 1,
        role: 'Software Engineer',
        description: 'Build products that impact billions of users. You\'ll work on search algorithms, cloud infrastructure, machine learning systems, or user-facing applications using cutting-edge technologies.',
        skills: ['C++', 'Java', 'Python', 'Go'],
        composition: 'Contains 5 Assessments: 2 System Design + 3 Algo',
      },
    ],
    projects: [
      {
        id: 1,
        title: 'Search Index Design',
        description: 'Design a search index system that can handle billions of documents and return relevant results in milliseconds. This project will help you understand Google\'s search infrastructure.',
        dueDate: 'April 20, 2025',
        skills: ['Elasticsearch', 'Python', 'Distributed Systems', 'Search Algorithms'],
      },
    ],
    exercises: [
      {
        id: 1,
        title: 'Search Index Design',
        description: 'Design and implement an efficient search index for large-scale document retrieval.',
        difficulty: 'Hard',
      },
      {
        id: 2,
        title: 'Algorithm Optimization',
        description: 'Optimize algorithms for performance and scalability - critical for search systems.',
        difficulty: 'Medium',
      },
    ],
    roadmap: [
      {
        id: 1,
        title: 'Systems Programming',
        description: 'C++, Java, performance optimization, memory management',
        children: [
          {
            id: 2,
            title: 'Distributed Systems',
            description: 'Large-scale systems, consistency, fault tolerance',
          },
          {
            id: 3,
            title: 'Machine Learning',
            description: 'ML algorithms, TensorFlow, recommendation systems',
          },
          {
            id: 4,
            title: 'Cloud Infrastructure',
            description: 'Google Cloud Platform, Kubernetes, microservices',
          },
        ],
      },
    ],
  },
]

// Helper function to get company by slug
export function getCompanyBySlug(slug: string): Company | undefined {
  return companies.find(company => company.id === slug.toLowerCase())
}

// Helper function to get all companies
export function getAllCompanies(): Company[] {
  return companies
}

// Helper function to search companies
export function searchCompanies(query: string): Company[] {
  const lowerQuery = query.toLowerCase()
  return companies.filter(company =>
    company.name.toLowerCase().includes(lowerQuery) ||
    company.tagline.toLowerCase().includes(lowerQuery) ||
    company.description.toLowerCase().includes(lowerQuery) ||
    company.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
    company.jobs.some(job => 
      job.role.toLowerCase().includes(lowerQuery) ||
      job.skills.some(skill => skill.toLowerCase().includes(lowerQuery))
    )
  )
}

