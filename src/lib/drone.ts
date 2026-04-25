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

export interface Voice {
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
}
