# Piano Layout Design

**Goal:** Add a "Piano" layout mode to the ear training quiz, showing a keyboard spanning C2-C5 as an alternative to the circle-based layouts.

**Tech Stack:** Svelte 5, TypeScript, Tailwind CSS, existing quiz infrastructure

---

## Interaction Model

- Piano is a 5th layout tab alongside Chromatic, 5ths, Augmented, Diminished
- User clicks a piano key to answer
- **Correctness is pitch-class only** (same as all other layouts) - clicking C2 or C3 both count as "C"
- During feedback, the **exact correct key** (specific octave) gets a green indicator
- If wrong, user's picked key gets a yellow indicator, correct key gets green
- Melody mode works the same: 3 notes, pitch class matching, feedback shows correct octaves

## Visual Design

### Key Labels
- Every piano key has a small **circle badge** near the bottom of the key
- Badge always shows the **note name**
- When the intervals toggle is on, badge also shows the **interval number**
- Default badge: subtle semi-transparent background with border
- Feedback states:
  - **Green fill** = correct answer
  - **Yellow fill** = user's wrong pick
  - Badges return to default after feedback clears

### Piano Styling
- Adapted from `filter_scales` Piano.svelte CSS approach
- White keys: flex layout, light background (dark mode aware)
- Black keys: absolutely positioned, dark background
- Range: C2 to C5 (3 octaves + 1 key)
- All keys are clickable regardless of enabled intervals (no dimming)

### Tonic Circle
- The center circle showing the current key name appears **above the piano**
- Same circle that appears in the center of the other layouts

## Layout

### Desktop (md+)
- When piano mode is active:
  - Piano spans **10 columns** (instead of circle's 6)
  - Tonic circle above the piano
  - Control buttons (Start, Replay, Note/Melody, Stats) move **below the piano** in a horizontal row
- When any circle mode is active: layout unchanged (buttons left, circle center)

### Mobile
- Piano stretches full width
- Buttons below (already their natural position on mobile)

## Implementation

### New Files
1. `src/lib/components/PianoLayout.svelte` - Piano keyboard with key labels and feedback

### Modified Files
1. `src/lib/music.ts` - Add `'piano'` to the `LayoutMode` type
2. `src/lib/components/NoteLayout.svelte` - Add piano tab, render PianoLayout when selected
3. `src/routes/+page.svelte` - Conditional grid layout for piano mode (10-col span, buttons below)

### PianoLayout.svelte Props
Same interface as other layout components:
- `tonic`, `notes`, `enabledSemitones`, `nameMode`, `showIntervals`, `accidentalMode`, `preset`
- `userPick`, `correctNote`, `cadenceNote`, `melodyDots`
- `showStats`, `stats`
- `onNoteClick` callback

### Key Generation
- Inline logic to generate keys for C2-C5 range
- Array of `{ note: NoteName, octave: number, midi: number, isBlack: boolean }` objects
- Black key positioning via percentage calculation (same approach as reference Piano.svelte)

### No Audio Changes
- Piano layout only affects the visual input
- Audio playback and answer checking remain unchanged
- `handleNoteClick` still receives just a `NoteName` (pitch class)
