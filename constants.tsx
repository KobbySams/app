
import { Role, User, Course } from './types';

// Emptied for production-like fresh state
export const MOCK_USERS: User[] = [];

export const MOCK_COURSES: Course[] = [
  { id: 'c1', code: 'CS101', name: 'Introduction to Computer Science', lecturerId: '' },
  { id: 'c2', code: 'CS302', name: 'Advanced Algorithms', lecturerId: '' },
  { id: 'c3', code: 'DB101', name: 'Database Management Systems', lecturerId: '' },
];
