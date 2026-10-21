import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { removeClip, saveClip } from "../lib/clips";
import { getMicStream, startRecording } from "../lib/record";
import Recorder from "./Recorder";

const saved = new Set<string>();
const bundled = new Set<string>();
const trackStop = vi.fn();
const fakeStream = () => ({ active: true, getTracks: () => [{ stop: trackStop }] }) as unknown as MediaStream;

vi.mock("../lib/clips", () => ({
  hasClip: (kind: string, key: string) => saved.has(`${kind}:${key}`) || bundled.has(`${kind}:${key}`),
  hasOwnClip: (kind: string, key: string) => saved.has(`${kind}:${key}`),
  saveClip: vi.fn(async (kind: string, key: string) => void saved.add(`${kind}:${key}`)),
  removeClip: vi.fn(async (kind: string, key: string) => void saved.delete(`${kind}:${key}`)),
  playClip: vi.fn(async () => {}),
}));
vi.mock("../lib/record", () => ({
  getMicStream: vi.fn(async () => fakeStream()),
  startRecording: vi.fn(() => ({ stop: async () => new Blob(["x"], { type: "audio/webm" }) })),
}));

const items = [
  { kind: "letter" as const, key: "А", label: "А" },
  { kind: "letter" as const, key: "Б", label: "Б" },
];

// A mic request that stays open until the test resolves it.
function pendingMic() {
  let resolve!: (s: MediaStream) => void;
  vi.mocked(getMicStream).mockReturnValueOnce(new Promise((r) => (resolve = r)));
  return () => act(async () => resolve(fakeStream()));
}

beforeEach(() => {
  saved.clear();
  bundled.clear();
  vi.clearAllMocks();
});

describe("Recorder", () => {
  it("a bundled clip plays but does not count and cannot be deleted", () => {
    bundled.add("letter:А");
    render(<Recorder items={items} />);
    expect(screen.getByText("Снимљено 0 од 2")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Пусти")[0]).toBeEnabled();
    expect(screen.getAllByLabelText("Пусти")[1]).toBeDisabled();
    expect(screen.getAllByLabelText("Обриши")[0]).toBeDisabled();
    expect(document.querySelectorAll(".rec-cell.recorded")).toHaveLength(0);
  });

  it("records, saves, counts and deletes; one stream, stopped on unmount", async () => {
    const { unmount } = render(<Recorder items={items} />);
    expect(screen.getByText("Снимљено 0 од 2")).toBeInTheDocument();
    fireEvent.click(screen.getAllByLabelText("Сними")[1]);
    fireEvent.click(await screen.findByLabelText("Стоп"));
    expect(await screen.findByText("Снимљено 1 од 2")).toBeInTheDocument();
    expect(saveClip).toHaveBeenCalledWith("letter", "Б", expect.any(Blob));
    expect(document.querySelectorAll(".rec-cell.recorded")).toHaveLength(1);

    fireEvent.click(screen.getAllByLabelText("Сними")[0]);
    fireEvent.click(await screen.findByLabelText("Стоп"));
    expect(await screen.findByText("Снимљено 2 од 2")).toBeInTheDocument();
    expect(getMicStream).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getAllByLabelText("Обриши")[0]);
    expect(await screen.findByText("Снимљено 1 од 2")).toBeInTheDocument();

    unmount();
    await waitFor(() => expect(trackStop).toHaveBeenCalledTimes(1));
  });

  it("two presses during the mic request share one request and one recording", async () => {
    const grant = pendingMic();
    render(<Recorder items={items} />);
    fireEvent.click(screen.getAllByLabelText("Сними")[0]);
    fireEvent.click(screen.getAllByLabelText("Сними")[1]);
    await grant();
    expect(getMicStream).toHaveBeenCalledTimes(1);
    expect(screen.getAllByLabelText("Стоп")).toHaveLength(1);
  });

  it("an unmount during the mic request stops the tracks when it resolves", async () => {
    const grant = pendingMic();
    const { unmount } = render(<Recorder items={items} />);
    fireEvent.click(screen.getAllByLabelText("Сними")[0]);
    unmount();
    await grant();
    expect(trackStop).toHaveBeenCalled();
  });

  it("a recording cell that disappears releases the recorder", async () => {
    const { rerender } = render(<Recorder items={items} />);
    fireEvent.click(screen.getAllByLabelText("Сними")[1]);
    await screen.findByLabelText("Стоп");
    rerender(<Recorder items={[items[0]]} />);
    expect(screen.queryByLabelText("Стоп")).toBeNull();
    expect(screen.getByLabelText("Сними")).toBeEnabled();
  });

  it("shows one line when the mic is unavailable", async () => {
    vi.mocked(getMicStream).mockRejectedValueOnce(new Error("denied"));
    render(<Recorder items={items} />);
    fireEvent.click(screen.getAllByLabelText("Сними")[0]);
    expect(await screen.findByRole("alert")).toHaveTextContent("Нема приступа микрофону");
  });

  it("a failed delete shows its own line", async () => {
    saved.add("letter:А");
    vi.mocked(removeClip).mockRejectedValueOnce(new Error("idb"));
    render(<Recorder items={items} />);
    fireEvent.click(screen.getAllByLabelText("Обриши")[0]);
    expect(await screen.findByRole("alert")).toHaveTextContent("Није обрисано");
  });

  it("an empty recording shows its own line and is never saved", async () => {
    vi.mocked(startRecording).mockReturnValueOnce({ stop: () => Promise.reject(new Error("empty")) });
    render(<Recorder items={items} />);
    fireEvent.click(screen.getAllByLabelText("Сними")[0]);
    fireEvent.click(await screen.findByLabelText("Стоп"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Снимак је празан");
    expect(saveClip).not.toHaveBeenCalled();
    expect(screen.getByText("Снимљено 0 од 2")).toBeInTheDocument();
  });
});
