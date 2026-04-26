# Piano Layout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Piano" layout mode (C2-C5 keyboard) to the ear training quiz as a 5th layout tab, with note/interval badges on every key and green/yellow feedback indicators.

**Architecture:** Add `'piano'` to the `LayoutMode` union, create a new `PianoLayout.svelte` component with inline key generation, wire it into `NoteLayout.svelte` as a tab, and adjust the page grid in `+page.svelte` so piano mode gets 10 columns with buttons underneath.

**Tech Stack:** Svelte 5 (runes: $state, $derived, $props), TypeScript, Tailwind CSS, existing quiz audio/stats infrastructure

---

### Task 1: Add 'piano' to LayoutMode type

**Files:**
- Modify: `src/lib/music.ts:59`

**Step 1: Update the LayoutMode type**

Change line 59 from:

```typescript
export type LayoutMode = 'fifths' | 'chromatic' | 'augmented' | 'diminished';
```

to:

```typescript
export type LayoutMode = 'fifths' | 'chromatic' | 'augmented' | 'diminished' | 'piano';
```

**Step 2: Verify existing tests still pass**

Run: `npx vitest run src/lib/music.test.ts`
Expected: All tests pass (no tests reference LayoutMode directly).

**Step 3: Commit**

```bash
git add src/lib/music.ts
git commit -m "feat: add piano to LayoutMode type"
```

---

### Task 2: Create PianoLayout.svelte component

**Files:**
- Create: `src/lib/components/PianoLayout.svelte`

This is the core of the feature. The component generates piano keys for C2-C5, renders them as HTML divs (white keys flex, black keys absolutely positioned), and puts a circle badge on each key showing note name + optional interval.

**Step 1: Create the component**

