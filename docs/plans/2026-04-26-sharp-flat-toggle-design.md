# Sharp/Flat Toggle for Traditional Note Names

## Goal

Make traditional note names context-aware: display sharps or flats based on the current key and scale, using tonal.js for correct enharmonic spellings.

## Core Concepts

**Internal identity stays the same.** Notes are identified by semitone (0-11) and stored as flat-only `NoteName` strings (`'C' | 'Db' | 'D' | 'Eb' | ...`). Sharp/flat is purely a display concern.

**Tonal.js computes correct spellings.** `Scale.degrees("G harmonic minor")` returns proper note names like F# for the 7th degree. No hand-maintained lookup tables.

## Display Algorithm

Given a tonic, a preset, and an accidental mode (`'sharp' | 'flat'`):

1. **Diatonic notes (in the scale):** Use `[1,2,3,4,5,6,7].map(Scale.degrees("{tonic} {preset}"))` to get the proper note names from tonal.js. These are always used as-is — harmonic minor's F# stays F# even in a "flats key."

2. **Chromatic notes (outside the scale):** Spell as sharps or flats based on the key's overall bias.

3. **Determining the key's bias:** Look at the *natural* scale (major for major presets, natural minor for minor presets). If any scale notes contain `#` → sharps key. Otherwise → flats key. Special case: C major / A minor (no accidentals) → default to flats.

4. **Chromatic/Custom presets:** Fall back to `Scale.degrees("{tonic} major")` to determine the sharp/flat bias. All 12 notes follow the bias since there's no specific diatonic set.

5. **User override:** The user can click the Traditional toggle to cycle between ♯ and ♭, overriding the auto-guess. Any tonic or preset change resets to the auto-guessed value.

## UI Changes

### Name Mode Toggle

Two buttons: **Traditional** | **Aug Dim**

- **Selected button:** Bold text, full color (`bg-blue-600`)
- **Unselected button:** Not bold, lower contrast (muted text/background)
- When Traditional is selected, the button label shows the current accidental: `Traditional ♯` or `Traditional ♭`
- Clicking Traditional when it's already selected cycles to the other accidental
- Clicking Aug Dim switches to aug-dim mode (accidental preference preserved internally for when user switches back)

### Tonic Selector Buttons

The 12 tonic buttons also reflect the current sharp/flat spelling. In sharps mode: `C C# D D# E F F# G G# A A# B`. In flats mode: `C Db D Eb E F Gb G Ab A Bb B`.

Clicking a tonic button sets the internal `NoteName` (flat-only) regardless of the display label.

### State Changes

- `nameMode`: stays as `'traditional' | 'augdim'`
- New state: `accidentalMode: 'sharp' | 'flat'`
- Auto-guess fires on every tonic or preset change, overriding `accidentalMode`

## Components Affected

- `music.ts` — new `getTraditionalDisplayName(semitone, tonic, preset, accidentalMode)` function using tonal.js
- `TopBar.svelte` — toggle UI changes, tonic button spelling
- `NoteCircle.svelte` — use new display function
- `AugmentedCompass.svelte` — use new display function
- `DiminishedGroups.svelte` — use new display function
- `+page.svelte` — new `accidentalMode` state, auto-guess logic

## Dependencies

- Add `tonal` npm package (or just `@tonaljs/scale` if tree-shaking is preferred)

## Out of Scope

- Interval labels (`b2`, `#4`, etc.) stay as-is
- Aug-dim naming mode is unchanged
- No changes to audio, quiz logic, or internal note identity
