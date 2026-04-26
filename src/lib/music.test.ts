import { describe, it, expect, vi } from 'vitest';
import {
	CHROMATIC_NOTES,
	CIRCLE_OF_FIFTHS,
	NOTES,
	INTERVAL_LABELS,
	PRESETS,
	getCircleForTonic,
	getChromaticCircle,
	noteFromInterval,
	intervalBetween,
	intervalLabel,
	matchPreset,
	pickRandomTarget,
	getCadenceNotes,
	getAccidentalMode,
	getTraditionalDisplayName,
	type NoteName,
	type AccidentalMode,
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
		expect(NOTES['C'].color).toBe(yellow);
		expect(NOTES['Eb'].color).toBe(yellow);
		expect(NOTES['Gb'].color).toBe(yellow);
		expect(NOTES['A'].color).toBe(yellow);
		expect(NOTES['G'].color).toBe(red);
		expect(NOTES['Bb'].color).toBe(red);
		expect(NOTES['Db'].color).toBe(red);
		expect(NOTES['E'].color).toBe(red);
		expect(NOTES['D'].color).toBe(blue);
		expect(NOTES['F'].color).toBe(blue);
		expect(NOTES['Ab'].color).toBe(blue);
		expect(NOTES['B'].color).toBe(blue);
	});

	it('diminished groups share the same vowel', () => {
		const eGroup = ['C', 'Eb', 'Gb', 'A'] as const;
		for (const n of eGroup) expect(NOTES[n].augDim[1]).toBe('e');
		const aGroup = ['G', 'Bb', 'Db', 'E'] as const;
		for (const n of aGroup) expect(NOTES[n].augDim[1]).toBe('a');
		const oGroup = ['D', 'F', 'Ab', 'B'] as const;
		for (const n of oGroup) expect(NOTES[n].augDim[1]).toBe('o');
	});

	it('augmented groups share the same consonant', () => {
		const nGroup = ['C', 'E', 'Ab'] as const;
		for (const n of nGroup) expect(NOTES[n].augDim[0]).toBe('N');
		const jGroup = ['Db', 'F', 'A'] as const;
		for (const n of jGroup) expect(NOTES[n].augDim[0]).toBe('J');
		const kGroup = ['D', 'Gb', 'Bb'] as const;
		for (const n of kGroup) expect(NOTES[n].augDim[0]).toBe('K');
		const pGroup = ['Eb', 'G', 'B'] as const;
		for (const n of pGroup) expect(NOTES[n].augDim[0]).toBe('P');
	});

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

	it('has 12 interval labels', () => {
		expect(INTERVAL_LABELS).toHaveLength(12);
		expect(INTERVAL_LABELS[0]).toBe('1');
		expect(INTERVAL_LABELS[6]).toBe('#4');
		expect(INTERVAL_LABELS[7]).toBe('5');
	});

	it('has correct presets', () => {
		expect(PRESETS).toHaveLength(10);
		const major = PRESETS.find((p) => p.name === 'Major');
		expect(major?.semitones).toEqual([0, 2, 4, 5, 7, 9, 11]);
		const chromatic = PRESETS.find((p) => p.name === 'Chromatic');
		expect(chromatic?.semitones).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
	});

	it('has correct diminished/octatonic presets', () => {
		expect(PRESETS.find((p) => p.name === 'Maj6 Diminished')?.semitones).toEqual([0, 2, 4, 5, 7, 8, 9, 11]);
		expect(PRESETS.find((p) => p.name === 'Min6 Diminished')?.semitones).toEqual([0, 2, 3, 5, 7, 8, 9, 11]);
		expect(PRESETS.find((p) => p.name === 'Dom7 Diminished')?.semitones).toEqual([0, 2, 4, 5, 7, 8, 10, 11]);
		expect(PRESETS.find((p) => p.name === 'Dom7b5 Diminished')?.semitones).toEqual([0, 2, 4, 5, 6, 8, 10, 11]);
		expect(PRESETS.find((p) => p.name === 'Octatonic')?.semitones).toEqual([0, 2, 3, 5, 6, 8, 9, 11]);
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
		expect(noteFromInterval('C', 7)).toBe('G');
		expect(noteFromInterval('C', 5)).toBe('F');
		expect(noteFromInterval('C', 4)).toBe('E');
	});

	it('wraps around correctly', () => {
		expect(noteFromInterval('G', 5)).toBe('C');
		expect(noteFromInterval('A', 4)).toBe('Db');
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
		expect(intervalBetween('G', 'C')).toBe(5);
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

	it('matches diminished/octatonic presets', () => {
		expect(matchPreset([0, 2, 4, 5, 7, 8, 9, 11])).toBe('Maj6 Diminished');
		expect(matchPreset([0, 2, 3, 5, 7, 8, 9, 11])).toBe('Min6 Diminished');
		expect(matchPreset([0, 2, 4, 5, 7, 8, 10, 11])).toBe('Dom7 Diminished');
		expect(matchPreset([0, 2, 4, 5, 6, 8, 10, 11])).toBe('Dom7b5 Diminished');
		expect(matchPreset([0, 2, 3, 5, 6, 8, 9, 11])).toBe('Octatonic');
	});
});

describe('pickRandomTarget', () => {
	it('returns a note from enabled intervals', () => {
		const result = pickRandomTarget('C', [0, 7]);
		expect(['C', 'G']).toContain(result.note);
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
		const result = pickRandomTarget('C', [0]);
		expect(result.note).toBe('C');
	});
});

