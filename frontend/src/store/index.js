import { configureStore } from "@reduxjs/toolkit";
import authReducer         from "./slices/authSlice";
import studentReducer      from "./slices/studentSlice";
import homeworkReducer     from "./slices/homeworkSlice";
import learningGapsReducer from "./slices/learningGapsSlice";
import vinAiReducer        from "./slices/vinAiSlice";
import teacherReducer      from "./slices/teacherSlice";
import parentReducer       from "./slices/parentSlice";
import schoolAdminReducer  from "./slices/schoolAdminSlice";

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
  },
});

export default store;
