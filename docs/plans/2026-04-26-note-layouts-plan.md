# Note Layouts Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add three new note visualization layouts (chromatic circle, augmented compass, diminished groups) alongside the existing circle of fifths, selectable via tabs.

**Architecture:** Add `augGroup`/`dimGroup` fields to the existing `NoteInfo` data model as the single source of truth for layout positioning. Create separate SVG components for each layout type, wrapped by a `NoteLayout.svelte` that handles tab switching. The circle-based layouts (fifths, chromatic) reuse the existing arc-segment renderer. The grouped layouts (augmented, diminished) use circular SVG buttons.

**Tech Stack:** Svelte 5 (runes), TypeScript, Tailwind CSS 4, SVG, Vitest

---

### Task 1: Add augGroup/dimGroup to music.ts data model

**Files:**
- Modify: `src/lib/music.ts:11-31`
- Modify: `src/lib/music.test.ts`

**Step 1: Write the failing tests**

Add these tests to `src/lib/music.test.ts` inside the existing `describe('constants', ...)` block, after the augmented groups test (line 82):

```typescript
it('assigns correct augGroup values', () => {
	// Aug 0: C, E, Ab
	expect(NOTES['C'].augGroup).toBe(0);
	expect(NOTES['E'].augGroup).toBe(0);
	expect(NOTES['Ab'].augGroup).toBe(0);
	// Aug 1: Db, F, A
	expect(NOTES['Db'].augGroup).toBe(1);
	expect(NOTES['F'].augGroup).toBe(1);
	expect(NOTES['A'].augGroup).toBe(1);
	// Aug 2: D, Gb, Bb
	expect(NOTES['D'].augGroup).toBe(2);
	expect(NOTES['Gb'].augGroup).toBe(2);
	expect(NOTES['Bb'].augGroup).toBe(2);
	// Aug 3: Eb, G, B
	expect(NOTES['Eb'].augGroup).toBe(3);
	expect(NOTES['G'].augGroup).toBe(3);
	expect(NOTES['B'].augGroup).toBe(3);
});

it('assigns correct dimGroup values', () => {
	// Dim 0 (yellow): C, Eb, Gb, A
	expect(NOTES['C'].dimGroup).toBe(0);
	expect(NOTES['Eb'].dimGroup).toBe(0);
	expect(NOTES['Gb'].dimGroup).toBe(0);
	expect(NOTES['A'].dimGroup).toBe(0);
	// Dim 1 (red): Db, E, G, Bb
	expect(NOTES['Db'].dimGroup).toBe(1);
	expect(NOTES['E'].dimGroup).toBe(1);
	expect(NOTES['G'].dimGroup).toBe(1);
	expect(NOTES['Bb'].dimGroup).toBe(1);
	// Dim 2 (blue): D, F, Ab, B
	expect(NOTES['D'].dimGroup).toBe(2);
	expect(NOTES['F'].dimGroup).toBe(2);
	expect(NOTES['Ab'].dimGroup).toBe(2);
	expect(NOTES['B'].dimGroup).toBe(2);
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest --run src/lib/music.test.ts`
Expected: FAIL — `augGroup` and `dimGroup` are undefined on NoteInfo

**Step 3: Add augGroup and dimGroup to NoteInfo and NOTES**

In `src/lib/music.ts`, update the `NoteInfo` interface (lines 11-16) to:

```typescript
export interface NoteInfo {
	traditional: string;
	augDim: string;
	color: string;
	semitones: number;
	augGroup: number;
	dimGroup: number;
}
```

Then update every entry in the `NOTES` record (lines 18-31) to include both fields:

