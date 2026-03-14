export function toCsv<T extends object>(rows: T[], headers: string[]): string {
  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes('"') || str.includes(',') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const headerLine = headers.join(',');
  const lines = rows.map((row) =>
    headers
      .map((h) => escape((row as Record<string, unknown>)[h]))
      .join(',')
  );
  return [headerLine, ...lines].join('\n');
}

