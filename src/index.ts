#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import unzipper from 'unzipper'
import os from 'os'
import { Command } from 'commander'
import { execSync } from 'child_process'  // For executing git commands
const program = new Command()

// Get version from package.json
// @ts-ignore
import { version } from '../package.json'

// Get the path to the Downloads directory
const downloadsDir = path.join(os.homedir(), 'Downloads')

// Function to check if the git history is clean
function isGitHistoryClean(): boolean {
  try {
    // Check if the current directory is a git repository
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' })

    // If it's a git repository, check the status
    const status = execSync('git status --porcelain').toString()
    return status.length === 0  // If empty, no changes or untracked files
  } catch (error) {
    // If any error occurs, it means it's not a Git repository
    console.error('Error: Not a git repository or unable to check status.')
    return false  // Assume not clean if error occurs
  }
}

// Function to find the most recent .zip file in the Downloads directory
function findMostRecentZip(): string | null {
  const files = fs.readdirSync(downloadsDir)
  const zipFiles = files.filter(file => file.endsWith('.zip'))
  
  if (zipFiles.length === 0) {
    console.log('No .zip files found in Downloads.')
    return null
  }

  // Get the most recent zip file based on the creation time
  const mostRecentFile = zipFiles
    .map(file => ({
      file,
      time: fs.statSync(path.join(downloadsDir, file)).mtime
    }))
    .sort((a, b) => b.time.getTime() - a.time.getTime())[0] // Sort in descending order by modification time

  // Print the name of the zip file found
  console.log(`Most recent zip file: ${mostRecentFile.file}`)

  return mostRecentFile.file
}

// Function to extract the most recent .zip file
function extractZip(zipFile: string): void {
  const zipFilePath = path.join(downloadsDir, zipFile)
  const extractPath = path.resolve(process.cwd()) // Extract to the current working directory

  fs.createReadStream(zipFilePath)
    .pipe(unzipper.Extract({ path: extractPath }))
    .on('entry', (entry) => {
      console.log(`Updating ${entry.path}`)  // Print the name of each file being extracted
    })
    .on('error', (err: Error) => {
      console.error('Extraction failed:', err)
    })
}

// Command handler for unzip
program
  .name('gptsync')
  .description('Seamlessly sync the latest AI output in a flash.')
  .version(version) // Set version from package.json
  .helpOption('-h, --help', 'Show help') // Ensure help works
  .option('-f, --force', 'Force operation even if git history is not clean.')
  .command('unzip')
  .description('Finds the most recent .zip file from Downloads and extracts it in the current directory.')
  .option('-f, --force', 'Force operation even if git history is not clean.')
  .action((options) => {
    if (!options.force && !isGitHistoryClean()) {
      console.error('Error: Git history is not clean. Use --force only if you are sure.')
      process.exit(1)  // Exit with error status
    }

    const recentZip = findMostRecentZip()
    if (recentZip) {
      extractZip(recentZip)
    }
  })

// Default behavior: if no command is provided, invoke 'unzip'
program.action(() => {
  program.commands.find(c => c.name() === 'unzip')?.parse(process.argv)
})

// Parse the command line arguments
program.parse(process.argv)
