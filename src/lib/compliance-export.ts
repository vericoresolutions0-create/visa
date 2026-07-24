type CohortRow = {
  invitedEmail: string;
  employeeName: string | null;
  status: string;
  department?: string;
  roleTitle?: string;
  targetRelocationDate?: string;
  pipelineStage: string;
  readinessPercent: number | null;
  employerVisibleStatus: string | null;
};

function csvEscape(value: string): string {
  // Prefix formula-trigger characters so Excel / Google Sheets don't
  // execute the cell as a formula (CSV injection defence).
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  // Strip lone CR that would corrupt CRLF row boundaries.
  const clean = safe.replace(/\r/g, " ");
  if (clean.includes(",") || clean.includes('"') || clean.includes("\n")) {
    return `"${clean.replace(/"/g, '""')}"`;
  }
  return clean;
}

type OrgHeaders = {
  name: string;
  field1: string;
  field2: string;
  field3: string;
  reportName: string;
};

function getOrgHeaders(orgType?: string | null): OrgHeaders {
  switch (orgType) {
    case "university":
      return { name: "Student Name", field1: "Faculty / School", field2: "Programme / Course", field3: "Target Enrolment Date", reportName: "Student_Report" };
    case "law_firm":
      return { name: "Client Name", field1: "Case Type", field2: "Matter Reference", field3: "Target Decision Date", reportName: "Case_Report" };
    default:
      return { name: "Employee Name", field1: "Department", field2: "Role / Title", field3: "Target Relocation Date", reportName: "Compliance_Report" };
  }
}

// Builds the CSV directly from whatever cohort rows are passed in — the
// caller must pass the live, already-rendered query result, never a cached
// or hand-written sample array, so the export always reflects current data.
export function buildComplianceCsv(rows: CohortRow[], orgType?: string | null): string {
  const h = getOrgHeaders(orgType);
  const headers = [
    h.name, "Email", h.field1, h.field2, h.field3,
    "Invite Status", "Pipeline Stage", "Readiness %", "Readiness Status",
  ];
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push([
      csvEscape(row.employeeName ?? ""),
      csvEscape(row.invitedEmail),
      csvEscape(row.department ?? ""),
      csvEscape(row.roleTitle ?? ""),
      csvEscape(row.targetRelocationDate ?? ""),
      csvEscape(row.status),
      csvEscape(row.pipelineStage),
      row.readinessPercent === null ? "" : String(row.readinessPercent),
      csvEscape(row.employerVisibleStatus ?? ""),
    ].join(","));
  }
  return lines.join("\n");
}

export function buildComplianceCsvFileName(orgName: string, orgType?: string | null): string {
  const h = getOrgHeaders(orgType);
  const safeOrgName = orgName.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_").slice(0, 50);
  return `VisaClear_${h.reportName}_${safeOrgName}_${new Date().toISOString().split("T")[0]}.csv`;
}

// Split out from downloadComplianceCsv so the compliance-export-history
// feature can persist the exact same CSV via the backend (see
// business/dashboard.tsx's handleExportCompliance) before triggering this
// purely local browser download — re-downloading a past export must return
// exactly what was exported that day, not whatever the live cohort looks
// like now.
export function triggerCsvDownload(csv: string, fileName: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadComplianceCsv(rows: CohortRow[], orgName: string, orgType?: string | null) {
  const csv = buildComplianceCsv(rows, orgType);
  triggerCsvDownload(csv, buildComplianceCsvFileName(orgName, orgType));
}
