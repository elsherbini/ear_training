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
