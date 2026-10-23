import {defineConfig} from 'vite';
import {existsSync} from 'node:fs';
export default defineConfig({define:{__HAND_MODEL_URL__:JSON.stringify(existsSync('public/models/hand_landmarker.task')?'/models/hand_landmarker.task':'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task')}});
