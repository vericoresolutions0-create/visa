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
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// Builds the CSV directly from whatever cohort rows are passed in — the
// caller must pass the live, already-rendered query result, never a cached
// or hand-written sample array, so the export always reflects current data.
export function buildComplianceCsv(rows: CohortRow[]): string {
  const headers = [
    "Employee Name", "Email", "Department", "Role", "Target Relocation Date",
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

export function downloadComplianceCsv(rows: CohortRow[], orgName: string) {
  const csv = buildComplianceCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `VisaClear_Compliance_Report_${orgName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
