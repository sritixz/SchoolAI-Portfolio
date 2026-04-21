import api from "../api";

export const fetchImages = (query, grade = "", board = "CBSE") =>
  api.post("/media/images", { query, grade, board }).then((r) => r.data.results);

export const fetchVideos = (query, grade = "", board = "CBSE") =>
  api.post("/media/videos", { query, grade, board }).then((r) => r.data.results);

/** Force-refresh images by clearing the cache first, then fetching fresh results. */
export const fetchImagesFresh = async (query, grade = "", board = "CBSE") => {
  await api.post("/media/images/clear-cache", { query, grade, board }).catch(() => {});
  return api.post("/media/images", { query, grade, board }).then((r) => r.data.results);
};
