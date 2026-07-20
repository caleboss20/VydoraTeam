import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { VoiceoverClip } from '../types';

/**
 * Voiceover helpers — mic recording via expo-av + pure factories for the
 * project timeline. Context owns persistence; this file owns the recorder.
 *
 * Takes land on the project timeline at `startMs` (playhead when Record
 * began) and bake into export the same way background music does.
 */

let activeRecording: Audio.Recording | null = null;

/** Build a VoiceoverClip ready to push into project.voiceovers[]. */
export function createVoiceover(
  uri: string,
  startMs: number,
  durationMs: number,
  volume = 1
): Omit<VoiceoverClip, 'id'> {
  return {
    uri,
    startMs: Math.max(0, Math.round(startMs)),
    durationMs: Math.max(200, Math.round(durationMs)),
    volume,
  };
}

/**
 * Ask for mic access and start a high-quality M4A recording.
 * Pauses other app audio while recording (CapCut-style).
 */
export async function startVoiceoverRecording(): Promise<void> {
  if (activeRecording) {
    throw new Error('A recording is already in progress.');
  }

  const perm = await Audio.requestPermissionsAsync();
  if (!perm.granted) {
    throw new Error('Microphone permission is required to record a voiceover.');
  }

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });

  const { recording } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  );
  activeRecording = recording;
}

/**
 * Stop the active recording and return its file URI + duration.
 * Restores playback audio mode so music/video can play again.
 */
export async function stopVoiceoverRecording(): Promise<{
  uri: string;
  durationMs: number;
}> {
  if (!activeRecording) {
    throw new Error('No recording in progress.');
  }

  const recording = activeRecording;
  activeRecording = null;

  try {
    await recording.stopAndUnloadAsync();
  } catch (e) {
    // Still try to recover the file URI if stop partially failed.
    console.log('[Voiceover] stopAndUnloadAsync', e);
  }

  const uri = recording.getURI();
  const status = await recording.getStatusAsync().catch(() => null);
  const durationMs =
    status && 'durationMillis' in status && typeof status.durationMillis === 'number'
      ? status.durationMillis
      : 0;

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: false,
    playThroughEarpieceAndroid: false,
    interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
    interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
  });

  if (!uri) {
    throw new Error('Recording finished but no audio file was produced.');
  }

  return { uri, durationMs: Math.max(200, durationMs) };
}

/** Cancel an in-progress take without saving. */
export async function cancelVoiceoverRecording(): Promise<void> {
  if (!activeRecording) return;
  const recording = activeRecording;
  activeRecording = null;
  try {
    await recording.stopAndUnloadAsync();
  } catch {
    /* ignore */
  }
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: false,
    interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
    interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
  }).catch(() => undefined);
}

export function isVoiceoverRecording(): boolean {
  return activeRecording != null;
}
