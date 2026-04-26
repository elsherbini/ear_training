# Quiz Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the main ear training quiz page with a circle of fifths UI, drone backing, and PluckSynth quiz notes.

**Architecture:** Pure data module (`music.ts`) for note definitions, colors, intervals, and presets. Quiz audio module (`quiz-audio.ts`) wrapping PluckSynth. Two presentational Svelte components (CircleOfFifths, TopBar). One page component (`/quiz`) owning all state and the quiz flow state machine. Drone runs continuously with hardcoded params; quiz notes use PluckSynth.

**Tech Stack:** SvelteKit, Svelte 5 runes, Tone.js 15, Tailwind CSS 4, Vitest, raw SVG (no LayerChart needed — the circle is a fixed geometric layout, not data visualization)

**Design doc:** `docs/plans/2026-04-25-quiz-page-design.md`

---

### Task 1: Music Data Module

**Files:**
- Create: `src/lib/music.ts`
- Create: `src/lib/music.test.ts`

**Step 1: Write the failing tests**

Create `src/lib/music.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
	CHROMATIC_NOTES,
	CIRCLE_OF_FIFTHS,
	NOTES,
	INTERVAL_LABELS,
	PRESETS,
	getCircleForTonic,
	noteFromInterval,
	intervalBetween,
	intervalLabel,
	matchPreset,
	pickRandomTarget,
	getCadenceNotes,
} from './music';

describe('constants', () => {
	it('has 12 chromatic notes', () => {
		expect(CHROMATIC_NOTES).toHaveLength(12);
		expect(CHROMATIC_NOTES[0]).toBe('C');
		expect(CHROMATIC_NOTES[11]).toBe('B');
	});

	it('has 12 circle of fifths notes', () => {
		expect(CIRCLE_OF_FIFTHS).toHaveLength(12);
		expect(CIRCLE_OF_FIFTHS[0]).toBe('C');
		expect(CIRCLE_OF_FIFTHS[1]).toBe('G');
		expect(CIRCLE_OF_FIFTHS[11]).toBe('F');
	});

	it('has info for all 12 notes', () => {
		for (const note of CHROMATIC_NOTES) {
			expect(NOTES[note]).toBeDefined();
			expect(NOTES[note].traditional).toBe(note);
			expect(NOTES[note].augDim).toHaveLength(2);
			expect(NOTES[note].color).toMatch(/^rgb\(/);
		}
	});

	it('assigns correct aug dim names', () => {
		expect(NOTES['C'].augDim).toBe('Ne');
		expect(NOTES['G'].augDim).toBe('Pa');
		expect(NOTES['D'].augDim).toBe('Ko');
	});

	it('assigns correct colors by diminished group', () => {
		const yellow = 'rgb(215, 204, 59)';
		const red = 'rgb(216, 37, 84)';
		const blue = 'rgb(77, 162, 210)';
		// Yellow: C, Eb, Gb, A
		expect(NOTES['C'].color).toBe(yellow);
		expect(NOTES['Eb'].color).toBe(yellow);
		expect(NOTES['Gb'].color).toBe(yellow);
		expect(NOTES['A'].color).toBe(yellow);
		// Red: G, Bb, Db, E
		expect(NOTES['G'].color).toBe(red);
		expect(NOTES['Bb'].color).toBe(red);
		expect(NOTES['Db'].color).toBe(red);
		expect(NOTES['E'].color).toBe(red);
		// Blue: D, F, Ab, B
		expect(NOTES['D'].color).toBe(blue);
		expect(NOTES['F'].color).toBe(blue);
		expect(NOTES['Ab'].color).toBe(blue);
		expect(NOTES['B'].color).toBe(blue);
	});

	it('diminished groups share the same vowel', () => {
		// e group: C, Eb, Gb, A
		const eGroup = ['C', 'Eb', 'Gb', 'A'] as const;
		for (const n of eGroup) expect(NOTES[n].augDim[1]).toBe('e');
		// a group: G, Bb, Db, E
		const aGroup = ['G', 'Bb', 'Db', 'E'] as const;
		for (const n of aGroup) expect(NOTES[n].augDim[1]).toBe('a');
		// o group: D, F, Ab, B
		const oGroup = ['D', 'F', 'Ab', 'B'] as const;
		for (const n of oGroup) expect(NOTES[n].augDim[1]).toBe('o');
	});

	it('augmented groups share the same consonant', () => {
		// N: C, E, Ab
		const nGroup = ['C', 'E', 'Ab'] as const;
		for (const n of nGroup) expect(NOTES[n].augDim[0]).toBe('N');
		// J: Db, F, A
		const jGroup = ['Db', 'F', 'A'] as const;
		for (const n of jGroup) expect(NOTES[n].augDim[0]).toBe('J');
		// K: D, Gb, Bb
		const kGroup = ['D', 'Gb', 'Bb'] as const;
		for (const n of kGroup) expect(NOTES[n].augDim[0]).toBe('K');
		// P: Eb, G, B
		const pGroup = ['Eb', 'G', 'B'] as const;
		for (const n of pGroup) expect(NOTES[n].augDim[0]).toBe('P');
	});

	it('has 12 interval labels', () => {
		expect(INTERVAL_LABELS).toHaveLength(12);
		expect(INTERVAL_LABELS[0]).toBe('1');
		expect(INTERVAL_LABELS[6]).toBe('#4');
		expect(INTERVAL_LABELS[7]).toBe('5');
	});

	it('has correct presets', () => {
		expect(PRESETS).toHaveLength(5);
		const major = PRESETS.find((p) => p.name === 'Major');
		expect(major?.semitones).toEqual([0, 2, 4, 5, 7, 9, 11]);
		const chromatic = PRESETS.find((p) => p.name === 'Chromatic');
		expect(chromatic?.semitones).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
	});
});

describe('getCircleForTonic', () => {
	it('returns C at position 0 when tonic is C', () => {
		const circle = getCircleForTonic('C');
		expect(circle[0]).toBe('C');
		expect(circle[1]).toBe('G');
		expect(circle).toHaveLength(12);
	});

	it('returns G at position 0 when tonic is G', () => {
		const circle = getCircleForTonic('G');
		expect(circle[0]).toBe('G');
		expect(circle[1]).toBe('D');
		expect(circle[11]).toBe('C');
	});

	it('returns F at position 0 when tonic is F', () => {
		const circle = getCircleForTonic('F');
		expect(circle[0]).toBe('F');
		expect(circle[1]).toBe('C');
	});
});

describe('noteFromInterval', () => {
	it('returns tonic for 0 semitones', () => {
		expect(noteFromInterval('C', 0)).toBe('C');
		expect(noteFromInterval('G', 0)).toBe('G');
	});

	it('returns correct note for intervals from C', () => {
		expect(noteFromInterval('C', 7)).toBe('G'); // perfect fifth
		expect(noteFromInterval('C', 5)).toBe('F'); // perfect fourth
		expect(noteFromInterval('C', 4)).toBe('E'); // major third
	});

	it('wraps around correctly', () => {
		expect(noteFromInterval('G', 5)).toBe('C'); // G + P4 = C
		expect(noteFromInterval('A', 4)).toBe('Db'); // A + M3 = Db
	});
});

describe('intervalBetween', () => {
	it('returns 0 for same note', () => {
		expect(intervalBetween('C', 'C')).toBe(0);
		expect(intervalBetween('G', 'G')).toBe(0);
	});

	it('returns correct intervals from C', () => {
		expect(intervalBetween('C', 'G')).toBe(7);
		expect(intervalBetween('C', 'F')).toBe(5);
	});

	it('always returns positive (ascending) interval', () => {
		expect(intervalBetween('G', 'C')).toBe(5); // G up to C = 5 semitones
	});
});

describe('intervalLabel', () => {
	it('returns correct labels', () => {
		expect(intervalLabel(0)).toBe('1');
		expect(intervalLabel(7)).toBe('5');
		expect(intervalLabel(6)).toBe('#4');
		expect(intervalLabel(1)).toBe('b2');
	});
});

describe('matchPreset', () => {
	it('matches Major', () => {
		expect(matchPreset([0, 2, 4, 5, 7, 9, 11])).toBe('Major');
	});

	it('matches regardless of order', () => {
		expect(matchPreset([11, 0, 9, 7, 5, 4, 2])).toBe('Major');
	});

	it('returns Custom for non-matching sets', () => {
		expect(matchPreset([0, 2, 4])).toBe('Custom');
	});

	it('matches Chromatic', () => {
		expect(matchPreset([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])).toBe('Chromatic');
	});
});

describe('pickRandomTarget', () => {
	it('returns a note from enabled intervals', () => {
		const result = pickRandomTarget('C', [0, 7]); // unison and fifth
		expect(result.note).toBe('G'); // unison filtered out, only fifth remains
	});

	it('returns octave 2 or 3', () => {
		const octaves = new Set<number>();
		for (let i = 0; i < 100; i++) {
			const result = pickRandomTarget('C', [0, 4, 7]);
			octaves.add(result.octave);
		}
		expect(octaves.has(2) || octaves.has(3)).toBe(true);
		for (const o of octaves) {
			expect([2, 3]).toContain(o);
		}
	});

	it('falls back to tonic when no intervals available', () => {
		const result = pickRandomTarget('C', [0]); // only unison, gets filtered
		expect(result.note).toBe('C');
	});
});

describe('getCadenceNotes', () => {
	it('returns I-IV-V-I for C', () => {
		const notes = getCadenceNotes('C');
		expect(notes).toEqual([
			{ note: 'C', pitch: 'C3' },
			{ note: 'F', pitch: 'F3' },
			{ note: 'G', pitch: 'G3' },
			{ note: 'C', pitch: 'C3' },
		]);
	});

	it('returns correct pitches for G (IV and V wrap to octave 4)', () => {
		const notes = getCadenceNotes('G');
		expect(notes).toEqual([
			{ note: 'G', pitch: 'G3' },
			{ note: 'C', pitch: 'C4' },
			{ note: 'D', pitch: 'D4' },
			{ note: 'G', pitch: 'G3' },
		]);
	});

	it('returns correct pitches for F (V wraps to octave 4)', () => {
		const notes = getCadenceNotes('F');
		expect(notes).toEqual([
			{ note: 'F', pitch: 'F3' },
			{ note: 'Bb', pitch: 'Bb3' },
			{ note: 'C', pitch: 'C4' },
			{ note: 'F', pitch: 'F3' },
		]);
	});
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/music.test.ts`
Expected: FAIL — module `./music` has no exports

