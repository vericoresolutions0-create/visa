import type { VisaChecklist } from "./visa-data.ts";

type CheckedItems = Record<string, boolean>;

/**
 * Generates and downloads a premium PDF checklist.
 * Uses dynamic import to avoid SSR issues with jspdf.
 */
export async function downloadChecklistPDF(
  checklist: VisaChecklist,
  origin: string,
  checkedItems: CheckedItems
): Promise<void> {
  // Dynamic import to keep initial bundle small
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const NAVY = [10, 25, 60] as const;
  const GOLD = [184, 149, 60] as const;
  const CREAM = [252, 249, 243] as const;
  const WHITE = [255, 255, 255] as const;
  const LIGHT_GRAY = [245, 245, 248] as const;

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;

  // ── Header band ──────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 42, "F");

  // Brand name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...GOLD);
  doc.text("VisaClear", margin, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 200);
  doc.text("by Vericore", margin + 37, 18);

  // Tagline
  doc.setFontSize(8);
  doc.setTextColor(180, 190, 210);
  doc.setFont("helvetica", "italic");
  doc.text("\"It's all about Privacy.\"  |  GDPR & NDPA Principles · CISA Certified", pageW - margin, 18, { align: "right" });

  // Visa title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...WHITE);
  const visaTitle = `${checklist.destination} ${checklist.visaType.charAt(0).toUpperCase() + checklist.visaType.slice(1)} Visa Checklist`;
  doc.text(visaTitle, margin, 32);

  // Origin line
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(160, 175, 200);
  doc.text(`Applicant Origin: ${origin}  |  Generated: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}`, margin, 39);

  // ── Summary strip ─────────────────────────────────────────────────────────
  doc.setFillColor(...CREAM);
  doc.rect(0, 42, pageW, 26, "F");

  const summaryItems = [
    { label: "Processing Time", value: checklist.processingTime },
    { label: "Visa Fee", value: checklist.fee },
    { label: "Documents", value: `${checklist.items.length} items` },
    { label: "Required", value: `${checklist.items.filter(i => i.required).length} mandatory` },
  ];

  // Increase header band height to 52 to give summary strip more room
  const colW = contentW / (summaryItems.length || 1);
  summaryItems.forEach((s, i) => {
    const x = margin + i * colW + colW / 2;
    // Wrap long values (e.g. fee with extra text) across 2 lines if needed
    const valueLines = doc.splitTextToSize(s.value, colW - 4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...NAVY);
    // Print first line at y=51, second at y=55.5 if wraps
    doc.text(valueLines[0] as string, x, 51, { align: "center" });
    if (valueLines.length > 1) {
      doc.text(valueLines[1] as string, x, 55.5, { align: "center" });
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 100, 120);
    doc.text(s.label, x, valueLines.length > 1 ? 60 : 57, { align: "center" });
  });

  // ── Approval Tip ─────────────────────────────────────────────────────────
  let y = 76;
  doc.setFillColor(240, 245, 255);
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.1);
  const tipLines = doc.splitTextToSize(`Approval Tip: ${checklist.successTip}`, contentW - 12);
  const tipH = tipLines.length * 4.5 + 8;
  doc.roundedRect(margin, y, contentW, tipH, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text("KEY APPROVAL TIP", margin + 5, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(40, 50, 80);
  doc.text(tipLines, margin + 5, y + 12);
  y += tipH + 8;

  // ── Checklist table ───────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text("DOCUMENT CHECKLIST", margin, y);
  y += 5;

  const tableData = checklist.items.map((item) => {
    const isDone = checkedItems[item.id];
    return [
      isDone ? "YES" : "NO",
      item.title + (item.required ? "" : " (optional)"),
      item.where,
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["Done", "Document", "Where to Get It"]],
    body: tableData,
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 3, lineColor: [220, 220, 230], lineWidth: 0.1 },
    headStyles: {
      fillColor: [...NAVY] as [number, number, number],
      textColor: [...WHITE] as [number, number, number],
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [...LIGHT_GRAY] as [number, number, number] },
    columnStyles: {
      0: { cellWidth: 16, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 88 },
      2: { cellWidth: contentW - 104 },
    },
    didParseCell: (hookData) => {
      const item = checklist.items[hookData.row.index];
      if (hookData.column.index === 0 && hookData.cell.raw === "YES") {
        hookData.cell.styles.textColor = [0, 140, 80];
        hookData.cell.styles.fontStyle = "bold";
      }
      if (hookData.column.index === 0 && hookData.cell.raw === "NO") {
        hookData.cell.styles.textColor = [150, 150, 170];
      }
      if (item && !item.required && hookData.column.index === 1) {
        hookData.cell.styles.textColor = [120, 120, 140];
      }
    },
  });

  // ── Disclaimer + footer ───────────────────────────────────────────────────
  const autoTableDoc = doc as unknown as { lastAutoTable?: { finalY: number } };
  const finalY = (autoTableDoc.lastAutoTable?.finalY ?? (pageH - 60)) + 8;

  if (finalY < pageH - 40) {
    doc.setFillColor(250, 248, 244);
    doc.setDrawColor(210, 195, 160);
    doc.setLineWidth(0.1);
    doc.roundedRect(margin, finalY, contentW, 18, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...NAVY);
    doc.text("IMPORTANT DISCLAIMER", margin + 4, finalY + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(80, 80, 100);
    const disclaimer = "This checklist is a guidance tool only and does not constitute legal or immigration advice. Requirements change regularly. Always verify with the official embassy or consulate before submitting.";
    doc.text(doc.splitTextToSize(disclaimer, contentW - 8), margin + 4, finalY + 11);
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(...NAVY);
    doc.rect(0, pageH - 10, pageW, 10, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(160, 175, 200);
    doc.text("VisaClear by Vericore  |  visaclear.vercel.app  |  GDPR & NDPA Principles  |  Not Legal Advice", margin, pageH - 4);
    doc.text(`Page ${p} of ${totalPages}`, pageW - margin, pageH - 4, { align: "right" });
  }

  doc.save(`VisaClear_${checklist.destination.replace(/\s+/g, "_")}_${checklist.visaType}_Checklist.pdf`);
}

/**
 * Generates and downloads a bank letter / financial readiness template PDF.
 */
export async function downloadBankLetterPDF(
  origin: string,
  destination: string,
  visaType: string,
  fee: string,
  processingTime: string
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const NAVY = [10, 25, 60] as const;
  const GOLD = [184, 149, 60] as const;
  const WHITE = [255, 255, 255] as const;

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 25;
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  // Header
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 35, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...GOLD);
  doc.text("VisaClear", margin, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 200);
  doc.text("by Vericore  |  Financial Readiness Template", margin, 22);
  doc.setFontSize(8);
  doc.setTextColor(140, 155, 185);
  doc.text(`Generated: ${today}`, margin, 30);

  // Watermark notice
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  let y = 48;
  doc.setFillColor(255, 250, 235);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, pageW - margin * 2, 14, 2, 2, "FD");
  doc.setFontSize(8);
  doc.setTextColor(120, 90, 20);
  doc.text("SAMPLE TEMPLATE — To be completed on official bank or employer letterhead with their stamp and signature.", margin + 4, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Present this as a guide to your bank/employer. Do not submit as-is.", margin + 4, y + 11);

  y += 22;

  // Letter header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.text("BANK STATEMENT COVER LETTER", pageW / 2, y, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 100);
  doc.text(`For ${visaType.charAt(0).toUpperCase() + visaType.slice(1)} Visa Application — ${destination}`, pageW / 2, y + 6, { align: "center" });
  y += 16;

  // Horizontal rule
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // Letter date and address block
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 50);

  const letterLines = [
    `Date: ${today}`,
    "",
    "To Whom It May Concern,",
    `Embassy / Consulate of ${destination}`,
    "",
    "Re: Financial Standing Confirmation for Visa Application",
    "",
    `I am writing to confirm that [APPLICANT FULL NAME], holder of passport number [PASSPORT NUMBER],`,
    `is a verified account holder at [BANK NAME] and has maintained a steady financial history`,
    `with our institution.`,
    "",
    `As of ${today}, the applicant holds an account balance of [AMOUNT IN LOCAL CURRENCY]`,
    `(approximately [EQUIVALENT IN USD/EUR]), which has been consistently maintained over`,
    `the past 6 months, demonstrating financial stability and sufficient funds to cover`,
    `travel, accommodation, and living expenses for the duration of the intended trip.`,
    "",
    `The estimated costs for the ${visaType} visa to ${destination} are as follows:`,
    `  • Visa Application Fee: ${fee}`,
    `  • Estimated Processing Time: ${processingTime}`,
    `  • Estimated Travel & Stay Budget: [INSERT AMOUNT]`,
    "",
    `We confirm that [APPLICANT FULL NAME] has sufficient funds and strong financial ties`,
    `to their country of origin, indicating a strong intent to return after their visit.`,
    "",
    `Should you require any additional verification, please do not hesitate to contact`,
    `us at the address or telephone number below.`,
    "",
    "Yours faithfully,",
    "",
    "",
    "[AUTHORISED SIGNATORY NAME]",
    "[TITLE / POSITION]",
    "[BANK NAME]",
    "[BRANCH ADDRESS]",
    "[PHONE NUMBER]",
    "[EMAIL ADDRESS]",
    "",
    "Official Stamp: ___________________________",
  ];

  doc.setFontSize(9.5);
  for (const line of letterLines) {
    if (y > pageH - 20) {
      doc.addPage();
      y = 25;
    }
    if (line.startsWith("Re:") || line.startsWith("[AUTHORISED")) {
      doc.setFont("helvetica", "bold");
    } else {
      doc.setFont("helvetica", "normal");
    }
    doc.text(line, margin, y);
    y += line === "" ? 4 : 5.5;
  }

  // Footer
  doc.setFillColor(...NAVY);
  doc.rect(0, pageH - 10, pageW, 10, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(160, 175, 200);
  doc.text("VisaClear by Vericore  |  This is a sample template, not a legal document.", margin, pageH - 4);
  doc.setTextColor(...GOLD);
  doc.text("visaclear.vercel.app", pageW - margin, pageH - 4, { align: "right" });

  doc.save(`VisaClear_Bank_Letter_Template_${destination.replace(/\s+/g, "_")}.pdf`);
}
