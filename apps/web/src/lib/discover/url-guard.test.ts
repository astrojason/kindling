// @vitest-environment node
import { describe, expect, it } from "vitest";
import { assertPublicHttpUrl, isPrivateAddress, UnsafeUrlError } from "./url-guard";

const resolvesTo = (...addresses: string[]) => async () => addresses.map((address) => ({ address, family: address.includes(":") ? 6 : 4 }));

describe("isPrivateAddress", () => {
  it.each([
    "0.0.0.0", "10.1.2.3", "100.64.0.1", "127.0.0.1", "169.254.169.254", "172.16.0.1", "172.31.255.255", "192.0.0.1", "192.168.1.1", "198.18.0.1", "224.0.0.1", "255.255.255.255",
    "::", "::1", "fc00::1", "fd12:3456::1", "fe80::1", "ff02::1", "::ffff:127.0.0.1", "::ffff:169.254.169.254",
  ])("treats %s as internal", (ip) => expect(isPrivateAddress(ip)).toBe(true));

  it.each(["8.8.8.8", "93.184.216.34", "172.32.0.1", "172.15.255.255", "2606:4700:4700::1111", "::ffff:8.8.8.8"])("treats %s as public", (ip) => expect(isPrivateAddress(ip)).toBe(false));
});

describe("assertPublicHttpUrl", () => {
  it("accepts a public http(s) URL and returns it parsed", async () => {
    const url = await assertPublicHttpUrl("https://example.com/a?b=1", resolvesTo("93.184.216.34"));
    expect(url.hostname).toBe("example.com");
  });

  it.each(["file:///etc/passwd", "ftp://example.com/x", "javascript:alert(1)", "gopher://example.com"])("refuses a non-http scheme (%s)", async (u) => {
    await expect(assertPublicHttpUrl(u, resolvesTo("93.184.216.34"))).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("refuses a URL that is not parseable, with the reason", async () => {
    await expect(assertPublicHttpUrl("not a url", resolvesTo("93.184.216.34"))).rejects.toThrow(/not a valid URL/i);
  });

  it("refuses credentials embedded in the URL", async () => {
    await expect(assertPublicHttpUrl("https://user:pass@example.com/", resolvesTo("93.184.216.34"))).rejects.toThrow(/credentials/i);
  });

  it.each(["http://localhost/", "http://app.localhost/", "http://printer.local/", "http://metadata.google.internal/computeMetadata/v1/", "http://db.internal/"])("refuses an internal hostname (%s)", async (u) => {
    await expect(assertPublicHttpUrl(u, resolvesTo("93.184.216.34"))).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it.each(["http://169.254.169.254/latest/meta-data/", "http://127.0.0.1:8080/", "http://10.0.0.5/", "http://[::1]/", "http://2130706433/", "http://0x7f000001/"])("refuses an internal address given directly (%s)", async (u) => {
    await expect(assertPublicHttpUrl(u, resolvesTo("93.184.216.34"))).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("refuses a public-looking name that resolves to an internal address", async () => {
    await expect(assertPublicHttpUrl("https://evil.example.com/", resolvesTo("169.254.169.254"))).rejects.toThrow(/internal address/i);
  });

  it("refuses when any one of several resolved addresses is internal", async () => {
    await expect(assertPublicHttpUrl("https://mixed.example.com/", resolvesTo("93.184.216.34", "10.0.0.1"))).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("reports a name that does not resolve rather than guessing", async () => {
    const failing = async () => { throw new Error("ENOTFOUND nope.example"); };
    await expect(assertPublicHttpUrl("https://nope.example/", failing)).rejects.toThrow(/ENOTFOUND/);
  });
});
