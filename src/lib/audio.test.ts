import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { play } from "./audio";

// jsdom implements no media playback: stub the element methods play() touches.
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test("an element that never ends resolves after maxMs", async () => {
  // Android audio-focus loss: the element pauses and fires neither ended nor error.
  vi.spyOn(HTMLMediaElement.prototype, "play").mockReturnValue(new Promise<void>(() => {}));
  let resolved = false;
  void play("blob:x", 1000).then(() => (resolved = true));
  await vi.advanceTimersByTimeAsync(999);
  expect(resolved).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  expect(resolved).toBe(true);
});

test("ended resolves at once and clears the watchdog", async () => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) {
    setTimeout(() => this.dispatchEvent(new Event("ended")), 100);
    return new Promise<void>(() => {});
  });
  let resolved = false;
  void play("blob:x", 1000).then(() => (resolved = true));
  await vi.advanceTimersByTimeAsync(100);
  expect(resolved).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
  expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledOnce();
});
