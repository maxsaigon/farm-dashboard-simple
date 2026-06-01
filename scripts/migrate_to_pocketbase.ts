import admin from 'firebase-admin'
import PocketBase from 'pocketbase'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import dotenv from 'dotenv'
// Note: We use axios and form-data or standard fetch/FormData to upload files to PocketBase
import axios from 'axios'
import FormData from 'form-data'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

// Deterministic function to convert any Firebase ID to valid PocketBase 15-character ID
function toPbId(firebaseId: string): string {
  if (!firebaseId) return ''
  // PocketBase requires IDs to be exactly 15 alphanumeric characters.
  // MD5 yields a 32-character hex string (which contains only 0-9 and a-f).
  // First 15 characters of MD5 is deterministic, alphanumeric, and exactly 15 chars.
  const hash = crypto.createHash('md5').update(firebaseId).digest('hex')
  return hash.substring(0, 15)
}

// Initialize Firebase Admin SDK
// Make sure service account file exists at this path or edit accordingly
const serviceAccountPath = path.join(__dirname, '../config/firebase-sa.json')
let firebaseInitialized = false

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = require(serviceAccountPath)
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com'
  })
  firebaseInitialized = true
  console.log('[Firebase] ✅ Admin SDK initialized successfully.')
} else {
  console.error(`[Firebase] ❌ Cannot find service account key at: ${serviceAccountPath}`)
  console.log('[Firebase] ℹ️ Migration cannot run without a valid firebase-sa.json file under config/.')
  process.exit(1)
}

const db = admin.firestore()
const bucket = admin.storage().bucket()

// Initialize PocketBase
const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'https://farmbackend.buonme.com'
const pb = new PocketBase(pbUrl)

