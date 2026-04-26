export type IntervalStats = { correct: number; total: number };
export type AllStats = Record<string, Record<number, IntervalStats>>;

const STORAGE_KEY = 'ear-training-stats';

export function loadStats(): AllStats {
	if (typeof localStorage === 'undefined') return {};
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? JSON.parse(raw) : {};
	} catch {
		return {};
	}
}

export function saveStats(stats: AllStats): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

export function recordAnswer(
	stats: AllStats,
	tonic: string,
	semitone: number,
	correct: boolean,
): AllStats {
	const updated = JSON.parse(JSON.stringify(stats)) as AllStats;
	if (!updated[tonic]) updated[tonic] = {};
	if (!updated[tonic][semitone]) updated[tonic][semitone] = { correct: 0, total: 0 };
	updated[tonic][semitone].total++;
	if (correct) updated[tonic][semitone].correct++;
	return updated;
}

export function clearStatsForKey(stats: AllStats, tonic: string): AllStats {
	const updated = JSON.parse(JSON.stringify(stats)) as AllStats;
	delete updated[tonic];
	return updated;
}

export function getKeyStats(
	stats: AllStats,
	tonic: string,
): Record<number, IntervalStats> {
	return stats[tonic] ?? {};
}
