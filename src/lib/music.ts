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
	augGroup: number;
	dimGroup: number;
}

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

export type LayoutMode = 'fifths' | 'chromatic' | 'augmented' | 'diminished';

export function getChromaticCircle(tonic: NoteName): NoteName[] {
	const idx = CHROMATIC_NOTES.indexOf(tonic);
	return [...CHROMATIC_NOTES.slice(idx), ...CHROMATIC_NOTES.slice(0, idx)];
}

export function noteFromInterval(tonic: NoteName, semitones: number): NoteName {
	const tonicIndex = CHROMATIC_NOTES.indexOf(tonic);
	const noteIndex = ((tonicIndex + semitones) % 12 + 12) % 12;
	return CHROMATIC_NOTES[noteIndex];
}

export function intervalBetween(tonic: NoteName, note: NoteName): number {
	const tonicIndex = CHROMATIC_NOTES.indexOf(tonic);
	const noteIndex = CHROMATIC_NOTES.indexOf(note);
	return (noteIndex - tonicIndex + 12) % 12;
}

export function intervalLabel(semitones: number): string {
	return INTERVAL_LABELS[((semitones % 12) + 12) % 12];
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
	lastPick?: { note: NoteName; octave: number },
	recentHistory?: { note: NoteName; octave: number }[],
): { note: NoteName; octave: number } {
	if (enabledSemitones.length === 0) {
		return { note: tonic, octave: 3 };
	}

	// Build all candidates: each semitone × each octave
	const candidates: { note: NoteName; octave: number }[] = [];
	for (const semitone of enabledSemitones) {
		const note = noteFromInterval(tonic, semitone);
		candidates.push({ note, octave: 2 });
		candidates.push({ note, octave: 3 });
	}

	// Remove last pick to prevent back-to-back repeat
	const filtered = lastPick
		? candidates.filter((c) => !(c.note === lastPick.note && c.octave === lastPick.octave))
		: candidates;

	const pool = filtered.length > 0 ? filtered : candidates;

	// Weight: 2 for notes not in recent history, 1 for notes in recent history
	const history = recentHistory ?? [];
	const weights = pool.map((c) => {
		const inRecent = history.some((h) => h.note === c.note && h.octave === c.octave);
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

export interface MelodyNote {
	note: NoteName;
	octave: number;
	semitone: number;
}

/**
 * Generate a 3-note melody from enabled intervals.
 * All notes stay within one octave of the starting note.
 */
export function generateMelody(
	tonic: NoteName,
	enabledSemitones: number[],
): MelodyNote[] {
	const pool = enabledSemitones;
	if (pool.length === 0) {
		return [
			{ note: tonic, octave: 3, semitone: 0 },
			{ note: tonic, octave: 3, semitone: 0 },
			{ note: tonic, octave: 3, semitone: 0 },
		];
	}

	const tonicIndex = CHROMATIC_NOTES.indexOf(tonic);

	function pickNote(): { note: NoteName; semitone: number; chromaticIndex: number } {
		const semitone = pool[Math.floor(Math.random() * pool.length)];
		const note = noteFromInterval(tonic, semitone);
		const chromaticIndex = (tonicIndex + semitone) % 12;
		return { note, semitone, chromaticIndex };
	}

	// Note 1: start in octave 3
	const n1 = pickNote();
	const startPitch = n1.chromaticIndex + 3 * 12; // absolute pitch number

	const notes: MelodyNote[] = [{ note: n1.note, octave: 3, semitone: n1.semitone }];

	let prevPitch = startPitch;

	// Notes 2 and 3: pick direction, compute octave, clamp within 1 octave of start
	for (let i = 0; i < 2; i++) {
		const n = pickNote();
		const goUp = Math.random() < 0.5;

		// Find closest pitch in chosen direction
		let pitch = n.chromaticIndex + Math.floor(prevPitch / 12) * 12;
		if (goUp && pitch <= prevPitch) pitch += 12;
		if (!goUp && pitch >= prevPitch) pitch -= 12;

		// Clamp within one octave of start note
		while (pitch - startPitch > 12) pitch -= 12;
		while (startPitch - pitch > 12) pitch += 12;

		const octave = Math.floor(pitch / 12);
		notes.push({ note: n.note, octave, semitone: n.semitone });
		prevPitch = pitch;
	}

	return notes;
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
