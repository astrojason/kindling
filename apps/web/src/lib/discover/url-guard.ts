import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

/** A URL the server must not fetch: wrong scheme, credentials, or an internal address. */
export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

type Lookup = (hostname: string, options: { all: true }) => Promise<Array<{ address: string; family: number }>>;

function isPrivateIPv4(octets: number[]): boolean {
  const [a, b, c] = octets;
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

/** The 16 bytes of an IPv6 address, including `::` compression and a trailing dotted IPv4. */
function ipv6Bytes(address: string): number[] {
  let text = address.toLowerCase();
  const dotted = text.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) {
    const o = dotted[1].split(".").map(Number);
    text = text.slice(0, -dotted[1].length) + ((o[0] << 8) | o[1]).toString(16) + ":" + ((o[2] << 8) | o[3]).toString(16);
  }
  const [head, tail] = text.split("::");
  const groups = (part: string | undefined) => (part ? part.split(":").map((g) => parseInt(g, 16)) : []);
  const front = groups(head);
  const back = tail === undefined ? [] : groups(tail);
  const all = tail === undefined ? front : [...front, ...Array(8 - front.length - back.length).fill(0), ...back];
  return all.flatMap((g) => [g >> 8, g & 0xff]);
}

/** Loopback, private, link-local (including the cloud metadata address), multicast and reserved addresses. */
export function isPrivateAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return isPrivateIPv4(address.split(".").map(Number));
  if (family !== 6) return true; // not an address we can reason about: do not fetch it

  const b = ipv6Bytes(address);
  const zeros = (from: number, to: number) => b.slice(from, to).every((x) => x === 0);
  if (zeros(0, 15) && (b[15] === 0 || b[15] === 1)) return true; // :: and ::1
  if ((b[0] & 0xfe) === 0xfc) return true; // fc00::/7 unique local
  if (b[0] === 0xfe && (b[1] & 0xc0) === 0x80) return true; // fe80::/10 link-local
  if (b[0] === 0xff) return true; // multicast
  if (zeros(0, 10) && b[10] === 0xff && b[11] === 0xff) return isPrivateIPv4(b.slice(12)); // ::ffff:a.b.c.d
  if (b[0] === 0x00 && b[1] === 0x64 && b[2] === 0xff && b[3] === 0x9b && zeros(4, 12)) return isPrivateIPv4(b.slice(12)); // 64:ff9b::/96 NAT64
  if (b[0] === 0x20 && b[1] === 0x02) return isPrivateIPv4(b.slice(2, 6)); // 2002::/16 6to4
  return false;
}

/**
 * Throws unless `raw` is an http(s) URL with no credentials whose host is a public address (resolving the
 * name and checking every address it maps to). Returns the parsed URL. Lookup failures propagate as they are.
 */
export async function assertPublicHttpUrl(raw: string, lookup: Lookup = dnsLookup as Lookup): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError(`"${raw.slice(0, 80)}" is not a valid URL`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new UnsafeUrlError(`only http and https links can be fetched, not ${url.protocol}`);
  if (url.username || url.password) throw new UnsafeUrlError("a URL with embedded credentials will not be fetched");

  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase().replace(/\.$/, "");
  if (host === "localhost" || /\.(localhost|local|internal)$/.test(host)) throw new UnsafeUrlError(`${host} is an internal hostname`);

  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new UnsafeUrlError(`${host} points at an internal address`);
    return url;
  }
  const addresses = await lookup(host, { all: true });
  const internal = addresses.find((a) => isPrivateAddress(a.address));
  if (internal) throw new UnsafeUrlError(`${host} resolves to an internal address (${internal.address})`);
  return url;
}
