import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Counters } from "../game/replay";
import { counters, redeemCoin } from "../store/session";
import Novcici from "./Novcici";

vi.mock("../store/session", () => ({ counters: vi.fn(), redeemCoin: vi.fn() }));

const c = (coins: number): Counters => ({
  barFill: 0, streak: 0, rainbows: 3, coins, bestStreak: 7, totalCorrect: 0, lastAt: null,
});

beforeEach(() => vi.resetAllMocks());

test("redeems one coin after confirmation", async () => {
  vi.mocked(counters).mockReturnValue(c(2));
  vi.mocked(redeemCoin).mockResolvedValue(c(1));
  render(<Novcici />);
  expect(screen.getByText("Новчићи: 2")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Уновчи један" }));
  expect(redeemCoin).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Да, уновчи" }));
  await waitFor(() => expect(screen.getByText("Новчићи: 1")).toBeInTheDocument());
  expect(redeemCoin).toHaveBeenCalledTimes(1);
});

test("button disabled at zero coins", () => {
  vi.mocked(counters).mockReturnValue(c(0));
  render(<Novcici />);
  expect(screen.getByRole("button", { name: "Уновчи један" })).toBeDisabled();
});
