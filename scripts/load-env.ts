import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables in order of priority
dotenv.config({ path: path.resolve(process.cwd(), '.env.development.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

console.log('◇ Environment variables loaded from .env files')
