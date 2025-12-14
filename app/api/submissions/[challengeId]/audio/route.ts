import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const SUBMISSIONS_DIR = path.join(process.cwd(), 'data', 'submissions')
const AUDIO_DIR = path.join(SUBMISSIONS_DIR, 'audio')

// Ensure audio directory exists
async function ensureAudioDir() {
  try {
    await fs.mkdir(AUDIO_DIR, { recursive: true })
  } catch (error) {
    console.error('Error creating audio directory:', error)
  }
}

// Get audio file path for a submission
function getAudioFilePath(submissionId: string): string {
  return path.join(AUDIO_DIR, `${submissionId}.webm`)
}

// POST - Upload audio file for a submission
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  try {
    const { challengeId } = await params
    const { searchParams } = new URL(request.url)
    const submissionId = searchParams.get('submissionId')
    
    if (!submissionId) {
      return NextResponse.json(
        { error: 'Submission ID is required' },
        { status: 400 }
      )
    }

    // Get audio data from request body
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      )
    }

    // Ensure audio directory exists
    await ensureAudioDir()

    // Convert File to Buffer
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Save audio file
    const audioFilePath = getAudioFilePath(submissionId)
    await fs.writeFile(audioFilePath, buffer)

    console.log(`Audio file saved for submission ${submissionId}`)

    return NextResponse.json({ 
      success: true, 
      audioFileName: `${submissionId}.webm` 
    })
  } catch (error) {
    console.error('Error uploading audio:', error)
    return NextResponse.json(
      { error: 'Failed to upload audio' },
      { status: 500 }
    )
  }
}
