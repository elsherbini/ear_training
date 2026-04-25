<script lang="ts">
	import { onDestroy } from 'svelte';
	import { DroneEngine, DEFAULT_PARAMS } from '$lib/drone';

	const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

	let engine: DroneEngine | null = $state(null);
	let playing = $state(false);

	// Top bar
	let key = $state(DEFAULT_PARAMS.key);
	let startOctave = $state(DEFAULT_PARAMS.startOctave);
	let numOctaves = $state(DEFAULT_PARAMS.numOctaves);
	let masterVolume = $state(DEFAULT_PARAMS.masterVolume);

	// AM params
	let amHarmonicity = $state(DEFAULT_PARAMS.am.harmonicity);
	let amModIndex = $state(DEFAULT_PARAMS.am.modulationIndex);
	let amLfoRate = $state(DEFAULT_PARAMS.am.lfoRate);
	let amLfoDepth = $state(DEFAULT_PARAMS.am.lfoDepth);
	let amLfoSpread = $state(DEFAULT_PARAMS.am.lfoSpread);
	let amDrift = $state(DEFAULT_PARAMS.am.driftAmount);

	// FM params
	let fmHarmonicity = $state(DEFAULT_PARAMS.fm.harmonicity);
	let fmModIndex = $state(DEFAULT_PARAMS.fm.modulationIndex);
	let fmLfoRate = $state(DEFAULT_PARAMS.fm.lfoRate);
	let fmLfoDepth = $state(DEFAULT_PARAMS.fm.lfoDepth);
	let fmLfoSpread = $state(DEFAULT_PARAMS.fm.lfoSpread);
	let fmDrift = $state(DEFAULT_PARAMS.fm.driftAmount);

	// Voice gains (up to 8)
	let voiceGains = $state([...DEFAULT_PARAMS.voiceGains]);

	// Effects
	let compThreshold = $state(DEFAULT_PARAMS.effects.compressorThreshold);
	let compRatio = $state(DEFAULT_PARAMS.effects.compressorRatio);
	let delayTime = $state(DEFAULT_PARAMS.effects.delayTime);
	let delayFeedback = $state(DEFAULT_PARAMS.effects.delayFeedback);
	let delayWet = $state(DEFAULT_PARAMS.effects.delayWet);
	let reverbDecay = $state(DEFAULT_PARAMS.effects.reverbDecay);
	let reverbWet = $state(DEFAULT_PARAMS.effects.reverbWet);

	// Voice labels derived from current key and octave range
	const voiceLabels = $derived.by(() => {
		const labels: string[] = [];
		for (let i = 0; i < numOctaves; i++) {
			labels.push(`AM ${key}${startOctave + i}`);
		}
		for (let i = 0; i < numOctaves; i++) {
			labels.push(`FM ${key}${startOctave + i}`);
		}
		return labels;
	});

	function getEngine(): DroneEngine {
		if (!engine) {
			engine = new DroneEngine();
		}
		return engine;
	}

	async function togglePlay() {
		const e = getEngine();
		if (playing) {
			e.stop();
			playing = false;
		} else {
			e.buildGraph();
			await e.start();
			playing = true;
		}
	}

	function handleKeyChange(newKey: string) {
		key = newKey;
		engine?.setKey(newKey);
	}

	function handleOctaveChange() {
		// Resize voiceGains array
		const total = numOctaves * 2;
		while (voiceGains.length < total) voiceGains.push(1);
		voiceGains = voiceGains.slice(0, total);
		engine?.setOctaveRange(startOctave, numOctaves);
	}

	// Reactive updates: push UI state to engine when values change
	$effect(() => {
		engine?.setMasterVolume(masterVolume);
	});

	$effect(() => {
		engine?.updateAmParams({
			harmonicity: amHarmonicity,
			modulationIndex: amModIndex,
			lfoRate: amLfoRate,
			lfoDepth: amLfoDepth,
			lfoSpread: amLfoSpread,
			driftAmount: amDrift,
		});
	});

	$effect(() => {
		engine?.updateFmParams({
			harmonicity: fmHarmonicity,
			modulationIndex: fmModIndex,
			lfoRate: fmLfoRate,
			lfoDepth: fmLfoDepth,
			lfoSpread: fmLfoSpread,
			driftAmount: fmDrift,
		});
	});

	$effect(() => {
		engine?.updateEffects({
			compressorThreshold: compThreshold,
			compressorRatio: compRatio,
			delayTime: delayTime,
			delayFeedback: delayFeedback,
			delayWet: delayWet,
			reverbDecay: reverbDecay,
			reverbWet: reverbWet,
		});
	});

	$effect(() => {
		voiceGains.forEach((g, i) => engine?.setVoiceGain(i, g));
	});

	onDestroy(() => {
		engine?.dispose();
	});
