import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DEFAULT_SETTINGS } from "../game/types";
import { getSettings, resetProgress, updateSettings } from "../store/session";
import Podesavanja from "./Podesavanja";

vi.mock("../store/session", () => ({ getSettings: vi.fn(), updateSettings: vi.fn(), resetProgress: vi.fn() }));

const withName = (kidName: string) => vi.mocked(getSettings).mockReturnValue({ ...DEFAULT_SETTINGS, kidName });
const button = (name: string) => screen.getByRole("button", { name });
const CONFIRM = "Упиши име детета за потврду";

beforeEach(() => vi.resetAllMocks());

test("reset is disabled while no kid name is saved", () => {
  withName("");
  render(<Podesavanja />);
  expect(button("Обриши сав напредак")).toBeDisabled();
});

test("reset needs the kid name typed before Да, обриши works", async () => {
  withName("МАЈА");
  render(<Podesavanja />);
  fireEvent.click(button("Обриши сав напредак"));
  const confirm = screen.getByPlaceholderText(CONFIRM);
  fireEvent.change(confirm, { target: { value: "АНА" } });
  expect(button("Да, обриши")).toBeDisabled();
  fireEvent.change(confirm, { target: { value: "маја" } });
  fireEvent.click(button("Да, обриши"));
  await waitFor(() => expect(screen.getByText("Напредак је обрисан")).toBeInTheDocument());
  expect(resetProgress).toHaveBeenCalledTimes(1);
});

test("clearing the saved name closes the reset confirm", async () => {
  withName("МАЈА");
  vi.mocked(updateSettings).mockImplementation(async (p) => ({ ...DEFAULT_SETTINGS, ...p, opening: { ...DEFAULT_SETTINGS.opening, ...p.opening } }));
  render(<Podesavanja />);
  fireEvent.click(button("Обриши сав напредак"));
  fireEvent.change(screen.getByLabelText("Име детета"), { target: { value: "" } });
  fireEvent.click(button("Сачувај"));
  await waitFor(() => expect(screen.getByText("Сачувано")).toBeInTheDocument());
  expect(screen.queryByPlaceholderText(CONFIRM)).not.toBeInTheDocument();
  expect(button("Обриши сав напредак")).toBeDisabled();
});

test("Сачувај uppercases the name and keeps old values for invalid numbers", async () => {
  withName("");
  vi.mocked(updateSettings).mockImplementation(async (p) => ({ ...DEFAULT_SETTINGS, ...p, opening: { ...DEFAULT_SETTINGS.opening, ...p.opening } }));
  render(<Podesavanja />);
  fireEvent.change(screen.getByLabelText("Име детета"), { target: { value: " маја " } });
  fireEvent.change(screen.getByLabelText("Новчићи на почетку"), { target: { value: "5" } });
  fireEvent.change(screen.getByLabelText("Уновчено"), { target: { value: "-2" } });
  fireEvent.click(button("Сачувај"));
  await waitFor(() => expect(screen.getByText("Сачувано")).toBeInTheDocument());
  expect(updateSettings).toHaveBeenCalledWith({
    kidName: "МАЈА",
    opening: { coins: 5, rainbows: 0, bestStreak: 0, totalCorrect: 0 },
    redeemed: 0,
  });
});