```typescript
export const NOTES: Record<NoteName, NoteInfo> = {
	C:  { traditional: 'C',  augDim: 'Ne', color: 'rgb(215, 204, 59)',  semitones: 0,  augGroup: 0, dimGroup: 0 },
	Db: { traditional: 'Db', augDim: 'Ja', color: 'rgb(216, 37, 84)',   semitones: 1,  augGroup: 1, dimGroup: 1 },
	D:  { traditional: 'D',  augDim: 'Ko', color: 'rgb(77, 162, 210)',  semitones: 2,  augGroup: 2, dimGroup: 2 },
	Eb: { traditional: 'Eb', augDim: 'Pe', color: 'rgb(215, 204, 59)',  semitones: 3,  augGroup: 3, dimGroup: 0 },
	E:  { traditional: 'E',  augDim: 'Na', color: 'rgb(216, 37, 84)',   semitones: 4,  augGroup: 0, dimGroup: 1 },
	F:  { traditional: 'F',  augDim: 'Jo', color: 'rgb(77, 162, 210)',  semitones: 5,  augGroup: 1, dimGroup: 2 },
	Gb: { traditional: 'Gb', augDim: 'Ke', color: 'rgb(215, 204, 59)',  semitones: 6,  augGroup: 2, dimGroup: 0 },
	G:  { traditional: 'G',  augDim: 'Pa', color: 'rgb(216, 37, 84)',   semitones: 7,  augGroup: 3, dimGroup: 1 },
	Ab: { traditional: 'Ab', augDim: 'No', color: 'rgb(77, 162, 210)',  semitones: 8,  augGroup: 0, dimGroup: 2 },
	A:  { traditional: 'A',  augDim: 'Je', color: 'rgb(215, 204, 59)',  semitones: 9,  augGroup: 1, dimGroup: 0 },
	Bb: { traditional: 'Bb', augDim: 'Ka', color: 'rgb(216, 37, 84)',   semitones: 10, augGroup: 2, dimGroup: 1 },
	B:  { traditional: 'B',  augDim: 'Po', color: 'rgb(77, 162, 210)',  semitones: 11, augGroup: 3, dimGroup: 2 },
};
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest --run src/lib/music.test.ts`
Expected: All PASS

**Step 5: Commit**

```bash
git add src/lib/music.ts src/lib/music.test.ts
git commit -m "feat: add augGroup/dimGroup to NoteInfo data model"
```

---

### Task 2: Add LayoutMode type and getChromaticCircle function

**Files:**
- Modify: `src/lib/music.ts`
- Modify: `src/lib/music.test.ts`

**Step 1: Write the failing tests**

Add a new `describe` block at the end of `src/lib/music.test.ts`:

```typescript
describe('getChromaticCircle', () => {
	it('returns tonic at position 0', () => {
		const circle = getChromaticCircle('C');
		expect(circle[0]).toBe('C');
		expect(circle).toHaveLength(12);
	});

	it('goes in chromatic order from the tonic', () => {
		const circle = getChromaticCircle('C');
		expect(circle).toEqual(['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']);
	});

	it('rotates correctly for G', () => {
		const circle = getChromaticCircle('G');
		expect(circle[0]).toBe('G');
		expect(circle[1]).toBe('Ab');
		expect(circle[11]).toBe('Gb');
	});

	it('rotates correctly for F', () => {
		const circle = getChromaticCircle('F');
		expect(circle[0]).toBe('F');
		expect(circle[1]).toBe('Gb');
		expect(circle[11]).toBe('E');
	});
});
```

Also update the import at the top of the test file to include `getChromaticCircle`.

**Step 2: Run tests to verify they fail**

Run: `npx vitest --run src/lib/music.test.ts`
Expected: FAIL — `getChromaticCircle` is not exported

**Step 3: Add LayoutMode type and getChromaticCircle to music.ts**

Add after the `getCircleForTonic` function (after line 53):

```typescript
export type LayoutMode = 'fifths' | 'chromatic' | 'augmented' | 'diminished';

export function getChromaticCircle(tonic: NoteName): NoteName[] {
	const idx = CHROMATIC_NOTES.indexOf(tonic);
	return [...CHROMATIC_NOTES.slice(idx), ...CHROMATIC_NOTES.slice(0, idx)];
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest --run src/lib/music.test.ts`
Expected: All PASS

**Step 5: Commit**

```bash
git add src/lib/music.ts src/lib/music.test.ts
git commit -m "feat: add LayoutMode type and getChromaticCircle function"
```

---

### Task 3: Rename CircleOfFifths.svelte to NoteCircle.svelte

This is a pure rename — the component is identical. It serves both fifths and chromatic layouts (the parent just passes different note orderings).

