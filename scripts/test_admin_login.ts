import PocketBase from 'pocketbase';

const pbUrl = 'https://farmbackend.buonme.com';
const email = 'admin@buonme.com';
const password = 'BuonMeFarm2026!';

async function main() {
  console.log(`Testing admin login to ${pbUrl} for email: ${email}...`);
  
  // 1. Try SDK pb.admins.authWithPassword (legacy)
  try {
    const pb = new PocketBase(pbUrl);
    const authData = await pb.admins.authWithPassword(email, password);
    console.log('✅ SDK pb.admins.authWithPassword: SUCCESS');
    console.log('   Admin ID:', authData.admin.id);
  } catch (err: any) {
    console.log('❌ SDK pb.admins.authWithPassword: FAILED', err.message);
  }

  // 2. Try SDK pb.collection('_superusers').authWithPassword (PocketBase v0.22+)
  try {
    const pb = new PocketBase(pbUrl);
    const authData = await pb.collection('_superusers').authWithPassword(email, password);
    console.log('✅ SDK pb.collection("_superusers").authWithPassword: SUCCESS');
    console.log('   Superuser ID:', authData.record.id);
  } catch (err: any) {
    console.log('❌ SDK pb.collection("_superusers").authWithPassword: FAILED', err.message);
  }

  // 3. Try raw API endpoint POST /api/admins/auth-with-password
  try {
    const res = await fetch(`${pbUrl}/api/admins/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: email, password: password })
    });
    if (res.ok) {
      console.log('✅ Direct API /api/admins/auth-with-password: SUCCESS');
    } else {
      const data = await res.json();
      console.log('❌ Direct API /api/admins/auth-with-password: FAILED', JSON.stringify(data));
    }
  } catch (err: any) {
    console.log('❌ Direct API /api/admins/auth-with-password: FAILED', err.message);
  }

  // 4. Try raw API endpoint POST /api/collections/_superusers/auth-with-password
  try {
    const res = await fetch(`${pbUrl}/api/collections/_superusers/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: email, password: password })
    });
    if (res.ok) {
      console.log('✅ Direct API /api/collections/_superusers/auth-with-password: SUCCESS');
    } else {
      const data = await res.json();
      console.log('❌ Direct API /api/collections/_superusers/auth-with-password: FAILED', JSON.stringify(data));
    }
  } catch (err: any) {
    console.log('❌ Direct API /api/collections/_superusers/auth-with-password: FAILED', err.message);
  }
}

main();