async function runMigration() {
  console.log('[Migration] 🚀 Starting migration from Firebase to PocketBase...')

  try {
    // 1. Authenticate PocketBase Admin
    // Please replace with your actual PocketBase admin credentials or set env vars
    const pbAdminEmail = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@buonme.com'
    const pbAdminPassword = process.env.POCKETBASE_ADMIN_PASSWORD || 'BuonMeFarm2026!'
    
    console.log(`[PocketBase] 🔑 Authenticating admin: ${pbAdminEmail}...`)
    await pb.collection('_superusers').authWithPassword(pbAdminEmail, pbAdminPassword)
    console.log('[PocketBase] ✅ Admin authenticated successfully.')

    // 2. Migrate Users
    console.log('[Users] 👤 Fetching users from Firestore...')
    const userSnapshot = await db.collection('users').get()
    console.log(`[Users] Found ${userSnapshot.size} users to migrate.`)

    for (const doc of userSnapshot.docs) {
      const data = doc.data()
      const pbUserId = toPbId(doc.id)
      try {
        // Check if user already exists
        let exists = false
        try {
          await pb.collection('users').getOne(pbUserId)
          exists = true
        } catch (e) {}

        if (!exists) {
          await pb.collection('users').create({
            id: pbUserId,
            email: data.email || `${pbUserId}@example.com`,
            name: data.displayName || data.name || '',
            language: data.language || 'vi',
            timezone: data.timezone || 'Asia/Ho_Chi_Minh',
            account_status: data.accountStatus || 'active',
            login_count: data.loginCount || 0,
            password: 'TemporaryPassword123!',
            passwordConfirm: 'TemporaryPassword123!',
            verified: data.isEmailVerified || data.emailVerified || false,
            created: data.createdAt ? new Date(data.createdAt._seconds * 1000).toISOString() : new Date().toISOString()
          })
          console.log(`[Users] Imported user: ${data.email || pbUserId}`)
        } else {
          console.log(`[Users] User already exists: ${data.email || pbUserId}`)
        }
      } catch (err: any) {
        console.error(`[Users] ❌ Error importing user ${doc.id}: ${err.message}`)
      }
    }

    // 3. Migrate Compliance Rules
    console.log('[Compliance] 📋 Fetching compliance rules...')
    const complianceSnapshot = await db.collection('complianceRules').get()
    for (const doc of complianceSnapshot.docs) {
      const data = doc.data()
      const ruleId = toPbId(doc.id)
      try {
        await pb.collection('compliance_rules').create({
          id: ruleId,
          name: data.name || '',
          description: data.description || '',
          category: data.category || '',
          status: data.status || 'compliant',
          last_checked: data.lastChecked ? new Date(data.lastChecked._seconds * 1000).toISOString() : new Date().toISOString(),
          next_check: data.nextCheck ? new Date(data.nextCheck._seconds * 1000).toISOString() : new Date().toISOString(),
          requirements: data.requirements || [],
          violations: data.violations || []
        })
        console.log(`[Compliance] Imported rule: ${data.name}`)
      } catch (err: any) {
        // Ignore if exists
      }
    }

    // 4. Migrate Farms
    console.log('[Farms] 🏗️ Fetching farms from Firestore...')
    const farmSnapshot = await db.collection('farms').get()
    console.log(`[Farms] Found ${farmSnapshot.size} farms.`)

    for (const farmDoc of farmSnapshot.docs) {
      const farmData = farmDoc.data()
      const pbFarmId = toPbId(farmDoc.id)
      
      try {
        // Create Farm
        let farmExists = false
        try {
          await pb.collection('farms').getOne(pbFarmId)
          farmExists = true
        } catch (e) {}

        if (!farmExists) {
          await pb.collection('farms').create({
            id: pbFarmId,
            name: farmData.name || 'Unnamed Farm',
            owner_name: farmData.ownerName || '',
            farm_type: farmData.farmType || 'personal',
            status: farmData.status || 'active',
            total_area: farmData.totalArea || 0,
            center_latitude: farmData.centerLatitude || 0,
            center_longitude: farmData.centerLongitude || 0,
            boundary_coordinates: farmData.boundaryCoordinates ? JSON.parse(farmData.boundaryCoordinates) : [],
            is_active: farmData.isActive !== false,
            seasons: farmData.seasons || [2025],
            current_season_year: farmData.currentSeasonYear || 2025
          })
          console.log(`[Farms] Imported farm: ${farmData.name}`)
        }

        // Migrate Trees under this Farm
        console.log(`[Trees] 🌳 Fetching trees for farm: ${farmData.name}...`)
        const treeSnapshot = await db.collection('farms').doc(farmDoc.id).collection('trees').get()
        console.log(`[Trees] Found ${treeSnapshot.size} trees in farm.`)

        for (const treeDoc of treeSnapshot.docs) {
          const treeData = treeDoc.data()
          const pbTreeId = toPbId(treeDoc.id)

          try {
            let treeExists = false
            try {
              await pb.collection('trees').getOne(pbTreeId)
              treeExists = true
            } catch (e) {}

            if (!treeExists) {
              await pb.collection('trees').create({
                id: pbTreeId,
                farm: pbFarmId,
                name: treeData.name || '',
                qr_code: treeData.qrCode || '',
                variety: treeData.variety || '',
                zone_code: treeData.zoneCode || '',
                tree_status: treeData.treeStatus || 'mature',
                health_status: treeData.healthStatus || 'Good',
                notes: treeData.notes || '',
                health_notes: treeData.healthNotes || '',
                disease_notes: treeData.diseaseNotes || '',
                latitude: treeData.latitude || 0,
                longitude: treeData.longitude || 0,
                gps_accuracy: treeData.gpsAccuracy || 0,
                planting_date: treeData.plantingDate ? new Date(treeData.plantingDate._seconds * 1000).toISOString() : null,
                manual_fruit_count: treeData.manualFruitCount || 0,
                ai_fruit_count: treeData.aiFruitCount || 0,
                ai_accuracy: treeData.aiAccuracy || 0,
                last_count_date: treeData.lastCountDate ? new Date(treeData.lastCountDate._seconds * 1000).toISOString() : null,
                last_ai_analysis_date: treeData.lastAIAnalysisDate ? new Date(treeData.lastAIAnalysisDate._seconds * 1000).toISOString() : null,
                tree_height: treeData.treeHeight || 0,
                trunk_diameter: treeData.trunkDiameter || 0,
                fertilized_date: treeData.fertilizedDate ? new Date(treeData.fertilizedDate._seconds * 1000).toISOString() : null,
                pruned_date: treeData.prunedDate ? new Date(treeData.prunedDate._seconds * 1000).toISOString() : null,
                needs_attention: treeData.needsAttention === true,
                custom_fields: treeData.customFields || {}
              })
            }
          } catch (treeErr: any) {
            console.error(`[Trees] ❌ Error migrating tree ${treeDoc.id}: ${treeErr.message}`)
          }
        }

        // Migrate Zones under this Farm
        console.log(`[Zones] 🗺️ Fetching zones for farm: ${farmData.name}...`)
        const zoneSnapshot = await db.collection('farms').doc(farmDoc.id).collection('zones').get()
        for (const zoneDoc of zoneSnapshot.docs) {
          const zoneData = zoneDoc.data()
          const pbZoneId = toPbId(zoneDoc.id)
          try {
            let zoneExists = false
            try {
              await pb.collection('zones').getOne(pbZoneId)
              zoneExists = true
            } catch (e) {}

            if (!zoneExists) {
              await pb.collection('zones').create({
                id: pbZoneId,
                farm: pbFarmId,
                name: zoneData.name || '',
                code: zoneData.code || '',
                description: zoneData.description || '',
                boundaries: zoneData.boundaries || zoneData.boundary || [],
                tree_count: zoneData.treeCount || 0,
                area: zoneData.area || 0,
                is_active: zoneData.isActive !== false,
                notes: zoneData.notes || '',
                color: zoneData.color || '#00FF00',
                color_data: zoneData.colorData || null,
                last_inspection_date: zoneData.lastInspectionDate ? new Date(zoneData.lastInspectionDate._seconds * 1000).toISOString() : null,
                needs_attention: zoneData.needsAttention === true,
                alert_on_entry: zoneData.alertOnEntry === true,
                alert_on_exit: zoneData.alertOnExit === true,
                allowed_user_ids: zoneData.allowedUserIds || [],
                metadata: zoneData.metadata || {},
                version: zoneData.version || 1
              })
            }
          } catch (zoneErr: any) {
            console.error(`[Zones] ❌ Error migrating zone ${zoneDoc.id}: ${zoneErr.message}`)
          }
        }

        // Migrate Manual Entries
        console.log(`[ManualEntries] 📝 Fetching manual entries for farm: ${farmData.name}...`)
        const entrySnapshot = await db.collection('farms').doc(farmDoc.id).collection('manualEntries').get()
        for (const entryDoc of entrySnapshot.docs) {
          const entryData = entryDoc.data()
          const pbEntryId = toPbId(entryDoc.id)
          try {
            let entryExists = false
            try {
              await pb.collection('manual_entries').getOne(pbEntryId)
              entryExists = true
            } catch (e) {}

            if (!entryExists) {
              await pb.collection('manual_entries').create({
                id: pbEntryId,
                farm: pbFarmId,
                tree: entryData.treeId ? toPbId(entryData.treeId) : '',
                entry_date: entryData.entryDate ? new Date(entryData.entryDate._seconds * 1000).toISOString() : new Date().toISOString(),
                fruit_count: entryData.fruitCount || 0,
                health_rating: entryData.healthRating || 0,
                notes: entryData.notes || '',
                weather: entryData.weather || '',
                entry_type: entryData.entryType || 'daily'
              })
            }
          } catch (entryErr: any) {
            console.error(`[ManualEntries] ❌ Error migrating entry ${entryDoc.id}: ${entryErr.message}`)
          }
        }

        // Migrate Investments
        console.log(`[Investments] 💰 Fetching investments for farm: ${farmData.name}...`)
        const investSnapshot = await db.collection('farms').doc(farmDoc.id).collection('investments').get()
        for (const invDoc of investSnapshot.docs) {
          const invData = invDoc.data()
          const pbInvId = toPbId(invDoc.id)
          try {
            let invExists = false
            try {
              await pb.collection('investments').getOne(pbInvId)
              invExists = true
            } catch (e) {}

            if (!invExists) {
              await pb.collection('investments').create({
                id: pbInvId,
                farm: pbFarmId,
                created_by_user: invData.createdBy ? toPbId(invData.createdBy) : '',
                amount: invData.amount || 0,
                category: invData.category || 'Khác',
                subcategory: invData.subcategory || '',
                date: invData.date ? new Date(invData.date._seconds * 1000).toISOString() : new Date().toISOString(),
                notes: invData.notes || '',
                quantity: invData.quantity || 0,
                unit: invData.unit || '',
                price_per_unit: invData.pricePerUnit || 0,
                tree_count: invData.treeCount || 0,
                is_recurring: invData.isRecurring === true,
                recurring_period: invData.recurringPeriod || '',
                images: invData.images || []
              })
            }
          } catch (invErr: any) {
            console.error(`[Investments] ❌ Error migrating investment ${invDoc.id}: ${invErr.message}`)
          }
        }

        // Migrate Photos (metadata & download binaries from Firebase Storage)
        console.log(`[Photos] 📷 Fetching photos for farm: ${farmData.name}...`)
        const photoSnapshot = await db.collection('farms').doc(farmDoc.id).collection('photos').get()
        console.log(`[Photos] Found ${photoSnapshot.size} photos.`)

        for (const photoDoc of photoSnapshot.docs) {
          const photoData = photoDoc.data()
          const pbPhotoId = toPbId(photoDoc.id)
          const firebasePath = photoData.originalPath || photoData.storagePath || photoData.compressedPath

          try {
            let photoExists = false
            try {
              await pb.collection('photos').getOne(pbPhotoId)
              photoExists = true
            } catch (e) {}

            if (!photoExists && firebasePath) {
              console.log(`  [Photos] Downloading image file from storage: ${firebasePath}...`)
              
              // Define temp file path
              const tempDir = path.join(__dirname, '../temp')
              if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true })
              }
              const tempFilePath = path.join(tempDir, path.basename(firebasePath))

              try {
                // Download file
                await bucket.file(firebasePath).download({ destination: tempFilePath })
                console.log(`  [Photos] Downloaded to temp path: ${tempFilePath}`)

                // Upload to PocketBase using Multipart Form-Data
                const form = new FormData()
                form.append('id', pbPhotoId)
                form.append('farm', pbFarmId)
                form.append('tree', photoData.treeId ? toPbId(photoData.treeId) : '')
                form.append('photo_type', photoData.photoType || 'general')
                form.append('user_notes', photoData.userNotes || '')
                form.append('latitude', String(photoData.latitude || 0))
                form.append('longitude', String(photoData.longitude || 0))
                form.append('altitude', String(photoData.altitude || 0))
                form.append('timestamp', photoData.timestamp ? new Date(photoData.timestamp._seconds * 1000).toISOString() : new Date().toISOString())
                form.append('uploaded_to_server', 'true')
                form.append('server_processed', photoData.serverProcessed === true ? 'true' : 'false')
                form.append('needs_ai_analysis', photoData.needsAIAnalysis === true ? 'true' : 'false')
                form.append('manual_fruit_count', String(photoData.manualFruitCount || 0))
                form.append('season_year', String(photoData.seasonYear || 2025))
                
                // Append the binary file
                form.append('image_file', fs.createReadStream(tempFilePath), {
                  filename: path.basename(firebasePath)
                })

                // Send request using Axios
                const pbHeaders = pb.authStore.token ? { 'Authorization': `Bearer ${pb.authStore.token}` } : {}
                await axios.post(`${pbUrl}/api/collections/photos/records`, form, {
                  headers: {
                    ...form.getHeaders(),
                    ...pbHeaders
                  }
                })
                console.log(`  [Photos] ✅ Uploaded image file to PocketBase: ${pbPhotoId}`)

                // Clean up temp file
                fs.unlinkSync(tempFilePath)
              } catch (storageErr: any) {
                console.error(`  [Photos] ❌ Error downloading or uploading binary file: ${storageErr.message}`)
              }
            } else {
              console.log(`  [Photos] Photo record already exists or path is missing: ${pbPhotoId}`)
            }
          } catch (photoErr: any) {
            console.error(`[Photos] ❌ Error migrating photo ${photoDoc.id}: ${photoErr.message}`)
          }
        }

      } catch (farmErr: any) {
        console.error(`[Farms] ❌ Error migrating farm ${farmDoc.id}: ${farmErr.message}`)
      }
    }

    // 5. Migrate userAccess logs into user_farm_access
    console.log('[Access] 📋 Migrating user farm access lists...')
    const accessSnapshot = await db.collection('userFarmAccess').get()
    for (const doc of accessSnapshot.docs) {
      const data = doc.data()
      const pbAccessId = toPbId(doc.id)
      try {
        let exists = false
        try {
          await pb.collection('user_farm_access').getOne(pbAccessId)
          exists = true
        } catch (e) {}

        if (!exists && data.userId && data.farmId) {
          await pb.collection('user_farm_access').create({
            id: pbAccessId,
            user: toPbId(data.userId),
            farm: toPbId(data.farmId),
            role: data.role || 'viewer',
            permissions: data.permissions || ['read'],
            is_active: data.isActive !== false
          })
          console.log(`[Access] Migrated access: user ${data.userId} on farm ${data.farmId}`)
        }
      } catch (err: any) {
        console.error(`[Access] ❌ Error migrating access doc ${doc.id}: ${err.message}`)
      }
    }

    // Also check legacy farmAccess collection
    console.log('[Access] 📋 Migrating legacy simple farmAccess lists...')
    const legacyAccessSnapshot = await db.collection('farmAccess').get()
    for (const doc of legacyAccessSnapshot.docs) {
      const data = doc.data()
      const pbAccessId = toPbId(doc.id)
      try {
        let exists = false
        try {
          await pb.collection('user_farm_access').getOne(pbAccessId)
          exists = true
        } catch (e) {}

        if (!exists && data.userId && data.farmId) {
          await pb.collection('user_farm_access').create({
            id: pbAccessId,
            user: toPbId(data.userId),
            farm: toPbId(data.farmId),
            role: data.role || 'viewer',
            permissions: ['read', 'write', 'delete', 'manage_users', 'manage_settings'],
            is_active: data.isActive !== false
          })
          console.log(`[Access] Migrated legacy access: user ${data.userId} on farm ${data.farmId}`)
        }
      } catch (err: any) {
        // Ignore errors
      }
    }

    console.log('[Migration] 🎉 Migration completed successfully!')

  } catch (error: any) {
    console.error('[Migration] ❌ Critical failure during migration:', error)
    process.exit(1)
  }
}

// Execute migration
runMigration()
