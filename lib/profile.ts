'use client'

// Profile management using localStorage

export interface UserProfile {
  userId: string
  firstName?: string
  lastName?: string
  programmingLanguages: string[]
  resumeFileName: string | null // Just store the filename, not the file itself
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
    const serialized = JSON.stringify(profiles)
    // Check if data is too large (localStorage limit is typically 5-10MB)
    if (serialized.length > 4 * 1024 * 1024) { // 4MB limit
      console.error('Profile data too large to save. Removing large fields.')
      // Remove any large data and try again
      const cleanedProfiles = Object.entries(profiles).reduce((acc, [key, profile]) => {
        acc[key] = {
          ...profile,
          resumeFileName: profile.resumeFileName ? profile.resumeFileName : null,
        }
        return acc
      }, {} as Record<string, UserProfile>)
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(cleanedProfiles))
      return
    }
    localStorage.setItem(PROFILE_STORAGE_KEY, serialized)
  } catch (error: any) {
    console.error('Failed to save profiles:', error)
    // If quota exceeded, try to save without resume
    if (error.name === 'QuotaExceededError' || error.code === 22) {
      console.warn('LocalStorage quota exceeded. Attempting to save without resume data.')
      try {
        const cleanedProfiles = Object.entries(profiles).reduce((acc, [key, profile]) => {
          acc[key] = {
            ...profile,
            resumeFileName: profile.resumeFileName ? profile.resumeFileName : null,
          }
          return acc
        }, {} as Record<string, UserProfile>)
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(cleanedProfiles))
      } catch (retryError) {
        console.error('Failed to save even after cleanup:', retryError)
      }
    }
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
