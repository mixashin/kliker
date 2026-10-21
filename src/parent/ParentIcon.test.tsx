import { render, screen, fireEvent, act } from "@testing-library/react";
import ParentIcon from "./ParentIcon";

beforeEach(() => {
  vi.useFakeTimers();
  location.hash = "";
});
afterEach(() => vi.useRealTimers());

const icon = () => screen.getByLabelText("За родитеље");
const wait = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

describe("ParentIcon", () => {
  it("a 2 s hold opens parent mode", () => {
    render(<ParentIcon />);
    fireEvent.pointerDown(icon());
    wait(2000);
    expect(location.hash).toBe("#/parent");
  });

  it("an early release does nothing", () => {
    render(<ParentIcon />);
    fireEvent.pointerDown(icon());
    wait(1000);
    fireEvent.pointerUp(icon());
    wait(2000);
    expect(location.hash).not.toBe("#/parent");
  });

  it("context menu is prevented and does not cancel the hold", () => {
    render(<ParentIcon />);
    fireEvent.pointerDown(icon());
    wait(500);
    expect(fireEvent.contextMenu(icon())).toBe(false);
    wait(1500);
    expect(location.hash).toBe("#/parent");
  });
});
