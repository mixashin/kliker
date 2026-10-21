import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, expect, test, vi } from "vitest";
import { putDrawing } from "../store/db";
import DrawName from "./DrawName";

vi.mock("../store/db", () => ({
  putDrawing: vi.fn(() => Promise.resolve()),
}));
vi.mock("../store/session", () => ({
  recordedNames: () => ["АНА"],
  lastPrompt: () => null,
  setLastPrompt: vi.fn(),
}));
vi.mock("../lib/clips", () => ({
  playClip: vi.fn(() => Promise.resolve()),
}));

// jsdom has no canvas: give it a minimal 2d context, toBlob and pointer capture.
beforeAll(() => {
  const ctx = {
    scale: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(),
    arc: vi.fn(), fill: vi.fn(), clearRect: vi.fn(), setTransform: vi.fn(),
    save: vi.fn(), restore: vi.fn(),
    lineWidth: 1, lineCap: "butt", lineJoin: "miter", strokeStyle: "#000", fillStyle: "#000",
  };
  HTMLCanvasElement.prototype.getContext = (() => ctx) as unknown as HTMLCanvasElement["getContext"];
  HTMLCanvasElement.prototype.toBlob = (cb: BlobCallback) => cb(new Blob(["x"], { type: "image/png" }));
  HTMLCanvasElement.prototype.setPointerCapture = () => {};
});

test("done without ink is ignored", async () => {
  const onAnswer = vi.fn();
  render(<DrawName onAnswer={onAnswer} setReplayHandler={vi.fn()} />);
  const done = screen.getByRole("button", { name: "ГОТОВО" });
  expect(done).toBeDisabled();
  fireEvent.click(done);
  await new Promise((r) => setTimeout(r, 0));
  expect(putDrawing).not.toHaveBeenCalled();
  expect(onAnswer).not.toHaveBeenCalled();
});

test("a stroke then done stores the drawing and answers correct", async () => {
  const onAnswer = vi.fn();
  const { container } = render(<DrawName onAnswer={onAnswer} setReplayHandler={vi.fn()} />);
  const canvas = container.querySelector("canvas");
  if (!canvas) throw new Error("no canvas");
  fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 10, clientY: 10 });
  fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 40, clientY: 40 });
  fireEvent.pointerUp(canvas, { pointerId: 1 });
  fireEvent.click(screen.getByRole("button", { name: "ГОТОВО" }));
  await waitFor(() => expect(onAnswer).toHaveBeenCalledExactlyOnceWith(true, "АНА"));
  expect(putDrawing).toHaveBeenCalledWith("АНА", expect.any(Blob));
});
