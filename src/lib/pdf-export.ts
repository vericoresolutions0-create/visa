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

  // ── Quick stats strip ────────────────────────────────────────────────────
  // Only ever holds short, fixed-format values ("9 items", "7 mandatory") —
  // Processing Time and Visa Fee moved to their own full-width blocks below,
  // since real-world values for those run past 200 characters (e.g. South
  // Africa's family-visa fee text) and a 4-column strip can't show that
  // safely at any font size.
  doc.setFillColor(...CREAM);
  doc.rect(0, 42, pageW, 22, "F");

  const quickStats = [
    { label: "Documents", value: `${checklist.items.length} items` },
    { label: "Required", value: `${checklist.items.filter(i => i.required).length} mandatory` },
  ];
  const statColW = contentW / quickStats.length;
  quickStats.forEach((s, i) => {
    const x = margin + i * statColW + statColW / 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text(s.value, x, 54.5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 120);
    doc.text(s.label, x, 60, { align: "center" });
  });

  // ── Key facts: Processing Time / Visa Fee ───────────────────────────────
  // Full-width, height computed from the real wrapped line count so the
  // complete value always renders — never truncated, never overlapping
  // whatever comes next. The font used to measure (splitTextToSize) and the
  // font used to render must be set identically and in that order every
  // time; setting them out of order was the cause of the text-overlap bug
  // this replaced (measured with a leftover smaller font from the previous
  // section, then rendered wider than the measured width, running text off
  // the page and into whatever followed).
  let y = 68;
  const keyFacts = [
    { label: "PROCESSING TIME", value: checklist.processingTime },
    { label: "VISA FEE", value: checklist.fee },
  ];
  for (const fact of keyFacts) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const lines = doc.splitTextToSize(fact.value, contentW - 12);
    const boxH = lines.length * 4.3 + 10;
    doc.setFillColor(...LIGHT_GRAY);
    doc.setDrawColor(220, 220, 230);
    doc.setLineWidth(0.1);
    doc.roundedRect(margin, y, contentW, boxH, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...NAVY);
    doc.text(fact.label, margin + 5, y + 5.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(50, 55, 75);
    doc.text(lines, margin + 5, y + 10.5);
    y += boxH + 4;
  }
  y += 2;

  // ── Approval Tip ─────────────────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const tipLines = doc.splitTextToSize(`Approval Tip: ${checklist.successTip}`, contentW - 12);
  const tipH = tipLines.length * 4.5 + 8;
  doc.setFillColor(240, 245, 255);
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.1);
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
    doc.text("VisaClear by Vericore  |  visaclear.app  |  GDPR & NDPA Principles  |  Not Legal Advice", margin, pageH - 4);
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

  // `bullet: true` lines carry real, unbounded-length data (fee/processing
  // time straight from visa-data.ts — some run past 200 characters) and get
  // wrapped for real below. Every other line is short, static template text
  // that already fits the page as authored, so it prints as-is.
  const letterLines: { text: string; bullet?: boolean; bold?: boolean }[] = [
    { text: `Date: ${today}` },
    { text: "" },
    { text: "To Whom It May Concern," },
    { text: `Embassy / Consulate of ${destination}` },
    { text: "" },
    { text: "Re: Financial Standing Confirmation for Visa Application", bold: true },
    { text: "" },
    { text: `I am writing to confirm that [APPLICANT FULL NAME], holder of passport number [PASSPORT NUMBER],` },
    { text: `is a verified account holder at [BANK NAME] and has maintained a steady financial history` },
    { text: `with our institution.` },
    { text: "" },
    { text: `As of ${today}, the applicant holds an account balance of [AMOUNT IN LOCAL CURRENCY]` },
    { text: `(approximately [EQUIVALENT IN USD/EUR]), which has been consistently maintained over` },
    { text: `the past 6 months, demonstrating financial stability and sufficient funds to cover` },
    { text: `travel, accommodation, and living expenses for the duration of the intended trip.` },
    { text: "" },
    { text: `The estimated costs for the ${visaType} visa to ${destination} are as follows:` },
    { text: `Visa Application Fee: ${fee}`, bullet: true },
    { text: `Estimated Processing Time: ${processingTime}`, bullet: true },
    { text: `Estimated Travel & Stay Budget: [INSERT AMOUNT]`, bullet: true },
    { text: "" },
    { text: `We confirm that [APPLICANT FULL NAME] has sufficient funds and strong financial ties` },
    { text: `to their country of origin, indicating a strong intent to return after their visit.` },
    { text: "" },
    { text: `Should you require any additional verification, please do not hesitate to contact` },
    { text: `us at the address or telephone number below.` },
    { text: "" },
    { text: "Yours faithfully," },
    { text: "" },
    { text: "" },
    { text: "[AUTHORISED SIGNATORY NAME]", bold: true },
    { text: "[TITLE / POSITION]" },
    { text: "[BANK NAME]" },
    { text: "[BRANCH ADDRESS]" },
    { text: "[PHONE NUMBER]" },
    { text: "[EMAIL ADDRESS]" },
    { text: "" },
    { text: "Official Stamp: ___________________________" },
  ];

  const bulletX = margin + 4;
  const bulletTextX = bulletX + 3.5;
  for (const line of letterLines) {
    if (line.bullet) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      const wrapped = doc.splitTextToSize(line.text, pageW - margin - bulletTextX);
      wrapped.forEach((sub: string, i: number) => {
        if (y > pageH - 20) {
          doc.addPage();
          y = 25;
        }
        if (i === 0) doc.text("•", bulletX, y);
        doc.text(sub, bulletTextX, y);
        y += 5.5;
      });
      continue;
    }
    if (y > pageH - 20) {
      doc.addPage();
      y = 25;
    }
    doc.setFont("helvetica", line.bold ? "bold" : "normal");
    doc.setFontSize(9.5);
    doc.text(line.text, margin, y);
    y += line.text === "" ? 4 : 5.5;
  }

  // Footer on every page — drawn after the content loop so it reflects the
  // real final page count, and applied via setPage per page rather than
  // once at whatever page happened to be current when this code ran (that
  // was the previous bug: a letter long enough to spill onto page 2 left
  // page 1, the actual content page, with no VisaClear footer at all).
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(...NAVY);
    doc.rect(0, pageH - 10, pageW, 10, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(160, 175, 200);
    doc.text("VisaClear by Vericore  |  This is a sample template, not a legal document.", margin, pageH - 4);
    doc.setTextColor(...GOLD);
    doc.text("visaclear.app", pageW - margin, pageH - 4, { align: "right" });
  }

  doc.save(`VisaClear_Bank_Letter_Template_${destination.replace(/\s+/g, "_")}.pdf`);
}