```svelte
<script lang="ts">
	import {
		type NoteName,
		type AccidentalMode,
		CHROMATIC_NOTES,
		NOTES,
		INTERVAL_LABELS,
		intervalBetween,
		getTraditionalDisplayName,
	} from '$lib/music';
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
		accidentalMode: AccidentalMode;
		preset: string;
		targetPitch: string | null;
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
		accidentalMode,
		preset,
		targetPitch,
		onNoteClick,
	}: Props = $props();

	// --- Key generation for C2-C5 ---
	const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
	const BLACK_SEMITONES = new Set([1, 3, 6, 8, 10]); // C#, D#, F#, G#, A#

	interface PianoKey {
		note: NoteName;
		sharpName: string;
		octave: number;
		isBlack: boolean;
		pitch: string; // e.g. "C3" for matching targetPitch
	}

	// Map sharp spellings back to our flat-based NoteName system
	function sharpToNoteName(sharp: string): NoteName {
		const map: Record<string, NoteName> = {
			'C': 'C', 'C#': 'Db', 'D': 'D', 'D#': 'Eb', 'E': 'E', 'F': 'F',
			'F#': 'Gb', 'G': 'G', 'G#': 'Ab', 'A': 'A', 'A#': 'Bb', 'B': 'B',
		};
		return map[sharp];
	}

	function generatePianoKeys(): PianoKey[] {
		const keys: PianoKey[] = [];
		for (let octave = 2; octave <= 5; octave++) {
			const maxSemitone = octave === 5 ? 0 : 11; // Only C5
			for (let s = 0; s <= maxSemitone; s++) {
				const sharpName = SHARP_NOTES[s];
				keys.push({
					note: sharpToNoteName(sharpName),
					sharpName,
					octave,
					isBlack: BLACK_SEMITONES.has(s),
					pitch: `${sharpName}${octave}`,
				});
			}
		}
		return keys;
	}

	const allKeys = generatePianoKeys();
	const whiteKeys = allKeys.filter((k) => !k.isBlack);
	const blackKeys = allKeys.filter((k) => k.isBlack);

	// Black key positions as percentage of total white key width
	const blackKeyPositions = $derived(
		blackKeys.map((bk) => {
			const whiteIdx = whiteKeys.filter(
				(wk) => wk.octave < bk.octave || (wk.octave === bk.octave && SHARP_NOTES.indexOf(wk.sharpName) < SHARP_NOTES.indexOf(bk.sharpName)),
			).length;
			const pct = (whiteIdx / whiteKeys.length) * 100;
			return { ...bk, pct };
		}),
	);

	function getDisplayName(note: NoteName): string {
		if (nameMode === 'augdim') return NOTES[note].augDim;
		const semitone = NOTES[note].semitones;
		return getTraditionalDisplayName(semitone, tonic, preset, accidentalMode);
	}

	function getBadgeColor(key: PianoKey): string {
		const semitone = intervalBetween(tonic, key.note);
		// Feedback: correct answer gets green badge
		if (correctNote === key.note && targetPitch === key.pitch) return 'bg-green-500 text-gray-900';
		// Feedback: user's wrong pick gets yellow badge (only on the specific key they clicked - but we only know pitch class)
		if (userPick === key.note && userPick !== correctNote) return 'bg-yellow-500 text-gray-900';
		// Cadence note
		if (cadenceNote === key.note) return 'bg-gray-500 text-gray-100';
		// Default
		return 'bg-gray-800/60 text-gray-300 border border-gray-600';
	}
</script>

<!-- Tonic circle above piano -->
<div class="flex flex-col items-center mb-3">
	<div
		class="w-16 h-16 rounded-full border border-gray-600 flex flex-col items-center justify-center"
	>
		<span class="text-2xl font-bold text-gray-200">{getDisplayName(tonic)}</span>
		{#if melodyDots.length > 0}
			<div class="flex gap-1 mt-0.5">
				{#each melodyDots as dot}
					<div
						class="w-2.5 h-2.5 rounded-full {dot.result === 'correct'
							? 'bg-green-500'
							: dot.result === 'incorrect'
								? 'bg-red-500'
								: 'border border-gray-500'}"
					></div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Piano keyboard -->
<div class="piano-container">
	<div class="piano">
		<div class="white-keys">
			{#each whiteKeys as wk}
				{@const semitone = intervalBetween(tonic, wk.note)}
				<button
					class="white-key"
					onclick={() => onNoteClick?.(wk.note)}
				>
					<div class="key-badge {getBadgeColor(wk)}">
						<span class="text-[10px] font-bold leading-none">{getDisplayName(wk.note)}</span>
						{#if showIntervals}
							<span class="text-[8px] leading-none opacity-80">{INTERVAL_LABELS[semitone]}</span>
						{/if}
					</div>
				</button>
			{/each}
		</div>
		<div class="black-keys">
			{#each blackKeyPositions as bk}
				{@const semitone = intervalBetween(tonic, bk.note)}
				<button
					class="black-key"
					style="left: {bk.pct}%; transform: translateX(-50%);"
					onclick={() => onNoteClick?.(bk.note)}
				>
					<div class="key-badge {getBadgeColor(bk)}">
						<span class="text-[9px] font-bold leading-none">{getDisplayName(bk.note)}</span>
						{#if showIntervals}
							<span class="text-[7px] leading-none opacity-80">{INTERVAL_LABELS[semitone]}</span>
						{/if}
					</div>
				</button>
			{/each}
		</div>
	</div>
</div>

<style>
	.piano-container {
		display: block;
		width: 100%;
		position: relative;
		max-width: 100%;
	}

	.piano {
		display: block;
		margin: 0 auto;
		position: relative;
		width: 100%;
		pointer-events: auto;
		box-sizing: border-box;
	}

	.piano .black-keys {
		position: absolute;
		top: -10px;
		left: 0;
		right: 0;
		height: 75px;
	}

	.piano .white-keys {
		position: relative;
		display: flex;
		flex-direction: row;
		height: 120px;
	}

	.piano .white-key {
		position: relative;
		flex: 1 1 0;
		min-width: 0;
		margin: 0 1px;
		box-sizing: border-box;
		height: 100%;
		border: 1px inset rgb(156, 156, 156);
		border-radius: 4px;
		background-color: rgba(102, 99, 99, 0.43);
		pointer-events: auto;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		padding-bottom: 4px;
	}

	.piano .white-key:hover {
		background-color: rgba(140, 137, 137, 0.5);
	}

	.piano .white-key:active {
		background-color: rgba(180, 177, 177, 0.55);
		transform: translateY(1px);
	}

	.piano .black-key {
		z-index: 1;
		position: absolute;
		width: 3.5%;
		height: 100%;
		border: 1px inset rgb(92, 88, 88);
		background: rgb(20, 20, 20);
		border-radius: 3px;
		box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.47);
		pointer-events: auto;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		padding-bottom: 3px;
	}

	.piano .black-key:hover {
		background: rgb(50, 50, 50);
	}

	.piano .black-key:active {
		background: rgb(70, 70, 70);
		transform: translateX(-50%) translateY(1px);
	}

	.key-badge {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		border-radius: 9999px;
		min-width: 20px;
		min-height: 20px;
		padding: 1px 3px;
		line-height: 1;
		pointer-events: none;
	}
</style>
```

**Important design decisions in this code:**