**Step 3: Implement the music data module**

Create `src/lib/music.ts`:

```typescript
export const CHROMATIC_NOTES = [
	'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
] as const;

export type NoteName = (typeof CHROMATIC_NOTES)[number];

export const CIRCLE_OF_FIFTHS: readonly NoteName[] = [
	'C', 'G', 'D', 'A', 'E', 'B', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F',
];

export interface NoteInfo {
	traditional: string;
	augDim: string;
	color: string;
	semitones: number;
}

export const NOTES: Record<NoteName, NoteInfo> = {
	C:  { traditional: 'C',  augDim: 'Ne', color: 'rgb(215, 204, 59)',  semitones: 0 },
	Db: { traditional: 'Db', augDim: 'Ja', color: 'rgb(216, 37, 84)',   semitones: 1 },
	D:  { traditional: 'D',  augDim: 'Ko', color: 'rgb(77, 162, 210)',  semitones: 2 },
	Eb: { traditional: 'Eb', augDim: 'Pe', color: 'rgb(215, 204, 59)',  semitones: 3 },
	E:  { traditional: 'E',  augDim: 'Na', color: 'rgb(216, 37, 84)',   semitones: 4 },
	F:  { traditional: 'F',  augDim: 'Jo', color: 'rgb(77, 162, 210)',  semitones: 5 },
	Gb: { traditional: 'Gb', augDim: 'Ke', color: 'rgb(215, 204, 59)',  semitones: 6 },
	G:  { traditional: 'G',  augDim: 'Pa', color: 'rgb(216, 37, 84)',   semitones: 7 },
	Ab: { traditional: 'Ab', augDim: 'No', color: 'rgb(77, 162, 210)',  semitones: 8 },
	A:  { traditional: 'A',  augDim: 'Je', color: 'rgb(215, 204, 59)',  semitones: 9 },
	Bb: { traditional: 'Bb', augDim: 'Ka', color: 'rgb(216, 37, 84)',   semitones: 10 },
	B:  { traditional: 'B',  augDim: 'Po', color: 'rgb(77, 162, 210)',  semitones: 11 },
};

export const INTERVAL_LABELS = [
	'1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7',
] as const;

export interface Preset {
	name: string;
	semitones: number[];
}

export const PRESETS: Preset[] = [
	{ name: 'Major', semitones: [0, 2, 4, 5, 7, 9, 11] },
	{ name: 'Natural Minor', semitones: [0, 2, 3, 5, 7, 8, 10] },
	{ name: 'Harmonic Minor', semitones: [0, 2, 3, 5, 7, 8, 11] },
	{ name: 'Melodic Minor', semitones: [0, 2, 3, 5, 7, 9, 11] },
	{ name: 'Chromatic', semitones: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
];

export function getCircleForTonic(tonic: NoteName): NoteName[] {
	const idx = CIRCLE_OF_FIFTHS.indexOf(tonic);
	return [...CIRCLE_OF_FIFTHS.slice(idx), ...CIRCLE_OF_FIFTHS.slice(0, idx)];
}

export function noteFromInterval(tonic: NoteName, semitones: number): NoteName {
	const tonicIndex = CHROMATIC_NOTES.indexOf(tonic);
	const noteIndex = (tonicIndex + semitones) % 12;
	return CHROMATIC_NOTES[noteIndex];
}

export function intervalBetween(tonic: NoteName, note: NoteName): number {
	const tonicIndex = CHROMATIC_NOTES.indexOf(tonic);
	const noteIndex = CHROMATIC_NOTES.indexOf(note);
	return (noteIndex - tonicIndex + 12) % 12;
}

export function intervalLabel(semitones: number): string {
	return INTERVAL_LABELS[semitones];
}

export function matchPreset(enabledSemitones: number[]): string {
	const sorted = [...enabledSemitones].sort((a, b) => a - b);
	for (const preset of PRESETS) {
		if (
			sorted.length === preset.semitones.length &&
			sorted.every((s, i) => s === preset.semitones[i])
		) {
			return preset.name;
		}
	}
	return 'Custom';
}

export function pickRandomTarget(
	tonic: NoteName,
	enabledSemitones: number[],
): { note: NoteName; octave: number } {
	const quizSemitones = enabledSemitones.filter((s) => s !== 0);
	if (quizSemitones.length === 0) {
		return { note: tonic, octave: 3 };
	}
	const semitones = quizSemitones[Math.floor(Math.random() * quizSemitones.length)];
	const note = noteFromInterval(tonic, semitones);
	const octave = Math.random() < 0.5 ? 2 : 3;
	return { note, octave };
}

export interface CadenceNote {
	note: NoteName;
	pitch: string;
}

export function getCadenceNotes(tonic: NoteName): CadenceNote[] {
	const tonicIndex = CHROMATIC_NOTES.indexOf(tonic);
	const iv = noteFromInterval(tonic, 5);
	const v = noteFromInterval(tonic, 7);
	const ivOctave = tonicIndex + 5 >= 12 ? 4 : 3;
	const vOctave = tonicIndex + 7 >= 12 ? 4 : 3;

	return [
		{ note: tonic, pitch: `${tonic}3` },
		{ note: iv, pitch: `${iv}${ivOctave}` },
		{ note: v, pitch: `${v}${vOctave}` },
		{ note: tonic, pitch: `${tonic}3` },
	];
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/music.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/lib/music.ts src/lib/music.test.ts
git commit -m "feat: add music data module with note definitions, intervals, and helpers"
```

