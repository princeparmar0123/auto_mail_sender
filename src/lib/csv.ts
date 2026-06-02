// Tiny CSV parser — handles quoted fields with commas and escaped quotes.
export interface CsvRow { [key: string]: string }

function parseLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { out.push(cur); cur = ""; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export function parseCsv(text: string): CsvRow[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = parseLine(lines[0]).map((h) => h.trim().toLowerCase());
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i]);
    const row: CsvRow = {};
    headers.forEach((h, idx) => { row[h] = (cells[idx] ?? "").trim(); });
    rows.push(row);
  }
  return rows;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ValidatedRecipient {
  company_name: string;
  recruiter_name: string;
  email: string;
  job_title: string;
  valid: boolean;
  reason?: string;
}

export function validateRecipients(rows: CsvRow[]): {
  valid: ValidatedRecipient[];
  invalid: ValidatedRecipient[];
  duplicates: number;
} {
  const seen = new Set<string>();
  const valid: ValidatedRecipient[] = [];
  const invalid: ValidatedRecipient[] = [];
  let duplicates = 0;
  for (const r of rows) {
    const rec: ValidatedRecipient = {
      company_name: r.company_name ?? "",
      recruiter_name: r.recruiter_name ?? "",
      email: (r.email ?? "").toLowerCase(),
      job_title: r.job_title ?? "",
      valid: true,
    };
    if (!rec.email) { rec.valid = false; rec.reason = "Missing email"; invalid.push(rec); continue; }
    if (!EMAIL_RE.test(rec.email)) { rec.valid = false; rec.reason = "Invalid email"; invalid.push(rec); continue; }
    if (seen.has(rec.email)) { duplicates++; continue; }
    seen.add(rec.email);
    valid.push(rec);
  }
  return { valid, invalid, duplicates };
}

export function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}