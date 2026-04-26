<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import * as Tone from 'tone';
	import { DroneEngine, DEFAULT_PARAMS } from '$lib/drone';
	import { QuizAudio } from '$lib/quiz-audio';
	import {
		type NoteName,
		type MelodyNote,
		PRESETS,
		getCircleForTonic,
		pickRandomTarget,
		generateMelody,
		getCadenceNotes,
		intervalBetween,
		matchPreset,
	} from '$lib/music';
	import { loadStats, saveStats, recordAnswer, clearStatsForKey, getKeyStats, type AllStats } from '$lib/stats';
	import NoteCircle from '$lib/components/NoteCircle.svelte';
	import TopBar from '$lib/components/TopBar.svelte';

	// Quiz state
	type QuizState = 'idle' | 'playing_cadence' | 'awaiting_answer' | 'showing_feedback';

	let quizState: QuizState = $state('idle');
	let playing = $state(false);

	// Settings
	let tonic: NoteName = $state('C');
	let preset = $state('Major');
	let enabledSemitones: number[] = $state([...PRESETS[0].semitones]);
	let nameMode: 'traditional' | 'augdim' = $state('augdim');
	let showIntervals = $state(true);
	let showStats = $state(false);
	let allStats: AllStats = $state({});
	let quizMode: 'interval' | 'melody' = $state('interval');

	// Melody mode state
	let melodyNotes: MelodyNote[] = $state([]);
	let melodyPitches: string[] = $state([]);
	let melodyIndex = $state(0);
	let melodyResults: ('correct' | 'incorrect' | null)[] = $state([]);

	onMount(() => {
		allStats = loadStats();
	});

	$effect(() => {
		saveStats(allStats);
	});

	// High tonics get a lower drone range
	const HIGH_TONICS: NoteName[] = ['G', 'Ab', 'A', 'Bb', 'B'];

	// Quiz note state
	let targetNote: NoteName | null = $state(null);
	let targetPitch: string | null = $state(null);
	let userPick: NoteName | null = $state(null);
	let correctNote: NoteName | null = $state(null);
	let cadenceNote: NoteName | null = $state(null);

	// Derived
	const circleNotes = $derived(getCircleForTonic(tonic));
	const keyStats = $derived(getKeyStats(allStats, tonic));
	const melodyDots = $derived(
		quizMode === 'melody' && melodyResults.length > 0
			? melodyResults.map((r) => ({ result: r }))
			: [],
	);

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

	function droneRangeForKey(key: NoteName): [number, number] {
		return HIGH_TONICS.includes(key) ? [1, 3] : [2, 4];
	}

	async function startQuiz() {
		await Tone.start();
		const [start, num] = droneRangeForKey(tonic);
		drone.setOctaveRange(start, num);
		await drone.start();
		playing = true;

		// Play cadence to establish the key, then start quiz
		quizState = 'playing_cadence';
		const cadenceNotes = getCadenceNotes(tonic);
		await quizAudio.playCadence(
			cadenceNotes.map((c) => c.pitch),
			(_pitch, index) => {
				cadenceNote = cadenceNotes[index].note;
			},
		);
		cadenceNote = null;

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
		melodyNotes = [];
		melodyPitches = [];
		melodyIndex = 0;
		melodyResults = [];
	}

	async function playNextNote() {
		userPick = null;
		correctNote = null;
		cadenceNote = null;

		if (quizMode === 'melody') {
			melodyNotes = generateMelody(tonic, enabledSemitones);
			melodyPitches = melodyNotes.map((n) => `${n.note}${n.octave}`);
			melodyIndex = 0;
			melodyResults = [null, null, null];
			await quizAudio.playMelody(melodyPitches);
			quizState = 'awaiting_answer';
		} else {
			const target = pickRandomTarget(tonic, enabledSemitones);
			targetNote = target.note;
			targetPitch = `${target.note}${target.octave}`;
			quizAudio.playNote(targetPitch);
			quizState = 'awaiting_answer';
		}
	}

	function handleNoteClick(note: NoteName) {
		if (quizState !== 'awaiting_answer') return;

		if (quizMode === 'melody') {
			handleMelodyClick(note);
		} else {
			handleIntervalClick(note);
		}
	}

	function handleIntervalClick(note: NoteName) {
		userPick = note;
		correctNote = targetNote;
		quizState = 'showing_feedback';

		// Record stats
		if (targetNote) {
			const semitone = intervalBetween(tonic, targetNote);
			allStats = recordAnswer(allStats, tonic, semitone, note === targetNote);
		}

		// Replay the target note so user hears the correct answer
		if (targetPitch) {
			quizAudio.playNote(targetPitch);
		}

		// Advance after 1s
		feedbackTimeout = setTimeout(() => {
			playNextNote();
		}, 1000);
	}

	async function handleMelodyClick(note: NoteName) {
		const expected = melodyNotes[melodyIndex];
		const isCorrect = note === expected.note;
		melodyResults = melodyResults.map((r, i) =>
			i === melodyIndex ? (isCorrect ? 'correct' : 'incorrect') : r,
		);
		melodyIndex++;

		if (melodyIndex >= 3) {
			quizState = 'showing_feedback';
			userPick = null;
			// Replay melody highlighting correct notes, then advance
			await quizAudio.playMelody(
				melodyPitches,
				(_pitch, idx) => {
					correctNote = melodyNotes[idx].note;
				},
			);
			correctNote = null;
			feedbackTimeout = setTimeout(() => {
				playNextNote();
			}, 800);
		}
	}

	async function handleReplay() {
		if (quizState !== 'awaiting_answer' && quizState !== 'showing_feedback') return;
		if (quizMode === 'melody' && melodyPitches.length > 0) {
			await quizAudio.playMelody(melodyPitches);
		} else if (targetPitch) {
			quizAudio.playNote(targetPitch);
		}
	}

	function handleQuizModeChange(mode: 'interval' | 'melody') {
		if (mode === quizMode) return;
		quizMode = mode;
		if (playing) {
			// Reset and play next in new mode
			if (feedbackTimeout) {
				clearTimeout(feedbackTimeout);
				feedbackTimeout = null;
			}
			playNextNote();
		}
	}

	async function handleTonicChange(newTonic: NoteName) {
		if (newTonic === tonic) return;
		tonic = newTonic;
		drone.setKey(newTonic);
		const [start, num] = droneRangeForKey(newTonic);
		drone.setOctaveRange(start, num);

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
		{tonic}
		{preset}
		{enabledSemitones}
		{nameMode}
		{showIntervals}
		onTonicChange={handleTonicChange}
		onPresetChange={handlePresetChange}
		onSemitonesChange={handleSemitonesChange}
		onNameModeChange={handleNameModeChange}
		onShowIntervalsChange={handleShowIntervalsChange}
	/>

	<!-- Large screens: buttons left of circle in grid -->
	<div class="mt-6 hidden md:grid grid-cols-12 items-center">
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
			<NoteCircle
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
				onNoteClick={handleNoteClick}
			/>
		</div>

		<div class="col-span-3"></div>
	</div>

	<!-- Small screens: circle above, buttons below -->
	<div class="mt-6 md:hidden flex flex-col items-center">
		<NoteCircle
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
			onNoteClick={handleNoteClick}
		/>

		<div class="mt-4 flex gap-3">
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
	</div>
</div>
