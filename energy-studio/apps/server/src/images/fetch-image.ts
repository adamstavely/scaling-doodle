import { BadRequestException } from '@nestjs/common';
import { lookup as dnsLookup, type LookupAddress } from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import { BlockList, isIP } from 'node:net';

/** Addresses a URL may not point at: this machine, the private network, link-local, multicast and reserved ranges. */
const blocked = new BlockList();
for (const [net, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) blocked.addSubnet(net, prefix, 'ipv4');
// IPv4-mapped IPv6 (::ffff:a.b.c.d) is unwrapped and checked as IPv4 instead: a ::ffff:0:0/96 rule here would also
// match every plain IPv4 address, because BlockList compares IPv4 against IPv6 rules in mapped form.
for (const [net, prefix] of [['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8]] as const)
  blocked.addSubnet(net, prefix, 'ipv6');

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (!family) return false;
  if (family === 6) {
    const mapped = /^::ffff:(.+)$/i.exec(address);
    if (mapped) {
      const tail = mapped[1];
      if (isIP(tail) === 4) return isPublicAddress(tail);
      const hex = /^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(tail);
      if (!hex) return false;
      const hi = parseInt(hex[1], 16);
      const lo = parseInt(hex[2], 16);
      return isPublicAddress(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
    }
  }
  return !blocked.check(address, family === 6 ? 'ipv6' : 'ipv4');
}

/** DNS lookup that refuses private addresses, so a redirect or a re-resolving name can't reach the local network. */
function safeLookup(
  hostname: string,
  options: object,
  callback: (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void,
) {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, '');
    const list = addresses as LookupAddress[];
    const bad = list.find((a) => !isPublicAddress(a.address));
    if (bad || !list.length) return callback(Object.assign(new Error('URL points at a private address'), { code: 'EPRIVATE' }), '');
    if ((options as { all?: boolean }).all) return callback(null, list);
    callback(null, list[0].address, list[0].family);
  });
}

/**
 * Downloads an image from a public http(s) URL. Follows up to 3 redirects, each checked again, and stops at
 * `maxBytes` or after 15 seconds.
 */
export async function fetchImage(url: string, maxBytes: number, redirects = 3): Promise<Buffer> {
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    throw new BadRequestException('That is not a valid URL');
  }
  if (target.protocol !== 'http:' && target.protocol !== 'https:') throw new BadRequestException('Use an http or https URL');
  if (isIP(target.hostname.replace(/^\[|\]$/g, '')) && !isPublicAddress(target.hostname.replace(/^\[|\]$/g, ''))) {
    throw new BadRequestException('That URL points at a private address');
  }

  const client = target.protocol === 'https:' ? https : http;
  return new Promise<Buffer>((resolve, reject) => {
    const req = client.get(
      target,
      { lookup: safeLookup as never, timeout: 15_000, headers: { accept: 'image/*', 'user-agent': 'EnergyStudio/0.1' } },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          if (redirects <= 0) return reject(new BadRequestException('Too many redirects'));
          return fetchImage(new URL(res.headers.location, target).toString(), maxBytes, redirects - 1).then(resolve, reject);
        }
        if (status !== 200) {
          res.resume();
          return reject(new BadRequestException(`The URL answered ${status}`));
        }
        const type = String(res.headers['content-type'] ?? '');
        if (type && !type.startsWith('image/') && !type.startsWith('application/octet-stream')) {
          res.resume();
          return reject(new BadRequestException('That URL is not an image'));
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBytes) {
            req.destroy();
            reject(new BadRequestException(`The image is larger than ${Math.round(maxBytes / 1024 / 1024)} MB`));
          } else chunks.push(chunk);
        });
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', () => reject(new BadRequestException('The download failed')));
      },
    );
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', (e: NodeJS.ErrnoException) =>
      reject(
        new BadRequestException(
          e.code === 'EPRIVATE' ? 'That URL points at a private address' : e.message === 'timeout' ? 'The download took too long' : 'Could not download that URL',
        ),
      ),
    );
  });
}
