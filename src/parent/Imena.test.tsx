import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DEFAULT_SETTINGS } from "../game/types";
import { removeClip } from "../lib/clips";
import { getSettings, updateSettings } from "../store/session";
import Imena from "./Imena";

vi.mock("../store/session", async () => {
  const { DEFAULT_SETTINGS } = await import("../game/types");
  return {
    getSettings: vi.fn(),
    updateSettings: vi.fn(async (p: object) => ({ ...DEFAULT_SETTINGS, ...p })),
  };
});
vi.mock("../lib/clips", () => ({
  hasClip: () => false,
  hasOwnClip: () => false,
  removeClip: vi.fn(async () => {}),
  clipUrl: () => null,
  playClip: vi.fn(async () => {}),
  saveClip: vi.fn(async () => {}),
}));

const withNames = (names: string[]) => vi.mocked(getSettings).mockReturnValue({ ...DEFAULT_SETTINGS, names });

beforeEach(() => {
  vi.clearAllMocks();
  withNames([]);
});

function add(text: string) {
  render(<Imena />);
  fireEvent.change(screen.getByLabelText("Име"), { target: { value: text } });
  fireEvent.click(screen.getByText("Додај"));
}

describe("Imena", () => {
  it("adds a Cyrillic name in uppercase", async () => {
    add(" ана ");
    expect(await screen.findAllByText("АНА")).not.toHaveLength(0);
    expect(updateSettings).toHaveBeenCalledWith({ names: ["АНА"] });
  });

  it("accepts a hyphenated name", async () => {
    add("АНА-МАРИЈА");
    expect(await screen.findAllByText("АНА-МАРИЈА")).not.toHaveLength(0);
    expect(updateSettings).toHaveBeenCalledWith({ names: ["АНА-МАРИЈА"] });
  });

  it.each(["Ana", "-", "АНА  МАРИЈА", "ЙОЖЕФ"])("rejects %j", (text) => {
    add(text);
    expect(updateSettings).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Упиши ново име ћирилицом");
  });

  it("Обриши removes the name and its clip", async () => {
    withNames(["АНА"]);
    render(<Imena />);
    fireEvent.click(screen.getByText("Обриши"));
    await waitFor(() => expect(removeClip).toHaveBeenCalledWith("name", "АНА"));
    expect(updateSettings).toHaveBeenCalledWith({ names: [] });
  });

  it("a failed clip delete shows a line", async () => {
    withNames(["АНА"]);
    vi.mocked(removeClip).mockRejectedValueOnce(new Error("idb"));
    render(<Imena />);
    fireEvent.click(screen.getByText("Обриши"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Није обрисано");
  });
});
