import { render, screen, fireEvent } from "@testing-library/react";
import LockGate from "./LockGate";

vi.mock("./lock", () => ({
  makeGate: () => ({ a: 2, b: 3, check: (s: string) => s.trim() === "6" }),
}));

function setup() {
  const onUnlock = vi.fn();
  render(<LockGate onUnlock={onUnlock} onCancel={() => {}} />);
  const input = screen.getByLabelText("Одговор") as HTMLInputElement;
  return { onUnlock, input };
}

describe("LockGate", () => {
  it("shows the question", () => {
    setup();
    expect(screen.getByText("Колико је 2 × 3?")).toBeInTheDocument();
  });

  it("wrong answer clears the input and does not unlock", () => {
    const { onUnlock, input } = setup();
    fireEvent.change(input, { target: { value: "7" } });
    fireEvent.click(screen.getByText("Потврди"));
    expect(onUnlock).not.toHaveBeenCalled();
    expect(input.value).toBe("");
  });

  it("right answer unlocks once", () => {
    const { onUnlock, input } = setup();
    fireEvent.change(input, { target: { value: "6" } });
    fireEvent.click(screen.getByText("Потврди"));
    expect(onUnlock).toHaveBeenCalledTimes(1);
  });
});
