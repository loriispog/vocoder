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

Allow microphone and camera access when prompted. Choose root, scale, voices and intervals. Sing a sustained monophonic note, then open your hand in view. Finger extension controls wet volume; dry voice remains audible. If camera access or model loading fails, microphone processing stays active and manual openness becomes available. Stop releases both device streams and closes the audio context. Cancellation also releases device streams that resolve after startup was cancelled.

## Checks

```sh
npm test
npm run build
npm run test:browser
npm run test:gestures
```

Browser tests require the dev server on port 5173 and Chromium at `/usr/bin/chromium` (override `TEST_URL` / `CHROMIUM_PATH`). They use Chromium fake camera capture and a generated microphone tone, and save ignored screenshots in `.test-results`. They exercise real Web Audio and AudioWorklet output, pitch display, wet audio fade, controls, permission-denial handling, cancellation, stop/restart and mobile layout. DSP tests verify pitch estimates, scale math, hand extension and measured pitch shift. `test:browser` now requires successful MediaPipe initialization and fails on unexpected console errors. `test:gestures` downloads official open-hand/fist image fixtures to the ignored test-output directory, sends them through a canvas-backed video stream, and checks actual MediaPipe inference, the landmark overlay, open/closed gesture mapping, and loss-of-hand fade. These are recorded-image inputs, not a physical webcam test. TensorFlow’s exact informational CPU-delegate notice is distinguished from errors even though it writes to the console error channel.

## Audio design and limits

The worklet uses a 45 ms variable-delay window with two complementary Hann grains per voice, independent smoothed pitch ratios, stereo panning, and up to seven cents of slow pitch drift. Scale intervals are diatonic degrees above/below the nearest scale note; root/scale selection determines their targets. Pitch is estimated from 2048 microphone samples using a normalized difference detector, updated every 4096 samples. Pitch estimates drive harmony ratios rather than a synthesizer. Unvoiced passages keep the last pitch ratio to preserve consonants. The display clears when no reliable note is detected.

The dry path bypasses pitch processing. The wet path has about 3–48 ms of algorithmic delay, plus hardware/browser buffering. The displayed device-buffer time is **not** total measured round-trip latency. Initial pitch acquisition and changes can take roughly 85 ms plus smoothing. Room ambience is a short stereo convolution tail; a compressor limits large peaks. Hand tracking runs at most about 22 Hz on the main thread, while audio runs on the audio thread.

This granular implementation can produce grain/phase artifacts and changes vowel formants, especially at wide intervals. It is not a formant-preserving studio harmonizer. Naturalness, underruns on slower devices, actual acoustic round-trip latency, real vocal quality and physical webcam gestures require hardware testing. It expects a solo monophonic input, approximately 75–1000 Hz, with a quiet background. Browser/device DSP may still affect capture despite requested constraints.

## Current validation

- The official version-1 hand model downloaded successfully after internet access was enabled. The setup script's incorrect ZIP-header assumption was corrected; the model is now validated with a pinned SHA-256, cross-checked against Google's published MD5 metadata. Archive integrity was also checked. TLS verification stayed enabled.
- Setup succeeded twice, confirming reuse of the verified local model.
- All 11 DSP tests and the production build passed.
- Chromium simulated-media tests passed against the production build with successful MediaPipe initialization, microphone pitch display, measured wet audio output/fade, startup cancellation, permission errors and stop/restart. No uncaught exceptions or unexpected console errors.
- Real MediaPipe inference on official open-hand/fist image fixtures verified hand tracking, drawn landmarks, gesture mapping and loss-of-hand fade. These fixtures are passed as video frames through the app, not mocked landmark results.
- No physical microphone/webcam, listening-quality, or end-to-end latency test has been performed. See the audio limitations above.

The repository was empty when inspected, so there was no pre-existing Start button to repair. Startup was implemented with visible errors and separate microphone/camera initialization instead.