---

### Task 2: Quiz Audio Module

**Files:**
- Create: `src/lib/quiz-audio.ts`
- Create: `src/lib/quiz-audio.test.ts`

**Reference:** Check `src/lib/drone.test.ts` for the Tone.js mock pattern used in this project.

**Step 1: Write the failing tests**

Create `src/lib/quiz-audio.test.ts`. Mock Tone.js following the same pattern as `drone.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Tone.js
const mockTriggerAttackRelease = vi.fn();
const mockDispose = vi.fn();
const mockToDestination = vi.fn().mockReturnThis();

vi.mock('tone', () => ({
	PluckSynth: vi.fn().mockImplementation(() => ({
		triggerAttackRelease: mockTriggerAttackRelease,
		dispose: mockDispose,
		toDestination: mockToDestination,
	})),
	start: vi.fn().mockResolvedValue(undefined),
}));

import { QuizAudio } from './quiz-audio';

describe('QuizAudio', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('constructs without error', () => {
		const audio = new QuizAudio();
		expect(audio).toBeDefined();
	});

	it('plays a note with triggerAttackRelease', () => {
		const audio = new QuizAudio();
		audio.playNote('C3');
		expect(mockTriggerAttackRelease).toHaveBeenCalledWith('C3', '2n');
	});

	it('plays cadence notes sequentially with delays', async () => {
		vi.useFakeTimers();
		const audio = new QuizAudio();
		const onNote = vi.fn();

		const promise = audio.playCadence(
			['C3', 'F3', 'G3', 'C3'],
			onNote,
		);

		// First note plays immediately
		expect(mockTriggerAttackRelease).toHaveBeenCalledTimes(1);
		expect(mockTriggerAttackRelease).toHaveBeenCalledWith('C3', '8n');
		expect(onNote).toHaveBeenCalledWith('C3', 0);

		// Advance through remaining notes
		for (let i = 1; i < 4; i++) {
			await vi.advanceTimersByTimeAsync(300);
		}

		await promise;
		expect(mockTriggerAttackRelease).toHaveBeenCalledTimes(4);
		expect(onNote).toHaveBeenCalledTimes(4);

		vi.useRealTimers();
	});

	it('disposes the synth', () => {
		const audio = new QuizAudio();
		audio.dispose();
		expect(mockDispose).toHaveBeenCalled();
	});
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/quiz-audio.test.ts`
Expected: FAIL — module `./quiz-audio` not found

