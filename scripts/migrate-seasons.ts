#!/usr/bin/env node

/**
 * Migration Script for Seasons
 * This script initializes season configurations on all farms,
 * copies legacy tree stats to seasonalStats[2025], and tags pre-2026 photos with seasonYear 2025.
 */

// Import env loader first to ensure process.env is ready
import './load-env'

import { db } from '../lib/firebase'
import { collection, doc, getDocs, updateDoc, writeBatch } from 'firebase/firestore'

async function migrateSeasons() {
  try {
    console.log('🚀 Starting season migration...')

    // 1. Migrate Farms
    console.log('\n📁 1. Migrating Farms...')
    const farmsSnapshot = await getDocs(collection(db, 'farms'))
    console.log(`Found ${farmsSnapshot.size} farms.`)

    for (const farmDoc of farmsSnapshot.docs) {
      const farmData = farmDoc.data()
      const currentSeasonYear = farmData.currentSeasonYear || 2025
      const seasons = farmData.seasons || [2025]
      
      if (!seasons.includes(2025)) {
        seasons.push(2025)
      }

      await updateDoc(doc(db, 'farms', farmDoc.id), {
        currentSeasonYear,
        seasons
      })
      console.log(`  ✅ Farm "${farmData.name || farmDoc.id}" updated. currentSeasonYear: ${currentSeasonYear}, seasons: [${seasons.join(', ')}]`)
    }

    // 2. Migrate Trees
    console.log('\n🌳 2. Migrating Trees...')
    let totalTreesMigrated = 0

    for (const farmDoc of farmsSnapshot.docs) {
      const farmId = farmDoc.id
      const treesRef = collection(db, 'farms', farmId, 'trees')
      const treesSnapshot = await getDocs(treesRef)
      
      if (treesSnapshot.empty) {
        continue
      }

      console.log(`  Processing ${treesSnapshot.size} trees for farm ${farmDoc.data().name || farmId}...`)
      
      // Batch write trees in chunks of 500
      let batch = writeBatch(db)
      let opCount = 0

      for (const treeDoc of treesSnapshot.docs) {
        const treeData = treeDoc.data()
        
        // If seasonalStats for 2025 does not exist, copy root values
        const seasonalStats = treeData.seasonalStats || {}
        if (!seasonalStats[2025]) {
          seasonalStats[2025] = {
            manualFruitCount: treeData.manualFruitCount || 0,
            aiFruitCount: treeData.aiFruitCount || 0,
            healthStatus: treeData.healthStatus || 'Good',
            notes: treeData.notes || '',
            updatedAt: treeData.updatedAt || new Date()
          }

          batch.update(doc(db, 'farms', farmId, 'trees', treeDoc.id), {
            seasonalStats
          })
          opCount++
          totalTreesMigrated++

          if (opCount >= 400) {
            await batch.commit()
            batch = writeBatch(db)
            opCount = 0
          }
        }
      }

      if (opCount > 0) {
        await batch.commit()
      }
    }
    console.log(`  ✅ Total trees migrated: ${totalTreesMigrated}`)

    // 3. Migrate Photos
    console.log('\n📸 3. Migrating Photos...')
    const photosRef = collection(db, 'photos')
    const photosSnapshot = await getDocs(photosRef)
    console.log(`Found ${photosSnapshot.size} photos total in root collection.`)

    let photosMigrated = 0
    let batchWrite = writeBatch(db)
    let opCount = 0

    for (const photoDoc of photosSnapshot.docs) {
      const photoData = photoDoc.data()
      
      if (photoData.seasonYear === undefined) {
        let seasonYear = 2025
        
        // Check photo timestamp
        let photoDate: Date | null = null
        if (photoData.timestamp) {
          if (photoData.timestamp.toDate) {
            photoDate = photoData.timestamp.toDate()
          } else {
            photoDate = new Date(photoData.timestamp)
          }
        }

        if (photoDate && photoDate.getFullYear() >= 2026) {
          seasonYear = photoDate.getFullYear()
        }

        batchWrite.update(doc(db, 'photos', photoDoc.id), {
          seasonYear
        })
        opCount++
        photosMigrated++

        if (opCount >= 400) {
          await batchWrite.commit()
          batchWrite = writeBatch(db)
          opCount = 0
        }
      }
    }

    if (opCount > 0) {
      await batchWrite.commit()
    }
    console.log(`  ✅ Total photos migrated: ${photosMigrated}`)

    console.log('\n🎉 Season migration completed successfully!')
  } catch (error) {
    console.error('❌ Error during season migration:', error)
    process.exit(1)
  }
}

// Run migration
migrateSeasons().then(() => process.exit(0)).catch(console.error)
