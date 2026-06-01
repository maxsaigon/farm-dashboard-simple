# Configuration Credentials

Please place your Firebase Service Account private key file here:
- Filename: `firebase-sa.json`

This file is required to run the migration script:
```bash
npx tsx scripts/migrate_to_pocketbase.ts
```

This folder is ignored by git to protect your secrets.
