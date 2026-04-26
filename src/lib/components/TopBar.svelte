<script lang="ts">
	import { base } from '$app/paths';
	import { CHROMATIC_NOTES, NOTES, PRESETS, INTERVAL_LABELS, matchPreset, getTraditionalDisplayName, type NoteName, type AccidentalMode } from '$lib/music';

	interface Props {
		tonic: NoteName;
		preset: string;
		enabledSemitones: number[];
		nameMode: 'traditional' | 'augdim';
		showIntervals: boolean;
		accidentalMode: AccidentalMode;
		onTonicChange: (tonic: NoteName) => void;
		onPresetChange: (preset: string) => void;
		onSemitonesChange: (semitones: number[]) => void;
		onNameModeChange: (mode: 'traditional' | 'augdim') => void;
		onAccidentalModeChange: (mode: AccidentalMode) => void;
		onShowIntervalsChange: (show: boolean) => void;
	}

	let {
		tonic,
		preset,
		enabledSemitones,
		nameMode,
		showIntervals,
		accidentalMode,
		onTonicChange,
		onPresetChange,
		onSemitonesChange,
		onNameModeChange,
		onAccidentalModeChange,
		onShowIntervalsChange,
	}: Props = $props();

	function getDisplayName(note: NoteName): string {
		if (nameMode === 'augdim') return NOTES[note].augDim;
		return getTraditionalDisplayName(NOTES[note].semitones, tonic, preset, accidentalMode);
	}

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
	<!-- Tonic selector -->
	<div class="flex gap-1">
		{#each CHROMATIC_NOTES as k}
			<button
				onclick={() => onTonicChange(k)}
				class="px-2 py-1 rounded text-xs {tonic === k
					? 'bg-blue-600'
					: 'bg-gray-700 hover:bg-gray-600'}"
			>
				{getDisplayName(k)}
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
				? 'bg-blue-600'
				: 'bg-gray-800 text-gray-400 hover:bg-gray-700'}"
		>
			<span class={nameMode === 'traditional' && accidentalMode === 'flat' ? 'font-bold' : 'text-gray-400'}>♭</span>
			<span class={nameMode === 'traditional' && accidentalMode === 'sharp' ? 'font-bold' : 'text-gray-400'}>♯</span>
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

	<!-- Show intervals toggle -->
	<label class="flex items-center gap-1 text-xs cursor-pointer">
		<input
			type="checkbox"
			checked={showIntervals}
			onchange={() => onShowIntervalsChange(!showIntervals)}
			class="rounded"
		/>
		Show intervals
	</label>

	<!-- Drone link -->
	<a href="{base}/drone" class="ml-auto text-2xl hover:scale-110 transition-transform" title="Drone">🛸</a>
</div>
