import { isPublicAddress } from '../src/images/fetch-image';

describe('isPublicAddress', () => {
  it.each(['104.26.5.30', '8.8.8.8', '2606:4700:20::681a:41e', '::ffff:8.8.8.8'])('allows %s', (a) =>
    expect(isPublicAddress(a)).toBe(true));

  it.each([
    '127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0',
    '::1', '::', 'fe80::1', 'fd00::1', '::ffff:127.0.0.1', '::ffff:7f00:1', '::ffff:a9fe:a9fe', 'not-an-ip',
  ])('refuses %s', (a) => expect(isPublicAddress(a)).toBe(false));
});
