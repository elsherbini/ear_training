# Quiz Page Design

## Purpose

The main ear training page. A drone establishes the tonic, a quiz note plays, and the user identifies the interval by clicking on a circle of fifths. Pure ear training without score pressure.

## Note Naming System ("Aug Dim" Names)

Each note has a two-letter name where the consonant encodes augmented chord membership and the vowel encodes diminished chord membership.

### Full Mapping

| Note | Traditional | Aug Dim | Color (RGB) |
|------|------------|---------|-------------|
| C | C | Ne | 215, 204, 59 (yellow) |
| Db | Db | Ja | 216, 37, 84 (red) |
| D | D | Ko | 77, 162, 210 (blue) |
| Eb | Eb | Pe | 215, 204, 59 (yellow) |
| E | E | Na | 216, 37, 84 (red) |
| F | F | Jo | 77, 162, 210 (blue) |
| Gb | Gb | Ke | 215, 204, 59 (yellow) |
| G | G | Pa | 216, 37, 84 (red) |
| Ab | Ab | No | 77, 162, 210 (blue) |
| A | A | Je | 215, 204, 59 (yellow) |
| Bb | Bb | Ka | 216, 37, 84 (red) |
| B | B | Po | 77, 162, 210 (blue) |

### Color Groups (by diminished chord)

- **Yellow** `rgb(215, 204, 59)`: C/Ne, Eb/Pe, Gb/Ke, A/Je (vowel "e")
- **Red** `rgb(216, 37, 84)`: G/Pa, Bb/Ka, Db/Ja, E/Na (vowel "a")
- **Blue** `rgb(77, 162, 210)`: D/Ko, F/Jo, Ab/No, B/Po (vowel "o")

Colors are fixed to notes -- they do NOT change when the tonic changes.

### Encoding Logic

- **Same consonant = same augmented chord** (major thirds): N={C,E,Ab}, J={Db,F,A}, K={D,Gb,Bb}, P={Eb,G,B}
- **Same vowel = same diminished chord** (minor thirds): e={C,Eb,Gb,A}, a={G,Bb,Db,E}, o={D,F,Ab,B}

## Interval Presets

| Preset | Intervals (semitones from tonic) |
|--------|----------------------------------|
| Major | 0, 2, 4, 5, 7, 9, 11 |
| Natural Minor | 0, 2, 3, 5, 7, 8, 10 |
| Harmonic Minor | 0, 2, 3, 5, 7, 8, 11 |
| Melodic Minor | 0, 2, 3, 5, 7, 9, 11 |
| Chromatic | 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 |

Selecting a preset sets the interval toggles. Manually toggling intervals changes preset to "Custom" unless the result matches an existing preset.

## UI Layout

### Top Menu Bar

- **Tonic selector** -- button showing current tonic (e.g. "C"), opens dropdown with 12 keys
- **Preset dropdown** -- Major, Natural Minor, Harmonic Minor, Melodic Minor, Chromatic, Custom
- **Interval toggles** -- 12 checkboxes (1, b2, 2, b3, 3, 4, #4, 5, b6, 6, b7, 7)
- **Name mode toggle** -- "Traditional" vs "Aug Dim"
- **Show intervals toggle** -- on/off

### Circle of Fifths (SVG via LayerChart)

Reference: `docs/Screenshot 2026-04-25 at 3.03.34 PM.png`

- **Outer ring** -- 12 arc segments for interval labels. Smaller text. Disabled intervals are dimmed
- **Inner ring** -- 12 arc segments for note names. Larger text. These are the clickable answer buttons
- **Center** -- displays selected tonic name (large text)
- **Arrangement** -- tonic always at 12 o'clock. Notes arranged clockwise in circle of fifths order (C, G, D, A, E, B, Gb, Db, Ab, Eb, Bb, F)
- **Colors** -- fixed per note (see color groups above), not per interval position
- **Highlight states:**
  - Default: dim outline in note's color
  - User pick: yellow fill (feedback state)
  - Correct answer: green fill, slightly larger/pulsed (feedback state)

## Quiz Flow

### State Machine

`idle` → `playing_cadence` → `awaiting_answer` → `showing_feedback` → loop

### Flow

1. **Start** -- drone begins playing the tonic. System plays a random target note (from enabled intervals, randomly octave above or below C3)
2. **Awaiting answer** -- user taps a note on the circle. Selected note highlighted yellow immediately
3. **Correct** -- correct note highlighted green (larger/pulsed), target note replayed. After 1s pause: clear highlights, play new target note
4. **Incorrect** -- user's pick stays yellow, correct note highlighted green. Target note replayed. After 1s pause: clear, play new target note (move on, no retry)

### Key Change

When the tonic changes:
- Drone glides to new key (existing `setKey` with `rampTo`)
- Play a I-IV-V-I cadence in the new key (e.g. C3, F3, G3, C3) with 300ms gaps
- Each note in the cadence is highlighted on the circle as it plays
- After cadence completes, resume quiz with new target note

### Replay

A dedicated replay button replays just the current target note (no reference note needed -- the drone provides tonal context).

### No Score Tracking

Pure ear training without pressure. No score, no streak, no stats (for now).

## Audio

### Drone

The existing `DroneEngine` from `src/lib/drone.ts` runs continuously. Uses hardcoded "good" params (tuned via the drone test page at `/drone`). Not user-adjustable on the quiz page.

### Quiz Notes

`Tone.PluckSynth` for target notes and cadence playback.

- Target note: random interval mapped to actual pitch, randomly placed at octave above or below C3
- Cadence: I-IV-V-I in 3rd octave, 300ms gaps between notes
- Feedback: replay target note on answer

### Timing

- 300ms gap between cadence notes
- 1s pause showing feedback before advancing to next note

## Component Architecture

### Files

- `src/lib/music.ts` -- Pure data: note definitions (traditional + aug dim names), colors, circle of fifths order, interval mappings, preset definitions, `getNotesForTonic()` helper
- `src/lib/quiz-audio.ts` -- PluckSynth wrapper. Methods: `playNote(pitch)`, `playCadence(tonic, onNote)` for I-IV-V-I sequence
- `src/routes/quiz/+page.svelte` -- Main page. Owns quiz state machine, drone engine (hardcoded params), audio. Top menu bar + circle
- `src/lib/components/CircleOfFifths.svelte` -- LayerChart-based SVG circle. Props: notes array, highlighted notes, tonic, display options. Events: `onNoteClick`
- `src/lib/components/TopBar.svelte` -- Menu bar with tonic selector, preset dropdown, interval toggles, name/interval display toggles

### State Ownership

All state lives in the page component:
- `tonic`, `nameMode`, `showIntervals`, `enabledIntervals`, `preset`
- `quizState` (idle / playing_cadence / awaiting_answer / showing_feedback)
- `targetNote`, `userPick`

Data flows down -- circle component is purely presentational, receives what to render and emits click events back up.
