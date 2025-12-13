'use client'

// Profile management using localStorage

export interface UserProfile {
  userId: string
  firstName: string
  lastName: string
  programmingLanguages: string[]
  resume: string | null // Base64 encoded file or URL
  resumeFileName: string | null
  companyTypes: string[]
  companySize: string | null
  completedAt: string
}

const PROFILE_STORAGE_KEY = 'user_profiles'

/**
 * Get all profiles from localStorage
 */
function getProfiles(): Record<string, UserProfile> {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

/**
 * Save profiles to localStorage
 */
function saveProfiles(profiles: Record<string, UserProfile>): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles))
  } catch (error) {
    console.error('Failed to save profiles:', error)
  }
}

/**
 * Get profile for a user
 */
export function getUserProfile(userId: string): UserProfile | null {
  const profiles = getProfiles()
  return profiles[userId] || null
}

/**
 * Save or update user profile
 */
export function saveUserProfile(profile: UserProfile): void {
  const profiles = getProfiles()
  profiles[profile.userId] = {
    ...profile,
    completedAt: new Date().toISOString(),
  }
  saveProfiles(profiles)
}

/**
 * Check if user has completed profile
 */
export function hasCompletedProfile(userId: string): boolean {
  const profile = getUserProfile(userId)
  return profile !== null
}
