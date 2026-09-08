// ============================================================
// KesslerX — Debris Impact Analysis Report Generator
// Professional PDF matching the Conjunction Assessment Report format
// Same design system: cover page, watermark, sections, tables, metric blocks
// ============================================================

import jsPDF from 'jspdf';

// ============================================================
// Types
// ============================================================

export interface CollisionEvent {
  id: number;
  timestamp: number;
  debrisGenerated: number;
  debrisWithSystem: number;
  reductionPercent: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface DebrisReportData {
  collisionEvents: CollisionEvent[];
  magnitude: number;
  debrisRate: number;
  timeline: number;
  simElapsed: number;
  totalDebrisWithout: number;
  totalDebrisWith: number;
  totalReduction: number;
}

// ============================================================
// Design Constants (mirrors generateReport.ts exactly)
// ============================================================

const COLORS = {
  navy: [10, 22, 40] as [number, number, number],
  primary: [180, 197, 255] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  lightGray: [200, 210, 225] as [number, number, number],
  midGray: [140, 155, 175] as [number, number, number],
  darkGray: [60, 75, 95] as [number, number, number],
  error: [255, 77, 77] as [number, number, number],
  warning: [234, 179, 8] as [number, number, number],
  success: [16, 185, 129] as [number, number, number],
  tableBg: [245, 247, 252] as [number, number, number],
  tableHeader: [20, 35, 60] as [number, number, number],
};

const MARGIN = 20;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_Y = PAGE_H - 15;
const USABLE_H = FOOTER_Y - 5;

function severityColor(severity: string): [number, number, number] {
  switch (severity) {
    case 'CRITICAL': return COLORS.error;
    case 'HIGH': return COLORS.warning;
    case 'MEDIUM': return COLORS.midGray;
    case 'LOW': return COLORS.success;
    default: return COLORS.midGray;
  }
}

// ============================================================
// PDF Generation
// ============================================================

export async function generateDebrisReport(
  data: DebrisReportData,
  onProgress?: (status: string) => void,
): Promise<void> {
  const {
    collisionEvents, magnitude, debrisRate, timeline,
    simElapsed, totalDebrisWithout, totalDebrisWith, totalReduction,
  } = data;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const now = new Date();
  const reportDate = now.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });
  const yearStr = now.getFullYear();
  const reportId = `SIM-${now.getTime().toString(36).toUpperCase().slice(-6)}`;

  let y = MARGIN;

  // ----------------------------------------------------------
  // Watermark Helper — draws behind page contents
  // ----------------------------------------------------------

  function drawWatermark(isCover = false) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(62);
    if (isCover) {
      doc.setTextColor(16, 32, 58);
    } else {
      doc.setTextColor(235, 240, 250);
    }
    doc.text('KESSLERX', PAGE_W / 2, PAGE_H / 2, {
      align: 'center',
      angle: 45,
    });
  }

  // ----------------------------------------------------------
  // Page helpers
  // ----------------------------------------------------------

  function ensureSpace(needed: number) {
    if (y + needed > USABLE_H) {
      doc.addPage();
      drawWatermark(false);
      y = MARGIN + 10;
    }
  }

  // ----------------------------------------------------------
  // Drawing helpers (same as generateReport.ts)
  // ----------------------------------------------------------

  function sectionTitle(num: string, title: string) {
    ensureSpace(14);
    y += 4;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.navy);
    doc.text(`${num}  ${title.toUpperCase()}`, MARGIN, y);
    y += 1.5;
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, y, MARGIN + 55, y);
    y += 5;
  }

  function labelValue(label: string, value: string, labelW = 52) {
    ensureSpace(6);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.darkGray);
    doc.text(label, MARGIN + 2, y);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.navy);
    const lines = doc.splitTextToSize(value, CONTENT_W - labelW - 2);
    doc.text(lines, MARGIN + labelW, y);
    y += Math.max(4.5, lines.length * 3.8);
  }

  function paragraph(text: string, indent = 0) {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.darkGray);
    const lines = doc.splitTextToSize(text, CONTENT_W - indent);
    for (let i = 0; i < lines.length; i++) {
      ensureSpace(4);
      doc.text(lines[i], MARGIN + indent, y);
      y += 3.6;
    }
    y += 1.5;
  }

  function subheading(text: string) {
    ensureSpace(8);
    y += 2;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.navy);
    doc.text(text, MARGIN + 2, y);
    y += 4.5;
  }

  function thinRule() {
    ensureSpace(3);
    doc.setDrawColor(...COLORS.lightGray);
    doc.setLineWidth(0.15);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 3;
  }

  function bulletItem(text: string, indent = 4) {
    ensureSpace(5);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.darkGray);
    doc.text('\u2022', MARGIN + indent, y);
    const lines = doc.splitTextToSize(text, CONTENT_W - indent - 5);
    doc.text(lines, MARGIN + indent + 4, y);
    y += lines.length * 3.5 + 1;
  }

  // ----------------------------------------------------------
  // Table (same as generateReport.ts)
  // ----------------------------------------------------------

  function table(headers: string[], rows: string[][], colWidths?: number[]) {
    const cols = headers.length;
    const widths = colWidths || Array(cols).fill(CONTENT_W / cols);
    const rowH = 6;

    ensureSpace(rowH + 2);
    doc.setFillColor(...COLORS.tableHeader);
    doc.rect(MARGIN, y - 1, CONTENT_W, rowH, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...COLORS.white);
    let x = MARGIN + 2;
    headers.forEach((h, i) => {
      doc.text(h, x, y + 3);
      x += widths[i];
    });
    y += rowH;

    rows.forEach((row, rowIdx) => {
      ensureSpace(rowH + 1);
      if (rowIdx % 2 === 0) {
        doc.setFillColor(...COLORS.tableBg);
        doc.rect(MARGIN, y - 1, CONTENT_W, rowH, 'F');
      }
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.navy);
      x = MARGIN + 2;
      row.forEach((cell, i) => {
        const maxW = widths[i] - 3;
        const truncated = doc.getTextWidth(cell) > maxW
          ? cell.substring(0, Math.floor(cell.length * (maxW / doc.getTextWidth(cell)))) + '...'
          : cell;
        doc.text(truncated, x, y + 3);
        x += widths[i];
      });
      y += rowH;
    });
    y += 3;
  }

  // ----------------------------------------------------------
  // Metric block (same as generateReport.ts)
  // ----------------------------------------------------------

  function metricBlock(label: string, value: string, unit: string, color: [number, number, number], xPos: number, yPos: number, blockW: number) {
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(xPos, yPos, blockW, 20, 2, 2, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(255, 255, 255);
    doc.text(label, xPos + blockW / 2, yPos + 4.5, { align: 'center' });
    doc.setFontSize(13);
    doc.text(value, xPos + blockW / 2, yPos + 12.5, { align: 'center' });
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.text(unit, xPos + blockW / 2, yPos + 17, { align: 'center' });
  }

  // ============================================================
  // Determine overall severity
  // ============================================================

  const maxSeverity = collisionEvents.reduce((max, e) => {
    const order = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };
    return order[e.severity] > order[max] ? e.severity : max;
  }, 'LOW' as CollisionEvent['severity']);

  // ============================================================
  // COVER PAGE
  // ============================================================

  onProgress?.('Building cover page...');

  // Dark background
  doc.setFillColor(...COLORS.navy);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  // Background Watermark on Cover Page
  drawWatermark(true);

  // Top accent
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, PAGE_W, 2.5, 'F');

  // KesslerX title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(36);
  doc.setTextColor(...COLORS.primary);
  doc.text('KESSLERX', MARGIN, 50);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.lightGray);
  doc.text('DEBRIS IMPACT ANALYSIS & MITIGATION ASSESSMENT', MARGIN, 60);

  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, 68, PAGE_W - MARGIN, 68);

  // Cover fields
  let cy = 85;
  const coverField = (label: string, value: string) => {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.midGray);
    doc.text(label, MARGIN, cy);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.white);
    doc.text(value, MARGIN, cy + 7);
    cy += 18;
  };

  coverField('SIMULATION ID', reportId);
  coverField('SCENARIO', `Magnitude ${magnitude}/10 \u2014 Rate ${debrisRate}`);
  coverField('TOTAL COLLISIONS', `${collisionEvents.length} collision event${collisionEvents.length !== 1 ? 's' : ''} recorded`);

  // Severity badge
  cy += 3;
  const sevC = severityColor(maxSeverity);
  doc.setFillColor(sevC[0], sevC[1], sevC[2]);
  doc.roundedRect(MARGIN, cy, 65, 12, 2, 2, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`RISK: ${maxSeverity}`, MARGIN + 32.5, cy + 8, { align: 'center' });

  // Report Status
  cy += 20;
  coverField('REPORT STATUS', 'Simulation Complete');

  // Generated info
  cy += 10;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.midGray);
  doc.text('GENERATED', MARGIN, cy);
  doc.setTextColor(...COLORS.lightGray);
  doc.setFontSize(9);
  doc.text(reportDate, MARGIN, cy + 6);

  cy += 14;
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.midGray);
  doc.text('GENERATED BY', MARGIN, cy);
  doc.setTextColor(...COLORS.lightGray);
  doc.setFontSize(9);
  doc.text('KesslerX Simulation Engine \u2014 Automated Analysis', MARGIN, cy + 6);

  // Copyright + disclaimer at bottom of cover
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...COLORS.midGray);
  doc.text(`\u00a9 ${yearStr} KesslerX. All rights reserved. Orbital Safety & Conjunction Monitoring Platform.`, MARGIN, PAGE_H - 22);
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(5.5);
  doc.text('This report is a decision-support artifact for qualified operators. It does not constitute an autonomous spacecraft command.', MARGIN, PAGE_H - 17);

  // ============================================================
  // CONTENT PAGES — continuous flow with watermark
  // ============================================================

  doc.addPage();
  drawWatermark(false);
  y = MARGIN + 10;

  // ------ 01 EXECUTIVE SUMMARY ------

  onProgress?.('Writing executive summary...');
  sectionTitle('01', 'Executive Summary');

  // Assessment box
  const debrisPrevented = totalDebrisWithout - totalDebrisWith;
  const assessText = `Kessler Syndrome simulation with magnitude ${magnitude}/10 over ${timeline}-year timeline. ${collisionEvents.length} collision event${collisionEvents.length !== 1 ? 's' : ''} recorded generating ${totalDebrisWithout.toLocaleString()} debris fragments. KesslerX mitigation system reduces debris by ${totalReduction}%, preventing ${debrisPrevented.toLocaleString()} fragments from entering orbit.`;

  ensureSpace(14);
  doc.setFillColor(245, 247, 252);
  doc.roundedRect(MARGIN, y - 1, CONTENT_W, 12, 1.5, 1.5, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.navy);
  doc.text('ASSESSMENT:', MARGIN + 3, y + 4);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7);
  const aLines = doc.splitTextToSize(assessText, CONTENT_W - 35);
  doc.text(aLines, MARGIN + 30, y + 4);
  y += Math.max(15, aLines.length * 3.5 + 5);

  labelValue('Simulation ID', reportId);
  labelValue('Scenario', `Magnitude ${magnitude}/10, Debris Rate ${debrisRate}, Timeline ${timeline} years`);
  labelValue('Total Collisions', `${collisionEvents.length}`);
  labelValue('Max Severity', maxSeverity);
  labelValue('Simulation Duration', `${simElapsed.toFixed(1)} seconds`);
  labelValue('Without KesslerX', `${totalDebrisWithout.toLocaleString()} debris fragments`);
  labelValue('With KesslerX', `${totalDebrisWith.toLocaleString()} debris fragments`);
  labelValue('Overall Reduction', `${totalReduction}% (${debrisPrevented.toLocaleString()} fragments prevented)`);

  y += 2;
  thinRule();

  // ------ 02 SIMULATION PARAMETERS ------

  onProgress?.('Documenting simulation parameters...');
  sectionTitle('02', 'Simulation Parameters');

  table(
    ['PARAMETER', 'VALUE', 'DESCRIPTION'],
    [
      ['Collision Magnitude', `${magnitude}/10`, 'Intensity of cascade collisions'],
      ['Debris Generation Rate', `${debrisRate}`, 'Fragments per collision event'],
      ['Timeline', `${timeline} years`, 'Projected orbital timeline'],
      ['Simulation Duration', `${simElapsed.toFixed(1)}s`, 'Actual simulation runtime'],
      ['Preset Type', magnitude >= 8 ? 'Catastrophic/Cascade' : magnitude >= 5 ? 'Major Collision' : 'Minor Collision', 'Scenario classification'],
    ],
    [50, 45, 75],
  );

  thinRule();

  // ------ 03 DEBRIS IMPACT ASSESSMENT ------

  onProgress?.('Building debris impact assessment...');
  sectionTitle('03', 'Debris Impact Assessment');

  // Metric blocks — same style as conjunction assessment
  ensureSpace(26);
  const blockW = (CONTENT_W - 8) / 3;

  metricBlock(
    'WITHOUT KESSLERX',
    totalDebrisWithout.toLocaleString(),
    'fragments generated',
    COLORS.error,
    MARGIN, y, blockW,
  );
  metricBlock(
    'WITH KESSLERX',
    totalDebrisWith.toLocaleString(),
    'fragments mitigated',
    COLORS.success,
    MARGIN + blockW + 4, y, blockW,
  );
  metricBlock(
    'REDUCTION',
    `${totalReduction}%`,
    `${debrisPrevented.toLocaleString()} prevented`,
    COLORS.navy,
    MARGIN + (blockW + 4) * 2, y, blockW,
  );
  y += 24;

  // Impact summary table
  table(
    ['METRIC', 'VALUE', 'STATUS'],
    [
      ['Total Collisions', `${collisionEvents.length}`, maxSeverity],
      ['Debris Without System', `${totalDebrisWithout.toLocaleString()} fragments`, 'UNMITIGATED'],
      ['Debris With KesslerX', `${totalDebrisWith.toLocaleString()} fragments`, 'MITIGATED'],
      ['Fragments Prevented', `${debrisPrevented.toLocaleString()}`, 'PREVENTED'],
      ['Average Reduction', `${totalReduction}%`, totalReduction >= 70 ? 'OPTIMAL' : totalReduction >= 50 ? 'EFFECTIVE' : 'MODERATE'],
      ['Max Severity Event', maxSeverity, maxSeverity],
      ['Mitigation Effectiveness', totalReduction >= 70 ? 'Highly Effective' : totalReduction >= 50 ? 'Effective' : 'Partial', totalReduction >= 60 ? 'NOMINAL' : 'REVIEW'],
    ],
    [52, 68, 50],
  );

  thinRule();

  // ------ 04 KESSLERX MITIGATION ANALYSIS ------

  onProgress?.('Compiling mitigation analysis...');
  sectionTitle('04', 'KesslerX Mitigation Analysis');

  subheading('How KesslerX Reduces Debris');
  paragraph('The KesslerX system employs a multi-layered approach to debris mitigation through early warning detection, predictive collision avoidance maneuvers, and real-time orbital traffic management. The simulation quantifies the reduction in orbital debris when KesslerX active monitoring and automated response systems are operational.', 2);

  subheading('Mitigation Mechanisms');
  bulletItem('Early Warning System \u2014 Detects potential collisions 24\u201372 hours in advance, enabling pre-emptive avoidance maneuvers');
  bulletItem('Automated Collision Avoidance (CAM) \u2014 AI-driven maneuver planning reduces collision probability by 60\u201385% per event');
  bulletItem('Orbital Traffic Management \u2014 Coordinated satellite positioning minimizes conjunction events');
  bulletItem('Cascade Prevention \u2014 By preventing initial collisions, exponential debris growth is avoided');

  subheading('Simulation Results');
  const critCount = collisionEvents.filter(e => e.severity === 'CRITICAL').length;
  const highCount = collisionEvents.filter(e => e.severity === 'HIGH').length;
  const medCount = collisionEvents.filter(e => e.severity === 'MEDIUM').length;
  const lowCount = collisionEvents.filter(e => e.severity === 'LOW').length;

  paragraph(`Out of ${collisionEvents.length} collision events: ${critCount} CRITICAL, ${highCount} HIGH, ${medCount} MEDIUM, ${lowCount} LOW severity.`, 2);
  paragraph(`The KesslerX system achieved an overall debris reduction of ${totalReduction}%, preventing ${debrisPrevented.toLocaleString()} fragments from entering orbit. This demonstrates ${totalReduction >= 70 ? 'highly effective' : totalReduction >= 50 ? 'effective' : 'partial'} mitigation capability under the simulated conditions.`, 2);

  thinRule();

  // ------ 05 COLLISION EVENT LOG ------

  onProgress?.('Formatting collision event log...');
  sectionTitle('05', 'Collision Event Log');

  if (collisionEvents.length > 0) {
    table(
      ['#', 'TIME (s)', 'SEVERITY', 'WITHOUT SYSTEM', 'WITH KESSLERX', 'REDUCTION'],
      collisionEvents.map(e => [
        `${e.id}`,
        `${e.timestamp.toFixed(1)}`,
        e.severity,
        `${e.debrisGenerated} fragments`,
        `${e.debrisWithSystem} fragments`,
        `-${e.reductionPercent}%`,
      ]),
      [15, 25, 28, 38, 38, 26],
    );
  } else {
    paragraph('No collision events recorded for this simulation.', 2);
  }

  thinRule();

  // ------ 06 RISK TREND ------

  sectionTitle('06', 'Risk Trend');
  labelValue('Current Trend', totalReduction >= 70 ? 'Decreasing (with KesslerX)' : 'Increasing');
  paragraph(`Without KesslerX intervention, the Kessler Syndrome cascade would generate ${totalDebrisWithout.toLocaleString()} debris fragments over the simulated timeline, with each collision event creating additional fragments that increase the probability of subsequent collisions. With KesslerX active, the cascade is significantly attenuated.`, 2);
  paragraph('Historical risk trend charts are available via the KesslerX dashboard Simulation interface.', 2);

  thinRule();

  // ------ 07 RECOMMENDED ACTION ------

  sectionTitle('07', 'Recommended Action');

  ensureSpace(18);
  doc.setFillColor(245, 247, 252);
  doc.roundedRect(MARGIN, y, CONTENT_W, 16, 1.5, 1.5, 'F');
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y, MARGIN, y + 16);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...COLORS.primary);
  doc.text('RECOMMENDED ACTION', MARGIN + 3, y + 4.5);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.navy);
  const actionText = totalReduction >= 70
    ? 'KesslerX mitigation is highly effective. Maintain active monitoring and ensure all satellites in the simulated orbital regime are enrolled in the KesslerX collision avoidance network.'
    : totalReduction >= 50
    ? 'KesslerX mitigation is effective but could be improved. Review maneuver response times and consider pre-positioning assets for faster avoidance.'
    : 'KesslerX mitigation shows partial effectiveness. Recommend increasing sensor coverage and reducing collision avoidance response latency.';
  const actionLines = doc.splitTextToSize(actionText, CONTENT_W - 8);
  doc.text(actionLines, MARGIN + 3, y + 10);
  y += 20;

  labelValue('Mitigation Status', totalReduction >= 60 ? 'Effective' : 'Needs Improvement');
  labelValue('Debris Prevention Rate', `${totalReduction}%`);
  labelValue('Simulation Classification', magnitude >= 8 ? 'Catastrophic Event' : magnitude >= 5 ? 'Major Collision' : 'Minor Collision');

  ensureSpace(5);
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(...COLORS.midGray);
  doc.text('Decision-support information \u2014 human review required before operational action.', MARGIN + 2, y);
  y += 5;

  thinRule();

  // ------ 08 DATA SOURCES & REPORT METADATA ------

  sectionTitle('08', 'Data Sources & Report Metadata');

  labelValue('KesslerX Simulation ID', reportId);
  labelValue('Data Source', 'KesslerX Kessler Syndrome Simulator');
  labelValue('Simulation Runtime', `${simElapsed.toFixed(1)} seconds`);
  labelValue('Report Generated', reportDate);
  labelValue('App Version', 'KesslerX v2.1.0');
  labelValue('Generated By', 'KesslerX Simulation Engine (Automated)');
  labelValue('Report Format', 'PDF/A4 \u2014 jsPDF');

  thinRule();

  // ------ 09 DISCLAIMER ------

  sectionTitle('09', 'Disclaimer');

  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.darkGray);
  const disclaimerText =
    'This report is generated from simulation data within KesslerX at the time of report generation. ' +
    'It is intended as a decision-support artifact for qualified operators. ' +
    'It does not constitute an autonomous spacecraft command or an authoritative collision-avoidance instruction. ' +
    'Operational decisions remain subject to qualified human review and applicable mission procedures. ' +
    'Simulation results are based on probabilistic models and may not reflect actual orbital conditions. ' +
    'Debris counts, mitigation percentages, and severity classifications are computed from simulation parameters and should be validated against real-world data before operational use.';
  const dLines = doc.splitTextToSize(disclaimerText, CONTENT_W - 4);
  for (const line of dLines) {
    ensureSpace(4);
    doc.text(line, MARGIN + 2, y);
    y += 3.5;
  }
  y += 3;

  // Copyright
  ensureSpace(8);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...COLORS.primary);
  doc.text(`\u00a9 ${yearStr} KesslerX. All rights reserved.`, MARGIN + 2, y);
  y += 3;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...COLORS.midGray);
  doc.text('KesslerX is a proprietary orbital safety and conjunction monitoring platform.', MARGIN + 2, y);
  doc.text('Unauthorized reproduction, distribution, or use of this report is strictly prohibited.', MARGIN + 2, y + 3);

  // ============================================================
  // Headers & Footers on all content pages
  // ============================================================

  onProgress?.('Finalizing document...');
  const totalPages = doc.getNumberOfPages();

  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);

    // Header
    doc.setFontSize(6.5);
    doc.setTextColor(...COLORS.midGray);
    doc.setFont('Helvetica', 'bold');
    doc.text('KESSLERX', MARGIN, 9);
    doc.setFont('Helvetica', 'normal');
    doc.text('  \u00b7  Orbital Safety & Conjunction Monitoring', MARGIN + doc.getTextWidth('KESSLERX'), 9);
    doc.setDrawColor(...COLORS.lightGray);
    doc.setLineWidth(0.15);
    doc.line(MARGIN, 11.5, PAGE_W - MARGIN, 11.5);

    // Footer
    doc.setFontSize(6);
    doc.setTextColor(...COLORS.midGray);
    doc.setFont('Helvetica', 'normal');
    doc.text(reportId, MARGIN, FOOTER_Y);
    doc.text('Confidential \u2014 Operational Use', PAGE_W / 2, FOOTER_Y, { align: 'center' });
    doc.text(`Page ${i - 1} of ${totalPages - 1}`, PAGE_W - MARGIN, FOOTER_Y, { align: 'right' });

    // Copyright in footer
    doc.setFontSize(5);
    doc.text(`\u00a9 ${yearStr} KesslerX`, MARGIN, FOOTER_Y + 3.5);
    doc.text(reportDate, PAGE_W - MARGIN, FOOTER_Y + 3.5, { align: 'right' });
  }

  // ============================================================
  // Output — open in new tab (same as conjunction report)
  // ============================================================

  const dateStr = now.toISOString().split('T')[0];
  const filename = `KesslerX_Debris_Impact_Report_${reportId}_${dateStr}.pdf`;

  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  const newTab = window.open(url, '_blank');
  if (!newTab) {
    doc.save(filename);
  }

  onProgress?.('Report generated successfully.');
}
