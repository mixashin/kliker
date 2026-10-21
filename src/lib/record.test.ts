import { fixWebmDuration } from "@fix-webm-duration/fix";
import { pickMimeType, startRecording } from "./record";

vi.mock("@fix-webm-duration/fix", () => ({ fixWebmDuration: vi.fn(async (b: Blob) => b) }));

class FakeRecorder {
  static last: FakeRecorder;
  mimeType: string;
  state = "inactive";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  start = vi.fn(() => {
    this.state = "recording";
  });
  constructor(_stream: MediaStream, opts?: { mimeType?: string }) {
    this.mimeType = opts?.mimeType ?? "";
    FakeRecorder.last = this;
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["x"]) });
    this.onstop?.();
  }
}

const stream = {} as MediaStream;

beforeEach(() => {
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  vi.mocked(fixWebmDuration).mockClear();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("pickMimeType", () => {
  it("returns the first supported candidate", () => {
    expect(pickMimeType((t) => t === "audio/mp4")).toBe("audio/mp4");
    expect(pickMimeType(() => true)).toBe("audio/webm;codecs=opus");
  });

  it("returns an empty string when nothing is supported", () => {
    expect(pickMimeType(() => false)).toBe("");
    vi.unstubAllGlobals();
    expect(pickMimeType()).toBe("");
  });
});

describe("startRecording", () => {
  it("starts without a timeslice and fixes the webm duration", async () => {
    vi.spyOn(performance, "now").mockReturnValueOnce(1000).mockReturnValueOnce(2500);
    const r = startRecording(stream, "audio/webm;codecs=opus");
    expect(FakeRecorder.last.start).toHaveBeenCalledWith();
    const blob = await r.stop();
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toContain("webm");
    expect(fixWebmDuration).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fixWebmDuration).mock.calls[0][1]).toBe(1500);
  });

  it("fixes plain audio/webm too", async () => {
    const blob = await startRecording(stream, "audio/webm").stop();
    expect(blob.type).toBe("audio/webm");
    expect(fixWebmDuration).toHaveBeenCalledTimes(1);
  });

  it("skips the fix for mp4", async () => {
    const blob = await startRecording(stream, "audio/mp4").stop();
    expect(blob.type).toBe("audio/mp4");
    expect(fixWebmDuration).not.toHaveBeenCalled();
  });

  it("returns the unfixed blob when the fix fails", async () => {
    vi.mocked(fixWebmDuration).mockRejectedValueOnce(new Error("bad"));
    const blob = await startRecording(stream, "audio/webm").stop();
    expect(fixWebmDuration).toHaveBeenCalledTimes(1);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("audio/webm");
  });

  it("stop() twice resolves both calls to the same blob", async () => {
    const r = startRecording(stream, "audio/webm");
    const [a, b] = await Promise.all([r.stop(), r.stop()]);
    expect(a).toBe(b);
    expect(fixWebmDuration).toHaveBeenCalledTimes(1);
  });

  it("resolves when the recorder stopped by itself before stop()", async () => {
    const r = startRecording(stream, "audio/mp4");
    FakeRecorder.last.stop(); // tracks ended
    const spy = vi.spyOn(FakeRecorder.last, "stop");
    await expect(r.stop()).resolves.toBeInstanceOf(Blob);
    expect(spy).not.toHaveBeenCalled();
  });

  it("rejects with empty when the recorder stops with no data", async () => {
    const r = startRecording(stream, "audio/webm");
    const rec = FakeRecorder.last;
    rec.stop = () => {
      rec.state = "inactive";
      rec.onstop?.();
    };
    await expect(r.stop()).rejects.toThrow("empty");
  });

  it("rejects with empty when the recorder errored before any data", async () => {
    const r = startRecording(stream, "audio/mp4");
    FakeRecorder.last.onerror?.();
    await expect(r.stop()).rejects.toThrow("empty");
  });
});
