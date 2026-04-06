/**
 * useAiToolWithHistory
 * Wraps runAiTool / generateAiQuestions dispatch and automatically saves
 * the result to the AI history (localStorage + backend).
 */
import { useDispatch } from "react-redux";
import { runAiTool, generateAiQuestions, clearAiToolResult, clearGeneratedQuestions } from "../store/slices/teacherSlice";
import { addHistoryItem, persistHistoryItem } from "../store/slices/aiHistorySlice";
import { nanoid } from "nanoid";

export function useAiToolWithHistory() {
  const dispatch = useDispatch();

  /**
   * Run an AI tool and save result to history.
   * @param {object} payload  - same payload as runAiTool
   * @param {object} meta     - { tool, title, subject, topic, grade }
   */
  async function runTool(payload, meta) {
    dispatch(clearAiToolResult());
    const action = await dispatch(runAiTool(payload));
    if (runAiTool.fulfilled.match(action)) {
      const item = {
        id:        nanoid(),
        tool:      meta.tool,
        title:     meta.title || `${meta.tool} — ${meta.topic || ""}`,
        subject:   meta.subject || payload.subject,
        topic:     meta.topic   || payload.topic,
        grade:     meta.grade   || payload.grade,
        result:    action.payload,
        createdAt: new Date().toISOString(),
      };
      dispatch(addHistoryItem(item));
      dispatch(persistHistoryItem(item)); // fire-and-forget to backend
    }
    return action;
  }

  /**
   * Run the quiz question generator and save to history.
   */
  async function runQuiz(payload, meta) {
    dispatch(clearGeneratedQuestions());
    const action = await dispatch(generateAiQuestions(payload));
    if (generateAiQuestions.fulfilled.match(action)) {
      const item = {
        id:        nanoid(),
        tool:      "quiz",
        title:     meta.title || `Quiz — ${payload.topic || ""}`,
        subject:   payload.subject,
        topic:     payload.topic,
        grade:     payload.grade,
        result:    { questions: action.payload, meta: payload },
        createdAt: new Date().toISOString(),
      };
      dispatch(addHistoryItem(item));
      dispatch(persistHistoryItem(item));
    }
    return action;
  }

  return { runTool, runQuiz };
}
