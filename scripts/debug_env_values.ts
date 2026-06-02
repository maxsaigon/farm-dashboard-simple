import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

console.log('POCKETBASE_ADMIN_EMAIL:', process.env.POCKETBASE_ADMIN_EMAIL);
console.log('POCKETBASE_ADMIN_PASSWORD:', process.env.POCKETBASE_ADMIN_PASSWORD);
console.log('NEXT_PUBLIC_POCKETBASE_URL:', process.env.NEXT_PUBLIC_POCKETBASE_URL);
