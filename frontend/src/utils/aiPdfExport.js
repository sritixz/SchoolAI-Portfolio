/**
 * aiPdfExport.js
 * Structured PDF generation for all 6 AI teacher tools using jsPDF + jspdf-autotable.
 * Each function takes the AI result JSON and produces a clean, structured PDF download.
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Shared helpers ──────────────────────────────────────────────────────────

const PRIMARY = [105, 91, 230];   // #695be6
const DARK    = [17, 17, 17];
const GRAY    = [100, 100, 100];
const LIGHT   = [245, 243, 255];
const WHITE   = [255, 255, 255];

function newDoc() {
  return new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
}

function pageWidth(doc) { return doc.internal.pageSize.getWidth(); }

function header(doc, title, meta = []) {
  // Purple header bar
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageWidth(doc), 22, "F");
  doc.setTextColor(...WHITE);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 14);

  // Meta row
  if (meta.length) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const metaStr = meta.filter(Boolean).join("  ·  ");
    doc.text(metaStr, 14, 20);
  }

  doc.setTextColor(...DARK);
  return 28; // y after header
}

function sectionTitle(doc, text, y) {
  doc.setFillColor(...LIGHT);
  doc.rect(10, y, pageWidth(doc) - 20, 7, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PRIMARY);
  doc.text(text.toUpperCase(), 14, y + 5);
  doc.setTextColor(...DARK);
  return y + 10;
}

function bodyText(doc, text, y, indent = 14, maxWidth = null) {
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...DARK);
  const w = maxWidth || pageWidth(doc) - indent - 10;
  const lines = doc.splitTextToSize(String(text || ""), w);
  doc.text(lines, indent, y);
  return y + lines.length * 5 + 2;
}

function bullet(doc, text, y, indent = 18) {
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...DARK);
  const w = pageWidth(doc) - indent - 10;
  const lines = doc.splitTextToSize("• " + String(text || ""), w);
  doc.text(lines, indent, y);
  return y + lines.length * 4.5 + 1;
}

function checkPage(doc, y, needed = 20) {
  if (y + needed > doc.internal.pageSize.getHeight() - 15) {
    doc.addPage();
    return 15;
  }
  return y;
}

function footer(doc) {
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text(
      `EduAI Platform  ·  Generated ${new Date().toLocaleDateString()}  ·  Page ${i} of ${pages}`,
      pageWidth(doc) / 2, doc.internal.pageSize.getHeight() - 6,
      { align: "center" }
    );
  }
}

// ─── 1. WORKSHEET ────────────────────────────────────────────────────────────

export function downloadWorksheetPdf(result) {
  const doc = newDoc();
  let y = header(doc, result.title || "Worksheet", [
    result.subject, result.grade, `${result.total_marks} marks`, `${result.estimated_time_minutes} min`
  ]);

  // Student info line
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text("Name: _______________________________   Date: _______________   Score: _______ / " + (result.total_marks || ""), 14, y);
  y += 7;

  if (result.instructions) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...GRAY);
    doc.text(result.instructions, 14, y);
    doc.setTextColor(...DARK);
    y += 7;
  }

  for (const sec of (result.sections || [])) {
    y = checkPage(doc, y, 15);
    y = sectionTitle(doc, sec.title || sec.type, y);
    if (sec.instructions) {
      doc.setFontSize(8); doc.setFont("helvetica", "italic"); doc.setTextColor(...GRAY);
      doc.text(sec.instructions, 14, y); doc.setTextColor(...DARK);
      y += 6;
    }
    for (const q of (sec.questions || [])) {
      y = checkPage(doc, y, 18);
      // Question number + marks badge
      doc.setFillColor(...PRIMARY);
      doc.circle(17, y - 1, 3.5, "F");
      doc.setTextColor(...WHITE); doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
      doc.text(String(q.number), 17, y + 0.5, { align: "center" });
      doc.setTextColor(...DARK); doc.setFontSize(9); doc.setFont("helvetica", "normal");
      const qLines = doc.splitTextToSize(q.text || "", pageWidth(doc) - 40);
      doc.text(qLines, 23, y);
      // Marks
      doc.setFontSize(7.5); doc.setTextColor(...PRIMARY); doc.setFont("helvetica", "bold");
      doc.text(`[${q.marks} mark${q.marks > 1 ? "s" : ""}]`, pageWidth(doc) - 12, y, { align: "right" });
      doc.setTextColor(...DARK); doc.setFont("helvetica", "normal");
      y += qLines.length * 5 + 2;

      if (q.options) {
        for (const opt of q.options) {
          y = checkPage(doc, y, 6);
          doc.setFontSize(8.5);
          doc.text(String(opt), 26, y);
          y += 5;
        }
      }
      if (sec.type !== "MCQ" && sec.type !== "Multiple Choice") {
        y = checkPage(doc, y, 14);
        doc.setDrawColor(200, 200, 200);
        for (let l = 0; l < 3; l++) { doc.line(23, y + l * 6, pageWidth(doc) - 14, y + l * 6); }
        y += 20;
      }
      y += 2;
    }
    y += 4;
  }

  // Answer Key (teacher copy)
  if (result.answer_key?.length) {
    doc.addPage(); y = 15;
    y = sectionTitle(doc, "Answer Key (Teacher Copy)", y);
    const rows = result.answer_key.map((a) => [
      `Q${a.number}`, String(a.answer || ""), String(a.marks || ""), String(a.notes || "")
    ]);
    autoTable(doc, {
      startY: y, head: [["Q#", "Answer", "Marks", "Notes"]],
      body: rows, theme: "grid",
      headStyles: { fillColor: PRIMARY, textColor: WHITE, fontSize: 8 },
      bodyStyles: { fontSize: 8 }, margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  if (result.teacher_notes) {
    y = checkPage(doc, y, 20);
    y = sectionTitle(doc, "Teacher Notes", y);
    y = bodyText(doc, result.teacher_notes, y);
  }

  footer(doc);
  doc.save(`${result.title || "worksheet"}.pdf`);
}

// ─── 2. QUIZ ─────────────────────────────────────────────────────────────────

export function downloadQuizPdf(questions, meta = {}) {
  const doc = newDoc();
  const title = meta.title || `Quiz: ${meta.topic || ""}`;
  let y = header(doc, title, [meta.subject, meta.grade, `${questions.length} questions`]);

  doc.setFontSize(8.5); doc.setFont("helvetica", "normal");
  doc.text("Name: _______________________________   Date: _______________", 14, y);
  y += 8;

  questions.forEach((q, i) => {
    y = checkPage(doc, y, 20);
    // Number badge
    doc.setFillColor(...PRIMARY);
    doc.circle(17, y - 1, 3.5, "F");
    doc.setTextColor(...WHITE); doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
    doc.text(String(i + 1), 17, y + 0.5, { align: "center" });
    doc.setTextColor(...DARK);

    // Type + difficulty badges
    const qType = (q.answer_type || q.type || "MCQ").toUpperCase();
    doc.setFontSize(7); doc.setFont("helvetica", "bold");
    doc.setFillColor(...LIGHT); doc.roundedRect(23, y - 3.5, 18, 5, 1, 1, "F");
    doc.setTextColor(...PRIMARY); doc.text(qType, 32, y, { align: "center" });
    doc.setTextColor(...DARK);

    const pts = q.max_points || q.marks || 1;
    doc.setFontSize(7.5); doc.setTextColor(...PRIMARY); doc.setFont("helvetica", "bold");
    doc.text(`[${pts} pt]`, pageWidth(doc) - 12, y, { align: "right" });
    doc.setTextColor(...DARK); doc.setFont("helvetica", "normal");

    doc.setFontSize(9);
    const qLines = doc.splitTextToSize(q.question_text || q.text || "", pageWidth(doc) - 50);
    doc.text(qLines, 44, y);
    y += qLines.length * 5 + 3;

    if (q.options?.length) {
      for (const opt of q.options) {
        y = checkPage(doc, y, 6);
        doc.setFontSize(8.5);
        const optText = opt.label ? `${opt.label}.  ${opt.text}` : String(opt.text || opt);
        doc.text(optText, 26, y);
        y += 5;
      }
    } else {
      // Answer lines for open-ended
      doc.setDrawColor(200, 200, 200);
      for (let l = 0; l < 3; l++) { doc.line(23, y + l * 6, pageWidth(doc) - 14, y + l * 6); }
      y += 20;
    }
    y += 3;
  });

  // Answer Key page
  doc.addPage(); y = 15;
  y = sectionTitle(doc, "Answer Key & Explanations", y);
  questions.forEach((q, i) => {
    y = checkPage(doc, y, 14);
    doc.setFontSize(8.5); doc.setFont("helvetica", "bold");
    doc.text(`Q${i + 1}.`, 14, y);
    doc.setFont("helvetica", "normal");
    const ans = q.correct_answer || (q.options?.find((o) => o.is_correct)?.text) || q.sample_answer || "See rubric";
    const ansLines = doc.splitTextToSize(String(ans), pageWidth(doc) - 35);
    doc.text(ansLines, 22, y);
    y += ansLines.length * 5 + 1;
    if (q.explanation) {
      doc.setFontSize(8); doc.setTextColor(...GRAY);
      const expLines = doc.splitTextToSize("Explanation: " + q.explanation, pageWidth(doc) - 35);
      doc.text(expLines, 22, y);
      doc.setTextColor(...DARK);
      y += expLines.length * 4.5 + 2;
    }
  });

  footer(doc);
  doc.save(`${title}.pdf`);
}

// ─── 3. CONCEPT EXPLAINER ────────────────────────────────────────────────────

export function downloadConceptPdf(result) {
  const doc = newDoc();
  let y = header(doc, result.concept || "Concept Explanation", [result.subject, result.grade]);

  if (result.one_line_summary) {
    doc.setFontSize(9); doc.setFont("helvetica", "italic"); doc.setTextColor(...GRAY);
    const sl = doc.splitTextToSize(result.one_line_summary, pageWidth(doc) - 28);
    doc.text(sl, 14, y); doc.setTextColor(...DARK);
    y += sl.length * 5 + 4;
  }

  if (result.plain_english_explanation || result.explanation) {
    y = sectionTitle(doc, "Plain English Explanation", y);
    y = bodyText(doc, result.plain_english_explanation || result.explanation, y);
    y += 4;
  }

  if (result.technical_explanation) {
    y = checkPage(doc, y, 15);
    y = sectionTitle(doc, "Technical Explanation", y);
    y = bodyText(doc, result.technical_explanation, y);
    y += 4;
  }

  if (result.primary_analogy) {
    y = checkPage(doc, y, 20);
    y = sectionTitle(doc, "Primary Analogy", y);
    doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text(result.primary_analogy.analogy || "", 14, y); y += 6;
    y = bodyText(doc, result.primary_analogy.explanation, y);
    if (result.primary_analogy.limitations) {
      doc.setFontSize(8); doc.setFont("helvetica", "italic"); doc.setTextColor(180, 100, 0);
      doc.text("⚠ Limitation: " + result.primary_analogy.limitations, 14, y);
      doc.setTextColor(...DARK); y += 6;
    }
    y += 2;
  }

  if (result.real_world_examples?.length) {
    y = checkPage(doc, y, 15);
    y = sectionTitle(doc, "Real-World Examples", y);
    for (const ex of result.real_world_examples) {
      y = checkPage(doc, y, 12);
      doc.setFontSize(8.5); doc.setFont("helvetica", "bold"); doc.text("• " + ex.example, 14, y); y += 5;
      doc.setFont("helvetica", "normal"); doc.setTextColor(...GRAY);
      const cl = doc.splitTextToSize(ex.connection || "", pageWidth(doc) - 28);
      doc.text(cl, 18, y); doc.setTextColor(...DARK); y += cl.length * 4.5 + 3;
    }
  }

  if (result.common_misconceptions?.length) {
    y = checkPage(doc, y, 15);
    y = sectionTitle(doc, "Common Misconceptions", y);
    autoTable(doc, {
      startY: y,
      head: [["Misconception", "Correction"]],
      body: result.common_misconceptions.map((m) => [m.misconception, m.correction]),
      theme: "striped",
      headStyles: { fillColor: [239, 68, 68], textColor: WHITE, fontSize: 8 },
      bodyStyles: { fontSize: 8 }, columnStyles: { 0: { cellWidth: 80 } },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  if (result.key_vocabulary?.length) {
    y = checkPage(doc, y, 15);
    y = sectionTitle(doc, "Key Vocabulary", y);
    autoTable(doc, {
      startY: y,
      head: [["Term", "Definition"]],
      body: result.key_vocabulary.map((v) => [v.term, v.definition]),
      theme: "grid",
      headStyles: { fillColor: PRIMARY, textColor: WHITE, fontSize: 8 },
      bodyStyles: { fontSize: 8 }, margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  if (result.discussion_questions?.length) {
    y = checkPage(doc, y, 15);
    y = sectionTitle(doc, "Discussion Questions", y);
    result.discussion_questions.forEach((q, i) => { y = bullet(doc, `Q${i+1}. ${q}`, y); });
    y += 3;
  }

  if (result.teaching_tips?.length) {
    y = checkPage(doc, y, 15);
    y = sectionTitle(doc, "Teaching Tips", y);
    result.teaching_tips.forEach((t) => { y = bullet(doc, t, y); });
  }

  footer(doc);
  doc.save(`${result.concept || "concept"}.pdf`);
}

// ─── 4. PRESENTATION ─────────────────────────────────────────────────────────

// Slide type → accent color
const SLIDE_COLORS = {
  title:      [105, 91, 230],   // purple
  hook:       [249, 115, 22],   // orange
  content:    [59, 130, 246],   // blue
  example:    [16, 185, 129],   // teal
  activity:   [34, 197, 94],    // green
  summary:    [139, 92, 246],   // violet
  assessment: [239, 68, 68],    // red
  objectives: [59, 130, 246],
};

function _slideColor(type) {
  return SLIDE_COLORS[type] || PRIMARY;
}

// Parse hex accent color from slide data
function _parseAccent(hex) {
  if (!hex || typeof hex !== "string") return PRIMARY;
  const h = hex.replace("#", "");
  if (h.length !== 6) return PRIMARY;
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}

// Extract bullets array from either old flat or new nested content
function _getBullets(slide) {
  if (Array.isArray(slide.content?.bullets) && slide.content.bullets.length) return slide.content.bullets;
  if (Array.isArray(slide.bullets) && slide.bullets.length) return slide.bullets;
  return [];
}

function _getSteps(slide) {
  if (Array.isArray(slide.content?.steps) && slide.content.steps.length) return slide.content.steps;
  if (Array.isArray(slide.steps) && slide.steps.length) return slide.steps;
  return [];
}

function _getQuestions(slide) {
  if (Array.isArray(slide.content?.questions)) return slide.content.questions;
  if (Array.isArray(slide.questions)) return slide.questions;
  return [];
}

function _getVisualPrompt(slide) {
  return slide.content?.visual_prompt || "";
}

// ── Image fetching via Picsum Photos (free, no API key, actively maintained) ──

/**
 * Derive a stable numeric seed from a string so the same prompt
 * always gets the same image within a session.
 */
