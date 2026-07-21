#!/usr/bin/env node

import './load-env'

import admin from 'firebase-admin'
import fs from 'fs'
import path from 'path'

const serviceAccountPath = path.join(__dirname, '../config/firebase-sa.json')
if (!fs.existsSync(serviceAccountPath)) {
  throw new Error(`Cannot find Firebase service account at ${serviceAccountPath}`)
}

const serviceAccount = require(serviceAccountPath)
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

const applyChanges = process.argv.includes('--apply')
const seasonArg = process.argv.find(arg => arg.startsWith('--season='))
const seasonYear = Number(seasonArg?.split('=')[1] || 2026)

if (!Number.isInteger(seasonYear) || seasonYear < 2000) {
  throw new Error('Season must be a valid year, for example --season=2026')
}

async function migrateFruitCountStatus() {
  const farmsSnapshot = await db.collection('farms').get()
  let positiveCounts = 0
  let zeroCountsNeedConfirmation = 0
  let missingSeasonStats = 0
  let alreadyRecorded = 0
  let writes = 0

  for (const farmSnapshot of farmsSnapshot.docs) {
    const treesSnapshot = await db.collection('farms').doc(farmSnapshot.id).collection('trees').get()
    let batch = db.batch()
    let batchSize = 0

    for (const treeSnapshot of treesSnapshot.docs) {
      const tree = treeSnapshot.data()
      const seasonalStats = tree.seasonalStats || {}
      const stats = seasonalStats[seasonYear]

      if (!stats) {
        missingSeasonStats++
        continue
      }

      if (stats.fruitCountRecordedAt) {
        alreadyRecorded++
        continue
      }

      const manualCount = Number(stats.manualFruitCount) || 0
      const aiCount = Number(stats.aiFruitCount) || 0
      if (manualCount <= 0 && aiCount <= 0) {
        zeroCountsNeedConfirmation++
        continue
      }

      positiveCounts++
      if (!applyChanges) continue

      batch.update(treeSnapshot.ref, {
        [`seasonalStats.${seasonYear}.fruitCountRecordedAt`]: stats.updatedAt || tree.updatedAt || new Date(),
        [`seasonalStats.${seasonYear}.fruitCountRecordedBy`]: 'migration',
        [`seasonalStats.${seasonYear}.fruitCountSource`]: manualCount > 0 ? 'manual' : 'ai'
      })
      batchSize++
      writes++

      if (batchSize >= 400) {
        await batch.commit()
        batch = db.batch()
        batchSize = 0
      }
    }

    if (applyChanges && batchSize > 0) {
      await batch.commit()
    }
  }

  console.log(JSON.stringify({
    mode: applyChanges ? 'apply' : 'dry-run',
    seasonYear,
    positiveCounts,
    zeroCountsNeedConfirmation,
    missingSeasonStats,
    alreadyRecorded,
    writes
  }, null, 2))

  if (!applyChanges) {
    console.log(`Dry-run only. Re-run with --season=${seasonYear} --apply to write positive legacy counts.`)
  }
}

migrateFruitCountStatus()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fruit count status migration failed:', error)
    process.exit(1)
  })
