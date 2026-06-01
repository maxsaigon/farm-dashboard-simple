import PocketBase from 'pocketbase'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'https://farmbackend.buonme.com'
const pb = new PocketBase(pbUrl)

function withSystemFields(fields: any[]) {
  return [
    {
      name: 'id',
      type: 'text',
      primaryKey: true,
      required: true,
      system: true,
      autogeneratePattern: '[a-z0-9]{15}'
    },
    ...fields,
    {
      name: 'created',
      type: 'autodate',
      onCreate: true,
      system: true
    },
    {
      name: 'updated',
      type: 'autodate',
      onCreate: true,
      onUpdate: true,
      system: true
    }
  ]
}

async function run() {
  const pbAdminEmail = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@buonme.com'
  const pbAdminPassword = process.env.POCKETBASE_ADMIN_PASSWORD || 'BuonMeFarm2026!'

  console.log(`[PocketBase] Connecting to ${pbUrl}...`)
  try {
    await pb.collection('_superusers').authWithPassword(pbAdminEmail, pbAdminPassword)
    console.log('[PocketBase] ✅ Authenticated as superuser.')
  } catch (err: any) {
    console.error('[PocketBase] ❌ Failed to authenticate:', err.message)
    process.exit(1)
  }

  // 1. Create/Update custom fields on system 'users' collection
  try {
    console.log('[Schema] 👤 Checking "users" collection...')
    const usersColl = await pb.collections.getOne('users')
    
    // Add extra fields to users if missing
    const userFields = [
      { name: 'language', type: 'text' },
      { name: 'timezone', type: 'text' },
      { name: 'account_status', type: 'select', values: ['active', 'suspended', 'pending_verification'], maxSelect: 1 },
      { name: 'login_count', type: 'number' },
      { name: 'last_login_at', type: 'date' },
      { name: 'preferences', type: 'json' }
    ]

    let updated = false
    const existingFieldNames = new Set(usersColl.fields.map((f: any) => f.name))
    for (const field of userFields) {
      if (!existingFieldNames.has(field.name)) {
        (usersColl.fields as any[]).push(field)
        updated = true
        console.log(`[Schema] Adding field "${field.name}" to users`)
      }
    }

    if (updated) {
      await pb.collections.update(usersColl.id, usersColl)
      console.log('[Schema] ✅ "users" collection updated.')
    } else {
      console.log('[Schema] "users" collection is up to date.')
    }
  } catch (err: any) {
    console.error('[Schema] ❌ Error checking "users" collection:', err.message)
  }

  // Helper to create base collections
  async function createCollection(id: string, name: string, fields: any[]) {
    try {
      console.log(`[Schema] Checking collection "${name}"...`)
      try {
        const existing = await pb.collections.getOne(name)
        if (existing.id !== id) {
          console.log(`[Schema] Collection "${name}" exists with wrong ID ${existing.id}. Deleting it...`)
          await pb.collections.delete(existing.id)
        } else {
          console.log(`[Schema] Collection "${name}" already exists with correct ID.`)
          return
        }
      } catch (e) {
        // Doesn't exist
      }

      console.log(`[Schema] Creating collection "${name}" with ID "${id}"...`)
      await pb.collections.create({
        id,
        name,
        type: 'base',
        fields,
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
      })
      console.log(`[Schema] ✅ Collection "${name}" created successfully.`)
    } catch (err: any) {
      console.error(`[Schema] ❌ Error creating collection "${name}":`, err.message)
      if (err.response) {
        console.error('[Schema] Response details:', JSON.stringify(err.response, null, 2))
      }
    }
  }

  // 2. Collection: farms
  await createCollection('farms0000000000', 'farms', withSystemFields([
    { name: 'name', type: 'text', required: true },
    { name: 'owner_name', type: 'text' },
    { name: 'farm_type', type: 'select', values: ['personal', 'commercial', 'cooperative'], maxSelect: 1 },
    { name: 'status', type: 'select', values: ['active', 'inactive', 'archived'], maxSelect: 1 },
    { name: 'total_area', type: 'number' },
    { name: 'center_latitude', type: 'number' },
    { name: 'center_longitude', type: 'number' },
    { name: 'boundary_coordinates', type: 'json' },
    { name: 'is_active', type: 'bool' },
    { name: 'seasons', type: 'json' },
    { name: 'settings', type: 'json' },
    { name: 'current_season_year', type: 'number' }
  ]))

  // 3. Collection: trees
  await createCollection('trees0000000000', 'trees', withSystemFields([
    { name: 'farm', type: 'relation', required: true, collectionId: 'farms0000000000', maxSelect: 1, cascadeDelete: true },
    { name: 'name', type: 'text' },
    { name: 'qr_code', type: 'text' },
    { name: 'variety', type: 'text' },
    { name: 'zone_code', type: 'text' },
    { name: 'tree_status', type: 'text' },
    { name: 'health_status', type: 'select', values: ['Excellent', 'Good', 'Fair', 'Poor'], maxSelect: 1 },
    { name: 'notes', type: 'text' },
    { name: 'health_notes', type: 'text' },
    { name: 'disease_notes', type: 'text' },
    { name: 'latitude', type: 'number' },
    { name: 'longitude', type: 'number' },
    { name: 'gps_accuracy', type: 'number' },
    { name: 'planting_date', type: 'date' },
    { name: 'manual_fruit_count', type: 'number' },
    { name: 'ai_fruit_count', type: 'number' },
    { name: 'ai_accuracy', type: 'number' },
    { name: 'last_count_date', type: 'date' },
    { name: 'last_ai_analysis_date', type: 'date' },
    { name: 'tree_height', type: 'number' },
    { name: 'trunk_diameter', type: 'number' },
    { name: 'fertilized_date', type: 'date' },
    { name: 'pruned_date', type: 'date' },
    { name: 'needs_attention', type: 'bool' },
    { name: 'seasonal_stats', type: 'json' },
    { name: 'custom_fields', type: 'json' }
  ]))

  // 4. Collection: zones
  await createCollection('zones0000000000', 'zones', withSystemFields([
    { name: 'farm', type: 'relation', required: true, collectionId: 'farms0000000000', maxSelect: 1, cascadeDelete: true },
    { name: 'name', type: 'text', required: true },
    { name: 'code', type: 'text' },
    { name: 'description', type: 'text' },
    { name: 'boundaries', type: 'json' },
    { name: 'tree_count', type: 'number' },
    { name: 'area', type: 'number' },
    { name: 'is_active', type: 'bool' },
    { name: 'notes', type: 'text' },
    { name: 'color', type: 'text' },
    { name: 'color_data', type: 'json' },
    { name: 'last_inspection_date', type: 'date' },
    { name: 'needs_attention', type: 'bool' },
    { name: 'alert_on_entry', type: 'bool' },
    { name: 'alert_on_exit', type: 'bool' },
    { name: 'allowed_user_ids', type: 'json' },
    { name: 'metadata', type: 'json' },
    { name: 'version', type: 'number' }
  ]))

  // 5. Collection: manual_entries
  await createCollection('manuale00000000', 'manual_entries', withSystemFields([
    { name: 'farm', type: 'relation', required: true, collectionId: 'farms0000000000', maxSelect: 1, cascadeDelete: true },
    { name: 'tree', type: 'relation', collectionId: 'trees0000000000', maxSelect: 1, cascadeDelete: true },
    { name: 'entry_date', type: 'date', required: true },
    { name: 'fruit_count', type: 'number' },
    { name: 'health_rating', type: 'number' },
    { name: 'notes', type: 'text' },
    { name: 'weather', type: 'text' },
    { name: 'entry_type', type: 'select', values: ['daily', 'weekly', 'monthly'], maxSelect: 1 }
  ]))

  // 6. Collection: compliance_rules
  await createCollection('complia00000000', 'compliance_rules', withSystemFields([
    { name: 'name', type: 'text', required: true },
    { name: 'description', type: 'text' },
    { name: 'category', type: 'text' },
    { name: 'status', type: 'select', values: ['compliant', 'warning', 'violation'], maxSelect: 1 },
    { name: 'last_checked', type: 'date' },
    { name: 'next_check', type: 'date' },
    { name: 'requirements', type: 'json' },
    { name: 'violations', type: 'json' }
  ]))

  // 7. Collection: investments
  await createCollection('investm00000000', 'investments', withSystemFields([
    { name: 'farm', type: 'relation', required: true, collectionId: 'farms0000000000', maxSelect: 1, cascadeDelete: true },
    { name: 'created_by_user', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
    { name: 'amount', type: 'number', required: true },
    { name: 'category', type: 'text' },
    { name: 'subcategory', type: 'text' },
    { name: 'date', type: 'date', required: true },
    { name: 'notes', type: 'text' },
    { name: 'quantity', type: 'number' },
    { name: 'unit', type: 'text' },
    { name: 'price_per_unit', type: 'number' },
    { name: 'tree_count', type: 'number' },
    { name: 'is_recurring', type: 'bool' },
    { name: 'recurring_period', type: 'text' },
    { name: 'images', type: 'file', maxSelect: 10 }
  ]))

  // 8. Collection: photos
  await createCollection('photos000000000', 'photos', withSystemFields([
    { name: 'farm', type: 'relation', required: true, collectionId: 'farms0000000000', maxSelect: 1, cascadeDelete: true },
    { name: 'tree', type: 'relation', collectionId: 'trees0000000000', maxSelect: 1, cascadeDelete: true },
    { name: 'image_file', type: 'file', required: true, maxSelect: 1 },
    { name: 'photo_type', type: 'select', values: ['general', 'health', 'fruit_count'], maxSelect: 1 },
    { name: 'user_notes', type: 'text' },
    { name: 'latitude', type: 'number' },
    { name: 'longitude', type: 'number' },
    { name: 'altitude', type: 'number' },
    { name: 'timestamp', type: 'date', required: true },
    { name: 'original_path', type: 'text' },
    { name: 'compressed_path', type: 'text' },
    { name: 'thumbnail_path', type: 'text' },
    { name: 'ai_ready_path', type: 'text' },
    { name: 'total_local_size', type: 'number' },
    { name: 'uploaded_to_server', type: 'bool' },
    { name: 'server_processed', type: 'bool' },
    { name: 'needs_ai_analysis', type: 'bool' },
    { name: 'manual_fruit_count', type: 'number' },
    { name: 'farm_name', type: 'text' },
    { name: 'season_year', type: 'number' }
  ]))

  // 9. Collection: user_farm_access
  await createCollection('userfar00000000', 'user_farm_access', withSystemFields([
    { name: 'user', type: 'relation', required: true, collectionId: '_pb_users_auth_', maxSelect: 1, cascadeDelete: true },
    { name: 'farm', type: 'relation', required: true, collectionId: 'farms0000000000', maxSelect: 1, cascadeDelete: true },
    { name: 'role', type: 'select', values: ['owner', 'manager', 'viewer'], maxSelect: 1 },
    { name: 'permissions', type: 'json' },
    { name: 'is_active', type: 'bool' }
  ]))

  // 10. Collection: activity_logs
  await createCollection('activit00000000', 'activity_logs', withSystemFields([
    { name: 'user', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
    { name: 'user_email', type: 'text' },
    { name: 'farm', type: 'relation', collectionId: 'farms0000000000', maxSelect: 1 },
    { name: 'action', type: 'text', required: true },
    { name: 'resource', type: 'text' },
    { name: 'resource_id', type: 'text' },
    { name: 'details', type: 'json' },
    { name: 'status', type: 'select', values: ['success', 'failure'], maxSelect: 1 },
    { name: 'severity', type: 'select', values: ['low', 'medium', 'high', 'critical'], maxSelect: 1 },
    { name: 'category', type: 'select', values: ['authentication', 'data_modification', 'system_access'], maxSelect: 1 },
    { name: 'ip_address', type: 'text' },
    { name: 'user_agent', type: 'text' },
    { name: 'error_message', type: 'text' }
  ]))

  console.log('[Schema] 🎉 All collections processed successfully.')
}

run()