**Step 3: Implement the quiz audio module**

Create `src/lib/quiz-audio.ts`:

```typescript
import * as Tone from 'tone';

export class QuizAudio {
	private synth: Tone.PluckSynth;

	constructor() {
		this.synth = new Tone.PluckSynth().toDestination();
	}

	playNote(pitch: string): void {
		this.synth.triggerAttackRelease(pitch, '2n');
	}

	async playCadence(
		pitches: string[],
		onNote?: (pitch: string, index: number) => void,
	): Promise<void> {
		for (let i = 0; i < pitches.length; i++) {
			onNote?.(pitches[i], i);
			this.synth.triggerAttackRelease(pitches[i], '8n');
			if (i < pitches.length - 1) {
				await new Promise((resolve) => setTimeout(resolve, 300));
			}
		}
	}

	dispose(): void {
		this.synth.dispose();
	}
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/quiz-audio.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/lib/quiz-audio.ts src/lib/quiz-audio.test.ts
git commit -m "feat: add quiz audio module with PluckSynth wrapper"
```

---

### Task 3: CircleOfFifths Component

**Files:**
- Create: `src/lib/components/CircleOfFifths.svelte`

**Context:** This is a purely presentational SVG component. It receives note data, highlight state, and display options as props, and emits click events. The parent (quiz page) owns all state. Raw SVG is used — no chart library needed for a fixed 12-segment interactive layout.

