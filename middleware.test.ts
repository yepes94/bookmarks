import { describe, expect, test } from "bun:test"
import { middleware } from "./middleware"

function mockNextRequest(pathname: string) {
  return {
    nextUrl: new URL(`https://example.com${pathname}`),
    url: `https://example.com${pathname}`,
    method: "GET",
  }
}

describe("middleware", () => {
  test("passes through without blocking when no auth", async () => {
    const req = mockNextRequest("/api/generate-image")
    const res = await middleware(req as never)
    expect(res?.status).toBe(200)
  })

  test("passes through for root path when no auth", async () => {
    const req = mockNextRequest("/")
    const res = await middleware(req as never)
    expect(res?.status).toBe(200)
  })
})
