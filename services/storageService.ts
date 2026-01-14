
import { User, AttendanceRecord, Course, DashboardWidget } from '../types';

const KEYS = {
  USERS: 'smartattend_users',
  RECORDS: 'smartattend_records',
  WIDGETS: 'smartattend_widgets',
  COURSES: 'smartattend_courses',
  THEME: 'smartattend_theme'
};

export const storageService = {
  getUsers: (): User[] => {
    const data = localStorage.getItem(KEYS.USERS);
    return data ? JSON.parse(data) : [];
  },
  saveUsers: (users: User[]) => {
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  },
  getRecords: (): AttendanceRecord[] => {
    const data = localStorage.getItem(KEYS.RECORDS);
    return data ? JSON.parse(data) : [];
  },
  saveRecords: (records: AttendanceRecord[]) => {
    localStorage.setItem(KEYS.RECORDS, JSON.stringify(records));
  },
  getWidgets: (defaultWidgets: DashboardWidget[]): DashboardWidget[] => {
    const data = localStorage.getItem(KEYS.WIDGETS);
    return data ? JSON.parse(data) : defaultWidgets;
  },
  saveWidgets: (widgets: DashboardWidget[]) => {
    localStorage.setItem(KEYS.WIDGETS, JSON.stringify(widgets));
  },
  getCourses: (defaultCourses: Course[]): Course[] => {
    const data = localStorage.getItem(KEYS.COURSES);
    return data ? JSON.parse(data) : defaultCourses;
  },
  saveCourses: (courses: Course[]) => {
    localStorage.setItem(KEYS.COURSES, JSON.stringify(courses));
  },
  getTheme: (): 'light' | 'dark' => {
    return (localStorage.getItem(KEYS.THEME) as 'light' | 'dark') || 'light';
  },
  saveTheme: (theme: 'light' | 'dark') => {
    localStorage.setItem(KEYS.THEME, theme);
  },
  resetAll: () => {
    Object.values(KEYS).forEach(key => localStorage.removeItem(key));
    window.location.reload();
  }
};
