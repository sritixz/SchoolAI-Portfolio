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

export function downloadPresentationPdf(result) {
  const doc = newDoc();
  let y = header(doc, result.title || "Presentation", [
    result.subject, result.grade, `${result.total_slides || (result.slides||[]).length} slides`, `${result.duration_minutes} min`
  ]);

  if (result.learning_objectives?.length) {
    y = sectionTitle(doc, "Learning Objectives", y);
    result.learning_objectives.forEach((o) => { y = bullet(doc, o, y); });
    y += 4;
  }

  for (const slide of (result.slides || [])) {
    y = checkPage(doc, y, 30);
    // Slide header bar
    const typeColors = {
      title: [139, 92, 246], hook: [249, 115, 22], activity: [34, 197, 94],
      assessment: [239, 68, 68], objectives: [59, 130, 246],
    };
    const col = typeColors[slide.type] || PRIMARY;
    doc.setFillColor(...col);
    doc.rect(10, y, pageWidth(doc) - 20, 8, "F");
    doc.setTextColor(...WHITE); doc.setFontSize(8); doc.setFont("helvetica", "bold");
    doc.text(`Slide ${slide.number || ""}  ·  ${(slide.type || "content").toUpperCase()}`, 14, y + 5.5);
    if (slide.duration_minutes) {
      doc.text(`${slide.duration_minutes} min`, pageWidth(doc) - 14, y + 5.5, { align: "right" });
    }
    doc.setTextColor(...DARK); y += 11;

    doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text(slide.title || "", 14, y); y += 6;

    if (slide.subtitle) {
      doc.setFontSize(8); doc.setFont("helvetica", "italic"); doc.setTextColor(...GRAY);
      doc.text(slide.subtitle, 14, y); doc.setTextColor(...DARK); y += 5;
    }
    if (slide.content) { y = bodyText(doc, slide.content, y); }
    if (slide.bullets?.length) {
      slide.bullets.forEach((b) => { y = bullet(doc, b, y); });
    }
    if (slide.steps?.length) {
      slide.steps.forEach((s, i) => { y = bullet(doc, `${i+1}. ${s}`, y); });
    }
    if (slide.speaker_notes) {
      y = checkPage(doc, y, 12);
      doc.setFillColor(255, 251, 235);
      const noteLines = doc.splitTextToSize(slide.speaker_notes, pageWidth(doc) - 32);
      doc.rect(14, y - 1, pageWidth(doc) - 28, noteLines.length * 4.5 + 5, "F");
      doc.setFontSize(7.5); doc.setFont("helvetica", "bold"); doc.setTextColor(146, 64, 14);
      doc.text("Speaker Notes:", 16, y + 3);
      doc.setFont("helvetica", "normal");
      doc.text(noteLines, 16, y + 7);
      doc.setTextColor(...DARK);
      y += noteLines.length * 4.5 + 8;
    }
    if (slide.engagement_prompt) {
      y = checkPage(doc, y, 10);
      doc.setFontSize(8); doc.setFont("helvetica", "italic"); doc.setTextColor(22, 101, 52);
      doc.text("💬 " + slide.engagement_prompt, 14, y);
      doc.setTextColor(...DARK); y += 6;
    }
    y += 5;
  }

  if (result.teacher_preparation_notes) {
    y = checkPage(doc, y, 15);
    y = sectionTitle(doc, "Teacher Preparation Notes", y);
    y = bodyText(doc, result.teacher_preparation_notes, y);
  }

  footer(doc);
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
