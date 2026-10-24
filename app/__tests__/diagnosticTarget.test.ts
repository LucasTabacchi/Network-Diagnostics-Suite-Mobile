import { isValidDiagnosticIp } from '../src/features/qr/diagnosticTarget';

test('accepts an explicitly supplied IPv4 address', () => {
  expect(isValidDiagnosticIp('10.0.2.2')).toBe(true);
  expect(isValidDiagnosticIp(' 192.168.1.1 ')).toBe(true);
});

test('rejects missing or malformed diagnostic targets', () => {
  for (const value of [
    '', 'router.local', '192.168.1', '192.168.1.256', '192.168.1.-1',
    '0.0.0.0', '00.0.0.0', '192.168.001.1', '255.255.255.255',
  ]) {
    expect(isValidDiagnosticIp(value)).toBe(false);
  }
});
