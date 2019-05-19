// INITIAL DELAY (S)
export const delay = 1.0;
// WARMUP TIME (S)
export const warmup = 2.0;
// FEEDBACK WAIT TIME (S)
export const wait = 2.0;
// BEEP DURATION (S)
export const beeplen = 50 / 1000;
// DISTANCE BETWEEN BEEPS (S)
export const beepstep = 100 / 1000;
// MARGINS BEFORE AND AFTER RECORDING (S)
export const margins = [500 / 1000, 2000 / 1000];
// AUDIO CONTEXT SAMPLE RATE
export const samplerate = 48000;
// FFT WINDOW SIZE (SAMPLES)
export const winsize = 1024;
// FFT WINDOW STEP (SAMPLES)
export const winstep = 32;
// FREQUENCIES TO BEEP & DETECT
export const detfreqs = [24, 28, 32, 36, 40, 44, 48].map(x => x * samplerate / winsize);
// MIN DETECTION VOLUME (DB)
export const minvolume = -10;
// ACCURACY RATIO
export const accratio = 0.8;
// PING TIMEOUT (S)
export const timeout = 3.0;
// DEVICE STATUS
export const status = {
    disconnected: 0,
    connected: 1,
    synced: 2,
    error: 3,
};