**Step 1: Create the components directory and component file**

Create `src/lib/components/CircleOfFifths.svelte`:

```svelte
<script lang="ts">
	import type { NoteName } from '$lib/music';
	import { NOTES, INTERVAL_LABELS, intervalBetween } from '$lib/music';

	interface Props {
		/** Circle of fifths note order, tonic at index 0 */
		notes: NoteName[];
		tonic: NoteName;
		nameMode: 'traditional' | 'augdim';
		showIntervals: boolean;
		enabledSemitones: number[];
		/** User's picked note (yellow highlight) */
		userPick: NoteName | null;
		/** Correct answer note (green highlight) */
		correctNote: NoteName | null;
		/** Currently sounding cadence note */
		cadenceNote: NoteName | null;
		onNoteClick?: (note: NoteName) => void;
	}

	let {
		notes,
		tonic,
		nameMode,
		showIntervals,
		enabledSemitones,
		userPick,
		correctNote,
		cadenceNote,
		onNoteClick,
	}: Props = $props();

	const SIZE = 400;
	const CX = SIZE / 2;
	const CY = SIZE / 2;

	// Ring dimensions
	const INTERVAL_OUTER_R = 185;
	const INTERVAL_INNER_R = 145;
	const NOTE_OUTER_R = 140;
	const NOTE_INNER_R = 75;
	const CENTER_R = 50;

	const SEGMENT_ANGLE = (2 * Math.PI) / 12;
	const GAP = 0.03; // radians between segments

	function toX(r: number, angle: number): number {
		return CX + r * Math.sin(angle);
	}

	function toY(r: number, angle: number): number {
		return CY - r * Math.cos(angle);
	}

	function arcPath(innerR: number, outerR: number, startAngle: number, endAngle: number): string {
		const x1 = toX(innerR, startAngle);
		const y1 = toY(innerR, startAngle);
		const x2 = toX(outerR, startAngle);
		const y2 = toY(outerR, startAngle);
		const x3 = toX(outerR, endAngle);
		const y3 = toY(outerR, endAngle);
		const x4 = toX(innerR, endAngle);
		const y4 = toY(innerR, endAngle);
		return [
			`M ${x1} ${y1}`,
			`L ${x2} ${y2}`,
			`A ${outerR} ${outerR} 0 0 1 ${x3} ${y3}`,
			`L ${x4} ${y4}`,
			`A ${innerR} ${innerR} 0 0 0 ${x1} ${y1}`,
			'Z',
		].join(' ');
	}

	function segmentCenter(innerR: number, outerR: number, position: number): { x: number; y: number } {
		const midAngle = position * SEGMENT_ANGLE;
		const midR = (innerR + outerR) / 2;
		return { x: toX(midR, midAngle), y: toY(midR, midAngle) };
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

<svg viewBox="0 0 {SIZE} {SIZE}" class="w-full max-w-lg mx-auto" role="group" aria-label="Circle of fifths">
	{#each notes as note, i}
		{@const startAngle = i * SEGMENT_ANGLE - SEGMENT_ANGLE / 2 + GAP}
		{@const endAngle = i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2 - GAP}
		{@const semitones = intervalBetween(tonic, note)}
		{@const enabled = enabledSemitones.includes(semitones)}
		{@const noteCenter = segmentCenter(NOTE_INNER_R, NOTE_OUTER_R, i)}
		{@const intervalCenter = segmentCenter(INTERVAL_INNER_R, INTERVAL_OUTER_R, i)}

		<!-- Interval ring (outer) -->
		{#if showIntervals}
			<path
				d={arcPath(INTERVAL_INNER_R, INTERVAL_OUTER_R, startAngle, endAngle)}
				fill="transparent"
				stroke={enabled ? NOTES[note].color : 'rgb(55, 65, 81)'}
				stroke-width="1"
				opacity={enabled ? 0.6 : 0.2}
			/>
			<text
				x={intervalCenter.x}
				y={intervalCenter.y}
				text-anchor="middle"
				dominant-baseline="central"
				fill={enabled ? NOTES[note].color : 'rgb(107, 114, 128)'}
				font-size="13"
				opacity={enabled ? 0.8 : 0.3}
				class="pointer-events-none select-none"
			>
				{INTERVAL_LABELS[semitones]}
			</text>
		{/if}

		<!-- Note ring (inner) — clickable -->
		<path
			d={arcPath(NOTE_INNER_R, NOTE_OUTER_R, startAngle, endAngle)}
			fill={getNoteFill(note)}
			stroke={NOTES[note].color}
			stroke-width="2"
			opacity={enabled ? 1 : 0.25}
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
			x={noteCenter.x}
			y={noteCenter.y}
			text-anchor="middle"
			dominant-baseline="central"
			fill={getNoteTextFill(note)}
			font-size="20"
			font-weight="bold"
			class="pointer-events-none select-none"
		>
			{getDisplayName(note)}
		</text>
	{/each}

	<!-- Center circle with tonic -->
	<circle cx={CX} cy={CY} r={CENTER_R} fill="transparent" stroke="rgb(75, 85, 99)" stroke-width="1" />
	<text
		x={CX}
		y={CY}
		text-anchor="middle"
		dominant-baseline="central"
		fill="rgb(229, 231, 235)"
		font-size="32"
		font-weight="bold"
		class="select-none"
	>
		{getDisplayName(tonic)}
	</text>
</svg>
```

