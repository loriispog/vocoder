# HALO

A browser vocal harmonizer with MediaPipe hand tracking. Captured microphone audio is pitch shifted into up to four scale-aware harmony voices in an AudioWorklet. An open hand fades in the choir; a closed or lost hand fades it out. Manual gesture control also works without a camera.

## Run

Requires Node 20.19+ (validated on Node 24), npm, curl for optional model preparation, and a current browser supporting AudioWorklet and camera/microphone capture. Use headphones. Serve over HTTPS or localhost; an insecure remote IP cannot request media permissions.

```sh
npm ci
npm run setup
npm run dev -- --port 5173 --strictPort
```

`npm ci` copies pinned MediaPipe WASM to `public/mediapipe/wasm`. `npm run setup` downloads Google's hand model to an ignored local asset directory over verified HTTPS and checks a pinned SHA-256. Restart Vite after downloading it. Without a local model the browser fetches the same official model from `storage.googleapis.com`. Permit that host in restricted environments. All audio/video processing is local; no microphone or webcam data is uploaded. Model/WASM downloads do not contain captured media. Fonts are served locally.

Allow microphone and camera access when prompted. Choose root, scale, voices and intervals. Sing a sustained monophonic note, then open your hand in view. Finger extension controls harmony volume; the lead voice remains audible, with optional hard correction. If camera access or model loading fails, microphone processing stays active and manual openness becomes available. Stop releases both device streams and closes the audio context. Cancellation also releases device streams that resolve after startup was cancelled.

## Voice shaping

- **Formant shift (−6 to +6 st):** lowers or raises the vocal spectral envelope to change character while keeping the musical fundamental. Applies to the lead and all harmony voices before harmony transposition. Zero is neutral.
- **Stereo separation (0–100%):** centers the direct harmony voices at zero and spreads them left-to-right at full width using equal-power panning. A single voice stays centered. Optional stereo room ambience can still create width at zero.
- **Harmony compression (0–100%):** sends all harmony voices through one linked stereo compressor before the room send. Zero uses a 1:1 ratio; maximum uses 8:1 with a −30 dB threshold. The lead bypasses this bus; a separate output compressor remains for peak control.
- **Hard pitch correction (optional, off by default):** replaces the monitored lead with a fast pitch-shifted version targeting the nearest note in the selected root/scale. Harmony transitions become faster too. Choir pitch drift pauses while on; its setting is restored when turned off. This is a deliberately synthetic effect, not a new oscillator or a second overlapping lead. Pitch display continues to show the detected input.

## Appearance

Use the Theme menu in the header to choose Forest, Midnight, Amethyst, Ember, or Daylight. Your choice is remembered on this browser when local storage is available. Header and footer GitHub links open the source repository in a new tab.

## Checks

```sh
npm test
npm run build
npm run test:browser
npm run test:gestures
```

Browser tests require the dev server on port 5173 and Chromium at `/usr/bin/chromium` (override `TEST_URL` / `CHROMIUM_PATH`). They use Chromium fake camera capture and a generated microphone tone, and save ignored screenshots in `.test-results`. They exercise real Web Audio and AudioWorklet output, pitch display, wet audio fade, controls, permission-denial handling, cancellation, stop/restart and mobile layout. DSP tests verify pitch estimates, scale math, hand extension and measured pitch shift. `test:browser` now requires successful MediaPipe initialization and fails on unexpected console errors. `test:gestures` downloads official open-hand/fist image fixtures to the ignored test-output directory, sends them through a canvas-backed video stream, and checks actual MediaPipe inference, the landmark overlay, open/closed gesture mapping, and loss-of-hand fade. These are recorded-image inputs, not a physical webcam test. TensorFlow’s exact informational CPU-delegate notice is distinguished from errors even though it writes to the console error channel.

## Audio design and limits

The worklet first runs a 1024-sample, 256-sample-hop overlap-add formant stage. When formant shift is nonzero, an FFT estimates a smoothed vocal spectral envelope, resamples it, and applies an envelope gain ratio to the original complex bins. Frequencies and phases stay in place, preserving harmonic spacing rather than transposing musical pitch. Gain ratios are bounded to avoid excessive amplification. The zero setting reconstructs the delayed input without spectral modification. This is approximate envelope processing, not a vocal-tract model or automatic formant preservation during harmony transposition.

Harmony transposition uses a 45 ms variable-delay window with two complementary Hann grains per voice, independent smoothed pitch ratios, adjustable equal-power stereo panning, and up to seven cents of slow pitch drift. Scale intervals are steps above/below the nearest scale note; root/scale selection determines their targets. The Third/Fifth/Octave labels assume seven-note scales; pentatonic and chromatic modes still count scale steps. Harmony targets are calculated from detected pitch, not synthesized. Unvoiced passages retain the last detected harmony pitch. The display clears when no reliable input note is detected.

Pitch is estimated from 2048 raw microphone samples using a normalized difference detector. Normal mode updates every 4096 samples (~85 ms at 48 kHz). Hard mode updates every 1024 samples (~21 ms, after the initial 2048-sample acquisition) and uses faster ratio smoothing. Hard mode targets the nearest selected-scale note for the lead and disables choir detuning; it cannot make a reliable correction until a pitch is detected. There is no beat/tempo quantization: the grid is the musical scale.

The formant stage adds 1024 samples (~21 ms at 48 kHz) of fixed delay, including when neutral. With correction off, the lead bypasses the granular delay. Hard-corrected lead and harmonies add roughly 3–48 ms of variable granular delay. The linked harmony compressor and output compressor add browser lookahead/buffering; hardware adds further latency. The displayed device-buffer time is **not** a total measured round-trip latency. Room ambience is a short stereo convolution tail. Hand tracking runs at most about 22 Hz on the main thread, while audio runs on the audio thread.

Granular transposition and formant-envelope processing can produce phase, vowel and grain artifacts, especially at wide intervals or extreme formant settings. Naturalness, underruns on slower devices, actual acoustic round-trip latency, real vocal quality and physical webcam gestures require hardware testing. The instrument expects a solo monophonic input, approximately 75–1000 Hz, with a quiet background. Browser/device DSP may still affect capture despite requested constraints.
