import * as Tone from 'tone';

export class QuizAudio {
	private synth: Tone.MonoSynth | null = null;

	private ensureSynth(): Tone.MonoSynth {
		if (!this.synth) {
			this.synth = new Tone.MonoSynth({
				volume: -12,
				oscillator: { type: 'square' },
				envelope: {
					attack: 0.1,
					decay: 0.2,
					sustain: 0.5,
					release: 1.5,
				},
				filterEnvelope: {
					attack: 0.1,
					decay: 0.2,
					sustain: 0.5,
					release: 2,
					baseFrequency: 800,
					octaves: 2,
					exponent: 2,
				},
			}).toDestination();
		}
		return this.synth;
	}

	playNote(pitch: string): void {
		this.ensureSynth().triggerAttackRelease(pitch, '2n.');
	}

	async playCadence(
		pitches: string[],
		onNote?: (pitch: string, index: number) => void,
	): Promise<void> {
		const synth = this.ensureSynth();
		for (let i = 0; i < pitches.length; i++) {
			onNote?.(pitches[i], i);
			synth.triggerAttackRelease(pitches[i], '4n');
			if (i < pitches.length - 1) {
				await new Promise((resolve) => setTimeout(resolve, 500));
			}
		}
		// Pause after cadence before the target note
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}

	async playMelody(
		pitches: string[],
		onNote?: (pitch: string, index: number) => void,
	): Promise<void> {
		const synth = this.ensureSynth();
		for (let i = 0; i < pitches.length; i++) {
			onNote?.(pitches[i], i);
			synth.triggerAttackRelease(pitches[i], '4n');
			await new Promise((resolve) => setTimeout(resolve, 500));
		}
	}

	dispose(): void {
		this.synth?.dispose();
	}
}
