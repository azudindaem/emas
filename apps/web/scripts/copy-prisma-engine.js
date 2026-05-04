#!/usr/bin/env node
const path = require('path')
const fs = require('fs')

const webDir = path.join(__dirname, '..')
const standaloneDir = path.join(webDir, '.next/standalone/apps/web')
const pnpmStore = path.join(__dirname, '../../../node_modules/.pnpm')

// ── 1. Copy Prisma engine ────────────────────────────────────────────────────
function findEngineFiles(dir, results = []) {
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (
        entry.name.startsWith('@prisma+client') ||
        entry.name === 'node_modules' ||
        entry.name === '.prisma' ||
        entry.name === 'client'
      ) {
        findEngineFiles(fullPath, results)
      }
    } else if (entry.name.endsWith('.node') && fullPath.includes('.prisma')) {
      results.push(fullPath)
    }
  }
  return results
}

try {
  const engines = findEngineFiles(pnpmStore)
  if (engines.length) {
    const engineDest = path.join(standaloneDir, '.prisma/client')
    fs.mkdirSync(engineDest, { recursive: true })
    for (const file of engines) {
      fs.copyFileSync(file, path.join(engineDest, path.basename(file)))
      console.log(`[prisma] Copied: ${path.basename(file)}`)
    }
  } else {
    console.log('[prisma] No engine files found.')
  }
} catch (e) {
  console.warn('[prisma] Warning:', e.message)
}

// ── 2. Copy .next/static ────────────────────────────────────────────────────
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

try {
  const staticSrc = path.join(webDir, '.next/static')
  const staticDest = path.join(standaloneDir, '.next/static')
  if (fs.existsSync(staticSrc)) {
    copyDir(staticSrc, staticDest)
    console.log('[static] Copied .next/static -> standalone/.next/static')
  }
} catch (e) {
  console.warn('[static] Warning:', e.message)
}

// ── 3. Copy public/ ─────────────────────────────────────────────────────────
try {
  const publicSrc = path.join(webDir, 'public')
  const publicDest = path.join(standaloneDir, 'public')
  if (fs.existsSync(publicSrc)) {
    copyDir(publicSrc, publicDest)
    console.log('[public] Copied public/ -> standalone/public/')
  }
} catch (e) {
  console.warn('[public] Warning:', e.message)
}
