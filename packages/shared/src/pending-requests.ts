import type { Firestore } from "firebase/firestore";
import { collection, onSnapshot, query, where } from "firebase/firestore";

/**
 * Watches the access requests still waiting for a decision and reports how many there are, leaving out the
 * viewer's own (an admin can have a leftover request from before they were promoted). Only an admin or a
 * superadmin may read these; the rules turn anyone else's subscription into an error passed to `onError`.
 */
export function subscribeToPendingRequests(db: Firestore, viewerUid: string, onCount: (count: number) => void, onError: (err: Error) => void): () => void {
  return onSnapshot(
    query(collection(db, "accessRequests"), where("status", "==", "pending")),
    (snapshot) => onCount(snapshot.docs.filter((d) => d.id !== viewerUid).length),
    (err) => onError(err),
  );
}
