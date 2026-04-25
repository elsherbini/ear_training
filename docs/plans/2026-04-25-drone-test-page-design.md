# Drone Test Page Design

## Purpose

A standalone test page at `/drone` for exploring drone synth parameters. Tweak controls in real-time, then bake chosen values into the ear training app later.

## Architecture

### Signal Chain

```
AMSynth x4 --\
               +--> Gain (mix) --> Compressor --> Delay --> Reverb --> Destination
FMSynth x4 --/
```

Each synth plays a sustained tonic note at its assigned octave. Volume is controlled by a main LFO, which is itself modulated by a meta-LFO.

### Octave Assignment (default C2-C5)

Each octave gets one AM voice and one FM voice (8 voices total):
- Octave 2: 1 AM + 1 FM
- Octave 3: 1 AM + 1 FM
- Octave 4: 1 AM + 1 FM
- Octave 5: 1 AM + 1 FM

### LFO Architecture (per voice)

```
Meta-LFO (0.02 Hz, sine) --> modulates Main LFO rate & depth
Main LFO (base rate +/- spread) --> modulates voice gain
```

The 4 voices of each type share the same base LFO rate, but are deterministically spread apart.

**Spread calculation:** Given base rate `r` and spread `s` (0-1), 4 voices get rates:
`r * (1 - s/2) + (s * r * i/3)` for i = 0,1,2,3

At spread=0: all voices at `r`. At spread=1: voices span from `r*0.5` to `r*1.5`.

**Meta-LFO:** Fixed 0.02 Hz sine wave. Drift amount (0-1) scales the meta-LFO's output range, modulating main LFO frequency and amplitude.

## UI Controls

### Top Bar
- Key selector (C, Db, D, Eb, E, F, Gb, G, Ab, A, Bb, B)
- Start / Stop button
- Master volume slider
- Octave range: start octave (1-5) + number of octaves (1-4)

### AM Synth Panel
- Harmonicity (0.1 - 10)
- Modulation Index (0.1 - 20)
- LFO base rate (0.01 - 1 Hz)
- LFO depth (0 - 100%)
- LFO spread (0 - 100%)
- Drift amount (0 - 100%)

### FM Synth Panel
- Harmonicity (0.1 - 10)
- Modulation Index (0.1 - 20)
- LFO base rate (0.01 - 1 Hz)
- LFO depth (0 - 100%)
- LFO spread (0 - 100%)
- Drift amount (0 - 100%)

### Voice Gains Panel
- 8 individual sliders labeled by type and octave (e.g., "AM C2", "FM C2", "AM C3", etc.)
- Range 0-100%, default 100%
- Sets the base gain for each voice, before LFO modulation

### Effects Panel
- Compressor threshold (-60 to 0 dB)
- Compressor ratio (1 - 20)
- Delay time (0 - 1s)
- Delay feedback (0 - 100%)
- Delay wet/dry (0 - 100%)
- Reverb decay (0.1 - 10s)
- Reverb wet/dry (0 - 100%)

All sliders update in real-time while the drone is playing.

## Implementation Details

### Key Change Behavior
- Use `voice.frequency.rampTo(newFreq, 0.5)` for a smooth glide rather than abrupt change

### Tone.js Setup
- All audio created on first user interaction (Tone.start() on Start button)
- Synths use `triggerAttack` with infinite sustain -- no release until Stop

### Component Structure
- `src/routes/drone/+page.svelte` -- page with controls UI
- `src/lib/drone.ts` -- DroneEngine class encapsulating all Tone.js logic (create, start, stop, update params)

Audio engine separated from UI for testability and reuse in the main app.
