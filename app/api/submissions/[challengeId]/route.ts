import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import type { ApplicantSubmission } from '@/lib/recruiter-data'

const SUBMISSIONS_DIR = path.join(process.cwd(), 'data', 'submissions')
const AUDIO_DIR = path.join(SUBMISSIONS_DIR, 'audio')

// Ensure submissions directory exists
async function ensureSubmissionsDir() {
  try {
    await fs.mkdir(SUBMISSIONS_DIR, { recursive: true })
  } catch (error) {
    console.error('Error creating submissions directory:', error)
  }
}

// Get audio file path for a submission
function getAudioFilePath(submissionId: string): string {
  return path.join(AUDIO_DIR, `${submissionId}.webm`)
}

// Get file path for a challenge
function getFilePath(challengeId: string): string {
  return path.join(SUBMISSIONS_DIR, `${challengeId}.json`)
}

// Read submissions from file
async function readSubmissions(challengeId: string): Promise<ApplicantSubmission[]> {
  await ensureSubmissionsDir()
  const filePath = getFilePath(challengeId)
  
  try {
    const data = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(data)
  } catch (error: any) {
    // File doesn't exist, return empty array
    if (error.code === 'ENOENT') {
      return []
    }
    console.error('Error reading submissions file:', error)
    throw error
  }
}

// Write submissions to file
async function writeSubmissions(challengeId: string, submissions: ApplicantSubmission[]): Promise<void> {
  await ensureSubmissionsDir()
  const filePath = getFilePath(challengeId)
  
  try {
    await fs.writeFile(filePath, JSON.stringify(submissions, null, 2), 'utf-8')
  } catch (error) {
    console.error('Error writing submissions file:', error)
    throw error
  }
}

// GET - Retrieve all submissions for a challenge
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  try {
    const { challengeId } = await params
    const submissions = await readSubmissions(challengeId)
    
    // Sort by score descending
    const sorted = submissions.sort((a, b) => b.score - a.score)
    
    return NextResponse.json(sorted)
  } catch (error) {
    console.error('Error fetching submissions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    )
  }
}

// POST - Add a new submission
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  try {
    const { challengeId } = await params
    const submission: ApplicantSubmission = await request.json()
    
    // Validate submission
    if (!submission.id || !submission.applicantName || !submission.applicantEmail) {
      return NextResponse.json(
        { error: 'Invalid submission data' },
        { status: 400 }
      )
    }
    
    const submissions = await readSubmissions(challengeId)
    submissions.push(submission)
    await writeSubmissions(challengeId, submissions)
    
    return NextResponse.json({ success: true, submission })
  } catch (error) {
    console.error('Error adding submission:', error)
    return NextResponse.json(
      { error: 'Failed to add submission' },
      { status: 500 }
    )
  }
}

// DELETE - Remove a submission by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  try {
    const { challengeId } = await params
    const { searchParams } = new URL(request.url)
    const submissionId = searchParams.get('id')
    
    if (!submissionId) {
      return NextResponse.json(
        { error: 'Submission ID is required' },
        { status: 400 }
      )
    }
    
    const submissions = await readSubmissions(challengeId)
    const filtered = submissions.filter(s => s.id !== submissionId)
    await writeSubmissions(challengeId, filtered)
    
    // Delete associated audio file if it exists
    try {
      const audioFilePath = getAudioFilePath(submissionId)
      await fs.unlink(audioFilePath)
      console.log(`Audio file deleted for submission ${submissionId}`)
    } catch (error: any) {
      // File doesn't exist or error deleting - not critical, continue
      if (error.code !== 'ENOENT') {
        console.error('Error deleting audio file:', error)
      }
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting submission:', error)
    return NextResponse.json(
      { error: 'Failed to delete submission' },
      { status: 500 }
    )
  }
}
