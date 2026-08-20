import { sequenceScope } from "./sequenceScope";

/**
 * The view state of this window: the "Visualize latest" switch and, while it
 * is off, the sequence being inspected. Kept in sessionStorage so that it
 * survives reloads and being unmounted by an embedding application, without
 * leaking into other windows.
 */
const STORAGE_KEY = "sequenceView";

// State belongs to the sequence that was requested, so a window opened for a
// different job starts from that job's defaults instead of restoring it.
const scopeKey = `${sequenceScope.jobId ?? ""}:${sequenceScope.datapoint ?? ""}`;

export function loadSequenceView() {
  try {
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    if (stored !== null && stored.scopeKey === scopeKey) {
      return stored;
    }
  } catch {
    console.warn(`Invalid entry in sessionStorage for '${STORAGE_KEY}'`);
  }
  return null;
}

export function saveSequenceView(visualizeLatest, sequence) {
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      scopeKey,
      visualizeLatest,
      // Only a sequence that is being inspected needs to be restored; while
      // live, the latest sequence is fetched on startup anyway.
      sequence: visualizeLatest ? null : sequence,
    }),
  );
}