**Step 2: Visually verify the component works**

We'll verify this when the quiz page is assembled in Task 5. For now, confirm the file compiles:

Run: `npx svelte-check --tsconfig ./tsconfig.json 2>&1 | head -30`
Expected: No errors in CircleOfFifths.svelte

**Step 3: Commit**

```bash
git add src/lib/components/CircleOfFifths.svelte
git commit -m "feat: add CircleOfFifths SVG component"
```

---

### Task 4: TopBar Component

**Files:**
- Create: `src/lib/components/TopBar.svelte`

**Context:** Uses `$bindable()` props for all settings (parent binds to them). The tonic change goes through a callback since it triggers side effects (cadence playback). Includes: Start/Stop, tonic selector, preset dropdown, interval toggles, name mode toggle, show intervals toggle, replay button.

**Step 1: Create the component**

Create `src/lib/components/TopBar.svelte`:

```svelte
<script lang="ts">
	import { CHROMATIC_NOTES, PRESETS, INTERVAL_LABELS, matchPreset, type NoteName } from '$lib/music';

	interface Props {
		playing: boolean;
		tonic: NoteName;
		preset: string;
		enabledSemitones: number[];
		nameMode: 'traditional' | 'augdim';
		showIntervals: boolean;
		onTogglePlay: () => void;
		onTonicChange: (tonic: NoteName) => void;
		onReplay: () => void;
		onPresetChange: (preset: string) => void;
		onSemitonesChange: (semitones: number[]) => void;
		onNameModeChange: (mode: 'traditional' | 'augdim') => void;
		onShowIntervalsChange: (show: boolean) => void;
	}

	let {
		playing,
		tonic,
		preset,
		enabledSemitones,
		nameMode,
		showIntervals,
		onTogglePlay,
		onTonicChange,
		onReplay,
		onPresetChange,
		onSemitonesChange,
		onNameModeChange,
		onShowIntervalsChange,
	}: Props = $props();

	function handlePresetSelect(e: Event) {
		const name = (e.target as HTMLSelectElement).value;
		const found = PRESETS.find((p) => p.name === name);
		if (found) {
			onPresetChange(name);
			onSemitonesChange([...found.semitones]);
		}
	}

	function toggleSemitone(semitone: number) {
		let next: number[];
		if (enabledSemitones.includes(semitone)) {
			next = enabledSemitones.filter((s) => s !== semitone);
		} else {
			next = [...enabledSemitones, semitone].sort((a, b) => a - b);
		}
		onSemitonesChange(next);
		onPresetChange(matchPreset(next));
	}
</script>

<div class="flex flex-wrap items-center gap-3 p-4 bg-gray-900 rounded-lg">
	<!-- Start / Stop -->
	<button
		onclick={onTogglePlay}
		class="px-5 py-2 rounded font-bold text-sm {playing
			? 'bg-red-600 hover:bg-red-700'
			: 'bg-green-600 hover:bg-green-700'}"
	>
		{playing ? 'Stop' : 'Start'}
	</button>

	<!-- Replay -->
	{#if playing}
		<button
			onclick={onReplay}
			class="px-3 py-2 rounded text-sm bg-gray-700 hover:bg-gray-600"
			title="Replay target note"
		>
			Replay
		</button>
	{/if}

	<!-- Tonic selector -->
	<div class="flex gap-1">
		{#each CHROMATIC_NOTES as k}
			<button
				onclick={() => onTonicChange(k)}
				class="px-2 py-1 rounded text-xs {tonic === k
					? 'bg-blue-600'
					: 'bg-gray-700 hover:bg-gray-600'}"
			>
				{k}
			</button>
		{/each}
	</div>

	<!-- Preset -->
	<select
		value={preset}
		onchange={handlePresetSelect}
		class="bg-gray-800 rounded px-2 py-1 text-sm"
	>
		{#each PRESETS as p}
			<option value={p.name}>{p.name}</option>
		{/each}
		{#if preset === 'Custom'}
			<option value="Custom">Custom</option>
		{/if}
	</select>

	<!-- Interval toggles -->
	<div class="flex gap-1 flex-wrap">
		{#each INTERVAL_LABELS as label, i}
			<button
				onclick={() => toggleSemitone(i)}
				class="px-1.5 py-0.5 rounded text-xs {enabledSemitones.includes(i)
					? 'bg-indigo-600'
					: 'bg-gray-700 hover:bg-gray-600'}"
			>
				{label}
			</button>
		{/each}
	</div>

	<!-- Name mode toggle -->
	<button
		onclick={() => onNameModeChange(nameMode === 'traditional' ? 'augdim' : 'traditional')}
		class="px-3 py-1 rounded text-xs bg-gray-700 hover:bg-gray-600"
	>
		{nameMode === 'traditional' ? 'Traditional' : 'Aug Dim'}
	</button>

	<!-- Show intervals toggle -->
	<label class="flex items-center gap-1 text-xs cursor-pointer">
		<input
			type="checkbox"
			checked={showIntervals}
			onchange={() => onShowIntervalsChange(!showIntervals)}
			class="rounded"
		/>
		Intervals
	</label>
</div>
```

