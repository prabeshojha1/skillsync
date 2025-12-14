import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const SUBMISSIONS_DIR = path.join(process.cwd(), 'data', 'submissions')
const AUDIO_DIR = path.join(SUBMISSIONS_DIR, 'audio')

// Get audio file path for a submission
function getAudioFilePath(submissionId: string): string {
  return path.join(AUDIO_DIR, `${submissionId}.webm`)
}

// GET - Serve audio file for a submission
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ challengeId: string; submissionId: string }> }
) {
  try {
    const { submissionId } = await params
    const audioFilePath = getAudioFilePath(submissionId)

    // Check if file exists
    try {
      await fs.access(audioFilePath)
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return NextResponse.json(
          { error: 'Audio file not found' },
          { status: 404 }
        )
      }
      throw error
    }

    // Read audio file
    const audioBuffer = await fs.readFile(audioFilePath)

    // Return audio file with proper headers
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/webm',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Error serving audio file:', error)
    return NextResponse.json(
      { error: 'Failed to serve audio file' },
      { status: 500 }
    )
  }
}
