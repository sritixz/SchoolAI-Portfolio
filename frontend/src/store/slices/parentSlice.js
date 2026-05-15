import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api";

export const fetchParentDashboard = createAsyncThunk("parent/fetchDashboard", async (_, { rejectWithValue }) => {
  try { return (await api.get("/parent/dashboard")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const fetchHomeworkOverview = createAsyncThunk("parent/fetchHomeworkOverview", async (childId, { rejectWithValue }) => {
  try { return (await api.get("/parent/homework-overview", { params: { child_id: childId } })).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const fetchConsistency = createAsyncThunk("parent/fetchConsistency", async (childId, { rejectWithValue }) => {
  try { return (await api.get("/parent/consistency", { params: { child_id: childId } })).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const fetchTopicProgress = createAsyncThunk("parent/fetchTopicProgress", async (childId, { rejectWithValue }) => {
  try { return (await api.get("/parent/topic-progress", { params: { child_id: childId } })).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const fetchParentNotifications = createAsyncThunk("parent/fetchNotifications", async (_, { rejectWithValue }) => {
  try { return (await api.get("/parent/notifications")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const markParentNotifRead = createAsyncThunk("parent/markNotifRead", async (id, { rejectWithValue }) => {
  try { await api.patch(`/parent/notifications/${id}/read`); return id; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const fetchSupportAlerts = createAsyncThunk("parent/fetchSupportAlerts", async (childId, { rejectWithValue }) => {
  try { return (await api.get("/parent/support-alerts", { params: { child_id: childId } })).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const fetchGrowthPortfolio = createAsyncThunk("parent/fetchGrowthPortfolio", async (childId, { rejectWithValue }) => {
  try { return (await api.get("/parent/growth-portfolio", { params: { child_id: childId } })).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const addPortfolioEntry = createAsyncThunk("parent/addPortfolioEntry", async ({ childId, title, text }, { rejectWithValue }) => {
  try { return (await api.post("/parent/growth-portfolio/add", null, { params: { child_id: childId, title, text } })).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const fetchLearningProfile = createAsyncThunk("parent/fetchLearningProfile", async (childId, { rejectWithValue }) => {
  try { return (await api.get("/parent/learning-profile", { params: { child_id: childId } })).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const updateLearningProfile = createAsyncThunk("parent/updateLearningProfile", async ({ childId, profile }, { rejectWithValue }) => {
  try { return (await api.put("/parent/learning-profile", profile, { params: { child_id: childId } })).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const fetchParentTeacherMessages = createAsyncThunk("parent/fetchTeacherMessages", async (_, { rejectWithValue }) => {
  try { return (await api.get("/parent/messages")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const markTeacherMessageRead = createAsyncThunk("parent/markTeacherMessageRead", async (id, { rejectWithValue }) => {
  try { await api.patch(`/parent/messages/${id}/read`); return id; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const sendMessageToTeacher = createAsyncThunk("parent/sendMessageToTeacher", async (payload, { rejectWithValue }) => {
  try { return (await api.post("/parent/messages", payload)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const fetchParentMeetingRequests = createAsyncThunk("parent/fetchMeetingRequests", async (_, { rejectWithValue }) => {
  try { return (await api.get("/parent/meeting-requests")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const fetchChildTeachers = createAsyncThunk("parent/fetchChildTeachers", async (childId, { rejectWithValue }) => {
  try { return (await api.get("/parent/child-teachers", { params: { child_id: childId } })).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const createParentMeetingRequest = createAsyncThunk("parent/createMeetingRequest", async (payload, { rejectWithValue }) => {
  try { return (await api.post("/parent/meeting-requests", payload)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

const parentSlice = createSlice({
  name: "parent",
  initialState: {
    dashboard:          null, dashboardStatus:      "idle",
    children:           [],
    homeworkOverview:   [], homeworkOverviewStatus:"idle",
    consistency:        null, consistencyStatus:    "idle",
    topicProgress:      [], topicProgressStatus:   "idle",
    notifications:      [], notifStatus:           "idle",
    supportAlerts:      [], alertsStatus:          "idle",
    portfolio:          [], portfolioStatus:       "idle",
    learningProfile:    null, profileStatus:       "idle",
    teacherMessages:    [], teacherMessagesStatus: "idle",
    meetingRequests:    [], meetingRequestsStatus: "idle",
  },
  reducers: {
    optimisticMarkNotifRead(s, { payload: id }) {
      const n = s.notifications.find((n) => n.id === id || n._id === id);
      if (n) n.read = true;
    },
    optimisticMarkMessageRead(s, { payload: id }) {
      const m = s.teacherMessages.find((m) => m._id === id || m.id === id);
      if (m) m.read = true;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchParentDashboard.pending,   (s) => { s.dashboardStatus = "loading"; })
     .addCase(fetchParentDashboard.fulfilled, (s, a) => {
       s.dashboardStatus = "succeeded";
       s.dashboard = a.payload;
       s.children  = a.payload.children || [];
     })
     .addCase(fetchParentDashboard.rejected,  (s) => { s.dashboardStatus = "failed"; });

    b.addCase(fetchHomeworkOverview.fulfilled, (s, a) => { s.homeworkOverview = a.payload; s.homeworkOverviewStatus = "succeeded"; });
    b.addCase(fetchConsistency.fulfilled,      (s, a) => { s.consistency = a.payload; s.consistencyStatus = "succeeded"; });
    b.addCase(fetchTopicProgress.fulfilled,    (s, a) => { s.topicProgress = a.payload; s.topicProgressStatus = "succeeded"; });

    b.addCase(fetchParentNotifications.pending,   (s) => { s.notifStatus = "loading"; })
     .addCase(fetchParentNotifications.fulfilled, (s, a) => { s.notifStatus = "succeeded"; s.notifications = a.payload; })
     .addCase(fetchParentNotifications.rejected,  (s) => { s.notifStatus = "failed"; });

    b.addCase(markParentNotifRead.fulfilled, (s, a) => {
      const n = s.notifications.find((n) => n._id === a.payload || n.id === a.payload);
      if (n) n.read = true;
    });

    b.addCase(fetchSupportAlerts.fulfilled,  (s, a) => { s.supportAlerts = a.payload; s.alertsStatus = "succeeded"; });
    b.addCase(fetchGrowthPortfolio.fulfilled,(s, a) => { s.portfolio = a.payload; s.portfolioStatus = "succeeded"; });
    b.addCase(fetchLearningProfile.fulfilled,(s, a) => { s.learningProfile = a.payload; s.profileStatus = "succeeded"; });

    b.addCase(fetchParentTeacherMessages.fulfilled, (s, a) => {
      s.teacherMessages = a.payload;
      s.teacherMessagesStatus = "succeeded";
    });
    b.addCase(markTeacherMessageRead.fulfilled, (s, a) => {
      const m = s.teacherMessages.find((m) => m._id === a.payload || m.id === a.payload);
      if (m) m.read = true;
    });

    b.addCase(fetchParentMeetingRequests.fulfilled, (s, a) => { s.meetingRequests = a.payload; s.meetingRequestsStatus = "succeeded"; });
    b.addCase(createParentMeetingRequest.fulfilled, (s, a) => { s.meetingRequests = [a.payload, ...s.meetingRequests]; });
  },
});

export const { optimisticMarkNotifRead, optimisticMarkMessageRead } = parentSlice.actions;

export const selectParentDashboard    = (s) => s.parent.dashboard;
export const selectChildren           = (s) => s.parent.children;
export const selectHomeworkOverview   = (s) => s.parent.homeworkOverview;
export const selectConsistency        = (s) => s.parent.consistency;
export const selectTopicProgress      = (s) => s.parent.topicProgress;
export const selectParentNotifications= (s) => s.parent.notifications;
export const selectUnreadCount        = (s) => s.parent.notifications.filter((n) => !n.read).length;
export const selectSupportAlerts      = (s) => s.parent.supportAlerts;
export const selectPortfolio          = (s) => s.parent.portfolio;
export const selectLearningProfile    = (s) => s.parent.learningProfile;
export const selectTeacherMessages    = (s) => s.parent.teacherMessages;
export const selectUnreadMessages     = (s) => s.parent.teacherMessages.filter((m) => m.direction === "teacher_to_parent" && !m.read).length;
export const selectParentMeetingRequests = (s) => s.parent.meetingRequests;

export default parentSlice.reducer;
