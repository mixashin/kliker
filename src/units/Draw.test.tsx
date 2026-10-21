import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, expect, test, vi } from "vitest";
import { recognizeLetter, type LetterOcrResult } from "../lib/ocr";
import { playClip } from "../lib/clips";
import { putDrawing } from "../store/db";
import { setLastPrompt } from "../store/session";
import Draw from "./Draw";

vi.mock("../lib/ocr", () => ({
  preloadOcr: vi.fn(() => Promise.resolve()),
  recognizeLetter: vi.fn(() => Promise.resolve({ ok: true })),
}));
vi.mock("../store/db", () => ({
  putDrawing: vi.fn(() => Promise.reject(new Error("quota"))),
}));
vi.mock("../store/session", () => ({
  getRounds: () => [],
  lastPrompt: () => null,
  setLastPrompt: vi.fn(),
}));
vi.mock("../lib/clips", () => ({
  playClip: vi.fn(() => Promise.resolve()),
}));
vi.mock("../game/picker", () => ({
  pickLetter: () => "Б",
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

const drawAndSubmit = () => {
  const onAnswer = vi.fn();
  const { container } = render(<Draw onAnswer={onAnswer} setReplayHandler={vi.fn()} />);
  const canvas = container.querySelector("canvas");
  if (!canvas) throw new Error("no canvas");
  fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 10, clientY: 10 });
  fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 40, clientY: 40 });
  fireEvent.pointerUp(canvas, { pointerId: 1 });
  fireEvent.click(screen.getByRole("button", { name: "ГОТОВО" }));
  return onAnswer;
};

test("OCR ok + storage failure still answers correct", async () => {
  const onAnswer = drawAndSubmit();
  await waitFor(() => expect(onAnswer).toHaveBeenCalledExactlyOnceWith(true, "Б"));
  expect(putDrawing).toHaveBeenCalledWith("Б", expect.any(Blob));
  expect(setLastPrompt).toHaveBeenCalledWith("draw", "Б");
  expect(playClip).toHaveBeenCalledWith("letter", "Б");
});

test("OCR failure never punishes", async () => {
  vi.mocked(recognizeLetter).mockRejectedValueOnce(new Error("model"));
  const onAnswer = drawAndSubmit();
  await waitFor(() => expect(onAnswer).toHaveBeenCalledExactlyOnceWith(true, "Б"));
});

test("OCR verdict wrong answers wrong", async () => {
  vi.mocked(recognizeLetter).mockResolvedValueOnce({ ok: false } as LetterOcrResult);
  const onAnswer = drawAndSubmit();
  await waitFor(() => expect(onAnswer).toHaveBeenCalledExactlyOnceWith(false, "Б"));
});

test("done without ink is ignored", async () => {
  vi.mocked(recognizeLetter).mockClear();
  const onAnswer = vi.fn();
  render(<Draw onAnswer={onAnswer} setReplayHandler={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "ГОТОВО" }));
  await new Promise((r) => setTimeout(r, 0));
  expect(recognizeLetter).not.toHaveBeenCalled();
  expect(onAnswer).not.toHaveBeenCalled();
});
