import { db } from './firebase'
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  onSnapshot, 
  QueryConstraint,
  CollectionReference,
  DocumentData,
  Query,
  Unsubscribe,
  FirestoreError
} from 'firebase/firestore'

/**
 * Safe wrapper for Firestore operations that handles assertion errors
 */
export class FirestoreSafe {
  private static isFirestoreReady(): boolean {
    try {
      return !!db && typeof db === 'object'
    } catch {
      return false
    }
  }

  private static async retryOperation<T>(
    operation: () => Promise<T>, 
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!this.isFirestoreReady()) {
          throw new Error('Firestore not ready')
        }
        
        return await operation()
      } catch (error: any) {
        lastError = error
        console.warn(`Firestore operation attempt ${attempt} failed:`, error?.message)
        
        // Don't retry on certain types of errors
        if (error?.code === 'permission-denied' || error?.code === 'not-found') {
          break
        }
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt))
        }
      }
    }
    
    throw lastError || new Error('Firestore operation failed after retries')
  }

  /**
   * Safe getDocs with retry logic
   */
  static async getDocs<T = DocumentData>(query: Query<T>): Promise<any[]> {
    try {
      return await this.retryOperation(async () => {
        const snapshot = await getDocs(query)
        return snapshot.docs
      })
    } catch (error) {
      console.error('SafeFirestore getDocs failed:', error)
      return []
    }
  }

  /**
   * Safe onSnapshot with error handling
   */
  static onSnapshot<T = DocumentData>(
    query: Query<T>,
    onNext: (docs: any[]) => void,
    onError?: (error: FirestoreError) => void
  ): Unsubscribe {
    try {
      if (!this.isFirestoreReady()) {
        console.error('Firestore not ready for onSnapshot')
        onNext([])
        return () => {}
      }

      return onSnapshot(query, 
        (snapshot) => {
          try {
            onNext(snapshot.docs)
          } catch (error) {
            console.error('Error in onSnapshot callback:', error)
            onNext([])
          }
        },
        (error) => {
          console.error('Firestore onSnapshot error:', error)
          if (onError) {
            onError(error)
          } else {
            onNext([])
          }
        }
      )
    } catch (error) {
      console.error('Error setting up onSnapshot:', error)
      onNext([])
      return () => {}
    }
  }

  /**
   * Safe query builder
   */
  static query<T = DocumentData>(
    collectionRef: CollectionReference<T>,
    ...constraints: QueryConstraint[]
  ): Query<T> | null {
    try {
      if (!this.isFirestoreReady()) {
        console.error('Firestore not ready for query')
        return null
      }
      return query(collectionRef, ...constraints)
    } catch (error) {
      console.error('Error building query:', error)
      return null
    }
  }

  /**
   * Safe collection reference
   */
  static collection(path: string): CollectionReference<DocumentData> | null {
    try {
      if (!this.isFirestoreReady()) {
        console.error('Firestore not ready for collection')
        return null
      }
      return collection(db, path)
    } catch (error) {
      console.error('Error getting collection reference:', error)
      return null
    }
  }
}

// Convenience exports for common operations (bound to preserve 'this' context)
export const safeGetDocs = FirestoreSafe.getDocs.bind(FirestoreSafe)
export const safeOnSnapshot = FirestoreSafe.onSnapshot.bind(FirestoreSafe)
export const safeQuery = FirestoreSafe.query.bind(FirestoreSafe)
export const safeCollection = FirestoreSafe.collection.bind(FirestoreSafe)
export { where, orderBy, limit } from 'firebase/firestore'