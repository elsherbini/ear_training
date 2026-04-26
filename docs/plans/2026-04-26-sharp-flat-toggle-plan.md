# Sharp/Flat Toggle Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Display traditional note names as sharps or flats based on the current key and scale, using tonal.js for correct enharmonic spellings.

**Architecture:** Add a `getTraditionalDisplayName()` function in `music.ts` that uses tonal.js `Scale.degrees()` to compute correct note spellings per-key. Add `accidentalMode` state to the page. Auto-guess the mode on tonic/preset changes. All components call the new display function instead of returning the raw `NoteName`.

**Tech Stack:** TypeScript, Svelte 5, tonal.js (`Scale.degrees`, `Note.enharmonic`), Vitest

---

### Task 1: Install tonal.js

**Step 1: Add the dependency**

Run: `npm install tonal`

**Step 2: Verify it imports**

Run: `node -e "const { Scale } = require('tonal'); console.log(Scale.degrees('G major')(1))"`
Expected: `G`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add tonal.js dependency"
```

---

### Task 2: Write tests for display name functions

**Files:**
- Modify: `src/lib/music.test.ts`

**Step 1: Write the failing tests**

Add to the end of `src/lib/music.test.ts`:

```typescript
import { getAccidentalMode, getTraditionalDisplayName, type AccidentalMode } from './music';

describe('getAccidentalMode', () => {
	it('returns flat for C major (no accidentals)', () => {
		expect(getAccidentalMode('C', 'Major')).toBe('flat');
	});

	it('returns sharp for G major', () => {
		expect(getAccidentalMode('G', 'Major')).toBe('sharp');
	});

	it('returns sharp for D major', () => {
		expect(getAccidentalMode('D', 'Major')).toBe('sharp');
	});

	it('returns flat for F major', () => {
		expect(getAccidentalMode('F', 'Major')).toBe('flat');
	});

	it('returns flat for Bb major', () => {
		expect(getAccidentalMode('Bb', 'Major')).toBe('flat');
	});

	it('returns flat for A minor (no accidentals = flat)', () => {
		expect(getAccidentalMode('A', 'Natural Minor')).toBe('flat');
	});

	it('returns sharp for E minor', () => {
		expect(getAccidentalMode('E', 'Natural Minor')).toBe('sharp');
	});

	it('returns flat for D minor', () => {
		expect(getAccidentalMode('D', 'Natural Minor')).toBe('flat');
	});

	it('returns flat for Chromatic preset (falls back to major)', () => {
		expect(getAccidentalMode('Bb', 'Chromatic')).toBe('flat');
	});

	it('returns sharp for Chromatic with sharp tonic', () => {
		expect(getAccidentalMode('G', 'Chromatic')).toBe('sharp');
	});

	it('returns sharp for Harmonic Minor with sharp natural minor', () => {
		expect(getAccidentalMode('E', 'Harmonic Minor')).toBe('sharp');
	});

	it('returns flat for Melodic Minor with flat natural minor', () => {
		expect(getAccidentalMode('D', 'Melodic Minor')).toBe('flat');
	});
});