**Step 2: Verify compilation**

Run: `npx svelte-check --tsconfig ./tsconfig.json 2>&1 | head -30`
Expected: No errors in TopBar.svelte

**Step 3: Commit**

```bash
git add src/lib/components/TopBar.svelte
git commit -m "feat: add TopBar component with tonic, presets, and interval controls"
```

---

### Task 5: Quiz Page

**Files:**
- Create: `src/routes/quiz/+page.svelte`

**Context:** This is the main integration point. It owns all state, instantiates DroneEngine and QuizAudio, and implements the quiz state machine. The drone uses hardcoded params from `DEFAULT_PARAMS` in `drone.ts`. The page coordinates: TopBar for controls, CircleOfFifths for display/input, drone for backing, PluckSynth for quiz notes.

**Step 1: Create the quiz page**

Create `src/routes/quiz/+page.svelte`:

```svelte
<script lang="ts">
	import { onDestroy } from 'svelte';
	import * as Tone from 'tone';
	import { DroneEngine, DEFAULT_PARAMS } from '$lib/drone';
	import { QuizAudio } from '$lib/quiz-audio';
	import {
		type NoteName,
		PRESETS,
		getCircleForTonic,
		pickRandomTarget,
		getCadenceNotes,
		matchPreset,
	} from '$lib/music';
	import CircleOfFifths from '$lib/components/CircleOfFifths.svelte';
	import TopBar from '$lib/components/TopBar.svelte';

	// Quiz state
	type QuizState = 'idle' | 'playing_cadence' | 'awaiting_answer' | 'showing_feedback';

	let quizState: QuizState = $state('idle');
	let playing = $state(false);

	// Settings
	let tonic: NoteName = $state('C');
	let preset = $state('Major');
	let enabledSemitones: number[] = $state([...PRESETS[0].semitones]);
	let nameMode: 'traditional' | 'augdim' = $state('traditional');
	let showIntervals = $state(true);

	// Quiz note state
	let targetNote: NoteName | null = $state(null);
	let targetPitch: string | null = $state(null);
	let userPick: NoteName | null = $state(null);
	let correctNote: NoteName | null = $state(null);
	let cadenceNote: NoteName | null = $state(null);

	// Derived
	const circleNotes = $derived(getCircleForTonic(tonic));

	// Audio engines
	const drone = new DroneEngine();
	const quizAudio = new QuizAudio();

	let feedbackTimeout: ReturnType<typeof setTimeout> | null = null;

	async function togglePlay() {
		if (playing) {
			stopQuiz();
		} else {
			await startQuiz();
		}
	}

	async function startQuiz() {
		await Tone.start();
		drone.buildGraph();
		await drone.start();
		playing = true;
		playNextNote();
	}

	function stopQuiz() {
		if (feedbackTimeout) {
			clearTimeout(feedbackTimeout);
			feedbackTimeout = null;
		}
		drone.stop();
		playing = false;
		quizState = 'idle';
		targetNote = null;
		targetPitch = null;
		userPick = null;
		correctNote = null;
		cadenceNote = null;
	}

	function playNextNote() {
		userPick = null;
		correctNote = null;
		cadenceNote = null;
		const target = pickRandomTarget(tonic, enabledSemitones);
		targetNote = target.note;
		targetPitch = `${target.note}${target.octave}`;
		quizAudio.playNote(targetPitch);
		quizState = 'awaiting_answer';
	}

	function handleNoteClick(note: NoteName) {
		if (quizState !== 'awaiting_answer') return;
		userPick = note;
		correctNote = targetNote;
		quizState = 'showing_feedback';

		// Replay the target note so user hears the correct answer
		if (targetPitch) {
			quizAudio.playNote(targetPitch);
		}

		// Advance after 1s
		feedbackTimeout = setTimeout(() => {
			playNextNote();
		}, 1000);
	}

	function handleReplay() {
		if (targetPitch && (quizState === 'awaiting_answer' || quizState === 'showing_feedback')) {
			quizAudio.playNote(targetPitch);
		}
	}

	async function handleTonicChange(newTonic: NoteName) {
		if (newTonic === tonic) return;
		tonic = newTonic;
		drone.setKey(newTonic);

		if (!playing) return;

		// Clear any pending feedback
		if (feedbackTimeout) {
			clearTimeout(feedbackTimeout);
			feedbackTimeout = null;
		}

		// Play I-IV-V-I cadence
		quizState = 'playing_cadence';
		userPick = null;
		correctNote = null;
		targetNote = null;

		const cadenceNotes = getCadenceNotes(newTonic);
		await quizAudio.playCadence(
			cadenceNotes.map((c) => c.pitch),
			(_pitch, index) => {
				cadenceNote = cadenceNotes[index].note;
			},
		);
		cadenceNote = null;

		// Resume quiz
		playNextNote();
	}

	function handlePresetChange(newPreset: string) {
		preset = newPreset;
	}

	function handleSemitonesChange(newSemitones: number[]) {
		enabledSemitones = newSemitones;
	}

	function handleNameModeChange(mode: 'traditional' | 'augdim') {
		nameMode = mode;
	}

	function handleShowIntervalsChange(show: boolean) {
		showIntervals = show;
	}

	onDestroy(() => {
		if (feedbackTimeout) clearTimeout(feedbackTimeout);
		drone.dispose();
		quizAudio.dispose();
	});
</script>

<div class="min-h-screen bg-gray-950 text-gray-100 p-4">
	<TopBar
		{playing}
		{tonic}
		{preset}
		{enabledSemitones}
		{nameMode}
		{showIntervals}
		onTogglePlay={togglePlay}
		onTonicChange={handleTonicChange}
		onReplay={handleReplay}
		onPresetChange={handlePresetChange}
		onSemitonesChange={handleSemitonesChange}
		onNameModeChange={handleNameModeChange}
		onShowIntervalsChange={handleShowIntervalsChange}
	/>

	<div class="mt-6 flex justify-center">
		<CircleOfFifths
			notes={circleNotes}
			{tonic}
			{nameMode}
			{showIntervals}
			{enabledSemitones}
			{userPick}
			{correctNote}
			{cadenceNote}
			onNoteClick={handleNoteClick}
		/>
	</div>
</div>
```

**Step 2: Start the dev server and test manually**

Run: `npm run dev`

Open `http://localhost:5173/quiz` in a browser. Verify:

1. Circle of fifths renders with 12 note segments and center tonic
2. Top bar controls are visible and functional
3. Clicking "Start" begins the drone and plays a quiz note
4. Clicking a note on the circle triggers feedback (yellow for pick, green for correct)
5. After 1s feedback, a new note plays automatically
6. Changing tonic plays I-IV-V-I cadence with notes highlighted
7. Preset dropdown changes interval toggles
8. Name mode toggle switches between traditional and Aug Dim names
9. Show intervals toggle hides/shows the outer ring
10. Replay button replays the current target note

**Step 3: Commit**

```bash
git add src/routes/quiz/+page.svelte
git commit -m "feat: add quiz page with circle of fifths and ear training state machine"
```

---

### Task 6: Run All Tests

**Files:** None (verification only)

**Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: All tests pass (music.test.ts, quiz-audio.test.ts, drone.test.ts, smoke.test.ts)

**Step 2: Run type checking**

Run: `npx svelte-check --tsconfig ./tsconfig.json`
Expected: No errors

**Step 3: If any failures, fix them before proceeding**

---