**Files:**
- Rename: `src/lib/components/CircleOfFifths.svelte` → `src/lib/components/NoteCircle.svelte`
- Modify: `src/routes/+page.svelte` (update import)

**Step 1: Rename the file**

```bash
git mv src/lib/components/CircleOfFifths.svelte src/lib/components/NoteCircle.svelte
```

**Step 2: Update the import in +page.svelte**

In `src/routes/+page.svelte`, change line 18:

From:
```typescript
import CircleOfFifths from '$lib/components/CircleOfFifths.svelte';
```

To:
```typescript
import NoteCircle from '$lib/components/NoteCircle.svelte';
```

Then find-and-replace all `<CircleOfFifths` with `<NoteCircle` in the same file (two occurrences, lines 350 and 371).

**Step 3: Verify the app still builds**

Run: `npx vite build`
Expected: Build succeeds with no errors

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: rename CircleOfFifths to NoteCircle"
```

---

### Task 4: Create AugmentedCompass.svelte

**Files:**
- Create: `src/lib/components/AugmentedCompass.svelte`

This component renders 4 groups of 3 circular note buttons arranged at compass points around a center tonic circle. Layout positions are derived from `augGroup` (which cluster) and `dimGroup` (position within cluster).

**Step 1: Create the component**

Create `src/lib/components/AugmentedCompass.svelte`:

```svelte
<script lang="ts">
	import { NOTES, CHROMATIC_NOTES, INTERVAL_LABELS, intervalBetween } from '$lib/music';
	import type { NoteName } from '$lib/music';
	import type { IntervalStats } from '$lib/stats';

	interface Props {
		tonic: NoteName;
		nameMode: 'traditional' | 'augdim';
		showIntervals: boolean;
		showStats: boolean;
		stats: Record<number, IntervalStats>;
		enabledSemitones: number[];
		userPick: NoteName | null;
		correctNote: NoteName | null;
		cadenceNote: NoteName | null;
		melodyDots: { result: 'correct' | 'incorrect' | null }[];
		onNoteClick?: (note: NoteName) => void;
	}

	let {
		tonic,
		nameMode,
		showIntervals,
		showStats,
		stats,
		enabledSemitones,
		userPick,
		correctNote,
		cadenceNote,
		melodyDots = [],
		onNoteClick,
	}: Props = $props();

	const SIZE = 400;
	const CX = SIZE / 2;
	const CY = SIZE / 2;
	const CENTER_R = 50;
	const NOTE_R = 28;

	// Cluster centers: top, right, bottom, left (indexed by augGroup)
	const CLUSTER_CENTERS: { x: number; y: number }[] = [
		{ x: 200, y: 75 },   // augGroup 0 = top
		{ x: 325, y: 200 },  // augGroup 1 = right
		{ x: 200, y: 325 },  // augGroup 2 = bottom
		{ x: 75, y: 200 },   // augGroup 3 = left
	];

	// Within each cluster, 3 notes stacked vertically (indexed by dimGroup: 0=yellow top, 1=red mid, 2=blue bottom)
	const STACK_OFFSETS: number[] = [-38, 0, 38];

	function getNotePosition(note: NoteName): { x: number; y: number } {
		const info = NOTES[note];
		const cluster = CLUSTER_CENTERS[info.augGroup];
		const yOffset = STACK_OFFSETS[info.dimGroup];

		// For left/right clusters, stack horizontally instead of vertically
		if (info.augGroup === 1 || info.augGroup === 3) {
			return { x: cluster.x, y: cluster.y + yOffset };
		}
		// For top/bottom clusters, stack vertically
		return { x: cluster.x, y: cluster.y + yOffset };
	}

	function getNoteFill(note: NoteName): string {
		if (correctNote === note) return 'rgb(34, 197, 94)';
		if (userPick === note && userPick !== correctNote) return 'rgb(234, 179, 8)';
		if (cadenceNote === note) return NOTES[note].color;
		return 'transparent';
	}

	function getNoteTextFill(note: NoteName): string {
		const fill = getNoteFill(note);
		if (fill !== 'transparent') return 'rgb(17, 24, 39)';
		return NOTES[note].color;
	}

	function getDisplayName(note: NoteName): string {
		return nameMode === 'augdim' ? NOTES[note].augDim : note;
	}
