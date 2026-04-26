<script lang="ts">
	import type { NoteName, AccidentalMode } from '$lib/music';
	import { NOTES, INTERVAL_LABELS, intervalBetween, getTraditionalDisplayName } from '$lib/music';
	import type { IntervalStats } from '$lib/stats';

	interface Props {
		/** Circle of fifths note order, tonic at index 0 */
		notes: NoteName[];
		tonic: NoteName;
		nameMode: 'traditional' | 'augdim';
		showIntervals: boolean;
		showStats: boolean;
		stats: Record<number, IntervalStats>;
		enabledSemitones: number[];
		/** User's picked note (yellow highlight) */
		userPick: NoteName | null;
		/** Correct answer note (green highlight) */
		correctNote: NoteName | null;
		/** Currently sounding cadence note */
		cadenceNote: NoteName | null;
		/** Melody mode indicator dots */
		melodyDots: { result: 'correct' | 'incorrect' | null }[];
		accidentalMode: AccidentalMode;
		preset: string;
		onNoteClick?: (note: NoteName) => void;
	}

	let {
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
		accidentalMode,
		preset,
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
		if (nameMode === 'augdim') return NOTES[note].augDim;
		return getTraditionalDisplayName(NOTES[note].semitones, tonic, preset, accidentalMode);
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
		{#if showIntervals || showStats}
			{@const s = stats[semitones]}
			<path
				d={arcPath(INTERVAL_INNER_R, INTERVAL_OUTER_R, startAngle, endAngle)}
				fill="transparent"
				stroke={enabled ? NOTES[note].color : 'rgb(55, 65, 81)'}
				stroke-width="1"
				opacity={enabled ? 0.6 : 0.2}
			/>
			{#if showIntervals}
				<text
					x={intervalCenter.x}
					y={intervalCenter.y - (showStats && s ? 6 : 0)}
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
			{#if showStats && s}
				<text
					x={intervalCenter.x}
					y={intervalCenter.y + (showIntervals ? 8 : 0)}
					text-anchor="middle"
					dominant-baseline="central"
					fill={enabled ? NOTES[note].color : 'rgb(107, 114, 128)'}
					font-size="9"
					opacity={enabled ? 0.8 : 0.3}
					class="pointer-events-none select-none"
				>
					{s.correct}/{s.total} ({Math.round((s.correct / s.total) * 100)}%)
				</text>
			{/if}
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
			opacity={enabled ? 1 : 0.25}
			class="pointer-events-none select-none"
		>
			{getDisplayName(note)}
		</text>
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

	<!-- Melody indicator dots (inside center circle) -->
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