// Canvas approach is intentionally removed — Wikipedia/Wikimedia images
// block canvas reads via CORS (tainted canvas), so we always use the proxy.
function _promptSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return (hash % 100000) + 1;
}

/**
 * Build a Pollinations.ai URL for a given visual description.
 * Uses a stable seed derived from the description for consistency.
 */
function _pollinationsUrl(description, seed) {
  const encoded = encodeURIComponent((description || "").slice(0, 300));
  const s = seed || _promptSeed(description || "");
  return `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=768&nologo=true&model=flux&seed=${s}`;
}

/**
 * Fetch a slide image as base64 via the backend proxy.
 * Uses the same image_url that the preview <img> tag shows — so the PDF
 * always matches the preview exactly.
 * Routes everything through /teacher/image-proxy to avoid CORS.
 */
async function _fetchSlideImage(slide) {
  // Normalize content to object so we can safely read from it
  const content = (typeof slide.content === "object" && slide.content !== null)
    ? slide.content
    : {};

  const imageUrl =
    content.image_url ||
    (content.detailed_visual_description
      ? _pollinationsUrl(content.detailed_visual_description)
      : null) ||
    (content.visual_prompt
      ? _pollinationsUrl(content.visual_prompt)
      : null);

  if (!imageUrl) {
    console.warn(`[PDF] Slide "${slide.title}" — no image URL found`);
    return null;
  }

  const apiBase =
    import.meta.env?.VITE_API_BASE_URL ||
    import.meta.env?.VITE_API_URL ||
    "http://localhost:8001";

  const proxyUrl = `${apiBase}/teacher/image-proxy?url=${encodeURIComponent(imageUrl)}`;

  // Helper: fetch a URL and return base64 or null
  async function _fetchToBase64(fetchUrl, timeoutMs = 30_000) {
    try {
      const ctrl = new AbortController();
      const tid  = setTimeout(() => ctrl.abort(), timeoutMs);
      const resp = await fetch(fetchUrl, {
        signal: ctrl.signal,
        headers: { Accept: "image/*" },
      });
      clearTimeout(tid);
      if (!resp.ok) return null;
      const blob = await resp.blob();
      if (!blob.size) return null;
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror   = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  // Strategy 1: proxy (handles CORS + Wikimedia User-Agent)
  console.log(`[PDF] Fetching "${slide.title}" via proxy...`);
  const proxyResult = await _fetchToBase64(proxyUrl, 90_000);
  if (proxyResult) {
    console.log(`[PDF] ✓ "${slide.title}" via proxy`);
    return proxyResult;
  }

  // Strategy 2: direct fetch (Pollinations has permissive CORS)
  const directResult = await _fetchToBase64(imageUrl, 90_000);
  if (directResult) {
    console.log(`[PDF] ✓ "${slide.title}" via direct fetch`);
    return directResult;
  }

  // Strategy 3: retry proxy once after short delay (handles transient 502s / Pollinations still generating)
  await new Promise(r => setTimeout(r, 5000));
  const proxyRetry = await _fetchToBase64(proxyUrl, 90_000);
  if (proxyRetry) {
    console.log(`[PDF] ✓ "${slide.title}" via proxy (retry)`);
    return proxyRetry;
  }

  console.warn(`[PDF] ✗ "${slide.title}" — all strategies failed, using diagram fallback`);
  return null;
}
/**
 * Pre-fetch all slide images in parallel.
 * Returns a Map: slideIndex → base64DataUrl | null
 */
async function _prefetchImages(slides) {
  const results = await Promise.all(slides.map((slide) => _fetchSlideImage(slide)));
  const map = new Map();
  results.forEach((img, i) => map.set(i, img));
  return map;
}

// ── Topic-relevant diagram drawn with jsPDF shapes ───────────────────────────

/**
 * Draw a diagram in the right panel based on slide.content.diagram data.
 * Falls back to a styled info card if no diagram data.
 */
function _drawDiagram(doc, slide, rpX, rpY, rpW, rpH, accent) {
  const diagram = slide.content?.diagram;
  const nodes   = diagram?.nodes || [];
  const type    = diagram?.type || "none";
  const vp      = _getVisualPrompt(slide);

  // Background panel
  doc.setFillColor(...accent.map(c => Math.min(255, c + 110)));
  doc.roundedRect(rpX, rpY, rpW, rpH, 4, 4, "F");

  // Accent top bar on panel
  doc.setFillColor(...accent);
  doc.roundedRect(rpX, rpY, rpW, 6, 2, 2, "F");

  if (nodes.length >= 2 && type !== "none") {
    if (type === "flowchart" || type === "timeline") {
      _drawFlowchart(doc, nodes, rpX, rpY + 10, rpW, rpH - 14, accent);
    } else if (type === "cycle") {
      _drawCycle(doc, nodes, rpX, rpY + 10, rpW, rpH - 14, accent);
    } else if (type === "comparison") {
      _drawComparison(doc, nodes, rpX, rpY + 10, rpW, rpH - 14, accent);
    } else {
      _drawFlowchart(doc, nodes, rpX, rpY + 10, rpW, rpH - 14, accent);
    }
  } else {
    // Info card with visual prompt text
    doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(...accent);
    doc.text("VISUAL CONCEPT", rpX + rpW / 2, rpY + 16, { align: "center" });
    if (vp) {
      doc.setFontSize(7.5); doc.setFont("helvetica", "italic"); doc.setTextColor(60, 60, 80);
      const lines = doc.splitTextToSize(vp, rpW - 8);
      doc.text(lines.slice(0, 8), rpX + 4, rpY + 24);
    }
  }
}

function _drawFlowchart(doc, nodes, x, y, w, h, accent) {
  const count   = Math.min(nodes.length, 6);
  const boxH    = Math.min(14, (h - count * 4) / count);
  const boxW    = w - 12;
  const startX  = x + 6;
  let   curY    = y + 4;

  for (let i = 0; i < count; i++) {
    // Box
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(startX, curY, boxW, boxH, 2, 2, "F");
    doc.setDrawColor(...accent);
    doc.setLineWidth(0.5);
    doc.roundedRect(startX, curY, boxW, boxH, 2, 2, "S");

    // Number badge
    doc.setFillColor(...accent);
    doc.circle(startX + 5, curY + boxH / 2, 3.5, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(6.5); doc.setFont("helvetica", "bold");
    doc.text(String(i + 1), startX + 5, curY + boxH / 2 + 1, { align: "center" });

    // Node text
    doc.setTextColor(30, 30, 30); doc.setFontSize(7); doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(String(nodes[i] || ""), boxW - 14);
    doc.text(lines[0] || "", startX + 11, curY + boxH / 2 + 1);

    curY += boxH + 2;

    // Arrow between boxes
    if (i < count - 1) {
      doc.setDrawColor(...accent); doc.setLineWidth(0.8);
      const midX = startX + boxW / 2;
      doc.line(midX, curY - 1, midX, curY + 2);
      // Arrowhead
      doc.triangle(midX - 2, curY + 2, midX + 2, curY + 2, midX, curY + 4, "F");
      curY += 5;
    }
  }
}

function _drawCycle(doc, nodes, x, y, w, h, accent) {
  const count  = Math.min(nodes.length, 5);
  const cx     = x + w / 2;
  const cy     = y + h / 2;
  const radius = Math.min(w, h) / 2 - 12;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
    const nx    = cx + radius * Math.cos(angle);
    const ny    = cy + radius * Math.sin(angle);

    // Node circle
    doc.setFillColor(255, 255, 255);
    doc.circle(nx, ny, 8, "F");
    doc.setDrawColor(...accent); doc.setLineWidth(0.8);
    doc.circle(nx, ny, 8, "S");

    // Node number
    doc.setFillColor(...accent);
    doc.circle(nx, ny - 4, 3, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(5.5); doc.setFont("helvetica", "bold");
    doc.text(String(i + 1), nx, ny - 3, { align: "center" });

    // Node label
    doc.setTextColor(30, 30, 30); doc.setFontSize(6); doc.setFont("helvetica", "normal");
    const label = doc.splitTextToSize(String(nodes[i] || ""), 20);
    doc.text(label[0] || "", nx, ny + 3, { align: "center" });

    // Arrow to next node
    const nextAngle = ((i + 1) / count) * 2 * Math.PI - Math.PI / 2;
    const nx2 = cx + radius * Math.cos(nextAngle);
    const ny2 = cy + radius * Math.sin(nextAngle);
    doc.setDrawColor(...accent); doc.setLineWidth(0.6);
    const midAngle = angle + (Math.PI / count);
    const ax = cx + (radius + 4) * Math.cos(midAngle);
    const ay = cy + (radius + 4) * Math.sin(midAngle);
    doc.line(nx, ny, ax, ay);
    doc.line(ax, ay, nx2, ny2);
  }

  // Center label
  doc.setFillColor(...accent.map(c => Math.min(255, c + 80)));
  doc.circle(cx, cy, 10, "F");
  doc.setTextColor(...accent); doc.setFontSize(6); doc.setFont("helvetica", "bold");
  doc.text("CYCLE", cx, cy + 1, { align: "center" });
}

function _drawComparison(doc, nodes, x, y, w, h, accent) {
  const half   = w / 2 - 4;
  const leftX  = x + 2;
  const rightX = x + w / 2 + 2;
  const GREEN  = [34, 197, 94];

  // Headers
  doc.setFillColor(...accent);
  doc.roundedRect(leftX, y + 2, half, 8, 1, 1, "F");
  doc.setFillColor(...GREEN);
  doc.roundedRect(rightX, y + 2, half, 8, 1, 1, "F");

  doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont("helvetica", "bold");
  doc.text(nodes[0] || "A", leftX + half / 2, y + 7.5, { align: "center" });
  doc.text(nodes[1] || "B", rightX + half / 2, y + 7.5, { align: "center" });

  // Comparison rows
  const rows = nodes.slice(2);
  let rowY = y + 14;
  rows.forEach((row, i) => {
    const bg = i % 2 === 0 ? [245, 243, 255] : [255, 255, 255];
    doc.setFillColor(...bg);
    doc.rect(leftX, rowY, half, 8, "F");
    doc.rect(rightX, rowY, half, 8, "F");
    doc.setTextColor(40, 40, 40); doc.setFontSize(6.5); doc.setFont("helvetica", "normal");
    const parts = String(row).split("|");
    doc.text(doc.splitTextToSize(parts[0] || row, half - 2)[0], leftX + 2, rowY + 5.5);
    doc.text(doc.splitTextToSize(parts[1] || "", half - 2)[0], rightX + 2, rowY + 5.5);
    rowY += 9;
  });

  // Divider line
  doc.setDrawColor(...accent); doc.setLineWidth(0.5);
  doc.line(x + w / 2, y + 2, x + w / 2, rowY);
}

// Draw one full A4 landscape slide page
function _drawSlide(doc, slide, slideNum, total, _unused = null) {
  const W = doc.internal.pageSize.getWidth();   // 297mm
  const H = doc.internal.pageSize.getHeight();  // 210mm
  const accent = _parseAccent(slide.vibrant_accent_color) || _slideColor(slide.type);
  const accentLight = accent.map(c => Math.min(255, c + 100));
  const accentDark  = accent.map(c => Math.max(0, c - 40));

  // ── Full background: subtle gradient effect ───────────────────────────────
  doc.setFillColor(248, 246, 255);
  doc.rect(0, 0, W, H, "F");
  // Soft diagonal accent wash top-right
  doc.setFillColor(...accentLight.map(c => Math.min(255, c + 40)));
  doc.setGState && doc.setGState(doc.GState({ opacity: 0.12 }));
  doc.triangle(W * 0.55, 0, W, 0, W, H * 0.55, "F");
  doc.setGState && doc.setGState(doc.GState({ opacity: 1 }));

  // ── Left accent strip (thick, vibrant) ───────────────────────────────────
  doc.setFillColor(...accentDark);
  doc.rect(0, 0, 5, H, "F");
  doc.setFillColor(...accent);
  doc.rect(5, 0, 4, H, "F");

  // ── Top header band ───────────────────────────────────────────────────────
  // Main band
  doc.setFillColor(...accent);
  doc.rect(0, 0, W, 24, "F");
  // Darker stripe at very top
  doc.setFillColor(...accentDark);
  doc.rect(0, 0, W, 3, "F");

  // Slide number badge (circle)
  doc.setFillColor(255, 255, 255);
  doc.circle(22, 12, 7, "F");
  doc.setTextColor(...accent);
  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text(String(slideNum), 22, 14.5, { align: "center" });

  // Slide type pill
  doc.setFillColor(...accentDark);
  doc.roundedRect(33, 5, 28, 8, 2, 2, "F");
  doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont("helvetica", "bold");
  doc.text((slide.type || "content").toUpperCase(), 47, 10.5, { align: "center" });

  // Slide title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14); doc.setFont("helvetica", "bold");
  const titleLines = doc.splitTextToSize(slide.title || "", W - 120);
  doc.text(titleLines, 65, 11);
  if (titleLines.length > 1) doc.text(titleLines[1], 65, 18);

  // Slide counter top-right
  doc.setFontSize(8); doc.setFont("helvetica", "normal");
  doc.text(`${slideNum} / ${total}`, W - 8, 10, { align: "right" });
  if (slide.duration_minutes) {
    doc.setFontSize(7);
    doc.text(`${slide.duration_minutes} min`, W - 8, 17, { align: "right" });
  }

  doc.setTextColor(25, 25, 35);

  // ── Right panel: image or diagram ────────────────────────────────────────
  const rpX = W * 0.62;
  const rpW = W - rpX - 6;
  const rpY = 28;
  const rpH = H - rpY - 44;

  const imgB64 = slide.content?.image_b64 || slide.content?._fetched_image;
  if (imgB64) {
    // Embed real generated image — preserve aspect ratio (contain, not cover)
    try {
      const fmt = imgB64.includes("jpeg") || imgB64.includes("jpg") ? "JPEG" : "PNG";
      const raw = imgB64.startsWith("data:") ? imgB64.split(",")[1] : imgB64;

      // Assume 4:3 source (1024×768 from Pollinations) — scale to fit panel
      const natAspect = 4 / 3;
      const panelAspect = rpW / rpH;
      let drawW, drawH;
      if (natAspect > panelAspect) {
        drawW = rpW;
        drawH = rpW / natAspect;
      } else {
        drawH = rpH;
        drawW = rpH * natAspect;
      }
      const drawX = rpX + (rpW - drawW) / 2;
      const drawY = rpY + (rpH - drawH) / 2;

      // Panel background
      doc.setFillColor(...accent.map(c => Math.min(255, c + 110)));
      doc.roundedRect(rpX, rpY, rpW, rpH, 4, 4, "F");

      doc.addImage(raw, fmt, drawX, drawY, drawW, drawH, undefined, "FAST");
      // Accent border
      doc.setDrawColor(...accent); doc.setLineWidth(1.5);
      doc.roundedRect(rpX, rpY, rpW, rpH, 3, 3, "S");
      // Slide type badge overlay
      doc.setFillColor(...accent);
      doc.roundedRect(rpX + 2, rpY + 2, 22, 6, 1, 1, "F");
      doc.setTextColor(255, 255, 255); doc.setFontSize(6); doc.setFont("helvetica", "bold");
      doc.text((slide.type || "").toUpperCase(), rpX + 13, rpY + 6.5, { align: "center" });
    } catch {
      _drawDiagram(doc, slide, rpX, rpY, rpW, rpH, accent);
    }
  } else {
    _drawDiagram(doc, slide, rpX, rpY, rpW, rpH, accent);
  }

  // ── Content area (left side) ──────────────────────────────────────────────
  const contentX = 13;
  const contentW = W * 0.59;
  let y = 32;

  // Subtitle
  if (slide.subtitle) {
    doc.setFontSize(9); doc.setFont("helvetica", "italic"); doc.setTextColor(110, 100, 130);
    doc.text(slide.subtitle, contentX, y);
    doc.setTextColor(25, 25, 35); y += 7;
  }

  // Bullets — with colored dot and slightly larger font
  const bullets = _getBullets(slide);
  if (bullets.length) {
    bullets.forEach((b) => {
      // Colored square bullet
      doc.setFillColor(...accent);
      doc.roundedRect(contentX, y - 2.5, 3, 3, 0.5, 0.5, "F");
      doc.setFontSize(9.5); doc.setFont("helvetica", "normal"); doc.setTextColor(25, 25, 35);
      const bLines = doc.splitTextToSize(String(b), contentW - 8);
      doc.text(bLines, contentX + 6, y);
      y += bLines.length * 5.2 + 2;
    });
    y += 2;
  }

  // Steps (numbered with accent boxes)
  const steps = _getSteps(slide);
  if (steps.length) {
    steps.forEach((s, i) => {
      doc.setFillColor(...accent);
      doc.roundedRect(contentX, y - 4.5, 7, 7, 1.5, 1.5, "F");
      doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont("helvetica", "bold");
      doc.text(String(i + 1), contentX + 3.5, y, { align: "center" });
      doc.setTextColor(25, 25, 35); doc.setFontSize(9); doc.setFont("helvetica", "normal");
      const sLines = doc.splitTextToSize(String(s), contentW - 12);
      doc.text(sLines, contentX + 10, y);
      y += sLines.length * 5.2 + 3;
    });
    y += 2;
  }

  // Explanation paragraph — styled card
  const explanation = slide.content?.explanation;
  if (explanation && y < H - 62) {
    const expLines = doc.splitTextToSize(String(explanation), contentW - 10);
    const expH = Math.min(expLines.length * 4.8 + 8, 28);
    // Card background
    doc.setFillColor(...accentLight.map(c => Math.min(255, c + 50)));
    doc.roundedRect(contentX - 1, y - 2, contentW + 2, expH, 2, 2, "F");
    // Left accent bar on card
    doc.setFillColor(...accent);
    doc.roundedRect(contentX - 1, y - 2, 3, expH, 1, 1, "F");
    doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(30, 25, 55);
    doc.text(expLines.slice(0, 5), contentX + 5, y + 3);
    y += expH + 4;
  }

  // Key terms — vibrant accent pills
  const keyTerms = slide.content?.key_terms || [];
  if (keyTerms.length && y < H - 52) {
    keyTerms.slice(0, 2).forEach((kt) => {
      if (!kt?.term) return;
      const termW = doc.getTextWidth(kt.term + ": ") + 4;
      doc.setFillColor(...accent);
      doc.roundedRect(contentX, y - 2, contentW, 9, 1.5, 1.5, "F");
      doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont("helvetica", "bold");
      doc.text(kt.term + ":", contentX + 3, y + 4);
      doc.setFont("helvetica", "normal");
      const defLines = doc.splitTextToSize(kt.definition || "", contentW - termW - 4);
      doc.text(defLines[0] || "", contentX + termW + 2, y + 4);
      y += 12;
    });
    y += 2;
  }

  // MCQ questions
  const questions = _getQuestions(slide);
  if (questions.length) {
    questions.forEach((q, qi) => {
      const qText = q.question || (typeof q === "string" ? q : "");
      if (qText && y < H - 55) {
        doc.setFillColor(...accentLight);
        doc.roundedRect(contentX - 1, y - 2, contentW + 2, 8, 1, 1, "F");
        doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(25, 25, 35);
        const qLines = doc.splitTextToSize(`Q${qi + 1}. ${qText}`, contentW - 4);
        doc.text(qLines[0], contentX + 2, y + 4);
        y += 11;
      }
      if (q.options && y < H - 50) {
        q.options.forEach((opt) => {
          const isCorrect = opt.startsWith && opt.startsWith(q.correct);
          if (isCorrect) {
            doc.setFillColor(220, 252, 231);
            doc.roundedRect(contentX + 2, y - 1.5, contentW - 4, 6, 1, 1, "F");
          }
          doc.setFontSize(8.5);
          doc.setFont("helvetica", isCorrect ? "bold" : "normal");
          doc.setTextColor(isCorrect ? 22 : 70, isCorrect ? 101 : 70, isCorrect ? 52 : 70);
          doc.text((isCorrect ? "✓ " : "   ") + String(opt), contentX + 4, y + 3);
          y += 7;
        });
        y += 2;
      }
    });
  }

  // ── Speaker Notes (amber card) ────────────────────────────────────────────
  if (slide.speaker_notes) {
    const noteY = H - 40;
    doc.setFillColor(255, 248, 220);
    doc.roundedRect(9, noteY, W * 0.57, 17, 2, 2, "F");
    doc.setFillColor(245, 158, 11);
    doc.roundedRect(9, noteY, 3.5, 17, 1, 1, "F");
    doc.setFontSize(6.5); doc.setFont("helvetica", "bold"); doc.setTextColor(120, 60, 0);
    doc.text("SPEAKER NOTES", 15, noteY + 5.5);
    doc.setFont("helvetica", "normal"); doc.setTextColor(80, 50, 0);
    const noteLines = doc.splitTextToSize(slide.speaker_notes, W * 0.55 - 10);
    doc.text(noteLines.slice(0, 2), 15, noteY + 11);
  }

  // ── Engagement Prompt (green card) ───────────────────────────────────────
  if (slide.engagement_prompt) {
    const epY = H - 19;
    doc.setFillColor(236, 253, 245);
    doc.roundedRect(9, epY, W * 0.57, 10, 2, 2, "F");
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(9, epY, 3.5, 10, 1, 1, "F");
    doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.setTextColor(6, 95, 70);
    doc.text("Ask: ", 15, epY + 6.5);
    doc.setFont("helvetica", "normal");
    const epLines = doc.splitTextToSize(slide.engagement_prompt, W * 0.55 - 22);
    doc.text(epLines[0] || "", 27, epY + 6.5);
  }

  // ── Bottom accent bar ─────────────────────────────────────────────────────
  doc.setFillColor(...accentDark);
  doc.rect(0, H - 4, W, 2, "F");
  doc.setFillColor(...accent);
  doc.rect(0, H - 2, W, 2, "F");

  doc.setTextColor(25, 25, 35);
}

function _drawImgPlaceholder(doc, accent, rpX, rpY, rpW, rpH, vp) {
  doc.setFillColor(...accent.map(c => Math.min(255, c + 80)));
  doc.roundedRect(rpX, rpY, rpW, rpH, 4, 4, "F");
  doc.setFillColor(...accent.map(c => Math.min(255, c + 120)));
  doc.roundedRect(rpX + 2, rpY + 2, rpW - 4, rpH - 4, 3, 3, "F");
  if (vp) {
    doc.setFontSize(7); doc.setFont("helvetica", "italic"); doc.setTextColor(80, 80, 80);
    const vpLines = doc.splitTextToSize(vp, rpW - 6);
    doc.text(vpLines.slice(0, 5), rpX + 3, rpY + rpH / 2);
  }
}

export async function downloadPresentationPdf(result) {
  const slides = result.slides || [];
  const total  = slides.length;

  // ── Pre-fetch all images via proxy in batches of 6 ───────────────────────
  // If the preview already cached _fetched_image via the onLoad handler, this
  // is nearly instant. Otherwise falls back to proxy/direct fetch.
  const BATCH = 6;
  for (let i = 0; i < total; i += BATCH) {
    await Promise.all(
      slides.slice(i, i + BATCH).map(async (slide) => {
        // Guard: content must be a plain object to store _fetched_image
        if (typeof slide.content !== "object" || slide.content === null) {
          slide.content = {};
        }
        if (slide.content._fetched_image) return; // already cached
        const b64 = await _fetchSlideImage(slide);
        if (b64) slide.content._fetched_image = b64;
      })
    );
  }
 
  // ── Landscape A4 — one slide per page ────────────────────────────────────
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
 
  // Cover / summary page
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, W, H, "F");
  doc.setFillColor(120, 100, 255);
  doc.circle(W - 30, 20, 40, "F");
  doc.setFillColor(80, 60, 200);
  doc.circle(20, H - 20, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28); doc.setFont("helvetica", "bold");
  doc.text(result.title || "Presentation", W / 2, H / 2 - 20, { align: "center" });
  doc.setFontSize(11); doc.setFont("helvetica", "normal");
  const metaParts = [result.subject, result.grade, `${total} slides`, `${result.duration_minutes || ""} min`].filter(Boolean);
  doc.text(metaParts.join("  ·  "), W / 2, H / 2 - 6, { align: "center" });
  if (result.learning_objectives?.length) {
    doc.setFontSize(9);
    doc.text("Learning Objectives:", W / 2, H / 2 + 8, { align: "center" });
    result.learning_objectives.slice(0, 3).forEach((o, i) => {
      const oLines = doc.splitTextToSize(`• ${o}`, W - 80);
      doc.text(oLines, W / 2, H / 2 + 16 + i * 8, { align: "center" });
    });
  }
  doc.setFontSize(8); doc.setTextColor(200, 190, 255);
  doc.text(`Generated ${new Date().toLocaleDateString()}`, W / 2, H - 10, { align: "center" });
 
  // One slide per page
  for (let i = 0; i < slides.length; i++) {
    doc.addPage("a4", "landscape");
    _drawSlide(doc, slides[i], i + 1, total);
  }
 
  // Teacher notes page
  if (result.teacher_preparation_notes) {
    doc.addPage("a4", "portrait");
    let y = header(doc, "Teacher Preparation Notes", [result.title]);
    y = bodyText(doc, result.teacher_preparation_notes, y);
    footer(doc);
  }
 
  doc.save(`${result.title || "presentation"}.pdf`);
}
 
// ─── 5. GRADING ASSISTANT ────────────────────────────────────────────────────

export function downloadGradingPdf(result, feedbackText) {
  const doc = newDoc();
  const pct = result.percentage ?? Math.round(((result.score || 0) / (result.max_score || 1)) * 100);
  let y = header(doc, "⚡ Smart AI Feedback", [
    `Score: ${result.score}/${result.max_score}`, `${pct}%`
  ]);

  // Overall verdict + score
  autoTable(doc, {
    startY: y,
    body: [
      ["Score", `${result.score} / ${result.max_score}`],
      ["Percentage", `${pct}%`],
      ["Overall", result.overall_verdict || ""],
    ],
    theme: "plain",
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 30, textColor: PRIMARY } },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 6;

  if (result.what_went_well?.length) {
    y = checkPage(doc, y, 15);
    y = sectionTitle(doc, "✅ What You Did Well", y);
    result.what_went_well.forEach((s) => { y = bullet(doc, s, y); }); y += 3;
  }

  if (result.what_to_improve?.length) {
    y = checkPage(doc, y, 15);
    y = sectionTitle(doc, "⚠️ What to Improve", y);
    result.what_to_improve.forEach((a) => { y = bullet(doc, a, y); }); y += 3;
  }

  if (result.quick_fix?.length) {
    y = checkPage(doc, y, 15);
    y = sectionTitle(doc, "🧠 Quick Fix", y);
    result.quick_fix.forEach((f) => { y = bullet(doc, f, y); }); y += 3;
  }

  if (result.next_steps?.length) {
    y = checkPage(doc, y, 15);
    y = sectionTitle(doc, "🛠️ Next Steps", y);
    result.next_steps.forEach((s, i) => { y = bullet(doc, `${i + 1}. ${s}`, y); }); y += 3;
  }

  if (result.try_again_message) {
    y = checkPage(doc, y, 12);
    y = sectionTitle(doc, "🔁 Try Again", y);
    y = bodyText(doc, `"${result.try_again_message}"`, y); y += 4;
  }

  if (feedbackText || result.feedback) {
    y = checkPage(doc, y, 20);
    y = sectionTitle(doc, "Feedback Draft", y);
    y = bodyText(doc, feedbackText || result.feedback, y);
  }

  footer(doc);
  doc.save(`grading-report.pdf`);
}

// ─── 6. LESSON PLAN ──────────────────────────────────────────────────────────

export function downloadLessonPlanPdf(result, form = {}) {
  const doc = newDoc();
  let y = header(doc, result.title || "Lesson Plan", [
    result.subject, result.grade, `${result.duration_minutes} min`, result.standards
  ]);

  // Meta grid
  autoTable(doc, {
    startY: y,
    body: [
      ["Subject", result.subject || form.subject || "", "Grade", result.grade || form.classLevel || ""],
      ["Duration", `${result.duration_minutes || form.durationMinutes || ""} minutes`, "Standards", result.standards || form.standards || ""],
    ],
    theme: "plain",
    bodyStyles: { fontSize: 8.5 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 28, textColor: PRIMARY }, 2: { fontStyle: "bold", cellWidth: 28, textColor: PRIMARY } },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 4;

  if (result.learning_objectives?.length) {
    y = sectionTitle(doc, "Learning Objectives", y);
    result.learning_objectives.forEach((o) => { y = bullet(doc, o, y); }); y += 3;
  }

  if (result.prerequisite_knowledge?.length) {
    y = checkPage(doc, y, 12);
    y = sectionTitle(doc, "Prerequisite Knowledge", y);
    result.prerequisite_knowledge.forEach((p) => { y = bullet(doc, p, y); }); y += 3;
  }

  if (result.key_vocabulary?.length) {
    y = checkPage(doc, y, 15);
    y = sectionTitle(doc, "Key Vocabulary", y);
    autoTable(doc, {
      startY: y,
      head: [["Term", "Definition"]],
      body: result.key_vocabulary.map((v) => [v.term, v.definition]),
      theme: "grid",
      headStyles: { fillColor: PRIMARY, textColor: WHITE, fontSize: 8 },
      bodyStyles: { fontSize: 8 }, margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  if (result.materials?.length) {
    y = checkPage(doc, y, 12);
    y = sectionTitle(doc, "Materials & Resources", y);
    result.materials.forEach((m) => { y = bullet(doc, m, y); }); y += 3;
  }

  // Lesson Procedures
  if (result.lesson_procedures?.length) {
    y = checkPage(doc, y, 20);
    y = sectionTitle(doc, "Lesson Procedures", y);
    for (const proc of result.lesson_procedures) {
      y = checkPage(doc, y, 25);
      doc.setFillColor(...LIGHT);
      doc.rect(10, y - 1, pageWidth(doc) - 20, 8, "F");
      doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(...PRIMARY);
      doc.text(proc.phase || "", 14, y + 4.5);
      if (proc.duration_minutes) {
        doc.text(`${proc.duration_minutes} min`, pageWidth(doc) - 14, y + 4.5, { align: "right" });
      }
      doc.setTextColor(...DARK); y += 11;

      if (proc.purpose) {
        doc.setFontSize(8); doc.setFont("helvetica", "italic"); doc.setTextColor(...GRAY);
        doc.text(proc.purpose, 14, y); doc.setTextColor(...DARK); y += 5;
      }
      if (proc.teacher_actions) {
        doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.text("Teacher:", 14, y); y += 4;
        y = bodyText(doc, proc.teacher_actions, y, 18); y += 2;
      }
      if (proc.student_actions) {
        doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.text("Students:", 14, y); y += 4;
        y = bodyText(doc, proc.student_actions, y, 18); y += 2;
      }
      if (proc.key_questions?.length) {
        doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.text("Key Questions:", 14, y); y += 4;
        proc.key_questions.forEach((q) => { y = bullet(doc, q, y, 20); });
      }
      if (proc.notes) {
        doc.setFontSize(7.5); doc.setFont("helvetica", "italic"); doc.setTextColor(146, 64, 14);
        const nl = doc.splitTextToSize("Note: " + proc.notes, pageWidth(doc) - 28);
        doc.text(nl, 14, y); doc.setTextColor(...DARK); y += nl.length * 4.5 + 2;
      }
      y += 4;
    }
  }

  // Assessment
  if (result.formative_assessment || result.summative_assessment) {
    y = checkPage(doc, y, 15);
    y = sectionTitle(doc, "Assessment", y);
    if (result.formative_assessment) {
      doc.setFontSize(8.5); doc.setFont("helvetica", "bold"); doc.text("Formative:", 14, y); y += 5;
      if (typeof result.formative_assessment === "object") {
        (result.formative_assessment.during_lesson || []).forEach((s) => { y = bullet(doc, s, y); });
        if (result.formative_assessment.exit_ticket) {
          y = bullet(doc, "Exit Ticket: " + result.formative_assessment.exit_ticket, y);
        }
      } else { y = bodyText(doc, result.formative_assessment, y); }
    }
    if (result.summative_assessment) {
      doc.setFontSize(8.5); doc.setFont("helvetica", "bold"); doc.text("Summative:", 14, y); y += 5;
      y = bodyText(doc, result.summative_assessment, y);
    }
    y += 3;
  }

  // Differentiation
  if (result.differentiation) {
    y = checkPage(doc, y, 15);
    y = sectionTitle(doc, "Differentiation", y);
    const diff = result.differentiation;
    if (diff.support) { doc.setFontSize(8.5); doc.setFont("helvetica", "bold"); doc.text("Support:", 14, y); y += 5; y = bodyText(doc, diff.support, y, 18); }
    if (diff.enrichment) { doc.setFontSize(8.5); doc.setFont("helvetica", "bold"); doc.text("Enrichment:", 14, y); y += 5; y = bodyText(doc, diff.enrichment, y, 18); }
    if (diff.ell_accommodations) { doc.setFontSize(8.5); doc.setFont("helvetica", "bold"); doc.text("ELL:", 14, y); y += 5; y = bodyText(doc, diff.ell_accommodations, y, 18); }
    y += 3;
  }

  if (result.homework_assignment) {
    y = checkPage(doc, y, 12);
    y = sectionTitle(doc, "Homework Assignment", y);
    y = bodyText(doc, result.homework_assignment, y);
  }

  if (result.teacher_reflection_prompts?.length) {
    y = checkPage(doc, y, 15);
    y = sectionTitle(doc, "Teacher Reflection Prompts", y);
    result.teacher_reflection_prompts.forEach((r, i) => { y = bullet(doc, `${i+1}. ${r}`, y); });
  }

  footer(doc);
  doc.save(`${result.title || "lesson-plan"}.pdf`);
}

// ─── 4b. PRESENTATION → PPTX ─────────────────────────────────────────────────

function _pptxDiagramFallback(s, pptx, accent, nodes, type, vp) {
  s.addShape(pptx.ShapeType.roundRect, {
    x: 8.3, y: 1.2, w: 4.8, h: 4.5,
    fill: { color: accent + "18" }, line: { color: accent, width: 1.5 }, rectRadius: 0.15,
  });
  s.addShape(pptx.ShapeType.rect, { x: 8.3, y: 1.2, w: 4.8, h: 0.35, fill: { color: accent } });
  s.addText((type !== "none" && type ? type : "DIAGRAM").toUpperCase(), {
    x: 8.3, y: 1.2, w: 4.8, h: 0.35, fontSize: 7, bold: true, color: "FFFFFF", align: "center", valign: "middle",
  });
  if (nodes.length >= 2) {
    const nodeH = Math.min(0.55, 3.8 / nodes.length);
    let ny = 1.65;
    nodes.slice(0, 6).forEach((node, ni) => {
      s.addShape(pptx.ShapeType.roundRect, {
        x: 8.45, y: ny, w: 4.5, h: nodeH,
        fill: { color: "FFFFFF" }, line: { color: accent, width: 0.8 }, rectRadius: 0.06,
      });
      s.addText([
        { text: `${ni + 1}. `, options: { bold: true, color: accent, fontSize: 8 } },
        { text: String(node), options: { color: "1E1E1E", fontSize: 8 } },
      ], { x: 8.5, y: ny + 0.04, w: 4.4, h: nodeH - 0.08, valign: "middle" });
      ny += nodeH + 0.08;
    });
  } else if (vp) {
    s.addText(vp, { x: 8.4, y: 1.7, w: 4.6, h: 3.8, fontSize: 8, color: "444444", italic: true, align: "center", wrap: true, valign: "middle" });
  }
}

// Helper: hex string → { r, g, b }
function _hexObj(hex) {
  const h = (hex || "695be6").replace("#", "");
  return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) };
}

// Type → hex accent
const SLIDE_HEX = {
  title:      "695be6", hook:       "f97316", content:    "3b82f6",
  example:    "10b981", activity:   "22c55e", summary:    "8b5cf6",
  assessment: "ef4444", objectives: "3b82f6",
};

function _accentHex(slide) {
  return (slide.vibrant_accent_color || SLIDE_HEX[slide.type] || "695be6").replace("#", "");
}

export async function downloadPresentationPptx(result) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 inches

  const slides = result.slides || [];
  const total  = slides.length;

  // Pre-fetch all images via proxy in batches of 6
  const BATCH = 6;
  for (let i = 0; i < total; i += BATCH) {
    await Promise.all(
      slides.slice(i, i + BATCH).map(async (slide) => {
        // Guard: content must be a plain object to store _fetched_image
        if (typeof slide.content !== "object" || slide.content === null) {
          slide.content = {};
        }
        if (slide.content._fetched_image) return;
        const b64 = await _fetchSlideImage(slide);
        if (b64) slide.content._fetched_image = b64;
      })
    );
  }

  // ── Cover slide ───────────────────────────────────────────────────────────
  const cover = pptx.addSlide();
  cover.background = { color: "695be6" };
  cover.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: "5a4dd4" } });
  cover.addText(result.title || "Presentation", {
    x: 0.5, y: 2.2, w: 12.3, h: 1.2,
    fontSize: 36, bold: true, color: "FFFFFF", align: "center",
  });
  const metaStr = [result.subject, result.grade, `${total} slides`, `${result.duration_minutes || ""} min`].filter(Boolean).join("  ·  ");
  cover.addText(metaStr, {
    x: 0.5, y: 3.6, w: 12.3, h: 0.5,
    fontSize: 14, color: "D0C8FF", align: "center",
  });
  if (result.learning_objectives?.length) {
    const objText = result.learning_objectives.map(o => `• ${o}`).join("\n");
    cover.addText(objText, {
      x: 1.5, y: 4.3, w: 10.3, h: 1.8,
      fontSize: 11, color: "E8E4FF", align: "center",
    });
  }

  // ── Content slides ────────────────────────────────────────────────────────
  slides.forEach((slide, idx) => {
    const s = pptx.addSlide();
    const accent = _accentHex(slide);
    const accentObj = _hexObj("#" + accent);

    // Background
    s.background = { color: "FAF8FF" };

    // Left accent strip
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.12, h: "100%", fill: { color: accent } });

    // Top header band
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 1.1, fill: { color: accent } });

    // Slide number circle
    s.addShape(pptx.ShapeType.ellipse, { x: 0.18, y: 0.12, w: 0.55, h: 0.55, fill: { color: "FFFFFF" } });
    s.addText(String(idx + 1), {
      x: 0.18, y: 0.12, w: 0.55, h: 0.55,
      fontSize: 10, bold: true, color: accent, align: "center", valign: "middle",
    });

    // Slide type badge
    s.addText((slide.type || "content").toUpperCase(), {
      x: 0.85, y: 0.08, w: 1.8, h: 0.4,
      fontSize: 8, bold: true, color: "FFFFFF",
    });

    // Slide title
    s.addText(slide.title || "", {
      x: 0.85, y: 0.48, w: 10, h: 0.55,
      fontSize: 16, bold: true, color: "FFFFFF",
    });

    // Slide counter top-right
    s.addText(`${idx + 1} / ${total}${slide.duration_minutes ? `  ·  ${slide.duration_minutes}m` : ""}`, {
      x: 10.5, y: 0.1, w: 2.7, h: 0.4,
      fontSize: 8, color: "FFFFFF", align: "right",
    });

    // ── Content area (left 60%) ─────────────────────────────────────────────
    let contentY = 1.3;
    const contentW = 7.8;
    const contentX = 0.25;

    // Subtitle
    if (slide.subtitle) {
      s.addText(slide.subtitle, {
        x: contentX, y: contentY, w: contentW, h: 0.35,
        fontSize: 9, italic: true, color: "666666",
      });
      contentY += 0.4;
    }

    // Bullets
    const bullets = (slide.content?.bullets || slide.bullets || []).filter(Boolean);
    if (bullets.length) {
      const bulletObjs = bullets.map(b => ({
        text: String(b),
        options: { bullet: { code: "2022" }, fontSize: 11, color: "1E1E1E", paraSpaceAfter: 5 },
      }));
      s.addText(bulletObjs, {
        x: contentX, y: contentY, w: contentW, h: Math.min(bullets.length * 0.5 + 0.2, 3.0),
        valign: "top",
      });
      contentY += bullets.length * 0.5 + 0.2;
    }

    // Explanation paragraph
    const explanation = slide.content?.explanation;
    if (explanation) {
      s.addShape(pptx.ShapeType.roundRect, {
        x: contentX, y: contentY, w: contentW, h: 1.1,
        fill: { color: "EEEAFF" }, line: { color: "C4B8FF", width: 0.5 }, rectRadius: 0.08,
      });
      s.addText(String(explanation), {
        x: contentX + 0.1, y: contentY + 0.05, w: contentW - 0.2, h: 1.0,
        fontSize: 9, color: "2D2060", wrap: true, valign: "top",
      });
      contentY += 1.2;
    }

    // Key terms
    const keyTerms = (slide.content?.key_terms || []).slice(0, 2);
    keyTerms.forEach(kt => {
      if (!kt?.term) return;
      s.addShape(pptx.ShapeType.roundRect, {
        x: contentX, y: contentY, w: contentW, h: 0.38,
        fill: { color: _accentHex(slide) }, line: { color: _accentHex(slide), width: 0 }, rectRadius: 0.05,
      });
      s.addText([
        { text: kt.term + ": ", options: { bold: true, color: "FFFFFF", fontSize: 8 } },
        { text: kt.definition || "", options: { color: "FFFFFF", fontSize: 8 } },
      ], { x: contentX + 0.1, y: contentY + 0.04, w: contentW - 0.2, h: 0.3, valign: "middle" });
      contentY += 0.45;
    });

    // Steps
    const steps = (slide.content?.steps || slide.steps || []).filter(Boolean);
    if (steps.length) {
      const stepObjs = steps.map((s, i) => ({
        text: `${i + 1}.  ${s}`,
        options: { fontSize: 11, color: "1E1E1E", paraSpaceAfter: 5 },
      }));
      s.addText(stepObjs, {
        x: contentX, y: contentY, w: contentW, h: Math.min(steps.length * 0.5 + 0.2, 3),
        valign: "top",
      });
      contentY += steps.length * 0.5 + 0.3;
    }

    // MCQ questions
    const questions = (slide.content?.questions || slide.questions || []);
    if (questions.length) {
      questions.forEach((q, qi) => {
        const qText = q.question || (typeof q === "string" ? q : "");
        if (qText) {
          s.addText(`Q${qi + 1}. ${qText}`, {
            x: contentX, y: contentY, w: contentW, h: 0.4,
            fontSize: 10, bold: true, color: "1E1E1E",
          });
          contentY += 0.45;
        }
        if (q.options) {
          q.options.forEach(opt => {
            const isCorrect = typeof opt === "string" && opt.startsWith(q.correct);
            s.addText(String(opt), {
              x: contentX + 0.2, y: contentY, w: contentW - 0.2, h: 0.32,
              fontSize: 9, color: isCorrect ? "166534" : "444444",
              bold: isCorrect,
            });
            contentY += 0.34;
          });
          contentY += 0.15;
        }
      });
    }

    // ── Right panel: diagram nodes ──────────────────────────────────────────
    const vp = slide.content?.visual_prompt || "";
    const imgB64 = slide.content?.image_b64 || slide.content?._fetched_image;
    const imgUrl = slide.content?.image_url;
    const diagramNodes = slide.content?.diagram?.nodes || [];
    const diagramType  = slide.content?.diagram?.type || "none";

    if (imgB64) {
      // Embed real AI-generated image (base64) — contain, not cover
      try {
        const raw = imgB64.startsWith("data:") ? imgB64 : `data:image/jpeg;base64,${imgB64}`;
        s.addImage({ data: raw, x: 8.3, y: 1.2, w: 4.8, h: 4.5,
          sizing: { type: "contain", w: 4.8, h: 4.5 } });
        s.addShape(pptx.ShapeType.roundRect, { x: 8.3, y: 1.2, w: 4.8, h: 4.5,
          fill: { type: "none" }, line: { color: accent, width: 2 }, rectRadius: 0.15 });
      } catch {
        _pptxDiagramFallback(s, pptx, accent, diagramNodes, diagramType, vp);
      }
    } else if (imgUrl) {
      // Embed from URL — contain, not cover
      try {
        s.addImage({ path: imgUrl, x: 8.3, y: 1.2, w: 4.8, h: 4.5,
          sizing: { type: "contain", w: 4.8, h: 4.5 } });
        s.addShape(pptx.ShapeType.roundRect, { x: 8.3, y: 1.2, w: 4.8, h: 4.5,
          fill: { type: "none" }, line: { color: accent, width: 2 }, rectRadius: 0.15 });
      } catch {
        _pptxDiagramFallback(s, pptx, accent, diagramNodes, diagramType, vp);
      }
    } else {
      _pptxDiagramFallback(s, pptx, accent, diagramNodes, diagramType, vp);
    }

    // ── Speaker notes (amber box) ───────────────────────────────────────────
    if (slide.speaker_notes) {
      s.addShape(pptx.ShapeType.roundRect, {
        x: 0.15, y: 5.85, w: 8.0, h: 1.0,
        fill: { color: "FFFBEB" },
        line: { color: "FCD34D", width: 1 },
        rectRadius: 0.08,
      });
      s.addText(`NOTES: ${slide.speaker_notes}`, {
        x: 0.25, y: 5.88, w: 7.8, h: 0.94,
        fontSize: 7.5, color: "92400E", wrap: true, valign: "top",
      });
    }

    // ── Engagement prompt (green box) ───────────────────────────────────────
    if (slide.engagement_prompt) {
      s.addShape(pptx.ShapeType.roundRect, {
        x: 8.3, y: 5.85, w: 4.8, h: 1.0,
        fill: { color: "F0FDF4" },
        line: { color: "86EFAC", width: 1 },
        rectRadius: 0.08,
      });
      s.addText(`Ask: ${slide.engagement_prompt}`, {
        x: 8.4, y: 5.88, w: 4.6, h: 0.94,
        fontSize: 7.5, color: "166534", wrap: true, valign: "top",
      });
    }

    // Bottom accent bar
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 7.35, w: "100%", h: 0.15, fill: { color: accent } });
  });

  // ── Teacher notes slide ───────────────────────────────────────────────────
  if (result.teacher_preparation_notes) {
    const ns = pptx.addSlide();
    ns.background = { color: "F8F7FF" };
    ns.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 1.1, fill: { color: "695be6" } });
    ns.addText("Teacher Preparation Notes", {
      x: 0.5, y: 0.2, w: 12.3, h: 0.7,
      fontSize: 18, bold: true, color: "FFFFFF",
    });
    ns.addText(result.teacher_preparation_notes, {
      x: 0.5, y: 1.4, w: 12.3, h: 5.5,
      fontSize: 11, color: "333333", wrap: true, valign: "top",
    });
  }

  await pptx.writeFile({ fileName: `${result.title || "presentation"}.pptx` });
}
