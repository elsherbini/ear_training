# Weighted Note Selection with No-Repeat

## Problem

In single-note (interval) quiz mode, `pickRandomTarget` uses pure uniform random selection. This leads to two UX issues:

1. The same note+octave can repeat back-to-back, which feels broken
2. Some notes cluster while others are underrepresented, which feels unfair

## Design

### Algorithm

Given the enabled semitones and two octaves (2, 3):

1. Build all candidates: each enabled semitone × each octave → list of `{note, octave}` pairs
2. Remove the last-played `{note, octave}` from candidates (no back-to-back repeat)
3. For each remaining candidate, check if it appeared in the last 4 plays:
   - Not in recent history → weight = 2
   - In recent history → weight = 1
4. Weighted random pick from candidates

### History Tracking

- A simple array of the last 4 `{note, octave}` picks
- Stored as Svelte `$state` in `+page.svelte`
- Passed into `pickRandomTarget` as parameters
- Resets when quiz restarts or tonic/enabled semitones change

### Changes

**`src/lib/music.ts`** — Update `pickRandomTarget`:

```typescript
export function pickRandomTarget(
  tonic: NoteName,
  enabledSemitones: number[],
  lastPick?: { note: NoteName; octave: number },
  recentHistory?: { note: NoteName; octave: number }[],
): { note: NoteName; octave: number } {
  if (enabledSemitones.length === 0) {
    return { note: tonic, octave: 3 };
  }

  // Build all candidates
  const candidates: { note: NoteName; octave: number }[] = [];
  for (const semitone of enabledSemitones) {
    const note = noteFromInterval(tonic, semitone);
    candidates.push({ note, octave: 2 });
    candidates.push({ note, octave: 3 });
  }

  // Remove last pick (no back-to-back repeat)
  const filtered = lastPick
    ? candidates.filter(c => !(c.note === lastPick.note && c.octave === lastPick.octave))
    : candidates;

  // If filtering removed everything (1 semitone, 1 octave edge case), fall back
  const pool = filtered.length > 0 ? filtered : candidates;

  // Weight: 2 for notes not in recent history, 1 for notes in recent history
  const history = recentHistory ?? [];
  const weights = pool.map(c => {
    const inRecent = history.some(h => h.note === c.note && h.octave === c.octave);
    return inRecent ? 1 : 2;
  });

  // Weighted random selection
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * totalWeight;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}
```

**`src/routes/+page.svelte`** — Add history state and pass to `pickRandomTarget`:

- Add `let noteHistory: { note: NoteName; octave: number }[] = $state([]);`
- In `playNextNote()`, pass `noteHistory.at(-1)` as `lastPick` and `noteHistory` as `recentHistory`
- After picking, push to history and cap at 4 entries
- Reset `noteHistory = []` in `startQuiz()` and when tonic/enabledSemitones change

### Edge Cases

- **1 enabled semitone:** Only 2 candidates (octave 2 and 3). No back-to-back repeat of same octave, but alternation is acceptable.
- **0 enabled semitones:** Falls back to tonic at octave 3 (existing behavior).
- **All candidates in recent history:** Every candidate gets weight 1, so selection becomes uniform — graceful degradation.
