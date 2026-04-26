<script lang="ts">
	import {
		type NoteName,
		type AccidentalMode,
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
					pitch: `${sharpToNoteName(sharpName)}${octave}`,
				});
			}
		}
		return keys;
	}

	const allKeys = generatePianoKeys();
	const whiteKeys = allKeys.filter((k) => !k.isBlack);
	const blackKeys = allKeys.filter((k) => k.isBlack);

	// Black key positions as percentage of total white key width
	const blackKeyPositions = blackKeys.map((bk) => {
			const whiteIdx = whiteKeys.filter(
				(wk) => wk.octave < bk.octave || (wk.octave === bk.octave && SHARP_NOTES.indexOf(wk.sharpName) < SHARP_NOTES.indexOf(bk.sharpName)),
			).length;
			const pct = (whiteIdx / whiteKeys.length) * 100;
			return { ...bk, pct };
	});

	function getDisplayName(note: NoteName): string {
		if (nameMode === 'augdim') return NOTES[note].augDim;
		const semitone = NOTES[note].semitones;
		return getTraditionalDisplayName(semitone, tonic, preset, accidentalMode);
	}

	function getBadgeColor(key: PianoKey): string {
		// Feedback: correct answer gets green badge
		if (correctNote === key.note && targetPitch === key.pitch) return 'bg-green-500 text-gray-900';
		// Feedback: user's wrong pick gets yellow badge
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
