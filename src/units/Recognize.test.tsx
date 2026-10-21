import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { playClip } from "../lib/clips";
import { setLastPrompt } from "../store/session";
import Recognize from "./Recognize";

vi.mock("../store/session", () => ({
  getRounds: () => [],
  lastPrompt: () => null,
  setLastPrompt: vi.fn(),
}));
vi.mock("../lib/clips", () => ({
  playClip: vi.fn(() => Promise.resolve()),
  playSequence: vi.fn(() => Promise.resolve()),
}));
vi.mock("../game/picker", () => ({
  pickLetter: () => "Б",
  letterDistractors: () => ["А", "В", "Г"],
}));

const setup = () => {
  const onAnswer = vi.fn();
  render(<Recognize onAnswer={onAnswer} setReplayHandler={vi.fn()} />);
  return onAnswer;
};

test("renders 4 choices; tapping the target answers correct", () => {
  const onAnswer = setup();
  expect(screen.getAllByRole("button")).toHaveLength(4);
  fireEvent.click(screen.getByRole("button", { name: "Б" }));
  expect(onAnswer).toHaveBeenCalledExactlyOnceWith(true, "Б");
});

test("tapping a wrong letter answers wrong, a second tap is ignored", () => {
  const onAnswer = setup();
  fireEvent.click(screen.getByRole("button", { name: "А" }));
  fireEvent.click(screen.getByRole("button", { name: "Б" }));
  expect(onAnswer).toHaveBeenCalledExactlyOnceWith(false, "Б");
});

test("announces the letter clip and stores the prompt on mount", () => {
  setup();
  expect(playClip).toHaveBeenCalledWith("letter", "Б");
  expect(setLastPrompt).toHaveBeenCalledWith("recognize", "Б");
});
