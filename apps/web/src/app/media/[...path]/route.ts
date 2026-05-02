import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import { join, extname, resolve, normalize } from 'path'

const UPLOAD_DIR = join(process.cwd(), '..', '..', '..', 'uploads')

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  // Sanitize: prevent path traversal
  const relative = path.map(p => p.replace(/[^a-zA-Z0-9._-]/g, '')).join('/')
  const fullPath = resolve(join(UPLOAD_DIR, relative))
  // Ensure the resolved path is inside UPLOAD_DIR
  if (!fullPath.startsWith(normalize(UPLOAD_DIR))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    await stat(fullPath)
    const buffer = await readFile(fullPath)
    const ext = extname(fullPath).toLowerCase()
    const contentType = MIME[ext] ?? 'application/octet-stream'
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
