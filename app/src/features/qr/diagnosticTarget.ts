/** Only an explicitly supplied IPv4 address can be used for a diagnosis. */
export function isValidDiagnosticIp(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === '0.0.0.0' || trimmed === '255.255.255.255') return false;
  const parts = trimmed.split('.');
  return parts.length === 4 && parts.every((part) =>
    /^(0|[1-9]\d{0,2})$/.test(part) && Number(part) <= 255
  );
}
