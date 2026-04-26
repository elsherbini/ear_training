import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockTriggerAttackRelease = vi.fn();
const mockDispose = vi.fn();
const mockToDestination = vi.fn().mockReturnThis();

vi.mock('tone', () => ({
	PluckSynth: vi.fn().mockImplementation(function () { return ({
		triggerAttackRelease: mockTriggerAttackRelease,
		dispose: mockDispose,
		toDestination: mockToDestination,
	}); }),
	start: vi.fn().mockResolvedValue(undefined),
}));

import { QuizAudio } from './quiz-audio';

describe('QuizAudio', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('constructs without error', () => {
		const audio = new QuizAudio();
		expect(audio).toBeDefined();
	});

	it('plays a note with triggerAttackRelease', () => {
		const audio = new QuizAudio();
		audio.playNote('C3');
		expect(mockTriggerAttackRelease).toHaveBeenCalledWith('C3', '2n');
	});

	it('plays cadence notes sequentially with delays', async () => {
		vi.useFakeTimers();
		const audio = new QuizAudio();
		const onNote = vi.fn();

		const promise = audio.playCadence(
			['C3', 'F3', 'G3', 'C3'],
			onNote,
		);

		expect(mockTriggerAttackRelease).toHaveBeenCalledTimes(1);
		expect(mockTriggerAttackRelease).toHaveBeenCalledWith('C3', '8n');
		expect(onNote).toHaveBeenCalledWith('C3', 0);

		for (let i = 1; i < 4; i++) {
			await vi.advanceTimersByTimeAsync(300);
		}

		await promise;
		expect(mockTriggerAttackRelease).toHaveBeenCalledTimes(4);
		expect(onNote).toHaveBeenCalledTimes(4);

		vi.useRealTimers();
	});

	it('disposes the synth', () => {
		const audio = new QuizAudio();
		audio.dispose();
		expect(mockDispose).toHaveBeenCalled();
	});
});
