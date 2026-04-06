import { configureStore } from "@reduxjs/toolkit";
import authReducer         from "./slices/authSlice";
import studentReducer      from "./slices/studentSlice";
import homeworkReducer     from "./slices/homeworkSlice";
import learningGapsReducer from "./slices/learningGapsSlice";
import vinAiReducer        from "./slices/vinAiSlice";
import teacherReducer      from "./slices/teacherSlice";
import parentReducer       from "./slices/parentSlice";
import schoolAdminReducer  from "./slices/schoolAdminSlice";
import aiHistoryReducer    from "./slices/aiHistorySlice";
import loadingReducer      from "./slices/loadingSlice";
import { injectStore }     from "../api";

export const store = configureStore({
  reducer: {
    auth:        authReducer,
    student:     studentReducer,
    homework:    homeworkReducer,
    learningGaps:learningGapsReducer,
    vinAi:       vinAiReducer,
    teacher:     teacherReducer,
    parent:      parentReducer,
    schoolAdmin: schoolAdminReducer,
    aiHistory:   aiHistoryReducer,
    loading:     loadingReducer,
  },
});

// Give the api module access to dispatch without a circular import
injectStore(store);

export default store;
