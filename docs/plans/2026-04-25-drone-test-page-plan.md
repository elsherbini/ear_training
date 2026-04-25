# Drone Test Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a `/drone` test page with an 8-voice Tone.js drone engine and real-time parameter controls for sound design exploration.

**Architecture:** A `DroneEngine` class in `src/lib/drone.ts` encapsulates all Tone.js audio (8 synths, LFOs, meta-LFOs, effects chain). A Svelte page at `src/routes/drone/+page.svelte` provides the UI. The engine exposes methods to update parameters; the UI calls them reactively.

**Tech Stack:** SvelteKit, Svelte 5 (runes), Tone.js v15, Tailwind v4, Vitest

**Reference:** `docs/plans/2026-04-25-drone-test-page-design.md`

---

### Task 1: DroneEngine core - types and constructor

**Files:**
- Create: `src/lib/drone.ts`
- Create: `src/lib/drone.test.ts`

**Step 1: Write the test for DroneEngine construction**

Create `src/lib/drone.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Tone.js - it requires AudioContext which isn't available in Node
vi.mock('tone', () => {
	const mockConnect = vi.fn().mockReturnThis();
	const mockChain = vi.fn().mockReturnThis();
	const mockStart = vi.fn().mockReturnThis();
	const mockStop = vi.fn().mockReturnThis();
	const mockDispose = vi.fn();
	const mockTriggerAttack = vi.fn().mockReturnThis();
	const mockTriggerRelease = vi.fn().mockReturnThis();
	const mockRampTo = vi.fn().mockReturnThis();

	const createMockParam = (value: number = 0) => ({
		value,
		rampTo: mockRampTo,
		setValueAtTime: vi.fn(),
	});

	const createMockSignal = (value: number = 0) => ({
		value,
		rampTo: mockRampTo,
	});

	const createMockSynth = () => ({
		connect: mockConnect,
		chain: mockChain,
		triggerAttack: mockTriggerAttack,
		triggerRelease: mockTriggerRelease,
		dispose: mockDispose,
		frequency: createMockSignal(440),
		volume: createMockParam(0),
		set: vi.fn(),
	});

	const createMockLFO = () => ({
		connect: mockConnect,
		start: mockStart,
		stop: mockStop,
		dispose: mockDispose,
		frequency: createMockSignal(1),
		amplitude: createMockParam(1),
		min: 0,
		max: 1,
		type: 'sine' as const,
		set: vi.fn(),
	});

	const createMockGain = () => ({
		connect: mockConnect,
		chain: mockChain,
		dispose: mockDispose,
		gain: createMockParam(1),
	});

	return {
		AMSynth: vi.fn().mockImplementation(() => createMockSynth()),
		FMSynth: vi.fn().mockImplementation(() => createMockSynth()),
		LFO: vi.fn().mockImplementation(() => createMockLFO()),
		Gain: vi.fn().mockImplementation(() => createMockGain()),
		Compressor: vi.fn().mockImplementation(() => ({
			connect: mockConnect,
			chain: mockChain,
			dispose: mockDispose,
			threshold: createMockParam(-24),
			ratio: createMockParam(12),
		})),
		FeedbackDelay: vi.fn().mockImplementation(() => ({
			connect: mockConnect,
			chain: mockChain,
			dispose: mockDispose,
			delayTime: createMockParam(0.3),
			feedback: createMockParam(0.3),
			wet: createMockSignal(0.2),
		})),
		Reverb: vi.fn().mockImplementation(() => ({
			connect: mockConnect,
			chain: mockChain,
			toDestination: vi.fn().mockReturnThis(),
			dispose: mockDispose,
			decay: 4,
			wet: createMockSignal(0.4),
		})),
		getDestination: vi.fn().mockReturnValue({
			connect: mockConnect,
		}),
		start: vi.fn().mockResolvedValue(undefined),
	};
});

import { DroneEngine, type DroneParams } from './drone';

describe('DroneEngine', () => {
	it('constructs with default params', () => {
		const engine = new DroneEngine();
		expect(engine).toBeDefined();
	});

	it('constructs with custom params', () => {
		const params: DroneParams = {
			key: 'D',
			startOctave: 3,
			numOctaves: 3,
			masterVolume: 0.7,
			am: {
				harmonicity: 2,
				modulationIndex: 5,
				lfoRate: 0.2,
				lfoDepth: 0.6,
				lfoSpread: 0.3,
				driftAmount: 0.4,
			},
			fm: {
				harmonicity: 3,
				modulationIndex: 8,
				lfoRate: 0.15,
				lfoDepth: 0.5,
				lfoSpread: 0.5,
				driftAmount: 0.6,
			},
			voiceGains: [1, 1, 1, 1, 1, 1, 1, 1],
			effects: {
				compressorThreshold: -20,
				compressorRatio: 4,
				delayTime: 0.3,
				delayFeedback: 0.3,
				delayWet: 0.2,
				reverbDecay: 4,
				reverbWet: 0.4,
			},
		};
		const engine = new DroneEngine(params);
		expect(engine).toBeDefined();
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/drone.test.ts`
Expected: FAIL - cannot find `./drone` module