</script>

<svg viewBox="0 0 {SIZE} {SIZE}" class="w-full max-w-lg mx-auto" role="group" aria-label="Augmented compass">
	{#each CHROMATIC_NOTES as note}
		{@const pos = getNotePosition(note)}
		{@const semitones = intervalBetween(tonic, note)}
		{@const enabled = enabledSemitones.includes(semitones)}
		{@const isTonic = note === tonic}
		{@const s = stats[semitones]}
		<g opacity={enabled ? 1 : 0.25}>
			<circle
				cx={pos.x}
				cy={pos.y}
				r={NOTE_R}
				fill={getNoteFill(note)}
				stroke={NOTES[note].color}
				stroke-width={isTonic ? 4 : 2}
				class={enabled ? 'cursor-pointer' : 'pointer-events-none'}
				role="button"
				tabindex={enabled ? 0 : -1}
				aria-label={getDisplayName(note)}
				onclick={() => enabled && onNoteClick?.(note)}
				onkeydown={(e) => {
					if (enabled && (e.key === 'Enter' || e.key === ' ')) {
						e.preventDefault();
						onNoteClick?.(note);
					}
				}}
			/>
			<text
				x={pos.x}
				y={pos.y - (showIntervals ? 5 : 0) - (showStats && s ? 3 : 0)}
				text-anchor="middle"
				dominant-baseline="central"
				fill={getNoteTextFill(note)}
				font-size={isTonic ? 16 : 14}
				font-weight="bold"
				class="pointer-events-none select-none"
			>
				{getDisplayName(note)}
			</text>
			{#if showIntervals}
				<text
					x={pos.x}
					y={pos.y + 8 - (showStats && s ? 2 : 0)}
					text-anchor="middle"
					dominant-baseline="central"
					fill={getNoteTextFill(note)}
					font-size="10"
					class="pointer-events-none select-none"
				>
					{INTERVAL_LABELS[semitones]}
				</text>
			{/if}
			{#if showStats && s}
				<text
					x={pos.x}
					y={pos.y + (showIntervals ? 18 : 10)}
					text-anchor="middle"
					dominant-baseline="central"
					fill={getNoteTextFill(note)}
					font-size="8"
					class="pointer-events-none select-none"
				>
					{Math.round((s.correct / s.total) * 100)}%
				</text>
			{/if}
		</g>
	{/each}

	<!-- Center circle with tonic -->
	<circle cx={CX} cy={CY} r={CENTER_R} fill="transparent" stroke="rgb(75, 85, 99)" stroke-width="1" />
	<text
		x={CX}
		y={melodyDots.length > 0 ? CY - 10 : CY}
		text-anchor="middle"
		dominant-baseline="central"
		fill="rgb(229, 231, 235)"
		font-size="32"
		font-weight="bold"
		class="select-none"
	>
		{getDisplayName(tonic)}
	</text>

	<!-- Melody indicator dots -->
	{#if melodyDots.length > 0}
		{#each melodyDots as dot, i}
			{@const dotX = CX + (i - 1) * 20}
			{@const dotY = CY + 18}
			<circle
				cx={dotX}
				cy={dotY}
				r={6}
				fill={dot.result === 'correct'
					? 'rgb(34, 197, 94)'
					: dot.result === 'incorrect'
						? 'rgb(239, 68, 68)'
						: 'transparent'}
				stroke={dot.result === null ? 'rgb(107, 114, 128)' : 'none'}
				stroke-width="2"
			/>
		{/each}
	{/if}
</svg>
```

**Step 2: Verify the app builds**

Run: `npx vite build`
Expected: Build succeeds (component not yet used, but should compile)

**Step 3: Commit**

```bash
git add src/lib/components/AugmentedCompass.svelte
git commit -m "feat: add AugmentedCompass layout component"
```

---

### Task 5: Create DiminishedGroups.svelte

**Files:**
- Create: `src/lib/components/DiminishedGroups.svelte`

This component renders 3 groups of 4 circular note buttons. Each group is a diminished 7th chord in compass formation. Groups form a downward-pointing equilateral triangle.

Group assignments (by dimGroup):
- dimGroup 0 (yellow: C, Eb, Gb, A) → top-right
- dimGroup 1 (red: Db, E, G, Bb) → bottom
- dimGroup 2 (blue: D, F, Ab, B) → top-left

Compass position within each group (by augGroup):
- augGroup 0 → top
- augGroup 1 → right
- augGroup 2 → bottom
- augGroup 3 → left

**Step 1: Create the component**

Create `src/lib/components/DiminishedGroups.svelte`:

```svelte
<script lang="ts">
	import { NOTES, CHROMATIC_NOTES, INTERVAL_LABELS, intervalBetween } from '$lib/music';
	import type { NoteName } from '$lib/music';
	import type { IntervalStats } from '$lib/stats';

	interface Props {
		tonic: NoteName;
		nameMode: 'traditional' | 'augdim';
		showIntervals: boolean;
		showStats: boolean;
		stats: Record<number, IntervalStats>;
		enabledSemitones: number[];
		userPick: NoteName | null;
		correctNote: NoteName | null;
		cadenceNote: NoteName | null;
		melodyDots: { result: 'correct' | 'incorrect' | null }[];
		onNoteClick?: (note: NoteName) => void;
	}

	let {
		tonic,
		nameMode,
		showIntervals,
		showStats,
		stats,
		enabledSemitones,
		userPick,
		correctNote,
		cadenceNote,
		melodyDots = [],
		onNoteClick,
	}: Props = $props();

	const SIZE = 400;
	const CX = SIZE / 2;
	const CY = SIZE / 2;
	const CENTER_R = 50;
	const NOTE_R = 26;
	const COMPASS_R = 48; // distance from group center to note center

	// Group centers: indexed by dimGroup
	// dimGroup 0 (yellow) → top-right
	// dimGroup 1 (red) → bottom
	// dimGroup 2 (blue) → top-left
	const GROUP_CENTERS: { x: number; y: number }[] = [
		{ x: 280, y: 115 },  // dimGroup 0 = top-right
		{ x: 200, y: 300 },  // dimGroup 1 = bottom
		{ x: 120, y: 115 },  // dimGroup 2 = top-left
	];

	// Compass offsets within a group, indexed by augGroup
	// augGroup 0 = top, 1 = right, 2 = bottom, 3 = left
	const COMPASS_OFFSETS: { dx: number; dy: number }[] = [
		{ dx: 0, dy: -COMPASS_R },   // top
		{ dx: COMPASS_R, dy: 0 },    // right
		{ dx: 0, dy: COMPASS_R },    // bottom
		{ dx: -COMPASS_R, dy: 0 },   // left
	];

	function getNotePosition(note: NoteName): { x: number; y: number } {
		const info = NOTES[note];
		const group = GROUP_CENTERS[info.dimGroup];
		const offset = COMPASS_OFFSETS[info.augGroup];
		return { x: group.x + offset.dx, y: group.y + offset.dy };
	}

	function getNoteFill(note: NoteName): string {
		if (correctNote === note) return 'rgb(34, 197, 94)';
		if (userPick === note && userPick !== correctNote) return 'rgb(234, 179, 8)';
		if (cadenceNote === note) return NOTES[note].color;
		return 'transparent';
	}

	function getNoteTextFill(note: NoteName): string {
		const fill = getNoteFill(note);
		if (fill !== 'transparent') return 'rgb(17, 24, 39)';
		return NOTES[note].color;
	}

	function getDisplayName(note: NoteName): string {
		return nameMode === 'augdim' ? NOTES[note].augDim : note;
	}
</script>

<svg viewBox="0 0 {SIZE} {SIZE}" class="w-full max-w-lg mx-auto" role="group" aria-label="Diminished groups">
	{#each CHROMATIC_NOTES as note}
		{@const pos = getNotePosition(note)}
		{@const semitones = intervalBetween(tonic, note)}
		{@const enabled = enabledSemitones.includes(semitones)}
		{@const isTonic = note === tonic}
		{@const s = stats[semitones]}
		<g opacity={enabled ? 1 : 0.25}>
			<circle
				cx={pos.x}
				cy={pos.y}
				r={NOTE_R}
				fill={getNoteFill(note)}
				stroke={NOTES[note].color}
				stroke-width={isTonic ? 4 : 2}
				class={enabled ? 'cursor-pointer' : 'pointer-events-none'}
				role="button"
				tabindex={enabled ? 0 : -1}
				aria-label={getDisplayName(note)}
				onclick={() => enabled && onNoteClick?.(note)}
				onkeydown={(e) => {
					if (enabled && (e.key === 'Enter' || e.key === ' ')) {
						e.preventDefault();
						onNoteClick?.(note);
					}
				}}
			/>
			<text
				x={pos.x}
				y={pos.y - (showIntervals ? 5 : 0) - (showStats && s ? 3 : 0)}
				text-anchor="middle"
				dominant-baseline="central"
				fill={getNoteTextFill(note)}
				font-size={isTonic ? 15 : 13}
				font-weight="bold"
				class="pointer-events-none select-none"
			>
				{getDisplayName(note)}
			</text>
			{#if showIntervals}
				<text
					x={pos.x}
					y={pos.y + 7 - (showStats && s ? 2 : 0)}
					text-anchor="middle"
					dominant-baseline="central"
					fill={getNoteTextFill(note)}
					font-size="9"
					class="pointer-events-none select-none"
				>
					{INTERVAL_LABELS[semitones]}
				</text>
			{/if}
			{#if showStats && s}
				<text
					x={pos.x}
					y={pos.y + (showIntervals ? 16 : 9)}
					text-anchor="middle"
					dominant-baseline="central"
					fill={getNoteTextFill(note)}
					font-size="8"
					class="pointer-events-none select-none"
				>
					{Math.round((s.correct / s.total) * 100)}%
				</text>
			{/if}
		</g>
	{/each}

	<!-- Center circle with tonic -->
	<circle cx={CX} cy={CY} r={CENTER_R} fill="transparent" stroke="rgb(75, 85, 99)" stroke-width="1" />
	<text
		x={CX}
		y={melodyDots.length > 0 ? CY - 10 : CY}
		text-anchor="middle"
		dominant-baseline="central"
		fill="rgb(229, 231, 235)"
		font-size="32"
		font-weight="bold"
		class="select-none"
	>
		{getDisplayName(tonic)}
	</text>

	<!-- Melody indicator dots -->
	{#if melodyDots.length > 0}
		{#each melodyDots as dot, i}
			{@const dotX = CX + (i - 1) * 20}
			{@const dotY = CY + 18}
			<circle
				cx={dotX}
				cy={dotY}
				r={6}
				fill={dot.result === 'correct'
					? 'rgb(34, 197, 94)'
					: dot.result === 'incorrect'
						? 'rgb(239, 68, 68)'
						: 'transparent'}
				stroke={dot.result === null ? 'rgb(107, 114, 128)' : 'none'}
				stroke-width="2"
			/>
		{/each}
	{/if}
</svg>
```

**Step 2: Verify the app builds**

Run: `npx vite build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/lib/components/DiminishedGroups.svelte
git commit -m "feat: add DiminishedGroups layout component"
```

---

### Task 6: Create NoteLayout.svelte wrapper with tabs

**Files:**
- Create: `src/lib/components/NoteLayout.svelte`

This component renders a tab bar and conditionally shows the correct layout component. It imports all three layout components and passes through the shared props.

**Step 1: Create the component**

Create `src/lib/components/NoteLayout.svelte`:

```svelte
<script lang="ts">
	import type { NoteName, LayoutMode } from '$lib/music';
	import type { IntervalStats } from '$lib/stats';
	import NoteCircle from './NoteCircle.svelte';
	import AugmentedCompass from './AugmentedCompass.svelte';
	import DiminishedGroups from './DiminishedGroups.svelte';

	interface Props {
		layoutMode: LayoutMode;
		notes: NoteName[];
		tonic: NoteName;
		nameMode: 'traditional' | 'augdim';
		showIntervals: boolean;
		showStats: boolean;
		stats: Record<number, IntervalStats>;
		enabledSemitones: number[];
		userPick: NoteName | null;
		correctNote: NoteName | null;
		cadenceNote: NoteName | null;
		melodyDots: { result: 'correct' | 'incorrect' | null }[];
		onNoteClick?: (note: NoteName) => void;
		onLayoutChange?: (mode: LayoutMode) => void;
	}

	let {
		layoutMode,
		notes,
		tonic,
		nameMode,
		showIntervals,
		showStats,
		stats,
		enabledSemitones,
		userPick,
		correctNote,
		cadenceNote,
		melodyDots = [],
		onNoteClick,
		onLayoutChange,
	}: Props = $props();

	const tabs: { mode: LayoutMode; label: string }[] = [
		{ mode: 'fifths', label: '5ths' },
		{ mode: 'chromatic', label: 'Chromatic' },
		{ mode: 'augmented', label: 'Augmented' },
		{ mode: 'diminished', label: 'Diminished' },
	];
</script>

<div>
	<div class="flex justify-center gap-4 mb-2">
		{#each tabs as tab}
			<button
				onclick={() => onLayoutChange?.(tab.mode)}
				class="text-sm pb-1 border-b-2 transition-colors {layoutMode === tab.mode
					? 'text-white border-white'
					: 'text-gray-400 border-transparent hover:text-gray-200'}"
			>
				{tab.label}
			</button>
		{/each}
	</div>

	{#if layoutMode === 'fifths' || layoutMode === 'chromatic'}
		<NoteCircle
			{notes}
			{tonic}
			{nameMode}
			{showIntervals}
			{showStats}
			{stats}
			{enabledSemitones}
			{userPick}
			{correctNote}
			{cadenceNote}
			{melodyDots}
			{onNoteClick}
		/>
	{:else if layoutMode === 'augmented'}
		<AugmentedCompass
			{tonic}
			{nameMode}
			{showIntervals}
			{showStats}
			{stats}
			{enabledSemitones}
			{userPick}
			{correctNote}
			{cadenceNote}
			{melodyDots}
			{onNoteClick}
		/>
	{:else if layoutMode === 'diminished'}
		<DiminishedGroups
			{tonic}
			{nameMode}
			{showIntervals}
			{showStats}
			{stats}
			{enabledSemitones}
			{userPick}
			{correctNote}
			{cadenceNote}
			{melodyDots}
			{onNoteClick}
		/>
	{/if}
</div>
```

**Step 2: Verify the app builds**

Run: `npx vite build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/lib/components/NoteLayout.svelte
git commit -m "feat: add NoteLayout wrapper with tab switching"
```

---

### Task 7: Wire up NoteLayout in the quiz page

**Files:**
- Modify: `src/routes/+page.svelte`

This is the integration task. Replace the two `NoteCircle` instances (desktop and mobile) with `NoteLayout`, add `layoutMode` state, and compute the correct `notes` array based on layout mode.

**Step 1: Update imports**

In `src/routes/+page.svelte`, change the imports (lines 6-19).

Replace:
```typescript
import {
	type NoteName,
	type MelodyNote,
	PRESETS,
	getCircleForTonic,
	pickRandomTarget,
	generateMelody,
	getCadenceNotes,
	intervalBetween,
	matchPreset,
} from '$lib/music';
```

With:
```typescript
import {
	type NoteName,
	type MelodyNote,
	type LayoutMode,
	PRESETS,
	getCircleForTonic,
	getChromaticCircle,
	pickRandomTarget,
	generateMelody,
	getCadenceNotes,
	intervalBetween,
	matchPreset,
} from '$lib/music';
```

Replace:
```typescript
import NoteCircle from '$lib/components/NoteCircle.svelte';
```

With:
```typescript
import NoteLayout from '$lib/components/NoteLayout.svelte';
```

**Step 2: Add layoutMode state and derived notes**

After the existing `let showStats = $state(false);` line (line 33), add:

```typescript
let layoutMode: LayoutMode = $state('fifths');
```

Change the existing `circleNotes` derived (line 62) from:

```typescript
const circleNotes = $derived(getCircleForTonic(tonic));
```

To:

```typescript
const circleNotes = $derived(
	layoutMode === 'chromatic' ? getChromaticCircle(tonic) : getCircleForTonic(tonic),
);
```

**Step 3: Add layout change handler**

After the `handleShowIntervalsChange` function (around line 276), add:

```typescript
function handleLayoutChange(mode: LayoutMode) {
	layoutMode = mode;
}
```

**Step 4: Replace NoteCircle with NoteLayout in both desktop and mobile sections**

For the **desktop** section (around line 350), replace:

```svelte
<NoteCircle
	notes={circleNotes}
	{tonic}
	{nameMode}
	{showIntervals}
	{showStats}
	stats={keyStats}
	{enabledSemitones}
	{userPick}
	{correctNote}
	{cadenceNote}
	{melodyDots}
	onNoteClick={handleNoteClick}
/>
```

With:

```svelte
<NoteLayout
	{layoutMode}
	notes={circleNotes}
	{tonic}
	{nameMode}
	{showIntervals}
	{showStats}
	stats={keyStats}
	{enabledSemitones}
	{userPick}
	{correctNote}
	{cadenceNote}
	{melodyDots}
	onNoteClick={handleNoteClick}
	onLayoutChange={handleLayoutChange}
/>
```

Do the same replacement for the **mobile** section (around line 371).

**Step 5: Verify the app builds**

Run: `npx vite build`
Expected: Build succeeds with no errors

**Step 6: Manually verify in browser**

Run: `npx vite dev`

Check:
- [ ] Tab bar appears above the circle with 4 tabs: "5ths", "Chromatic", "Augmented", "Diminished"
- [ ] Clicking "5ths" shows the original circle of fifths layout
- [ ] Clicking "Chromatic" shows a circle with notes in half-step order (C, Db, D, Eb... clockwise)
- [ ] Clicking "Augmented" shows 4 groups of 3 buttons at compass points
- [ ] Clicking "Diminished" shows 3 groups of 4 buttons in a triangle
- [ ] The center tonic circle is visible in all layouts
- [ ] Changing the tonic rotates the circle layouts and updates the tonic indicator in grouped layouts
- [ ] Clicking notes during a quiz works in all layouts (green/yellow feedback)
- [ ] Interval labels show correctly in all layouts
- [ ] Stats overlay works in all layouts
- [ ] Melody dots appear in center circle for all layouts
- [ ] Disabled notes are dimmed in all layouts

**Step 7: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: wire up NoteLayout with all four layout modes in quiz page"
```

---

### Task 8: Visual tuning pass

After seeing the layouts in the browser, you may need to adjust position constants. This task is for fine-tuning.

**Files:**
- Possibly modify: `src/lib/components/AugmentedCompass.svelte`
- Possibly modify: `src/lib/components/DiminishedGroups.svelte`

**Step 1: Check for overlaps**

Open the app in the browser (`npx vite dev`) and check each layout:
- Do any note circles overlap the center tonic circle?
- Do any note circles overlap each other?
- Are the groups visually balanced?
- Does the tonic indicator (thicker stroke) look distinct?

**Step 2: Adjust constants if needed**

Key constants to tune:
- `AugmentedCompass.svelte`: `CLUSTER_CENTERS` (x, y for each group), `STACK_OFFSETS` (vertical spacing), `NOTE_R` (circle size)
- `DiminishedGroups.svelte`: `GROUP_CENTERS` (x, y for each group), `COMPASS_R` (distance to compass positions), `NOTE_R` (circle size)

**Step 3: Verify adjustments look good**

Check in browser that all 12 notes are visible, non-overlapping, and aesthetically balanced.

**Step 4: Commit if changes were made**

```bash
git add src/lib/components/AugmentedCompass.svelte src/lib/components/DiminishedGroups.svelte
git commit -m "fix: tune layout positions for augmented and diminished views"
```

---

### Task 9: Run all tests and final verification

**Files:**
- None (verification only)

**Step 1: Run all tests**

Run: `npx vitest --run`
Expected: music.test.ts passes (smoke.test.ts and other pre-existing failures are unrelated)

**Step 2: Build for production**

Run: `npx vite build`
Expected: Clean build, no errors

**Step 3: Final browser check**

Run: `npx vite dev`

Quick smoke test all four layouts with:
- Start/stop quiz
- Change tonic
- Switch between interval and melody mode
- Toggle stats
- Switch name modes

**Step 4: Commit any remaining fixes**

If any issues found, fix and commit individually with descriptive messages.
