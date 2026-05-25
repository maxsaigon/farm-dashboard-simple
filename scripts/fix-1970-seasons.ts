#!/usr/bin/env tsx

/**
 * Migration Script to fix 1970/pre-2000 Seasons and Photo Dates
 * This script connects to Firestore and repairs farms, photos, and trees.
 */

// Import env loader first to ensure process.env is ready
import './load-env'

import { db } from '../lib/firebase'
import { collection, doc, getDocs, updateDoc, writeBatch, Timestamp } from 'firebase/firestore'

async function fix1970Seasons() {
  try {
    console.log('🚀 Starting 1970/pre-2000 season & photo date cleanup...')

    // 1. Get all Farms
    console.log('\n📁 1. Scanning Farms...')
    const farmsSnapshot = await getDocs(collection(db, 'farms'))
    console.log(`Found ${farmsSnapshot.size} farms.`)

    const farmSeasonMap = new Map<string, { currentSeasonYear: number; createdDate: Date }>()

    for (const farmDoc of farmsSnapshot.docs) {
      const farmId = farmDoc.id
      const farmData = farmDoc.data()
      
      let currentSeasonYear = farmData.currentSeasonYear || 2025
      const seasons: number[] = farmData.seasons || []

      let farmUpdated = false

      // Fix currentSeasonYear if < 2000
      if (currentSeasonYear < 2000) {
        console.log(`  ⚠️ Farm "${farmData.name || farmId}" has invalid currentSeasonYear: ${currentSeasonYear}. Resetting to 2025.`)
        currentSeasonYear = 2025
        farmUpdated = true
      }

      // Filter seasons list to remove pre-2000 values
      const cleanSeasons = seasons.filter(y => y >= 2000)
      if (!cleanSeasons.includes(2025)) {
        cleanSeasons.push(2025)
      }
      cleanSeasons.sort((a, b) => b - a)

      if (JSON.stringify(seasons) !== JSON.stringify(cleanSeasons)) {
        console.log(`  ⚠️ Farm "${farmData.name || farmId}" has invalid seasons list: [${seasons.join(', ')}]. Cleaned list: [${cleanSeasons.join(', ')}]`)
        farmUpdated = true
      }

      // Save farm creation date for photo fallback
      let createdDate = new Date()
      if (farmData.createdDate) {
        createdDate = farmData.createdDate.toDate ? farmData.createdDate.toDate() : new Date(farmData.createdDate)
        if (createdDate.getFullYear() < 2000) {
          createdDate = new Date('2025-01-01')
        }
      }

      farmSeasonMap.set(farmId, { currentSeasonYear, createdDate })

      if (farmUpdated) {
        await updateDoc(doc(db, 'farms', farmId), {
          currentSeasonYear,
          seasons: cleanSeasons
        })
        console.log(`  ✅ Farm "${farmData.name || farmId}" successfully updated in Firestore.`)
      } else {
        console.log(`  ℹ️ Farm "${farmData.name || farmId}" is OK.`)
      }
    }

    // Helper to process photo documents
    async function cleanPhotoDocs(photoDocs: any[], typeLabel: string) {
      let photosMigrated = 0
      let batchWrite = writeBatch(db)
      let opCount = 0

      for (const photoDoc of photoDocs) {
        const photoData = photoDoc.data()
        const farmId = photoData.farmId
        const farmInfo = farmId ? farmSeasonMap.get(farmId) : null
        const defaultYear = farmInfo?.currentSeasonYear || 2025
        const defaultDate = farmInfo?.createdDate || new Date('2025-01-01')

        let needsUpdate = false
        const updates: any = {}

        // 1. Check and fix timestamp
        let photoDate: Date | null = null
        if (photoData.timestamp) {
          photoDate = photoData.timestamp.toDate ? photoData.timestamp.toDate() : new Date(photoData.timestamp)
        }

        if (!photoDate || isNaN(photoDate.getTime()) || photoDate.getFullYear() < 2000) {
          console.log(`  ⚠️ Photo ${photoDoc.id} in ${typeLabel} has invalid timestamp: ${photoDate ? photoDate.toISOString() : 'null'}. Resetting timestamp.`)
          updates.timestamp = Timestamp.fromDate(defaultDate)
          photoDate = defaultDate
          needsUpdate = true
        }

        // 2. Check and fix seasonYear
        const currentSeasonYear = photoData.seasonYear
        if (currentSeasonYear === undefined || currentSeasonYear < 2000) {
          let targetSeasonYear = defaultYear
          if (photoDate && photoDate.getFullYear() >= 2020) {
            targetSeasonYear = photoDate.getFullYear()
          }
          console.log(`  ⚠️ Photo ${photoDoc.id} in ${typeLabel} has invalid seasonYear: ${currentSeasonYear}. Setting to ${targetSeasonYear}.`)
          updates.seasonYear = targetSeasonYear
          needsUpdate = true
        }

        if (needsUpdate) {
          batchWrite.update(photoDoc.ref, updates)
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
      return photosMigrated
    }

    // 2. Clean Photos (Root Collection)
    console.log('\n📸 2. Scanning Root Photos Collection...')
    const rootPhotosSnapshot = await getDocs(collection(db, 'photos'))
    console.log(`Found ${rootPhotosSnapshot.size} root photos.`)
    const rootPhotosMigrated = await cleanPhotoDocs(rootPhotosSnapshot.docs, 'root')
    console.log(`  ✅ Root photos migrated: ${rootPhotosMigrated}`)

    // 3. Clean Photos and Trees (Farm Subcollections)
    console.log('\n🌳 3. Scanning Farm Subcollections (Photos & Trees)...')
    let totalSubPhotosMigrated = 0
    let totalTreesFixed = 0

    for (const farmDoc of farmsSnapshot.docs) {
      const farmId = farmDoc.id
      const farmName = farmDoc.data().name || farmId
      
      // A. Farm Subcollection Photos
      const subPhotosRef = collection(db, 'farms', farmId, 'photos')
      const subPhotosSnapshot = await getDocs(subPhotosRef)
      if (!subPhotosSnapshot.empty) {
        console.log(`  Scanning ${subPhotosSnapshot.size} subcollection photos for farm "${farmName}"...`)
        const migratedCount = await cleanPhotoDocs(subPhotosSnapshot.docs, `farm ${farmId}`)
        totalSubPhotosMigrated += migratedCount
      }

      // B. Farm Subcollection Trees (to fix seasonalStats keys)
      const treesRef = collection(db, 'farms', farmId, 'trees')
      const treesSnapshot = await getDocs(treesRef)
      if (!treesSnapshot.empty) {
        console.log(`  Scanning ${treesSnapshot.size} trees for farm "${farmName}"...`)
        let batch = writeBatch(db)
        let opCount = 0

        for (const treeDoc of treesSnapshot.docs) {
          const treeData = treeDoc.data()
          const seasonalStats = treeData.seasonalStats || {}
          
          let treeUpdated = false
          const newSeasonalStats = { ...seasonalStats }

          // Scan seasonalStats keys
          for (const key of Object.keys(seasonalStats)) {
            const yearKey = parseInt(key, 10)
            if (isNaN(yearKey) || yearKey < 2000) {
              console.log(`  ⚠️ Tree "${treeData.name || treeDoc.id}" has invalid seasonalStats key: "${key}". Moving stats to "2025".`)
              
              // Move data to 2025 (or merge if 2025 already exists)
              const existing2025Stats = newSeasonalStats[2025] || {}
              const badStats = seasonalStats[key] || {}
              
              newSeasonalStats[2025] = {
                manualFruitCount: badStats.manualFruitCount !== undefined ? badStats.manualFruitCount : (existing2025Stats.manualFruitCount || 0),
                aiFruitCount: badStats.aiFruitCount !== undefined ? badStats.aiFruitCount : (existing2025Stats.aiFruitCount || 0),
                healthStatus: badStats.healthStatus || existing2025Stats.healthStatus || 'Good',
                notes: badStats.notes || existing2025Stats.notes || '',
                updatedAt: badStats.updatedAt || existing2025Stats.updatedAt || new Date()
              }

              // Delete the invalid key
              delete newSeasonalStats[key]
              treeUpdated = true
            }
          }

          if (treeUpdated) {
            batch.update(doc(db, 'farms', farmId, 'trees', treeDoc.id), {
              seasonalStats: newSeasonalStats
            })
            opCount++
            totalTreesFixed++

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
    }

    console.log(`  ✅ Subcollection photos migrated: ${totalSubPhotosMigrated}`)
    console.log(`  ✅ Trees seasonal stats keys fixed: ${totalTreesFixed}`)

    console.log('\n🎉 1970/pre-2000 seasons and photo dates cleanup completed successfully!')
  } catch (error) {
    console.error('❌ Error during cleanup script:', error)
    process.exit(1)
  }
}

// Run script
fix1970Seasons().then(() => process.exit(0)).catch(console.error)