**Step 3: Write DroneEngine types and constructor**

Create `src/lib/drone.ts`:

```ts
import * as Tone from 'tone';

export interface SynthGroupParams {
	harmonicity: number;
	modulationIndex: number;
	lfoRate: number;
	lfoDepth: number;
	lfoSpread: number;
	driftAmount: number;
}

export interface EffectsParams {
	compressorThreshold: number;
	compressorRatio: number;
	delayTime: number;
	delayFeedback: number;
	delayWet: number;
	reverbDecay: number;
	reverbWet: number;
}

export interface DroneParams {
	key: string;
	startOctave: number;
	numOctaves: number;
	masterVolume: number;
	am: SynthGroupParams;
	fm: SynthGroupParams;
	voiceGains: number[];
	effects: EffectsParams;
}

export const DEFAULT_PARAMS: DroneParams = {
	key: 'C',
	startOctave: 2,
	numOctaves: 4,
	masterVolume: 0.5,
	am: {
		harmonicity: 1.5,
		modulationIndex: 5,
		lfoRate: 0.1,
		lfoDepth: 0.5,
		lfoSpread: 0.4,
		driftAmount: 0.3,
	},
	fm: {
		harmonicity: 2,
		modulationIndex: 3,
		lfoRate: 0.08,
		lfoDepth: 0.5,
		lfoSpread: 0.4,
		driftAmount: 0.3,
	},
	voiceGains: [1, 1, 1, 1, 1, 1, 1, 1],
	effects: {
		compressorThreshold: -24,
		compressorRatio: 4,
		delayTime: 0.3,
		delayFeedback: 0.3,
		delayWet: 0.2,
		reverbDecay: 4,
		reverbWet: 0.4,
	},
};

const META_LFO_RATE = 0.02;

interface Voice {
	synth: Tone.AMSynth | Tone.FMSynth;
	gain: Tone.Gain;
	lfo: Tone.LFO;
	metaLfoRate: Tone.LFO;
	metaLfoDepth: Tone.LFO;
}

/**
 * Compute spread LFO rates for N voices.
 * At spread=0 all voices get baseRate.
 * At spread=1 voices span from baseRate*0.5 to baseRate*1.5.
 */
function computeSpreadRates(baseRate: number, spread: number, count: number): number[] {
	if (count === 1) return [baseRate];
	return Array.from({ length: count }, (_, i) => {
		return baseRate * (1 - spread / 2) + (spread * baseRate * i) / (count - 1);
	});
}

export class DroneEngine {
	private params: DroneParams;
	private amVoices: Voice[] = [];
	private fmVoices: Voice[] = [];
	private masterGain: Tone.Gain | null = null;
	private compressor: Tone.Compressor | null = null;
	private delay: Tone.FeedbackDelay | null = null;
	private reverb: Tone.Reverb | null = null;
	private _playing = false;

	constructor(params?: Partial<DroneParams>) {
		this.params = { ...DEFAULT_PARAMS, ...params };
	}

	get playing(): boolean {
		return this._playing;
	}
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/drone.test.ts`
Expected: 2 tests pass

**Step 5: Commit**

```bash
git add src/lib/drone.ts src/lib/drone.test.ts
git commit -m "feat(drone): add DroneEngine types and constructor"
```

---

### Task 2: DroneEngine audio graph creation

**Files:**
- Modify: `src/lib/drone.ts`
- Modify: `src/lib/drone.test.ts`

**Step 1: Write the test for audio graph build**

Add to `src/lib/drone.test.ts` inside the `describe('DroneEngine', ...)` block:

```ts
	it('creates correct number of voices based on numOctaves', () => {
		const engine = new DroneEngine({ numOctaves: 3 });
		engine.buildGraph();
		// 3 octaves = 3 AM + 3 FM = 6 voices
		expect(engine.voiceCount).toBe(6);
	});

	it('creates 8 voices with default 4 octaves', () => {
		const engine = new DroneEngine();
		engine.buildGraph();
		expect(engine.voiceCount).toBe(8);
	});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/drone.test.ts`
Expected: FAIL - `buildGraph` is not a function

**Step 3: Implement buildGraph**

Add to `DroneEngine` class in `src/lib/drone.ts`:

```ts
	get voiceCount(): number {
		return this.amVoices.length + this.fmVoices.length;
	}

	buildGraph(): void {
		this.disposeGraph();

		const { am, fm, effects, masterVolume } = this.params;
		const octaves = this.getOctaves();

		// Effects chain
		this.masterGain = new Tone.Gain(masterVolume);
		this.compressor = new Tone.Compressor({
			threshold: effects.compressorThreshold,
			ratio: effects.compressorRatio,
		});
		this.delay = new Tone.FeedbackDelay({
			delayTime: effects.delayTime,
			feedback: effects.delayFeedback,
			wet: effects.delayWet,
		});
		this.reverb = new Tone.Reverb({
			decay: effects.reverbDecay,
			wet: effects.reverbWet,
		});
		this.masterGain.chain(this.compressor, this.delay, this.reverb, Tone.getDestination());

		// AM voices
		const amRates = computeSpreadRates(am.lfoRate, am.lfoSpread, octaves.length);
		this.amVoices = octaves.map((octave, i) => {
			return this.createVoice('am', octave, i, amRates[i], am);
		});

		// FM voices
		const fmRates = computeSpreadRates(fm.lfoRate, fm.lfoSpread, octaves.length);
		this.fmVoices = octaves.map((octave, i) => {
			return this.createVoice('fm', octave, i, fmRates[i], fm);
		});
	}

	private getOctaves(): number[] {
		const { startOctave, numOctaves } = this.params;
		return Array.from({ length: numOctaves }, (_, i) => startOctave + i);
	}

	private createVoice(
		type: 'am' | 'fm',
		octave: number,
		index: number,
		lfoRate: number,
		groupParams: SynthGroupParams,
	): Voice {
		// Voice gain node
		const voiceIndex = type === 'am' ? index : index + this.params.numOctaves;
		const gain = new Tone.Gain(this.params.voiceGains[voiceIndex] ?? 1);
		gain.connect(this.masterGain!);

		// Synth
		const synth =
			type === 'am'
				? new Tone.AMSynth({
						harmonicity: groupParams.harmonicity,
						envelope: { attack: 2, decay: 0.5, sustain: 1, release: 2 },
					})
				: new Tone.FMSynth({
						harmonicity: groupParams.harmonicity,
						modulationIndex: groupParams.modulationIndex,
						envelope: { attack: 2, decay: 0.5, sustain: 1, release: 2 },
					});
		synth.connect(gain);

		// Main LFO: modulates voice gain
		const lfo = new Tone.LFO({
			frequency: lfoRate,
			min: 1 - groupParams.lfoDepth,
			max: 1,
			type: 'sine',
		});
		lfo.connect(gain.gain);

		// Meta-LFO for rate drift
		const driftRange = lfoRate * groupParams.driftAmount;
		const metaLfoRate = new Tone.LFO({
			frequency: META_LFO_RATE,
			min: lfoRate - driftRange,
			max: lfoRate + driftRange,
			type: 'sine',
		});
		metaLfoRate.connect(lfo.frequency);

		// Meta-LFO for depth drift
		const metaLfoDepth = new Tone.LFO({
			frequency: META_LFO_RATE,
			min: Math.max(0, groupParams.lfoDepth - groupParams.driftAmount * 0.3),
			max: Math.min(1, groupParams.lfoDepth + groupParams.driftAmount * 0.3),
			type: 'sine',
			phase: 90, // offset from rate meta-LFO
		});
		metaLfoDepth.connect(lfo.amplitude);

		return { synth, gain, lfo, metaLfoRate, metaLfoDepth };
	}

	private disposeGraph(): void {
		[...this.amVoices, ...this.fmVoices].forEach((v) => {
			v.metaLfoDepth.dispose();
			v.metaLfoRate.dispose();
			v.lfo.dispose();
			v.synth.dispose();
			v.gain.dispose();
		});
		this.amVoices = [];
		this.fmVoices = [];
		this.reverb?.dispose();
		this.delay?.dispose();
		this.compressor?.dispose();
		this.masterGain?.dispose();
		this.reverb = null;
		this.delay = null;
		this.compressor = null;
		this.masterGain = null;
	}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/drone.test.ts`
