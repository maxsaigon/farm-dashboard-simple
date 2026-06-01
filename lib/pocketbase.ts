import PocketBase from 'pocketbase'

const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'https://farmbackend.buonme.com'
export const pb = new PocketBase(pbUrl)

// Optional: listen to auth store changes to sync or log
if (typeof window !== 'undefined') {
  // Can be used for debug logging or local storage sync
  pb.authStore.onChange((token, model) => {
    // console.log('[PocketBase] Auth state changed:', !!token, model?.id)
  })
}
