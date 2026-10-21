import { fireEvent, render, screen } from "@testing-library/react";
import { UNIT_LABELS } from "../game/stats";
import { UNITS, type RoundRow } from "../game/types";
import { getRounds } from "../store/session";
import Statistika from "./Statistika";

vi.mock("../store/session", () => ({ getRounds: vi.fn() }));

const rowsAt = (t: string): RoundRow[] =>
  UNITS.flatMap((u) => [
    { u, p: `${u}-a`, c: true, t },
    { u, p: `${u}-b`, c: false, t },
  ]);

beforeEach(() => vi.mocked(getRounds).mockReset());

test("renders every unit label and survives the Данас filter", () => {
  vi.mocked(getRounds).mockReturnValue(rowsAt(new Date().toISOString()));
  render(<Statistika />);
  for (const label of Object.values(UNIT_LABELS)) expect(screen.getAllByText(label).length).toBeGreaterThan(0);
  expect(screen.getAllByText("recognize-b").length).toBeGreaterThan(0);
  expect(screen.queryByText("recognize-a", { selector: "td" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Данас" }));
  for (const label of Object.values(UNIT_LABELS)) expect(screen.getAllByText(label).length).toBeGreaterThan(0);
});

test("old rows give the empty line under 7 дана", () => {
  vi.mocked(getRounds).mockReturnValue(rowsAt("2026-01-01T10:00:00.000Z"));
  render(<Statistika />);
  fireEvent.click(screen.getByRole("button", { name: "7 дана" }));
  expect(screen.getByText("Још нема одиграних задатака")).toBeInTheDocument();
});
