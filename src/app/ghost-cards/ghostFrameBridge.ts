/**
 * Lightweight pub/sub so BodySegmentationLayer can signal capture-steps
 * and GhostCardDeck can sync its history FIFO without prop drilling canvases.
 */

export type GhostFrameBridgeState = {
  /** Monotonic id bumped when a new ghost frame is captured into the body FIFO. */
  captureId: number;
  width: number;
  height: number;
};

type Listener = (state: GhostFrameBridgeState) => void;

let state: GhostFrameBridgeState = {
  captureId: 0,
  width: 0,
  height: 0,
};

const listeners = new Set<Listener>();

export function publishGhostCapture(partial: {
  width: number;
  height: number;
}): void {
  state = {
    captureId: state.captureId + 1,
    width: partial.width,
    height: partial.height,
  };
  listeners.forEach((fn) => fn(state));
}

export function publishGhostDimensions(width: number, height: number): void {
  if (state.width === width && state.height === height) return;
  state = { ...state, width, height };
  listeners.forEach((fn) => fn(state));
}

export function getGhostFrameBridgeState(): GhostFrameBridgeState {
  return state;
}

export function subscribeGhostFrameBridge(listener: Listener): () => void {
  listeners.add(listener);
  listener(state);
  return () => {
    listeners.delete(listener);
  };
}