</script>

<div class="min-h-screen bg-gray-950 text-gray-100 p-6">
	<h1 class="text-2xl font-bold mb-6">Drone Test Page</h1>

	<!-- Top Bar -->
	<div class="flex flex-wrap items-center gap-4 mb-8 p-4 bg-gray-900 rounded-lg">
		<button
			onclick={togglePlay}
			class="px-6 py-2 rounded font-bold {playing ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}"
		>
			{playing ? 'Stop' : 'Start'}
		</button>

		<div class="flex gap-1">
			{#each KEYS as k}
				<button
					onclick={() => handleKeyChange(k)}
					class="px-2 py-1 rounded text-sm {key === k ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}"
				>
					{k}
				</button>
			{/each}
		</div>

		<label class="flex items-center gap-2">
			<span class="text-sm">Volume</span>
			<input type="range" min="0" max="1" step="0.01" bind:value={masterVolume} class="w-32" />
			<span class="text-sm w-10">{masterVolume.toFixed(2)}</span>
		</label>

		<label class="flex items-center gap-2">
			<span class="text-sm">Start Oct</span>
			<input type="number" min="1" max="5" bind:value={startOctave} onchange={handleOctaveChange} class="w-16 bg-gray-800 rounded px-2 py-1" />
		</label>

		<label class="flex items-center gap-2">
			<span class="text-sm">Octaves</span>
			<input type="number" min="1" max="4" bind:value={numOctaves} onchange={handleOctaveChange} class="w-16 bg-gray-800 rounded px-2 py-1" />
		</label>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
		<!-- AM Synth Panel -->
		<div class="p-4 bg-gray-900 rounded-lg">
			<h2 class="text-lg font-semibold mb-4">AM Synth</h2>
			<label class="block mb-3">
				<span class="text-sm text-gray-400">Harmonicity ({amHarmonicity.toFixed(1)})</span>
				<input type="range" min="0.1" max="10" step="0.1" bind:value={amHarmonicity} class="w-full" />
			</label>
			<label class="block mb-3">
				<span class="text-sm text-gray-400">Mod Index ({amModIndex.toFixed(1)})</span>
				<input type="range" min="0.1" max="20" step="0.1" bind:value={amModIndex} class="w-full" />
			</label>
			<label class="block mb-3">
				<span class="text-sm text-gray-400">LFO Rate ({amLfoRate.toFixed(3)} Hz)</span>
				<input type="range" min="0.01" max="1" step="0.01" bind:value={amLfoRate} class="w-full" />
			</label>
			<label class="block mb-3">
				<span class="text-sm text-gray-400">LFO Depth ({(amLfoDepth * 100).toFixed(0)}%)</span>
				<input type="range" min="0" max="1" step="0.01" bind:value={amLfoDepth} class="w-full" />
			</label>
			<label class="block mb-3">
				<span class="text-sm text-gray-400">LFO Spread ({(amLfoSpread * 100).toFixed(0)}%)</span>
				<input type="range" min="0" max="1" step="0.01" bind:value={amLfoSpread} class="w-full" />
			</label>
			<label class="block mb-3">
				<span class="text-sm text-gray-400">Drift ({(amDrift * 100).toFixed(0)}%)</span>
				<input type="range" min="0" max="1" step="0.01" bind:value={amDrift} class="w-full" />
			</label>
		</div>

		<!-- FM Synth Panel -->
		<div class="p-4 bg-gray-900 rounded-lg">
			<h2 class="text-lg font-semibold mb-4">FM Synth</h2>
			<label class="block mb-3">
				<span class="text-sm text-gray-400">Harmonicity ({fmHarmonicity.toFixed(1)})</span>
				<input type="range" min="0.1" max="10" step="0.1" bind:value={fmHarmonicity} class="w-full" />
			</label>
			<label class="block mb-3">
				<span class="text-sm text-gray-400">Mod Index ({fmModIndex.toFixed(1)})</span>
				<input type="range" min="0.1" max="20" step="0.1" bind:value={fmModIndex} class="w-full" />
			</label>
			<label class="block mb-3">
				<span class="text-sm text-gray-400">LFO Rate ({fmLfoRate.toFixed(3)} Hz)</span>
				<input type="range" min="0.01" max="1" step="0.01" bind:value={fmLfoRate} class="w-full" />
			</label>
			<label class="block mb-3">
				<span class="text-sm text-gray-400">LFO Depth ({(fmLfoDepth * 100).toFixed(0)}%)</span>
				<input type="range" min="0" max="1" step="0.01" bind:value={fmLfoDepth} class="w-full" />
			</label>
			<label class="block mb-3">
				<span class="text-sm text-gray-400">LFO Spread ({(fmLfoSpread * 100).toFixed(0)}%)</span>
				<input type="range" min="0" max="1" step="0.01" bind:value={fmLfoSpread} class="w-full" />
			</label>
			<label class="block mb-3">
				<span class="text-sm text-gray-400">Drift ({(fmDrift * 100).toFixed(0)}%)</span>
				<input type="range" min="0" max="1" step="0.01" bind:value={fmDrift} class="w-full" />
			</label>
		</div>

		<!-- Voice Gains Panel -->
		<div class="p-4 bg-gray-900 rounded-lg">
			<h2 class="text-lg font-semibold mb-4">Voice Gains</h2>
			{#each voiceLabels as label, i}
				<label class="block mb-3">
					<span class="text-sm text-gray-400">{label} ({(voiceGains[i] * 100).toFixed(0)}%)</span>
					<input type="range" min="0" max="1" step="0.01" bind:value={voiceGains[i]} class="w-full" />
				</label>
			{/each}
		</div>

		<!-- Effects Panel -->
		<div class="p-4 bg-gray-900 rounded-lg">
			<h2 class="text-lg font-semibold mb-4">Effects</h2>
			<label class="block mb-3">
				<span class="text-sm text-gray-400">Comp Threshold ({compThreshold} dB)</span>
				<input type="range" min="-60" max="0" step="1" bind:value={compThreshold} class="w-full" />
			</label>
			<label class="block mb-3">
				<span class="text-sm text-gray-400">Comp Ratio ({compRatio.toFixed(1)})</span>
				<input type="range" min="1" max="20" step="0.5" bind:value={compRatio} class="w-full" />
			</label>
			<label class="block mb-3">
				<span class="text-sm text-gray-400">Delay Time ({delayTime.toFixed(2)}s)</span>
				<input type="range" min="0" max="1" step="0.01" bind:value={delayTime} class="w-full" />
			</label>
			<label class="block mb-3">
				<span class="text-sm text-gray-400">Delay Feedback ({(delayFeedback * 100).toFixed(0)}%)</span>
				<input type="range" min="0" max="1" step="0.01" bind:value={delayFeedback} class="w-full" />
			</label>
			<label class="block mb-3">
				<span class="text-sm text-gray-400">Delay Wet ({(delayWet * 100).toFixed(0)}%)</span>
				<input type="range" min="0" max="1" step="0.01" bind:value={delayWet} class="w-full" />
			</label>
			<label class="block mb-3">
				<span class="text-sm text-gray-400">Reverb Decay ({reverbDecay.toFixed(1)}s)</span>
				<input type="range" min="0.1" max="10" step="0.1" bind:value={reverbDecay} class="w-full" />
			</label>
			<label class="block mb-3">
				<span class="text-sm text-gray-400">Reverb Wet ({(reverbWet * 100).toFixed(0)}%)</span>
				<input type="range" min="0" max="1" step="0.01" bind:value={reverbWet} class="w-full" />
			</label>
		</div>
	</div>
</div>