describe('pickRandomTarget weighted selection', () => {
	const tonic: NoteName = 'C';
	const majorSemitones = [0, 2, 4, 5, 7, 9, 11];

	it('returns a valid note and octave', () => {
		const result = pickRandomTarget(tonic, majorSemitones);
		expect(result).toHaveProperty('note');
		expect(result).toHaveProperty('octave');
		expect([2, 3]).toContain(result.octave);
	});

	it('returns tonic at octave 3 when no semitones enabled', () => {
		const result = pickRandomTarget('C', []);
		expect(result).toEqual({ note: 'C', octave: 3 });
	});

	it('never repeats the last pick', () => {
		const lastPick = { note: 'E' as NoteName, octave: 3 };
		for (let i = 0; i < 100; i++) {
			const result = pickRandomTarget(tonic, majorSemitones, lastPick);
			const isSame = result.note === lastPick.note && result.octave === lastPick.octave;
			expect(isSame).toBe(false);
		}
	});

	it('still works when only one semitone enabled (can only avoid same octave)', () => {
		const lastPick = { note: 'C' as NoteName, octave: 3 };
		for (let i = 0; i < 50; i++) {
			const result = pickRandomTarget(tonic, [0], lastPick);
			// Should always return octave 2 since octave 3 is excluded
			expect(result).toEqual({ note: 'C', octave: 2 });
		}
	});

	it('weights recent notes lower than non-recent notes', () => {
		// With 2 semitones [0, 2] and recent history containing all octave variants of semitone 0 (C),
		// semitone 2 (D) should appear roughly twice as often
		const recentHistory = [
			{ note: 'C' as NoteName, octave: 2 },
			{ note: 'C' as NoteName, octave: 3 },
		];
		const counts: Record<string, number> = {};
		const iterations = 3000;
		for (let i = 0; i < iterations; i++) {
			const result = pickRandomTarget(tonic, [0, 2], undefined, recentHistory);
			const key = `${result.note}${result.octave}`;
			counts[key] = (counts[key] || 0) + 1;
		}
		// D2 and D3 each have weight 2, C2 and C3 each have weight 1
		// So D notes should appear ~2x as often as C notes
		const dTotal = (counts['D2'] || 0) + (counts['D3'] || 0);
		const cTotal = (counts['C2'] || 0) + (counts['C3'] || 0);
		const ratio = dTotal / cTotal;
		expect(ratio).toBeGreaterThan(1.5);
		expect(ratio).toBeLessThan(2.5);
	});

	it('works with both lastPick and recentHistory together', () => {
		const lastPick = { note: 'C' as NoteName, octave: 2 };
		const recentHistory = [
			{ note: 'C' as NoteName, octave: 2 },
			{ note: 'C' as NoteName, octave: 3 },
		];
		for (let i = 0; i < 100; i++) {
			const result = pickRandomTarget(tonic, [0, 2], lastPick, recentHistory);
			const isSame = result.note === lastPick.note && result.octave === lastPick.octave;
			expect(isSame).toBe(false);
		}
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

	it('uses major bias for Maj6 Diminished', () => {
		expect(getAccidentalMode('G', 'Maj6 Diminished')).toBe('sharp');
		expect(getAccidentalMode('F', 'Maj6 Diminished')).toBe('flat');
	});

	it('uses minor bias for Min6 Diminished', () => {
		expect(getAccidentalMode('E', 'Min6 Diminished')).toBe('sharp');
		expect(getAccidentalMode('D', 'Min6 Diminished')).toBe('flat');
	});

	it('uses major bias for Dom7 Diminished', () => {
		expect(getAccidentalMode('G', 'Dom7 Diminished')).toBe('sharp');
		expect(getAccidentalMode('F', 'Dom7 Diminished')).toBe('flat');
	});

	it('uses major bias for Dom7b5 Diminished', () => {
		expect(getAccidentalMode('G', 'Dom7b5 Diminished')).toBe('sharp');
		expect(getAccidentalMode('F', 'Dom7b5 Diminished')).toBe('flat');
	});

	it('uses minor bias for Octatonic', () => {
		expect(getAccidentalMode('E', 'Octatonic')).toBe('sharp');
		expect(getAccidentalMode('D', 'Octatonic')).toBe('flat');
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
		expect(getTraditionalDisplayName(6, 'G', 'Major', 'sharp')).toBe('F#');
	});

	it('returns sharp names for chromatic notes in a sharp key', () => {
		expect(getTraditionalDisplayName(8, 'G', 'Major', 'sharp')).toBe('G#');
	});

	it('returns correct diatonic names for Gb major', () => {
		expect(getTraditionalDisplayName(6, 'Gb', 'Major', 'flat')).toBe('Gb');
		expect(getTraditionalDisplayName(11, 'Gb', 'Major', 'flat')).toBe('Cb');
		expect(getTraditionalDisplayName(5, 'Gb', 'Major', 'flat')).toBe('F');
	});

	it('handles G harmonic minor: diatonic F# in a flat key', () => {
		expect(getTraditionalDisplayName(6, 'G', 'Harmonic Minor', 'flat')).toBe('F#');
	});

	it('chromatic notes in G harmonic minor follow flat bias', () => {
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
