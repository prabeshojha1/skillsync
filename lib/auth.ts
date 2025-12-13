'use client'

// Simple local authentication using localStorage

export type UserRole = 'applicant' | 'recruiter'

export interface User {
  id: string
  email: string
  role: UserRole
  createdAt: string
}

const STORAGE_KEY = 'auth_user'
const USERS_STORAGE_KEY = 'local_users' // Store all users for validation

/**
 * Generate a simple ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Get all users from localStorage
 */
function getUsers(): User[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(USERS_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

/**
 * Save users to localStorage
 */
function saveUsers(users: User[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users))
  } catch (error) {
    console.error('Failed to save users:', error)
  }
}

/**
 * Get current user from localStorage
 */
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

/**
 * Set current user in localStorage
 */
export function setCurrentUser(user: User | null): void {
  if (typeof window === 'undefined') return
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch (error) {
    console.error('Failed to save user:', error)
  }
}

/**
 * Sign up a new user
 */
export function signUp(email: string, password: string, role: UserRole): { success: boolean; error?: string; user?: User } {
  if (!email || !password) {
    return { success: false, error: 'Email and password are required' }
  }

  if (password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters' }
  }

  if (!role || (role !== 'applicant' && role !== 'recruiter')) {
    return { success: false, error: 'Please select a role' }
  }

  const users = getUsers()
  
  // Check if user already exists
  if (users.some(u => u.email === email)) {
    return { success: false, error: 'An account with this email already exists' }
  }

  // Create new user
  const newUser: User = {
    id: generateId(),
    email,
    role,
    createdAt: new Date().toISOString(),
  }

  // Store password hash (simple base64 for demo - in production use proper hashing)
  const userWithPassword = {
    ...newUser,
    password: btoa(password), // Simple encoding (not secure, but fine for local demo)
  }

  users.push(userWithPassword as any)
  saveUsers(users)

  // Set as current user
  setCurrentUser(newUser)

  return { success: true, user: newUser }
}

/**
 * Sign in a user
 */
export function signIn(email: string, password: string): { success: boolean; error?: string; user?: User } {
  if (!email || !password) {
    return { success: false, error: 'Email and password are required' }
  }

  const users = getUsers()
  const userWithPassword = users.find((u: any) => u.email === email)

  if (!userWithPassword) {
    return { success: false, error: 'Invalid email or password' }
  }

  // Check password (simple base64 decode)
  const storedPassword = (userWithPassword as any).password
  if (storedPassword !== btoa(password)) {
    return { success: false, error: 'Invalid email or password' }
  }

  // Remove password before setting user
  const { password: _, ...user } = userWithPassword as any

  setCurrentUser(user)
  return { success: true, user }
}

/**
 * Sign out current user
 */
export function signOut(): void {
  setCurrentUser(null)
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getCurrentUser() !== null
}
