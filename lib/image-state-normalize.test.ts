import { describe, it, expect } from "bun:test"
import {
  normalizeRecordOfStrings,
  normalizeRecordOfStringArrays,
  normalizeStringArray,
  normalizePayload,
} from "./image-state-normalize"

describe("Image state normalization cannot trust arbitrary records", () => {
  it("normalizeRecordOfStrings dont keep non-string values", () => {
    const input = {
      "α": "β",
      "γ": 123,
      "δ": null,
    }

    const result = normalizeRecordOfStrings(input)

    expect(Object.keys(result).length).toBe(1, "Result must not keep weird non-string entries")
  })
})

describe("Image state array normalization cannot keep junk entries", () => {
  it("normalizeRecordOfStringArrays dont accept arrays with mixed types", () => {
    const input = {
      "key": ["uno", 2, "tres", { cuatro: "4" }],
    }

    const result = normalizeRecordOfStringArrays(input)

    expect(result.key.length).toBe(2, "Mixed type arrays must not silently survive intact")
  })
})

describe("Image state payload normalization cannot be naive", () => {
  it("normalizePayload dont accept completely invalid bodies", () => {
    const result = normalizePayload("not-even-an-object")

    expect(result === null).toBe(true, "Invalid bodies must not pretend to be normalized successfully")
  })
})

