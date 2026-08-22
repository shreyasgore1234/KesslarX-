// ============================================================
// KesslerX — Orbital Assessment Report Generator
// Professional PDF generation using jsPDF with background Watermark
// All data from actual KesslerX event/handoff/timeline APIs
// ============================================================

import jsPDF from 'jspdf';
import type { HandoffEvent, Handoff, TimelineEntry, HandoffUser } from '../data/handoffTypes';

// ============================================================
// Types
// ============================================================

export interface ReportData {
  event: HandoffEvent;
  handoffs: Handoff[];
  timeline: TimelineEntry[];
  currentUser: HandoffUser;
  users: HandoffUser[];
}

// ============================================================
// Design Constants
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

function na(fieldLabel: string): string {
  return `${fieldLabel} not available in the current KesslerX data source.`;
}

function val(value: any, fieldLabel: string): string {
  if (value === null || value === undefined || value === '') return na(fieldLabel);
  return String(value);
}

function formatReportTCA(tca?: string, minutes?: number): string {
  if (minutes !== undefined && !isNaN(minutes) && minutes > 0) {
    if (minutes < 60) return `T-${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `T-${h}h ${m}m`;
  }
  if (!tca) return na('TCA');
  if (tca.includes('T')) {
    try {
      const dt = new Date(tca);
      if (!isNaN(dt.getTime())) {
        return dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' }) + ' UTC';
      }
    } catch {}
  }
  return tca;
}

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

export async function generateConjunctionReport(
  data: ReportData,
  onProgress?: (status: string) => void,
): Promise<void> {
  const { event, handoffs, timeline, currentUser } = data;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const now = new Date();
  const reportDate = now.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });
  const yearStr = now.getFullYear();

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
  // Drawing helpers
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

  function naMsg(fieldLabel: string) {
    ensureSpace(5);
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.midGray);
    doc.text(na(fieldLabel), MARGIN + 4, y);
    y += 5;
  }

  // ----------------------------------------------------------
  // Table
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
  // Metric block
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
  doc.text('ORBITAL SAFETY & CONJUNCTION ASSESSMENT', MARGIN, 60);

  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, 68, PAGE_W - MARGIN, 68);

  // Event info
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

  coverField('EVENT ID', event.event_id);
  coverField('PRIMARY OBJECT', val(event.satellite, 'Primary object'));
  coverField('SECONDARY OBJECT', val(event.object, 'Secondary object'));

  // Severity badge
  cy += 3;
  const sevC = severityColor(event.severity);
  doc.setFillColor(sevC[0], sevC[1], sevC[2]);
  doc.roundedRect(MARGIN, cy, 65, 12, 2, 2, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`RISK: ${event.severity}`, MARGIN + 32.5, cy + 8, { align: 'center' });

  // Status
  cy += 20;
  coverField('REPORT STATUS', val(event.status, 'Event status'));

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
  doc.text(`${currentUser.name} \u2014 ${currentUser.role}`, MARGIN, cy + 6);

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

  const ownerUser = data.users.find(u => u.user_id === event.current_owner_id);

  // ------ 01 EXECUTIVE SUMMARY ------

  onProgress?.('Writing executive summary...');
  sectionTitle('01', 'Executive Summary');

  // Assessment box
  const assessText = event.severity === 'CRITICAL'
    ? `Critical conjunction requiring immediate operational review. ${event.title} \u2014 collision probability ${event.collision_probability !== undefined ? (event.collision_probability * 100).toFixed(1) + '%' : 'unavailable'}.`
    : event.severity === 'HIGH'
    ? `Elevated risk conjunction under active review. ${event.title}.`
    : `Conjunction event under ${(event.status || 'monitoring').toLowerCase()}. ${event.title}.`;

  ensureSpace(12);
  doc.setFillColor(245, 247, 252);
  doc.roundedRect(MARGIN, y - 1, CONTENT_W, 10, 1.5, 1.5, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.navy);
  doc.text('ASSESSMENT:', MARGIN + 3, y + 4);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7);
  const aLines = doc.splitTextToSize(assessText, CONTENT_W - 35);
  doc.text(aLines, MARGIN + 30, y + 4);
  y += 13;

  labelValue('Event ID', event.event_id);
  labelValue('Event Title', event.title);
  labelValue('Primary Object', val(event.satellite, 'Primary object'));
  labelValue('Secondary Object', val(event.object, 'Secondary object'));
  labelValue('Severity', event.severity);
  labelValue('Current Status', val(event.status, 'Event status'));
  labelValue('Current Owner', ownerUser ? `${ownerUser.name} \u2014 ${ownerUser.role}` : val(event.current_owner_id, 'Current owner'));
  labelValue('TCA', formatReportTCA(event.tca, event.tca_minutes));
  labelValue('Miss Distance', event.miss_distance_km !== undefined ? `${event.miss_distance_km} km` : na('Miss distance'));
  labelValue('Collision Prob.', event.collision_probability !== undefined ? `${event.collision_probability} (${(event.collision_probability * 100).toFixed(2)}%)` : na('Collision probability'));
  labelValue('Rel. Velocity', event.relative_velocity_km_s !== undefined ? `${event.relative_velocity_km_s} km/s` : na('Relative velocity'));
  labelValue('Uncertainty', val(event.uncertainty, 'Positional uncertainty'));
  labelValue('Next Action', val(event.next_action, 'Next action'));
  labelValue('Deadline', event.deadline ? new Date(event.deadline).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC' : na('Deadline'));

  y += 2;
  thinRule();

  // ------ 02 OBJECTS INVOLVED ------

  onProgress?.('Documenting objects involved...');
  sectionTitle('02', 'Objects Involved');

  table(
    ['PARAMETER', 'PRIMARY OBJECT', 'SECONDARY OBJECT'],
    [
      ['Object Name', val(event.satellite, 'Primary name'), val(event.object, 'Secondary name')],
      ['Object Type', event.satellite ? 'Satellite' : na('Type'), event.object && event.object.includes('DEB') ? 'Debris' : na('Type')],
      ['Altitude', event.altitude_km !== undefined ? `${event.altitude_km} km` : na('Altitude'), na('Secondary altitude')],
      ['Velocity', event.relative_velocity_km_s !== undefined ? `${event.relative_velocity_km_s} km/s` : na('Velocity'), '\u2014 (relative)'],
      ['Orbit', val(event.orbit, 'Orbit'), na('Secondary orbit')],
      ['Inclination', na('Inclination'), na('Inclination')],
    ],
    [42, 64, 64],
  );

  subheading('Object Imagery');
  if (event.satellite) {
    paragraph(`${event.satellite} \u2014 Object imagery available within the KesslerX interactive interface. View the Event Workspace for visual assets.`, 2);
  }
  if (event.object) {
    if (event.object.includes('DEB') || event.object.includes('DEBRIS')) {
      paragraph(`${event.object} \u2014 Debris objects do not have associated imagery.`, 2);
    } else {
      paragraph(`${event.object} \u2014 Image availability depends on KesslerX data source.`, 2);
    }
  }

  thinRule();

  // ------ 03 CONJUNCTION ASSESSMENT ------

  onProgress?.('Building conjunction assessment...');
  sectionTitle('03', 'Conjunction Assessment');

  // Metric blocks
  ensureSpace(26);
  const blockW = (CONTENT_W - 8) / 3;

  const pcDisplay = event.collision_probability !== undefined
    ? (event.collision_probability >= 0.001 ? (event.collision_probability * 100).toFixed(1) + '%' : event.collision_probability.toExponential(2))
    : 'N/A';
  metricBlock('COLLISION PROBABILITY', pcDisplay, event.collision_probability !== undefined ? 'Pc' : na('Collision probability'), severityColor(event.severity), MARGIN, y, blockW);
  metricBlock('MISS DISTANCE', event.miss_distance_km !== undefined ? String(event.miss_distance_km) : 'N/A', event.miss_distance_km !== undefined ? 'km' : na('Miss distance'), COLORS.navy, MARGIN + blockW + 4, y, blockW);
  metricBlock('RELATIVE VELOCITY', event.relative_velocity_km_s !== undefined ? String(event.relative_velocity_km_s) : 'N/A', event.relative_velocity_km_s !== undefined ? 'km/s' : na('Velocity'), COLORS.navy, MARGIN + (blockW + 4) * 2, y, blockW);
  y += 24;

  // Detail table
  table(
    ['METRIC', 'VALUE', 'STATUS'],
    [
      ['Collision Probability', event.collision_probability !== undefined ? String(event.collision_probability) : na('Collision probability'), event.severity],
      ['Miss Distance', event.miss_distance_km !== undefined ? `${event.miss_distance_km} km` : na('Miss distance'), event.miss_distance_km !== undefined && event.miss_distance_km < 1 ? 'CRITICAL' : 'NOMINAL'],
      ['TCA', formatReportTCA(event.tca, event.tca_minutes), event.tca_minutes !== undefined && event.tca_minutes < 60 ? 'URGENT' : 'MONITORING'],
      ['Relative Velocity', event.relative_velocity_km_s !== undefined ? `${event.relative_velocity_km_s} km/s` : na('Velocity'), '\u2014'],
      ['Uncertainty', val(event.uncertainty, 'Uncertainty'), '\u2014'],
      ['Risk Classification', event.severity, event.severity],
      ['Risk Trend', val(event.risk_trend, 'Risk trend'), val(event.risk_trend, 'Risk trend')],
    ],
    [52, 68, 50],
  );

  thinRule();

  // ------ 04 VISUALIZATION ------

  sectionTitle('04', 'Conjunction Visualization');
  paragraph('Conjunction visualization is available within the KesslerX interactive 3D orbital map. PDF-based trajectory rendering is not supported. Refer to the Event Workspace for real-time conjunction geometry.', 2);

  thinRule();

  // ------ 05 RISK TREND ------

  sectionTitle('05', 'Risk Trend');
  if (event.risk_trend) {
    labelValue('Current Trend', event.risk_trend);
    paragraph(`The risk trend for this event is ${event.risk_trend.toLowerCase()}. For graphical trend analysis, refer to the KesslerX Collision Monitor dashboard.`, 2);
  } else {
    naMsg('Risk trend data');
  }
  paragraph('Historical risk trend charts are available via the KesslerX dashboard interface.', 2);

  thinRule();

  // ------ 06 ANALYSIS & EVIDENCE ------

  onProgress?.('Compiling analysis & evidence...');
  sectionTitle('06', 'Analysis & Evidence');

  subheading('Observed Data \u2014 Work Completed');
  if (event.work_completed && event.work_completed.length > 0) {
    event.work_completed.forEach(item => bulletItem(item));
  } else {
    naMsg('Work completed records');
  }

  subheading('Analyst Assessment \u2014 Current Decision');
  if (event.current_decision) {
    paragraph(event.current_decision, 2);
  } else {
    naMsg('Analyst decision');
  }

  subheading('Constraints & Considerations');
  if (event.constraints && event.constraints.length > 0) {
    event.constraints.forEach(c => bulletItem(c));
  } else {
    naMsg('Operational constraints');
  }

  thinRule();

  // ------ 07 RESPONSIBILITY & HANDOFF HISTORY ------

  onProgress?.('Adding handoff history...');
  sectionTitle('07', 'Responsibility & Handoff History');

  subheading('Current Owner');
  if (ownerUser) {
    labelValue('Name', ownerUser.name);
    labelValue('Role', ownerUser.role);
    labelValue('Status', ownerUser.status);
  } else {
    labelValue('Owner ID', val(event.current_owner_id, 'Current owner'));
    labelValue('Role', val(event.current_owner_role, 'Owner role'));
  }

  subheading('Transfer History');
  if (handoffs.length > 0) {
    handoffs.forEach((h, idx) => {
      const fromUser = data.users.find(u => u.user_id === h.from_user_id);
      const toUser = data.users.find(u => u.user_id === h.to_user_id);

      ensureSpace(20);
      subheading(`Transfer #${idx + 1} \u2014 ${h.handoff_id}`);
      labelValue('From', fromUser ? `${fromUser.name} (${fromUser.role})` : h.from_user_id);
      labelValue('To', toUser ? `${toUser.name} (${toUser.role})` : h.to_user_id);
      labelValue('Reason', h.reason);
      labelValue('Priority', h.priority);
      labelValue('Status', h.status);
      labelValue('Created', h.created_at ? new Date(h.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'medium' }) : na('Creation timestamp'));
      if (h.accepted_at) labelValue('Accepted', new Date(h.accepted_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'medium' }));
      if (h.rejected_at) labelValue('Rejected', new Date(h.rejected_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'medium' }));
      if (h.escalated_at) labelValue('Escalated', new Date(h.escalated_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'medium' }));

      if (h.clarification_messages && h.clarification_messages.length > 0) {
        subheading('Clarification Messages');
        h.clarification_messages.forEach(msg => {
          bulletItem(`[${msg.from}] ${msg.message} (${new Date(msg.timestamp).toLocaleTimeString('en-US')})`);
        });
      }
      if (idx < handoffs.length - 1) thinRule();
    });
  } else {
    paragraph('No responsibility transfers recorded for this event.', 2);
  }

  thinRule();

  // ------ 08 EVENT TIMELINE ------

  onProgress?.('Formatting event timeline...');
  sectionTitle('08', 'Event Timeline');

  if (timeline.length > 0) {
    table(
      ['TIMESTAMP', 'ACTOR', 'ACTION', 'DETAILS'],
      timeline.map(t => [
        t.timestamp ? new Date(t.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' }) + ' UTC' : '\u2014',
        t.actor_name || t.actor_id || '\u2014',
        t.action || '\u2014',
        t.comment || '\u2014',
      ]),
      [32, 35, 48, 55],
    );
  } else {
    paragraph('No timeline events recorded for this event.', 2);
  }

  thinRule();

  // ------ 09 RECOMMENDED ACTION ------

  sectionTitle('09', 'Recommended Action');

  ensureSpace(18);
  doc.setFillColor(245, 247, 252);
  doc.roundedRect(MARGIN, y, CONTENT_W, 16, 1.5, 1.5, 'F');
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y, MARGIN, y + 16);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...COLORS.primary);
  doc.text('NEXT REQUIRED ACTION', MARGIN + 3, y + 4.5);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.navy);
  const actionLines = doc.splitTextToSize(event.next_action || na('Next action'), CONTENT_W - 8);
  doc.text(actionLines, MARGIN + 3, y + 10);
  y += 20;

  labelValue('Assigned To', ownerUser ? `${ownerUser.name} \u2014 ${ownerUser.role}` : val(event.current_owner_id, 'Assigned owner'));
  labelValue('Deadline', event.deadline ? new Date(event.deadline).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC' : na('Deadline'));
  labelValue('Status', val(event.status, 'Event status'));

  ensureSpace(5);
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(...COLORS.midGray);
  doc.text('Decision-support information \u2014 human review required before operational action.', MARGIN + 2, y);
  y += 5;

  thinRule();

  // ------ 10 DATA SOURCES ------

  sectionTitle('10', 'Data Sources & Report Metadata');

  labelValue('KesslerX Event ID', event.event_id);
  labelValue('Data Source', 'KesslerX Backend API');
  labelValue('Last Event Update', event.updated_at ? new Date(event.updated_at).toLocaleString('en-US') : na('Last update timestamp'));
  labelValue('Report Generated', reportDate);
  labelValue('App Version', 'KesslerX v2.1.0');
  labelValue('Generated By', `${currentUser.name} (${currentUser.role})`);
  labelValue('Report Format', 'PDF/A4 \u2014 jsPDF');

  thinRule();

  // ------ 11 DISCLAIMER ------

  sectionTitle('11', 'Disclaimer');

  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.darkGray);
  const disclaimerText =
    'This report is generated from information available within KesslerX at the time of report generation. ' +
    'It is intended as a decision-support artifact for qualified operators. ' +
    'It does not constitute an autonomous spacecraft command or an authoritative collision-avoidance instruction. ' +
    'Operational decisions remain subject to qualified human review and applicable mission procedures. ' +
    'Numerical values, orbital parameters, and risk assessments reflect the data state at generation time and may have changed since.';
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
    doc.text(event.event_id, MARGIN, FOOTER_Y);
    doc.text('Confidential \u2014 Operational Use', PAGE_W / 2, FOOTER_Y, { align: 'center' });
    doc.text(`Page ${i - 1} of ${totalPages - 1}`, PAGE_W - MARGIN, FOOTER_Y, { align: 'right' });

    // Copyright in footer
    doc.setFontSize(5);
    doc.text(`\u00a9 ${yearStr} KesslerX`, MARGIN, FOOTER_Y + 3.5);
    doc.text(reportDate, PAGE_W - MARGIN, FOOTER_Y + 3.5, { align: 'right' });
  }

  // ============================================================
  // Output
  // ============================================================

  const dateStr = now.toISOString().split('T')[0];
  const filename = `KesslerX_Conjunction_Report_${event.event_id}_${dateStr}.pdf`;

  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  const newTab = window.open(url, '_blank');
  if (!newTab) {
    doc.save(filename);
  }

  onProgress?.('Report generated successfully.');
}
