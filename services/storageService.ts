
import { User, AttendanceRecord, Course, DashboardWidget } from '../types';

const KEYS = {
  USERS: 'smartattend_users',
  RECORDS: 'smartattend_records',
  WIDGETS: 'smartattend_widgets',
  COURSES: 'smartattend_courses'
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
  resetAll: () => {
    Object.values(KEYS).forEach(key => localStorage.removeItem(key));
    window.location.reload();
  }
};
