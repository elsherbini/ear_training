<script lang="ts">
	import type { NoteName, LayoutMode, AccidentalMode } from '$lib/music';
	import type { IntervalStats } from '$lib/stats';
	import NoteCircle from './NoteCircle.svelte';
	import AugmentedCompass from './AugmentedCompass.svelte';
	import DiminishedGroups from './DiminishedGroups.svelte';
	import PianoLayout from './PianoLayout.svelte';

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
		cadencePitch: string | null;
		targetPitch: string | null;
		melodyDots: { result: 'correct' | 'incorrect' | null }[];
		accidentalMode: AccidentalMode;
		preset: string;
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
		cadencePitch,
		targetPitch,
		melodyDots = [],
		accidentalMode,
		preset,
		onNoteClick,
		onLayoutChange,
	}: Props = $props();

	const tabs: { mode: LayoutMode; label: string }[] = [
		{ mode: 'chromatic', label: 'Chromatic' },
		{ mode: 'fifths', label: '5ths' },
		{ mode: 'augmented', label: 'Augmented' },
		{ mode: 'diminished', label: 'Diminished' },
		{ mode: 'piano', label: 'Piano' },
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
			{accidentalMode}
			{preset}
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
			{accidentalMode}
			{preset}
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
			{accidentalMode}
			{preset}
			{onNoteClick}
		/>
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
			{cadencePitch}
			{melodyDots}
			{accidentalMode}
			{preset}
			{targetPitch}
			{onNoteClick}
		/>
	{/if}
</div>