Expected: 4 tests pass

**Step 5: Commit**

```bash
git add src/lib/drone.ts src/lib/drone.test.ts
git commit -m "feat(drone): implement audio graph creation with LFO and meta-LFO"
```

---

### Task 3: DroneEngine start/stop and key change

**Files:**
- Modify: `src/lib/drone.ts`
- Modify: `src/lib/drone.test.ts`

**Step 1: Write the tests**

Add to `src/lib/drone.test.ts`:

```ts
	it('starts and stops the drone', async () => {
		const engine = new DroneEngine();
		engine.buildGraph();
		await engine.start();
		expect(engine.playing).toBe(true);
		engine.stop();
		expect(engine.playing).toBe(false);
	});

	it('changes key with frequency ramp', async () => {
		const engine = new DroneEngine({ key: 'C' });
		engine.buildGraph();
		await engine.start();
		engine.setKey('D');
		// Verify synths had rampTo called on frequency
		const voices = engine.getAllVoices();
		voices.forEach((v) => {
			expect(v.synth.frequency.rampTo).toHaveBeenCalled();
		});
	});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/drone.test.ts`
Expected: FAIL - `start` and `getAllVoices` not found

**Step 3: Implement start, stop, setKey, getAllVoices**

Add to `DroneEngine` class in `src/lib/drone.ts`:

```ts
	getAllVoices(): Voice[] {
		return [...this.amVoices, ...this.fmVoices];
	}

	async start(): Promise<void> {
		if (this._playing) return;
		await Tone.start();

		if (this.voiceCount === 0) {
			this.buildGraph();
		}

		const octaves = this.getOctaves();
		const { key } = this.params;

		// Start all LFOs
		this.getAllVoices().forEach((v) => {
			v.lfo.start();
			v.metaLfoRate.start();
			v.metaLfoDepth.start();
		});

		// Trigger all synths
		this.amVoices.forEach((v, i) => {
			v.synth.triggerAttack(`${key}${octaves[i]}`);
		});
		this.fmVoices.forEach((v, i) => {
			v.synth.triggerAttack(`${key}${octaves[i]}`);
		});

		this._playing = true;
	}

	stop(): void {
		if (!this._playing) return;

		this.getAllVoices().forEach((v) => {
			v.synth.triggerRelease();
			v.lfo.stop();
			v.metaLfoRate.stop();
			v.metaLfoDepth.stop();
		});

		this._playing = false;
	}

	setKey(key: string): void {
		this.params.key = key;
		if (!this._playing) return;

		const octaves = this.getOctaves();
		this.amVoices.forEach((v, i) => {
			v.synth.frequency.rampTo(Tone.Frequency(`${key}${octaves[i]}`).toFrequency(), 0.5);
		});
		this.fmVoices.forEach((v, i) => {
			v.synth.frequency.rampTo(Tone.Frequency(`${key}${octaves[i]}`).toFrequency(), 0.5);
		});
	}
```

Note: `Tone.Frequency` is used to convert note names to Hz. Add it to the mock in `drone.test.ts` — add this inside the `vi.mock('tone', ...)` factory:

```ts
		Frequency: vi.fn().mockImplementation((note: string) => ({
			toFrequency: vi.fn().mockReturnValue(440),
		})),
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/drone.test.ts`
Expected: 6 tests pass

**Step 5: Commit**

```bash
git add src/lib/drone.ts src/lib/drone.test.ts
git commit -m "feat(drone): implement start, stop, and key change with frequency ramp"
```

---

### Task 4: DroneEngine parameter update methods

**Files:**
- Modify: `src/lib/drone.ts`
- Modify: `src/lib/drone.test.ts`

**Step 1: Write the tests**

Add to `src/lib/drone.test.ts`:

```ts
	it('updates master volume', () => {
		const engine = new DroneEngine();
		engine.buildGraph();
		engine.setMasterVolume(0.8);
		// masterGain.gain.rampTo should be called
		expect(engine.getParams().masterVolume).toBe(0.8);
	});

	it('updates voice gain', () => {
		const engine = new DroneEngine();
		engine.buildGraph();
		engine.setVoiceGain(0, 0.5);
		expect(engine.getParams().voiceGains[0]).toBe(0.5);
	});

	it('updates AM synth group params', () => {
		const engine = new DroneEngine();
		engine.buildGraph();
		engine.updateAmParams({ harmonicity: 3 });
		expect(engine.getParams().am.harmonicity).toBe(3);
	});

	it('updates FM synth group params', () => {
		const engine = new DroneEngine();
		engine.buildGraph();
		engine.updateFmParams({ lfoRate: 0.5 });
		expect(engine.getParams().fm.lfoRate).toBe(0.5);
	});

	it('updates effects params', () => {
		const engine = new DroneEngine();
		engine.buildGraph();
		engine.updateEffects({ reverbDecay: 6 });
		expect(engine.getParams().effects.reverbDecay).toBe(6);
	});

	it('updates octave range and rebuilds', () => {
		const engine = new DroneEngine();
		engine.buildGraph();
		engine.setOctaveRange(3, 2);
		expect(engine.voiceCount).toBe(4);
		expect(engine.getParams().startOctave).toBe(3);
		expect(engine.getParams().numOctaves).toBe(2);
	});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/drone.test.ts`
Expected: FAIL - methods not found

**Step 3: Implement parameter update methods**

Add to `DroneEngine` class in `src/lib/drone.ts`:

```ts
	getParams(): DroneParams {
		return { ...this.params };
	}

	setMasterVolume(value: number): void {
		this.params.masterVolume = value;
		this.masterGain?.gain.rampTo(value, 0.1);
	}

	setVoiceGain(index: number, value: number): void {
		this.params.voiceGains[index] = value;
		const voices = this.getAllVoices();
		if (voices[index]) {
			voices[index].gain.gain.rampTo(value, 0.1);
		}
	}

	updateAmParams(partial: Partial<SynthGroupParams>): void {
		Object.assign(this.params.am, partial);
		this.applySynthGroupParams('am');
	}

	updateFmParams(partial: Partial<SynthGroupParams>): void {
		Object.assign(this.params.fm, partial);
		this.applySynthGroupParams('fm');
	}

	private applySynthGroupParams(type: 'am' | 'fm'): void {
		const voices = type === 'am' ? this.amVoices : this.fmVoices;
		const groupParams = type === 'am' ? this.params.am : this.params.fm;
		const rates = computeSpreadRates(groupParams.lfoRate, groupParams.lfoSpread, voices.length);

		voices.forEach((v, i) => {
			// Update synth params
			v.synth.set({ harmonicity: groupParams.harmonicity });
			if ('modulationIndex' in v.synth) {
				(v.synth as Tone.FMSynth).set({ modulationIndex: groupParams.modulationIndex });
			}

			// Update LFO
			v.lfo.frequency.rampTo(rates[i], 0.5);
			v.lfo.min = 1 - groupParams.lfoDepth;

			// Update meta-LFO drift
			const driftRange = rates[i] * groupParams.driftAmount;
			v.metaLfoRate.min = rates[i] - driftRange;
			v.metaLfoRate.max = rates[i] + driftRange;
			v.metaLfoDepth.min = Math.max(0, groupParams.lfoDepth - groupParams.driftAmount * 0.3);
			v.metaLfoDepth.max = Math.min(1, groupParams.lfoDepth + groupParams.driftAmount * 0.3);
		});
	}

	updateEffects(partial: Partial<EffectsParams>): void {
		Object.assign(this.params.effects, partial);
		const e = this.params.effects;
		this.compressor?.threshold.rampTo(e.compressorThreshold, 0.1);
		this.compressor?.ratio.rampTo(e.compressorRatio, 0.1);
		this.delay?.delayTime.rampTo(e.delayTime, 0.1);
		this.delay?.feedback.rampTo(e.delayFeedback, 0.1);
		this.delay?.wet.rampTo(e.delayWet, 0.1);
		if (this.reverb) {
			this.reverb.decay = e.reverbDecay;
			this.reverb.wet.rampTo(e.reverbWet, 0.1);
		}
	}

	setOctaveRange(startOctave: number, numOctaves: number): void {
		const wasPlaying = this._playing;
		if (wasPlaying) this.stop();
		this.params.startOctave = startOctave;
		this.params.numOctaves = numOctaves;
		// Ensure voiceGains array is correct length
		const totalVoices = numOctaves * 2;
		while (this.params.voiceGains.length < totalVoices) {
			this.params.voiceGains.push(1);
		}
		this.params.voiceGains = this.params.voiceGains.slice(0, totalVoices);
		this.buildGraph();
		if (wasPlaying) this.start();
	}

	dispose(): void {
		this.stop();
		this.disposeGraph();
	}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/drone.test.ts`