describe('getTraditionalDisplayName', () => {
	it('returns natural note names unchanged', () => {
		expect(getTraditionalDisplayName(0, 'C', 'Major', 'flat')).toBe('C');
		expect(getTraditionalDisplayName(2, 'C', 'Major', 'flat')).toBe('D');
	});

	it('returns flat names in flat mode for C major chromatic notes', () => {
		expect(getTraditionalDisplayName(1, 'C', 'Major', 'flat')).toBe('Db');
		expect(getTraditionalDisplayName(3, 'C', 'Major', 'flat')).toBe('Eb');
		expect(getTraditionalDisplayName(6, 'C', 'Major', 'flat')).toBe('Gb');
	});

	it('returns sharp names for diatonic notes in G major', () => {
		// F# is the 7th degree of G major
		expect(getTraditionalDisplayName(6, 'G', 'Major', 'sharp')).toBe('F#');
	});

	it('returns sharp names for chromatic notes in a sharp key', () => {
		// In G major (sharp key), chromatic note at semitone 1 from G = Ab/G#
		// semitone 1 absolute = Db, but semitone 1 from G = 7+1=8 = Ab
		// Actually: getTraditionalDisplayName takes absolute semitone (0-11)
		// Ab (semitone 8) in G major sharp mode → G#
		expect(getTraditionalDisplayName(8, 'G', 'Major', 'sharp')).toBe('G#');
	});

	it('returns correct diatonic names for Gb major', () => {
		// Gb major: Gb Ab Bb Cb Db Eb F
		expect(getTraditionalDisplayName(6, 'Gb', 'Major', 'flat')).toBe('Gb');
		expect(getTraditionalDisplayName(11, 'Gb', 'Major', 'flat')).toBe('Cb');
		expect(getTraditionalDisplayName(5, 'Gb', 'Major', 'flat')).toBe('F');
	});

	it('handles G harmonic minor: diatonic F# in a flat key', () => {
		// G harmonic minor: G A Bb C D Eb F#
		// Key bias from G natural minor = flat (Bb, Eb)
		// But diatonic 7th degree is F# from tonal.js
		expect(getTraditionalDisplayName(6, 'G', 'Harmonic Minor', 'flat')).toBe('F#');
	});

	it('chromatic notes in G harmonic minor follow flat bias', () => {
		// G harmonic minor is a flat key (natural minor has Bb, Eb)
		// Chromatic note Ab (semitone 8) should stay Ab, not G#
		expect(getTraditionalDisplayName(8, 'G', 'Harmonic Minor', 'flat')).toBe('Ab');
	});

	it('returns all 12 names for Chromatic preset in flat mode', () => {
		const names = Array.from({ length: 12 }, (_, i) =>
			getTraditionalDisplayName(i, 'C', 'Chromatic', 'flat'),
		);
		expect(names).toEqual(['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']);
	});

	it('returns all 12 names for Chromatic preset in sharp mode', () => {
		const names = Array.from({ length: 12 }, (_, i) =>
			getTraditionalDisplayName(i, 'C', 'Chromatic', 'sharp'),
		);
		expect(names).toEqual(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']);
	});
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/music.test.ts`
Expected: FAIL — `getAccidentalMode` and `getTraditionalDisplayName` don't exist yet.

**Step 3: Commit**

```bash
git add src/lib/music.test.ts
git commit -m "test: add tests for sharp/flat display name functions"
```

---

### Task 3: Implement getAccidentalMode and getTraditionalDisplayName

**Files:**
- Modify: `src/lib/music.ts`

**Step 1: Add the imports and types at the top of `music.ts`**

After the existing imports (line 1), add:

```typescript
import { Scale, Note } from 'tonal';
```

After the `LayoutMode` type (line 57), add:

```typescript
export type AccidentalMode = 'sharp' | 'flat';
```

**Step 2: Add the preset-to-tonal-scale mapping and helper functions**

Add at the end of `music.ts` (after `getCadenceNotes`):

```typescript
/** Map our preset names to tonal.js scale names */
function toTonalScale(preset: string): string | null {
	switch (preset) {
		case 'Major': return 'major';
		case 'Natural Minor': return 'minor';
		case 'Harmonic Minor': return 'harmonic minor';
		case 'Melodic Minor': return 'melodic minor';
		default: return null;
	}
}

/** Determine whether a preset is minor-family (uses natural minor for bias) */
function isMinorPreset(preset: string): boolean {
	return ['Natural Minor', 'Harmonic Minor', 'Melodic Minor'].includes(preset);
}

/**
 * Auto-guess sharp or flat mode for a given tonic and preset.
 * Uses the natural scale (major or natural minor) to check for sharps.
 * No accidentals (C major, A minor) → flat.
 */
export function getAccidentalMode(tonic: NoteName, preset: string): AccidentalMode {
	const biasScale = isMinorPreset(preset) ? 'minor' : 'major';
	const tonicName = Note.enharmonic(tonic) || tonic;
	const degrees = Scale.degrees(`${tonicName} ${biasScale}`);
	for (let i = 1; i <= 7; i++) {
		const note = degrees(i);
		if (note.includes('#')) return 'sharp';
	}
	return 'flat';
}

/** All 12 pitch classes spelled as sharps */
const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
/** All 12 pitch classes spelled as flats */
const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/**
 * Get the display name for a semitone (0-11) in traditional mode.
 *
 * For diatonic presets: diatonic notes come from tonal.js Scale.degrees(),
 * chromatic notes follow the accidental mode bias.
 *
 * For Chromatic/Custom: all 12 notes follow the accidental mode.
 */
export function getTraditionalDisplayName(
	semitone: number,
	tonic: NoteName,
	preset: string,
	accidentalMode: AccidentalMode,
): string {
	const tonalScale = toTonalScale(preset);

	if (tonalScale) {
		// Build a map of semitone → display name from the scale
		const tonicName = Note.enharmonic(tonic) || tonic;
		const degrees = Scale.degrees(`${tonicName} ${tonalScale}`);
		const diatonicMap = new Map<number, string>();
		for (let i = 1; i <= 7; i++) {
			const noteName = degrees(i);
			if (noteName) {
				const chroma = Note.chroma(noteName);
				if (chroma !== undefined && chroma !== null) {
					diatonicMap.set(chroma, noteName);
				}
			}
		}

		// If this semitone is diatonic, use the scale's spelling
		const diatonic = diatonicMap.get(semitone);
		if (diatonic) return diatonic;
	}

	// Chromatic fallback: use sharp or flat spelling
	return accidentalMode === 'sharp' ? SHARP_NOTES[semitone] : FLAT_NOTES[semitone];
}
```

**Step 3: Run tests to verify they pass**

Run: `npx vitest run src/lib/music.test.ts`
Expected: All tests pass.

**Step 4: Commit**

```bash
git add src/lib/music.ts
git commit -m "feat: add getAccidentalMode and getTraditionalDisplayName using tonal.js"
```

---

### Task 4: Add accidentalMode state and auto-guess to +page.svelte

**Files:**
- Modify: `src/routes/+page.svelte`

**Step 1: Add imports**

In the imports from `$lib/music` (line 7), add `getAccidentalMode` and `type AccidentalMode`:

```typescript
import {
	type NoteName,
	type MelodyNote,
	type LayoutMode,
	type AccidentalMode,
	PRESETS,
	getCircleForTonic,
	getChromaticCircle,
	pickRandomTarget,
	generateMelody,
	getCadenceNotes,
	intervalBetween,
	matchPreset,
	getAccidentalMode,
} from '$lib/music';
```

**Step 2: Add accidentalMode state**

After `let showStats = $state(false);` (line 35), add:

```typescript
let accidentalMode: AccidentalMode = $state(getAccidentalMode('C', 'Major'));
```

**Step 3: Add auto-guess to handleTonicChange**

In `handleTonicChange` (around line 238), after `tonic = newTonic;` add:

```typescript
accidentalMode = getAccidentalMode(newTonic, preset);
```

**Step 4: Add auto-guess to handlePresetChange**

Replace the existing `handlePresetChange` function:

```typescript
function handlePresetChange(newPreset: string) {
	preset = newPreset;
	accidentalMode = getAccidentalMode(tonic, newPreset);
}
```

**Step 5: Add accidentalMode toggle handler**

After `handleNameModeChange`:

```typescript
function handleAccidentalModeChange(mode: AccidentalMode) {
	accidentalMode = mode;
}
```

**Step 6: Pass accidentalMode to TopBar and NoteLayout**

In both TopBar usages, add:

```
{accidentalMode}
onAccidentalModeChange={handleAccidentalModeChange}
```

In both NoteLayout usages, add:

```
{accidentalMode}
{preset}
```

**Step 7: Verify the app builds**

Run: `npx vite build`
Expected: Build will fail because TopBar and NoteLayout don't accept these props yet. That's expected — we wire them up in the next tasks.

**Step 8: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: add accidentalMode state with auto-guess on key/preset change"
```

---

### Task 5: Update TopBar with sharp/flat toggle and tonic re-spelling

**Files:**
- Modify: `src/lib/components/TopBar.svelte`

**Step 1: Update Props interface**

Replace the Props interface:

```typescript
import { CHROMATIC_NOTES, NOTES, PRESETS, INTERVAL_LABELS, matchPreset, getTraditionalDisplayName, type NoteName, type AccidentalMode } from '$lib/music';

interface Props {
	tonic: NoteName;
	preset: string;
	enabledSemitones: number[];
	nameMode: 'traditional' | 'augdim';
	accidentalMode: AccidentalMode;
	showIntervals: boolean;
	onTonicChange: (tonic: NoteName) => void;
	onPresetChange: (preset: string) => void;
	onSemitonesChange: (semitones: number[]) => void;
	onNameModeChange: (mode: 'traditional' | 'augdim') => void;
	onAccidentalModeChange: (mode: AccidentalMode) => void;
	onShowIntervalsChange: (show: boolean) => void;
}
```

**Step 2: Update destructuring**

```typescript
let {
	tonic,
	preset,
	enabledSemitones,
	nameMode,
	accidentalMode,
	showIntervals,
	onTonicChange,
	onPresetChange,
	onSemitonesChange,
	onNameModeChange,
	onAccidentalModeChange,
	onShowIntervalsChange,
}: Props = $props();
```

**Step 3: Update getDisplayName to use new function**

Replace the `getDisplayName` function:

```typescript
function getDisplayName(note: NoteName): string {
	if (nameMode === 'augdim') return NOTES[note].augDim;
	return getTraditionalDisplayName(NOTES[note].semitones, tonic, preset, accidentalMode);
}
```

**Step 4: Update the name mode toggle buttons**

Replace the entire `<!-- Name mode toggle -->` section (lines 99-117):

```svelte
<!-- Name mode toggle -->
<div class="flex items-center gap-1 text-xs">
	<button
		onclick={() => {
			if (nameMode === 'traditional') {
				onAccidentalModeChange(accidentalMode === 'sharp' ? 'flat' : 'sharp');
			} else {
				onNameModeChange('traditional');
			}
		}}
		class="px-2 py-1 rounded {nameMode === 'traditional'
			? 'bg-blue-600 font-bold'
			: 'bg-gray-800 text-gray-400 hover:bg-gray-700'}"
	>
		Traditional {nameMode === 'traditional' ? (accidentalMode === 'sharp' ? '♯' : '♭') : ''}
	</button>
	<button
		onclick={() => onNameModeChange('augdim')}
		class="px-2 py-1 rounded {nameMode === 'augdim'
			? 'bg-blue-600 font-bold'
			: 'bg-gray-800 text-gray-400 hover:bg-gray-700'}"
	>
		Aug Dim
	</button>
</div>
```

**Step 5: Verify the app builds**

Run: `npx vite build`
Expected: May still fail if NoteLayout props aren't wired. Continue to next task.

**Step 6: Commit**

```bash
git add src/lib/components/TopBar.svelte
git commit -m "feat: update TopBar with sharp/flat cycling toggle and re-spelled tonic buttons"
```

---

### Task 6: Update NoteLayout and child components

**Files:**
- Modify: `src/lib/components/NoteLayout.svelte`
- Modify: `src/lib/components/NoteCircle.svelte`
- Modify: `src/lib/components/AugmentedCompass.svelte`
- Modify: `src/lib/components/DiminishedGroups.svelte`

**Step 1: Update NoteLayout.svelte Props**

Add to the Props interface:

```typescript
accidentalMode: AccidentalMode;
preset: string;
```

Add the import:

```typescript
import type { NoteName, LayoutMode, AccidentalMode } from '$lib/music';
```

Add to the destructuring:

```typescript
accidentalMode,
preset,
```

Pass to all three child components:

```
{accidentalMode}
{preset}
```

**Step 2: Update NoteCircle.svelte**

Add `AccidentalMode` to the type import and `getTraditionalDisplayName` to the function import. Add `accidentalMode: AccidentalMode` and `preset: string` to Props. Add them to destructuring. Update `getDisplayName`:

```typescript
function getDisplayName(note: NoteName): string {
	if (nameMode === 'augdim') return NOTES[note].augDim;
	return getTraditionalDisplayName(NOTES[note].semitones, tonic, preset, accidentalMode);
}
```

**Step 3: Update AugmentedCompass.svelte**

Same changes as NoteCircle: add `accidentalMode` and `preset` to Props, update `getDisplayName` to use `getTraditionalDisplayName`.

**Step 4: Update DiminishedGroups.svelte**

Same changes as NoteCircle: add `accidentalMode` and `preset` to Props, update `getDisplayName` to use `getTraditionalDisplayName`.

**Step 5: Verify the app builds**

Run: `npx vite build`
Expected: Build succeeds with no type errors.

**Step 6: Run all tests**

Run: `npx vitest run`
Expected: All tests pass.

**Step 7: Commit**

```bash
git add src/lib/components/NoteLayout.svelte src/lib/components/NoteCircle.svelte src/lib/components/AugmentedCompass.svelte src/lib/components/DiminishedGroups.svelte
git commit -m "feat: wire up sharp/flat display names in all layout components"
```

---

### Task 7: Wire up remaining +page.svelte prop passing

**Files:**
- Modify: `src/routes/+page.svelte`

This task ensures both `NoteLayout` and `TopBar` instances in `+page.svelte` pass the new props correctly.

**Step 1: Update both TopBar usages**

The TopBar (line 302) should include:

```svelte
{accidentalMode}
onAccidentalModeChange={handleAccidentalModeChange}
```

**Step 2: Update both NoteLayout usages**

Both NoteLayout instances (lines 366 and 389) should include:

```svelte
{accidentalMode}
{preset}
```

**Step 3: Verify build**

Run: `npx vite build`
Expected: Build succeeds.

**Step 4: Run all tests**

Run: `npx vitest run`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: pass accidentalMode and preset props through to all components"
```

---

### Task 8: Manual verification and final cleanup

**Step 1: Start the dev server**

Run: `npm run dev`

**Step 2: Manual testing checklist**

Verify in browser:
- [ ] C Major shows flat note names (Db, Eb, Gb, Ab, Bb)
- [ ] Switch to G Major → note names change to sharps (C#, D#, F#, G#, A#)
- [ ] Tonic buttons re-spell to match (F# instead of Gb, etc.)
- [ ] Click "Traditional ♯" to cycle → shows "Traditional ♭", names switch
- [ ] Switch to "Aug Dim" → aug-dim names shown. Switch back → sharp/flat preserved
- [ ] G Harmonic Minor → F# shown for 7th degree, but chromatic notes use flats
- [ ] Gb Major → shows Cb for 4th degree
- [ ] Chromatic preset → all 12 notes follow sharp/flat bias
- [ ] Switching tonic resets the sharp/flat auto-guess
- [ ] All four layout modes (chromatic, 5ths, augmented, diminished) show correct names

**Step 3: Run final test suite**

Run: `npx vitest run`
Expected: All tests pass.

**Step 4: Type check**

Run: `npx svelte-kit sync && npx svelte-check --tsconfig ./tsconfig.json`
Expected: No errors.