- `generatePianoKeys()` builds C2 through C5 (37 keys: 22 white, 15 black)
- `sharpToNoteName()` maps sharp spellings (C#, D#, etc.) back to the flat-based `NoteName` system used throughout the app (Db, Eb, etc.)
- `getBadgeColor()` returns Tailwind classes. For the correct answer, it checks both pitch class AND pitch string (so the green badge appears on the exact octave). For wrong picks, it only knows pitch class.
- The `targetPitch` prop is NEW - not on the other layouts. This tells the piano which specific key (with octave) was the correct answer, so it can highlight the exact key green.
- Black key width is `3.5%` (wider than the reference piano's 1.8% because we have fewer keys: 3 octaves vs 4+)

**Step 2: Verify the app builds**

Run: `npx vite build`
Expected: Build succeeds. (Component isn't mounted yet, but TypeScript will check imports.)

**Step 3: Commit**

```bash
git add src/lib/components/PianoLayout.svelte
git commit -m "feat: create PianoLayout component with key badges"
```

---

### Task 3: Wire PianoLayout into NoteLayout tab switcher

**Files:**
- Modify: `src/lib/components/NoteLayout.svelte`

**Step 1: Import PianoLayout**

Add to imports (after line 6):

```typescript
import PianoLayout from './PianoLayout.svelte';
```

**Step 2: Add piano tab**

Change the `tabs` array (line 46-51) to include piano:

```typescript
const tabs: { mode: LayoutMode; label: string }[] = [
	{ mode: 'chromatic', label: 'Chromatic' },
	{ mode: 'fifths', label: '5ths' },
	{ mode: 'augmented', label: 'Augmented' },
	{ mode: 'diminished', label: 'Diminished' },
	{ mode: 'piano', label: 'Piano' },
];
```

**Step 3: Add targetPitch prop**

Add `targetPitch` to the Props interface (after `cadenceNote` line 19):

```typescript
targetPitch: string | null;
```

And destructure it in the props (after `cadenceNote` in the destructuring):

```typescript
targetPitch,
```

**Step 4: Add PianoLayout rendering**

After the `{:else if layoutMode === 'diminished'}` block (after line 116), add:

```svelte
{:else if layoutMode === 'piano'}
	<PianoLayout
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
		{accidentalMode}
		{preset}
		{targetPitch}
		{onNoteClick}
	/>
```

**Step 5: Verify the app builds**

Run: `npx vite build`
Expected: Build will fail because `+page.svelte` doesn't pass `targetPitch` to NoteLayout yet. That's expected - we fix it in the next task.

**Step 6: Commit**

```bash
git add src/lib/components/NoteLayout.svelte
git commit -m "feat: add Piano tab to NoteLayout switcher"
```

---

### Task 4: Pass targetPitch and adjust page grid for piano mode

**Files:**
- Modify: `src/routes/+page.svelte`

**Step 1: Pass targetPitch to both NoteLayout instances**

Find the desktop NoteLayout (around line 377) and add the `targetPitch` prop:

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
	{accidentalMode}
	{preset}
	{targetPitch}
	onNoteClick={handleNoteClick}
	onLayoutChange={handleLayoutChange}
/>
```

Do the same for the mobile NoteLayout instance (around line 402).

**Step 2: Adjust desktop grid for piano mode**

The desktop layout currently uses a fixed grid: 1 col spacer + 2 col buttons + 6 col circle + 3 col spacer.

For piano mode, we want: 1 col spacer + 10 col piano + 1 col spacer, with buttons below.

Replace the desktop grid section (lines 327-398) with conditional layout:

```svelte
<!-- Large screens: conditional layout based on mode -->
<div class="mt-6 hidden md:block">
	{#if layoutMode === 'piano'}
		<!-- Piano mode: wide layout, buttons below -->
		<div class="grid grid-cols-12">
			<div class="col-span-1"></div>
			<div class="col-span-10">
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
					{accidentalMode}
					{preset}
					{targetPitch}
					onNoteClick={handleNoteClick}
					onLayoutChange={handleLayoutChange}
				/>
			</div>
			<div class="col-span-1"></div>
		</div>
		<div class="mt-4 flex justify-center gap-3">
			<button
				onclick={togglePlay}
				class="w-14 h-14 rounded-full font-bold text-sm {playing
					? 'bg-red-600 hover:bg-red-700'
					: 'bg-green-600 hover:bg-green-700'}"
			>
				{playing ? 'Stop' : 'Start'}
			</button>
			<button
				onclick={handleReplay}
				disabled={!playing}
				class="w-14 h-14 rounded-full text-sm {playing
					? 'bg-gray-700 hover:bg-gray-600'
					: 'bg-gray-800 text-gray-600 cursor-not-allowed'}"
				title="Replay target note"
			>
				Replay
			</button>
			<button
				onclick={() => handleQuizModeChange(quizMode === 'interval' ? 'melody' : 'interval')}
				class="w-14 h-14 rounded-full text-xs bg-gray-700 hover:bg-gray-600 leading-tight"
			>
				<span class={quizMode === 'interval' ? 'font-bold' : 'text-gray-400'}>Note</span><br />
				<span class={quizMode === 'melody' ? 'font-bold' : 'text-gray-400'}>Melody</span>
			</button>
			<button
				onclick={() => (showStats = !showStats)}
				class="w-14 h-14 rounded-full text-sm {showStats
					? 'bg-blue-600 hover:bg-blue-700'
					: 'bg-gray-700 hover:bg-gray-600'}"
			>
				Stats
			</button>
			{#if showStats}
				<button
					onclick={() => {
						allStats = clearStatsForKey(allStats, tonic);
					}}
					class="w-14 h-14 rounded-full text-xs bg-gray-700 hover:bg-gray-600"
				>
					Clear
				</button>
			{/if}
		</div>
	{:else}
		<!-- Circle modes: original grid layout with buttons on the left -->
		<div class="grid grid-cols-12 items-center">
			<div class="col-span-1"></div>

			<div class="col-span-2 flex flex-col items-end gap-3">
				<button
					onclick={togglePlay}
					class="w-14 h-14 rounded-full font-bold text-sm {playing
						? 'bg-red-600 hover:bg-red-700'
						: 'bg-green-600 hover:bg-green-700'}"
				>
					{playing ? 'Stop' : 'Start'}
				</button>
				<button
					onclick={handleReplay}
					disabled={!playing}
					class="w-14 h-14 rounded-full text-sm {playing
						? 'bg-gray-700 hover:bg-gray-600'
						: 'bg-gray-800 text-gray-600 cursor-not-allowed'}"
					title="Replay target note"
				>
					Replay
				</button>
				<button
					onclick={() => handleQuizModeChange(quizMode === 'interval' ? 'melody' : 'interval')}
					class="w-14 h-14 rounded-full text-xs bg-gray-700 hover:bg-gray-600 leading-tight"
				>
					<span class={quizMode === 'interval' ? 'font-bold' : 'text-gray-400'}>Note</span><br />
					<span class={quizMode === 'melody' ? 'font-bold' : 'text-gray-400'}>Melody</span>
				</button>
				<button
					onclick={() => (showStats = !showStats)}
					class="w-14 h-14 rounded-full text-sm {showStats
						? 'bg-blue-600 hover:bg-blue-700'
						: 'bg-gray-700 hover:bg-gray-600'}"
				>
					Stats
				</button>
				{#if showStats}
					<button
						onclick={() => {
							allStats = clearStatsForKey(allStats, tonic);
						}}
						class="w-14 h-14 rounded-full text-xs bg-gray-700 hover:bg-gray-600"
					>
						Clear
					</button>
				{/if}
			</div>

			<div class="col-span-6">
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
					{accidentalMode}
					{preset}
					{targetPitch}
					onNoteClick={handleNoteClick}
					onLayoutChange={handleLayoutChange}
				/>
			</div>

			<div class="col-span-3"></div>
		</div>
	{/if}
</div>
```

**Step 3: Add targetPitch to the mobile NoteLayout too**

In the mobile section (around line 402), add `{targetPitch}` to the NoteLayout props.

**Step 4: Verify the app builds**

Run: `npx vite build`
Expected: Build succeeds with no type errors.

**Step 5: Run all tests**

Run: `npx vitest run`
Expected: All tests pass.

**Step 6: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: wire piano layout into page with responsive grid"
```

---

### Task 5: Manual testing and visual polish

**Step 1: Start dev server and test**

Run: `npx vite dev`

Test the following:
- [ ] Piano tab appears in the layout switcher
- [ ] Clicking Piano tab shows the keyboard with tonic circle above
- [ ] All keys have note name badges
- [ ] Toggling intervals shows/hides interval labels on badges
- [ ] Starting the quiz and clicking a correct key shows green badge on the correct octave's key
- [ ] Clicking a wrong key shows yellow badge on your pick, green on correct
- [ ] Switching between piano and circle layouts preserves quiz state
- [ ] Mobile layout: piano is full width, buttons are below
- [ ] Desktop layout: piano spans wide (10 cols), buttons are below piano
- [ ] Desktop circle layouts: buttons are still on the left side

**Step 2: Fix any visual issues found during testing**

Likely adjustments:
- Badge sizing on very narrow screens
- Black key width relative to white keys
- Badge positioning within keys

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: visual polish for piano layout"
```

---

### Task 6: Final verification

**Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass.

**Step 2: Run production build**

Run: `npx vite build`
Expected: Build succeeds.

**Step 3: Done**

All tasks complete. The piano layout is functional with:
- Piano tab in the layout switcher
- C2-C5 keyboard with note/interval badges on every key
- Green/yellow feedback indicators on specific keys
- Tonic circle with melody dots above the piano
- Responsive grid: 10-col piano with buttons below on desktop, full width on mobile
