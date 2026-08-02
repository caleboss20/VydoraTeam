/**
 * Soft collab presence chimes — Zoom/Meet-quiet, not gamey.
 * Join: short ascending two-tone. Leave: quieter single tone.
 * Honors Settings → presence + optional collabSounds flag.
 */
import { Audio } from 'expo-av';
import { loadAppSettings } from '../Dashboard/Settings';

const JOIN = require('../../../assets/sounds/collab-join.wav');
const LEAVE = require('../../../assets/sounds/collab-leave.wav');

let primed = false;
let lastPlayAt = 0;
const MIN_GAP_MS = 700;

async function ensureAudioMode() {
  if (primed) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    primed = true;
  } catch {
    /* ignore — device may deny audio mode */
  }
}

async function soundsEnabled(): Promise<boolean> {
  try {
    const prefs = await loadAppSettings();
    if (prefs.presence === false) return false;
    // Default on when unset (older settings blobs).
    if ((prefs as { collabSounds?: boolean }).collabSounds === false) {
      return false;
    }
    return true;
  } catch {
    return true;
  }
}

async function play(source: number, volume: number) {
  const now = Date.now();
  if (now - lastPlayAt < MIN_GAP_MS) return;
  if (!(await soundsEnabled())) return;
  lastPlayAt = now;
  try {
    await ensureAudioMode();
    const { sound } = await Audio.Sound.createAsync(source, {
      shouldPlay: true,
      volume,
      isLooping: false,
    });
    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) return;
      if (status.didJustFinish) {
        void sound.unloadAsync().catch(() => undefined);
      }
    });
  } catch (e) {
    console.log('[CollabSound] play failed', e);
  }
}

/** Teammate entered the live editor session. */
export function playCollabJoinChime() {
  void play(JOIN, 0.38);
}

/** Teammate left the live editor session. */
export function playCollabLeaveChime() {
  void play(LEAVE, 0.28);
}
