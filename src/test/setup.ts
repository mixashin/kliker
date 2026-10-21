import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";

URL.createObjectURL = () => "blob:test";
URL.revokeObjectURL = () => {};
