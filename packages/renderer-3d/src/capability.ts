/** Device capability probing for the 3D renderer. */

export interface Probe3D {
  /** a WebGL (1 or 2) context could be created */
  webgl: boolean;
  /** coarse low-end check: few cores or little memory */
  lowEnd: boolean;
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
export function probe3D(): Probe3D {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 8;
  const memory = nav.deviceMemory ?? 8;
  return { webgl: hasWebGL(), lowEnd: cores <= 4 || memory <= 2 };
}

/** Auto-decision: 3D only on capable devices; everything else gets 2D. */
export function supports3D(): boolean {
  const { webgl, lowEnd } = probe3D();
  return webgl && !lowEnd;
}
