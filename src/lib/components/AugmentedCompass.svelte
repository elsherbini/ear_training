<script lang="ts">
	import { NOTES, CHROMATIC_NOTES, INTERVAL_LABELS, intervalBetween, getTraditionalDisplayName } from '$lib/music';
	import type { NoteName, AccidentalMode } from '$lib/music';
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

	// Within each cluster, 3 notes in downward equilateral triangle (side=60, needs ≥56 to avoid overlap with r=28)
	// dimGroup 1 (red) = top-left, dimGroup 0 (yellow) = top-right, dimGroup 2 (blue) = bottom
	const TRIANGLE_OFFSETS: { dx: number; dy: number }[] = [
		{ dx: 30, dy: -17 },   // dimGroup 0 (yellow) = top-right
		{ dx: -30, dy: -17 },  // dimGroup 1 (red) = top-left
		{ dx: 0, dy: 35 },     // dimGroup 2 (blue) = bottom
	];

	function getNotePosition(note: NoteName): { x: number; y: number } {
		const info = NOTES[note];
		const cluster = CLUSTER_CENTERS[info.augGroup];
		const offset = TRIANGLE_OFFSETS[info.dimGroup];
		return { x: cluster.x + offset.dx, y: cluster.y + offset.dy };
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
		if (nameMode === 'augdim') return NOTES[note].augDim;
		return getTraditionalDisplayName(NOTES[note].semitones, tonic, preset, accidentalMode);
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
