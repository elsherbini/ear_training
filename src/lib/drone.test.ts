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
		AMSynth: vi.fn().mockImplementation(function () { return createMockSynth(); }),
		FMSynth: vi.fn().mockImplementation(function () { return createMockSynth(); }),
		LFO: vi.fn().mockImplementation(function () { return createMockLFO(); }),
		Gain: vi.fn().mockImplementation(function () { return createMockGain(); }),
		Compressor: vi.fn().mockImplementation(function () {
			return {
				connect: mockConnect,
				chain: mockChain,
				dispose: mockDispose,
				threshold: createMockParam(-24),
				ratio: createMockParam(12),
			};
		}),
		FeedbackDelay: vi.fn().mockImplementation(function () {
			return {
				connect: mockConnect,
				chain: mockChain,
				dispose: mockDispose,
				delayTime: createMockParam(0.3),
				feedback: createMockParam(0.3),
				wet: createMockSignal(0.2),
			};
		}),
		Reverb: vi.fn().mockImplementation(function () {
			return {
				connect: mockConnect,
				chain: mockChain,
				toDestination: vi.fn().mockReturnThis(),
				dispose: mockDispose,
				decay: 4,
				wet: createMockSignal(0.4),
			};
		}),
		getDestination: vi.fn().mockReturnValue({
			connect: mockConnect,
		}),
		Frequency: vi.fn().mockImplementation((note: string) => ({
			toFrequency: vi.fn().mockReturnValue(440),
		})),
		start: vi.fn().mockResolvedValue(undefined),
	};
});

import { DroneEngine, type DroneParams } from './drone';

describe('DroneEngine', () => {
	it('constructs with default params', () => {
		const engine = new DroneEngine();
		expect(engine).toBeDefined();
	});

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
