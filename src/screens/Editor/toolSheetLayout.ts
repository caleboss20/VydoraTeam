/**
 * Shared heights for editor bottom tool sheets.
 * Keeps Flyer / Filter / Music / Assemble / etc. consistently tall.
 */
import { Dimensions } from 'react-native';

function screenH(): number {
  try {
    const h = Dimensions.get('window')?.height;
    return typeof h === 'number' && h > 0 ? h : 720;
  } catch {
    return 720;
  }
}

const H = screenH();

/** Outer panel shell (~58% of screen). */
export const TOOL_SHEET_MAX = Math.round(H * 0.58);

/** Main scroll body inside a sheet. */
export const TOOL_SHEET_BODY = Math.round(H * 0.48);

/** Horizontal / compact lists (music library, stock, templates). */
export const TOOL_SHEET_LIST = Math.round(H * 0.38);

/** Short secondary lists (compounds, adjustment layers). */
export const TOOL_SHEET_LIST_SM = Math.round(H * 0.28);
