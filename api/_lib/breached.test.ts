import { describe, expect, it } from "vitest";
import { pwnedPasswords } from "./breached";

// SHA-1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
const reply = (body: string) => (async (url: string | URL | Request) => {
  expect(String(url)).toBe("https://api.pwnedpasswords.com/range/5BAA6");
  return new Response(body);
}) as typeof fetch;

describe("pwnedPasswords", () => {
  it("sends only the first 5 characters of the hash, and finds the rest in the reply", async () => {
    expect(await pwnedPasswords("password", reply("0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n1E4C9B93F3F0682250B6CF8331B7EE68FD8:9545824"))).toBe(true);
    expect(await pwnedPasswords("password", reply("0018A45C4D1DEF81644B54AB7F969B88D65:1"))).toBe(false);
  });

  it("ignores padding lines (count 0)", async () => {
    expect(await pwnedPasswords("password", reply("1E4C9B93F3F0682250B6CF8331B7EE68FD8:0"))).toBe(false);
  });
});
