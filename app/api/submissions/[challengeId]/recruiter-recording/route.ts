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

// Read recordings from file
async function readRecordings(challengeId: string): Promise<RecruiterRecording[]> {
  await ensureRecruiterRecordingsDir()
  const filePath = getFilePath(challengeId)
  
  try {
    const data = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(data)
  } catch (error: any) {
    // File doesn't exist, return empty array
    if (error.code === 'ENOENT') {
      return []
    }
    console.error('Error reading recruiter recordings file:', error)
    throw error
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