Expected: 12 tests pass

**Step 5: Commit**

```bash
git add src/lib/drone.ts src/lib/drone.test.ts
git commit -m "feat(drone): add parameter update methods for all controls"
```

---

### Task 5: computeSpreadRates unit tests

**Files:**
- Modify: `src/lib/drone.test.ts`
- Modify: `src/lib/drone.ts` (export `computeSpreadRates`)

**Step 1: Export computeSpreadRates**

In `src/lib/drone.ts`, change `function computeSpreadRates` to `export function computeSpreadRates`.

**Step 2: Write the tests**

Add a new describe block in `src/lib/drone.test.ts`:

```ts
import { DroneEngine, computeSpreadRates, type DroneParams } from './drone';

describe('computeSpreadRates', () => {
	it('returns all same rate when spread is 0', () => {
		const rates = computeSpreadRates(0.1, 0, 4);
		expect(rates).toEqual([0.1, 0.1, 0.1, 0.1]);
	});

	it('spreads rates from 0.5x to 1.5x when spread is 1', () => {
		const rates = computeSpreadRates(0.1, 1, 4);
		expect(rates[0]).toBeCloseTo(0.05);
		expect(rates[3]).toBeCloseTo(0.15);
	});

	it('handles single voice', () => {
		const rates = computeSpreadRates(0.1, 0.5, 1);
		expect(rates).toEqual([0.1]);
	});

	it('spreads symmetrically around base rate at moderate spread', () => {
		const rates = computeSpreadRates(0.1, 0.5, 4);
		const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
		expect(avg).toBeCloseTo(0.1, 2);
	});
});
```

**Step 3: Run tests**

Run: `npx vitest run src/lib/drone.test.ts`
Expected: All tests pass (previous + 4 new)

**Step 4: Commit**

```bash
git add src/lib/drone.ts src/lib/drone.test.ts
git commit -m "test(drone): add unit tests for computeSpreadRates"
```

---

### Task 6: Drone test page - basic route and controls layout

**Files:**
- Create: `src/routes/drone/+page.svelte`

**Step 1: Create the drone route with all UI controls**

Create `src/routes/drone/+page.svelte`:

```svelte
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { DroneEngine, DEFAULT_PARAMS, type DroneParams, type SynthGroupParams, type EffectsParams } from '$lib/drone';

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
```

**Step 2: Verify the page loads**

Run: `npm run dev` and navigate to `http://localhost:5173/drone`
Expected: Page renders with all control panels, no console errors.

**Step 3: Commit**

```bash
git add src/routes/drone/+page.svelte
git commit -m "feat(drone): add drone test page with full parameter controls UI"
```

---

### Task 7: Integration test - verify dev server builds

**Files:** None new

**Step 1: Run all unit tests**

Run: `npx vitest run`
Expected: All tests pass

**Step 2: Run type checking**

Run: `npx svelte-check --tsconfig ./tsconfig.json`
Expected: No errors (warnings OK)

**Step 3: Run the dev build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit (only if any fixes were needed)**

```bash
git add -A
git commit -m "fix(drone): address build/type issues"
```

---

### Task 8: Manual listening test

**Files:** None

**Step 1: Start the dev server**

Run: `npm run dev`

**Step 2: Open `http://localhost:5173/drone` in a browser**

**Step 3: Test the following manually:**

1. Click "Start" — hear a sustained drone in the key of C
2. Move the AM harmonicity slider — hear the AM timbre change
3. Move the FM mod index slider — hear the FM timbre change
4. Click a different key (e.g., "D") — hear the drone smoothly glide to D
5. Move voice gain sliders — hear individual voices get louder/quieter
6. Move LFO depth slider — hear volume modulation
7. Move drift slider — hear the modulation slowly evolve
8. Change octave range — voices rebuild correctly
9. Click "Stop" — silence

**Step 4: Fix any issues found during manual testing, commit fixes**

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat(drone): complete drone test page, ready for sound design"
```
