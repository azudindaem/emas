#!/usr/bin/env node
const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const distDir = path.join(__dirname, '../dist')
const pnpmStore = path.join(__dirname, '../../../node_modules/.pnpm')

function findEngineFiles(dir, results = []) {
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      // Only recurse into paths that contain prisma client
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
  const files = findEngineFiles(pnpmStore)

  if (!files.length) {
    console.log('No Prisma engine files found to copy.')
    process.exit(0)
  }

  for (const file of files) {
    const dest = path.join(distDir, path.basename(file))
    fs.copyFileSync(file, dest)
    console.log(`Copied: ${path.basename(file)} -> dist/`)
  }
} catch (e) {
  console.warn('Warning: Could not copy Prisma engine files:', e.message)
}
