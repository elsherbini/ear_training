# Note Layouts Design

## Overview

Add three new note layouts alongside the existing circle of fifths, selectable via tabs above the visualization. All layouts share the same center tonic circle (with melody dots) and the same click/feedback/stats behavior.

## Layout Types

### 1. Circle of Fifths (existing)
- Arc segments, tonic at top, clockwise in fifths
- Rotates when tonic changes
- Outer interval ring + optional stats overlay

### 2. Chromatic Circle
- Identical arc-segment layout as circle of fifths
- Notes go clockwise in half-steps starting from the tonic (tonic at top)
- Rotates when tonic changes
- Outer interval ring + optional stats overlay

### 3. Augmented Compass
- 4 groups of 3 circular note buttons, arranged at compass points around center
- Top: aug off C (C, E, Ab) | Right: aug off Db (Db, F, A) | Bottom: aug off D (D, Gb, Bb) | Left: aug off Eb (Eb, G, B)
- Within each group, notes stacked vertically, ordered yellow/red/blue (by diminished group)
- Fixed positions regardless of tonic. Tonic indicated by thicker stroke (4px vs 2px)
- Interval labels inside each note button (below note name)

### 4. Diminished Groups
- 3 groups of 4 circular note buttons, each in compass formation (diamond shape)
- Groups form equilateral triangle pointing down:
  - Top-left: Ab dim7 — Ab(top), F(right), D(bottom), B(left)
  - Top-right: C dim7 — C(top), A(right), Gb(bottom), Eb(left)
  - Bottom: E dim7 — E(top), Db(right), Bb(bottom), G(left)
- Compass position within each group is determined by augmented membership (aug 0=top, 1=right, 2=bottom, 3=left)
- Fixed positions regardless of tonic. Tonic indicated by thicker stroke (4px vs 2px)
- Interval labels inside each note button (below note name)

## Data Model — Single Source of Truth

Each pitch class belongs to exactly one augmented triad and one diminished 7th. These two memberships determine everything:

**Augmented triads** (augGroup 0-3):
- 0: C, E, Ab
- 1: Db, F, A
- 2: D, Gb, Bb
- 3: Eb, G, B

**Diminished 7ths** (dimGroup 0-2):
- 0: C, Eb, Gb, A (yellow — rgb(215, 204, 59))
- 1: Db, E, G, Bb (red — rgb(216, 37, 84))
- 2: D, F, Ab, B (blue — rgb(77, 162, 210))

| Property | Determined by |
|----------|--------------|
| Note color | dimGroup (0=yellow, 1=red, 2=blue) |
| AugDim name consonant | augGroup (0=N, 1=J, 2=K, 3=P) |
| AugDim name vowel | dimGroup (0=e, 1=a, 2=o) |
| Augmented compass: which cluster | augGroup (0=top, 1=right, 2=bottom, 3=left) |
| Augmented compass: position in cluster | dimGroup (stacked vertically: yellow top, red mid, blue bottom) |
| Diminished groups: which group | dimGroup |
| Diminished groups: compass position | augGroup (0=top, 1=right, 2=bottom, 3=left) |

Add `augGroup` and `dimGroup` fields to `NoteInfo`:
```typescript
export interface NoteInfo {
  traditional: string;
  augDim: string;
  color: string;
  semitones: number;
  augGroup: number;  // 0-3
  dimGroup: number;  // 0-2
}
```

New type:
```typescript
export type LayoutMode = 'fifths' | 'chromatic' | 'augmented' | 'diminished';
```

New function:
```typescript
export function getChromaticCircle(tonic: NoteName): NoteName[] {
  const idx = CHROMATIC_NOTES.indexOf(tonic);
  return [...CHROMATIC_NOTES.slice(idx), ...CHROMATIC_NOTES.slice(0, idx)];
}
```

## Tab UI

Tabs placed directly above the visualization area (inside the same grid column):

```
[ 5ths | Chromatic | Augmented | Diminished ]
```

- Simple text tabs, underline on active
- Dark theme: gray-400 text, white active with underline
- Small font (~14px)

## Visual Spec — Circular Buttons (Augmented & Diminished)

- SVG viewBox: 0 0 400 400
- Note button: circle r=28
- Stroke: note's color, 2px normal / 4px for tonic
- Fill: same feedback logic (transparent default, green=correct, yellow=user pick, note color=cadence)
- Inside circle:
  - Note name: 14px bold, centered above midpoint
  - Interval label: 10px, below name (when showIntervals is true)
- Disabled: opacity 0.25, non-interactive
- Stats: tiny 8px text below interval when showStats is true

### Augmented Compass Positions (center 200,200)
- Top cluster center: (200, 80)
- Right cluster center: (320, 200)
- Bottom cluster center: (200, 320)
- Left cluster center: (80, 200)
- Within cluster: 3 notes stacked vertically, ~40px spacing

### Diminished Groups Positions
- Top-left group center: (130, 120)
- Top-right group center: (270, 120)
- Bottom group center: (200, 290)
- Within group: 4 notes in compass formation, ~50px radius from group center

### Center Tonic Circle (all layouts)
- Circle at (200, 200), r=50
- Tonic name 32px bold, gray-200 fill
- Melody indicator dots inside (3 dots at y=CY+18)

## Component Architecture

**Modify:**
1. `src/lib/music.ts` — Add LayoutMode, augGroup/dimGroup to NoteInfo, getChromaticCircle()
2. `src/lib/components/CircleOfFifths.svelte` → rename to `NoteCircle.svelte` (serves both fifths and chromatic)
3. `src/routes/+page.svelte` — Add layoutMode state, replace CircleOfFifths with NoteLayout

**Create:**
4. `src/lib/components/NoteLayout.svelte` — Wrapper with tabs + conditional rendering
5. `src/lib/components/AugmentedCompass.svelte` — 4-group compass layout
6. `src/lib/components/DiminishedGroups.svelte` — 3-group triangle layout

**No changes to:** drone.ts, quiz-audio.ts, stats.ts, TopBar.svelte

## Shared Behavior (all layouts)
- Center tonic circle with melody dots always present
- Click/keyboard interaction on note areas
- Green/yellow/note-color fill feedback
- Enabled/disabled opacity (0.25)
- Interval labels (outer ring for circles, inside button for grouped)
- Stats display
- Name mode switching (traditional / augdim)
