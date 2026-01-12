
export enum Role {
  LECTURER = 'LECTURER',
  STUDENT = 'STUDENT'
}

export type AttendanceStatus = 'present' | 'absent';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface AppNotification {
  id: string;
  type: NotificationType;
  message: string;
  description?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  studentId?: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  lecturerId: string;
}

export interface AttendanceRecord {
  id: string;
  courseId: string;
  studentId: string;
  studentName: string;
  timestamp: string;
  sessionId: string;
  status: AttendanceStatus;
}

export interface AttendanceSession {
  id: string;
  courseId: string;
  startTime: string;
  qrToken: string;
}

export interface DashboardWidget {
  id: string;
  label: string;
  visible: boolean;
}
