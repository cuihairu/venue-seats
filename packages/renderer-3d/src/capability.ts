/** Device capability probing for the 3D renderer. */

/** viewports at or below this width (px) get the 2D renderer by default */
export const NARROW_VIEWPORT = 640;

export interface Probe3D {
  /** a WebGL (1 or 2) context could be created */
  webgl: boolean;
  /** coarse low-end check: few cores or little memory */
  lowEnd: boolean;
  /** the viewport is phone-narrow (≤ NARROW_VIEWPORT px) */
  narrow: boolean;
}

export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Probe the device: WebGL support plus a coarse "low-end" heuristic
 * (hardwareConcurrency / deviceMemory) used to auto-degrade to 2D.
 */
export function isNarrowViewport(width: number = window.innerWidth): boolean {
  return width <= NARROW_VIEWPORT;
}

export function probe3D(): Probe3D {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 8;
  const memory = nav.deviceMemory ?? 8;
  return { webgl: hasWebGL(), lowEnd: cores <= 4 || memory <= 2, narrow: isNarrowViewport() };
}

/** Auto-decision: 3D only on capable devices with room for it; else 2D. */
export function supports3D(): boolean {
  const { webgl, lowEnd, narrow } = probe3D();
  return webgl && !lowEnd && !narrow;
}
