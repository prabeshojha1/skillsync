import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import type { ChangeEvent } from '@/lib/recruiter-data'

const SUBMISSIONS_DIR = path.join(process.cwd(), 'data', 'submissions')
const RECRUITER_RECORDINGS_DIR = path.join(SUBMISSIONS_DIR, 'recruiter-recordings')

interface RecruiterRecording {
  editorIndex: number
  submissionId: string
  recordedChanges: ChangeEvent[]
  audioFileName: string
}

// Ensure recruiter recordings directory exists
async function ensureRecruiterRecordingsDir() {
  try {
    await fs.mkdir(RECRUITER_RECORDINGS_DIR, { recursive: true })
  } catch (error) {
    console.error('Error creating recruiter recordings directory:', error)
  }
}

// Get file path for a challenge's recruiter recordings
function getFilePath(challengeId: string): string {
  return path.join(RECRUITER_RECORDINGS_DIR, `${challengeId}.json`)
}

// Read recordings from file - Always returns an array, even if parsing fails
async function readRecordings(challengeId: string): Promise<RecruiterRecording[]> {
  await ensureRecruiterRecordingsDir()
  const filePath = getFilePath(challengeId)
  
  try {
    const data = await fs.readFile(filePath, 'utf-8')
    const parsed = JSON.parse(data)
    // Ensure result is an array
    if (Array.isArray(parsed)) {
      return parsed
    }
    console.warn('Recordings file does not contain an array, returning empty array')
    return []
  } catch (error: any) {
    // File doesn't exist, return empty array
    if (error.code === 'ENOENT') {
      return []
    }
    // Parsing failed or other error - return empty array instead of throwing
    console.error('Error reading recruiter recordings file:', error)
    return []
  }
}

// Write recordings to file
async function writeRecordings(challengeId: string, recordings: RecruiterRecording[]): Promise<void> {
  await ensureRecruiterRecordingsDir()
  const filePath = getFilePath(challengeId)
  
  try {
    await fs.writeFile(filePath, JSON.stringify(recordings, null, 2), 'utf-8')
  } catch (error) {
    console.error('Error writing recruiter recordings file:', error)
    throw error
  }
}

// GET - Retrieve all recordings for a challenge
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  try {
    const { challengeId } = await params
    const recordings = await readRecordings(challengeId)
    
    return NextResponse.json({ recordings })
  } catch (error) {
    console.error('Error fetching recruiter recordings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recruiter recordings' },
      { status: 500 }
    )
  }
}

// POST - Save recordings for a challenge
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  try {
    const { challengeId } = await params
    const body = await request.json()
    const { recordings }: { recordings: RecruiterRecording[] } = body
    
    if (!Array.isArray(recordings)) {
      return NextResponse.json(
        { error: 'Recordings must be an array' },
        { status: 400 }
      )
    }
    
    // Validate recordings
    for (const recording of recordings) {
      if (typeof recording.editorIndex !== 'number' || 
          recording.editorIndex < 0 || 
          recording.editorIndex > 2) {
        return NextResponse.json(
          { error: 'Invalid editorIndex (must be 0, 1, or 2)' },
          { status: 400 }
        )
      }
      if (!recording.submissionId || !recording.audioFileName) {
        return NextResponse.json(
          { error: 'Missing required fields: submissionId and audioFileName' },
          { status: 400 }
        )
      }
    }
    
    // Read existing recordings
    const existingRecordings = await readRecordings(challengeId)
    
    // Replace recordings for the same editorIndex
    const updatedRecordings = [...existingRecordings]
    
    for (const newRecording of recordings) {
      const existingIndex = updatedRecordings.findIndex(
        r => r.editorIndex === newRecording.editorIndex
      )
      
      if (existingIndex >= 0) {
        // Replace existing recording
        updatedRecordings[existingIndex] = newRecording
      } else {
        // Add new recording
        updatedRecordings.push(newRecording)
      }
    }
    
    // Sort by editorIndex
    updatedRecordings.sort((a, b) => a.editorIndex - b.editorIndex)
    
    await writeRecordings(challengeId, updatedRecordings)
    
    return NextResponse.json({ success: true, recordings: updatedRecordings })
  } catch (error) {
    console.error('Error saving recruiter recordings:', error)
    return NextResponse.json(
      { error: 'Failed to save recruiter recordings' },
      { status: 500 }
    )
  }
}

// DELETE - Delete all recordings for a challenge
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  try {
    const { challengeId } = await params
    const filePath = getFilePath(challengeId)
    const AUDIO_DIR = path.join(process.cwd(), 'data', 'submissions', 'audio')
    
    // Delete the recordings file if it exists
    try {
      await fs.unlink(filePath)
      console.log(`Deleted recruiter recordings file for challenge ${challengeId}`)
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error
      }
      // File doesn't exist, that's fine
    }
    
    // Delete all audio files for this challenge
    // This includes files with stable IDs (recruiter-recording-${challengeId}-${index})
    // and any old timestamp-based files that might exist
    try {
      // Ensure audio directory exists
      await fs.mkdir(AUDIO_DIR, { recursive: true })
      const audioFiles = await fs.readdir(AUDIO_DIR)
      const deletedFiles: string[] = []
      
      for (const file of audioFiles) {
        // Delete files that match the stable pattern for this challenge
        if (file.startsWith(`recruiter-recording-${challengeId}-`) && file.endsWith('.webm')) {
          try {
            const audioFilePath = path.join(AUDIO_DIR, file)
            await fs.unlink(audioFilePath)
            deletedFiles.push(file)
            console.log(`Deleted audio file: ${file}`)
          } catch (error: any) {
            if (error.code !== 'ENOENT') {
              console.error(`Error deleting audio file ${file}:`, error)
            }
          }
        }
        // Also delete old timestamp-based files that might be orphaned
        // These have format: recruiter-recording-{timestamp}-{index}.webm
        // We'll be conservative and only delete if we can't find a matching stable ID
        else if (file.startsWith('recruiter-recording-') && file.endsWith('.webm') && /recruiter-recording-\d+-\d+\.webm/.test(file)) {
          // This is an old timestamp-based file, delete it to clean up
          try {
            const audioFilePath = path.join(AUDIO_DIR, file)
            await fs.unlink(audioFilePath)
            deletedFiles.push(file)
            console.log(`Deleted old timestamp-based audio file: ${file}`)
          } catch (error: any) {
            if (error.code !== 'ENOENT') {
              console.error(`Error deleting old audio file ${file}:`, error)
            }
          }
        }
      }
      
      console.log(`Deleted ${deletedFiles.length} audio files for challenge ${challengeId}`)
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error('Error reading audio directory:', error)
      }
      // Directory doesn't exist, that's fine
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting recruiter recordings:', error)
    return NextResponse.json(
      { error: 'Failed to delete recruiter recordings' },
      { status: 500 }
    )
  }
}

