import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DEFAULT_SETTINGS } from "../game/types";
import { getSettings } from "../store/session";
import Rezerva, { lastSaved } from "./Rezerva";

vi.mock("../store/session", () => ({ getSettings: vi.fn(), updateSettings: vi.fn() }));

const pick = (text: string) =>
  fireEvent.change(screen.getByLabelText("Фајл"), { target: { files: [new File([text], "b.json")] } });

beforeEach(() => vi.mocked(getSettings).mockReturnValue({ ...DEFAULT_SETTINGS, kidName: "МАЈА" }));

test("import waits for the kid name", async () => {
  render(<Rezerva />);
  expect(screen.getByText("Последњи пут сачувано: никад")).toBeInTheDocument();
  pick(JSON.stringify({ version: 1, exportedAt: "", settings: {}, rounds: [], clips: [] }));
  const go = await screen.findByRole("button", { name: "Врати" });
  expect(go).toBeDisabled();
  fireEvent.change(screen.getByPlaceholderText("Упиши име детета за потврду"), { target: { value: "маја" } });
  expect(go).toBeEnabled();
});

test("the confirmation names the sections in the file", async () => {
  render(<Rezerva />);
  pick(JSON.stringify({ version: 1, clips: [] }));
  const line = await screen.findByText(/Ово ће заменити/);
  expect(line).toHaveTextContent("глас");
  expect(line).not.toHaveTextContent("напредак");
  expect(line).not.toHaveTextContent("цртеже");
  pick(JSON.stringify({ version: 1, settings: {}, rounds: [], clips: [], drawings: [] }));
  await waitFor(() => expect(screen.getByText(/Ово ће заменити/)).toHaveTextContent("напредак и другаре, глас, цртеже"));
});

test("export needs at least one section", () => {
  render(<Rezerva />);
  const go = screen.getByRole("button", { name: "Сачувај у фајл" });
  expect(go).toBeEnabled();
  for (const label of ["Напредак и другари", "Глас", "Цртежи"]) fireEvent.click(screen.getByLabelText(label));
  expect(go).toBeDisabled();
});

test("the file button is visible and opens the picker", () => {
  render(<Rezerva />);
  const click = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
  fireEvent.click(screen.getByRole("button", { name: "Изабери фајл" }));
  expect(click).toHaveBeenCalledTimes(1);
});

test("a broken file shows a line", async () => {
  render(<Rezerva />);
  pick('{"version":2}');
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Фајл је из друге верзије апликације"));
  pick('{"version":1}');
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Ово није Кликер фајл"));
});

test("lastSaved speaks in days", () => {
  const now = Date.parse("2026-10-21T12:00:00.000Z");
  expect(lastSaved("", now)).toBe("никад");
  expect(lastSaved("2026-10-21T08:00:00.000Z", now)).toBe("данас");
  expect(lastSaved("2026-10-20T08:00:00.000Z", now)).toBe("јуче");
  expect(lastSaved("2026-10-18T08:00:00.000Z", now)).toBe("пре 3 дана");
  expect(lastSaved("2026-09-30T08:00:00.000Z", now)).toBe("пре 21 дан");
  expect(lastSaved("2026-10-10T08:00:00.000Z", now)).toBe("пре 11 дана");
});
