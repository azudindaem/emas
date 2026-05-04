import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join, extname } from 'path'
import { randomUUID } from 'crypto'

const UPLOAD_DIR = join(process.cwd(), '..', '..', '..', 'uploads', 'profiles')
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Jenis fail tidak dibenarkan. Guna JPG, PNG, WebP atau GIF.' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Saiz fail melebihi 5MB.' }, { status: 400 })
    }

    const ext = extname(file.name).toLowerCase() || '.jpg'
    const filename = `${randomUUID()}${ext}`

    await mkdir(UPLOAD_DIR, { recursive: true })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(join(UPLOAD_DIR, filename), buffer)

    const url = `/media/profiles/${filename}`
    return NextResponse.json({ url })
  } catch (err) {
    console.error('Profile upload error:', err)
    return NextResponse.json({ error: 'Gagal memuat naik fail.' }, { status: 500 })
  }
}
