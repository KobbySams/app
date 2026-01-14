
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Role, 
  User, 
  Course, 
  AttendanceRecord, 
  AttendanceSession,
  DashboardWidget,
  AttendanceStatus,
  AppNotification,
  NotificationType
} from './types';
import { MOCK_COURSES } from './constants';
import QRCodeGenerator from './components/QRCodeGenerator';
import QRScanner from './components/QRScanner';
import IDScanner from './components/IDScanner';
import { generatePerformanceReport } from './services/geminiService';
import { storageService } from './services/storageService';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  LogOut, 
  Calendar, 
  CheckCircle2, 
  TrendingUp, 
  Plus, 
  ArrowLeft, 
  Search, 
  Menu, 
  X, 
  Settings, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  EyeOff, 
  Clock, 
  UserCheck, 
  UserX, 
  ShieldCheck, 
  GraduationCap, 
  History, 
  Lock, 
  Mail, 
  ScanLine, 
  Database, 
  CheckCircle,
  ChevronRight,
  Zap,
  Globe,
  Shield,
  BarChart4,
  Info,
  AlertTriangle,
  FileText,
  Activity,
  Sun,
  Moon,
  Sliders,
  RotateCcw,
  Sparkles,
  MousePointer2,
  Heart
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: 'stats', label: 'Summary', visible: true },
  { id: 'trends', label: 'Attendance Charts', visible: true },
  { id: 'courses', label: 'Your Classes', visible: true },
  { id: 'log', label: 'Active Session', visible: true },
];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>(storageService.getUsers());
  const [records, setRecords] = useState<AttendanceRecord[]>(storageService.getRecords());
  const [courses, setCourses] = useState<Course[]>(storageService.getCourses(MOCK_COURSES));
  const [widgets, setWidgets] = useState<DashboardWidget[]>(storageService.getWidgets(DEFAULT_WIDGETS));
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>(storageService.getTheme());
  
  const [isLanding, setIsLanding] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'settings'>('overview');
  const [view, setView] = useState<'role-select' | 'login' | 'signup'>('role-select');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [reportData, setReportData] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isIdScannerOpen, setIsIdScannerOpen] = useState(false);
  const [lastScannedCourse, setLastScannedCourse] = useState<string | null>(null);

  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [signupForm, setSignupForm] = useState({ name: '', email: '', role: Role.STUDENT, studentId: '' });

  // Persistence Effects
  useEffect(() => { storageService.saveUsers(allUsers); }, [allUsers]);
  useEffect(() => { storageService.saveRecords(records); }, [records]);
  useEffect(() => { storageService.saveWidgets(widgets); }, [widgets]);
  useEffect(() => { storageService.saveCourses(courses); }, [courses]);
  
  // Theme Sync
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    storageService.saveTheme(theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const addNotification = useCallback((type: NotificationType, message: string, description?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { id, type, message, description }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const foundUser = allUsers.find(u => 
      u.email.toLowerCase() === loginEmail.toLowerCase() || 
      (u.studentId && u.studentId.toLowerCase() === loginEmail.toLowerCase())
    );
    
    if (foundUser) {
      if (selectedRole && foundUser.role !== selectedRole) {
        addNotification('error', 'Login Error', `Oops! This account isn't set up for this role.`);
        return;
      }
      setUser(foundUser);
      setIsLanding(false);
      addNotification('success', 'Welcome Back', `Logged in as ${foundUser.name}`);
    } else {
      addNotification('error', 'Login Failed', "We couldn't find an account with those details.");
    }
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupForm.name || !signupForm.email) return addNotification('warning', 'Almost there', 'Please fill in all the details.');
    if (allUsers.some(u => u.email.toLowerCase() === signupForm.email.toLowerCase())) return addNotification('error', 'Account Exists', 'That email is already registered.');

    const newUser: User = { id: `u-${Date.now()}`, ...signupForm, studentId: signupForm.role === Role.STUDENT ? signupForm.studentId : undefined };
    setAllUsers(prev => [...prev, newUser]);
    setUser(newUser);
    setIsLanding(false);
    addNotification('success', 'Account Created', "Welcome to the community!");
  };

  const startSession = (course: Course) => {
    const expiresAt = new Date(Date.now() + course.qrExpirationMinutes * 60 * 1000).toISOString();
    const newSession: AttendanceSession = { 
      id: `session-${Date.now()}`, 
      courseId: course.id, 
      startTime: new Date().toISOString(), 
      expiresAt,
      qrToken: Math.random().toString(36).substring(7) 
    };
    setActiveSession(newSession);
    setSelectedCourse(course);
    addNotification('info', 'Class Started', `${course.code} is now accepting attendance.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateCourseSettings = (courseId: string, updates: Partial<Course>) => {
    setCourses(prev => prev.map(c => c.id === courseId ? { ...c, ...updates } : c));
    addNotification('success', 'Saved', 'Your class settings have been updated.');
  };

  const handleScan = useCallback((data: string) => {
    try {
      if (!user || user.role !== Role.STUDENT) return addNotification('error', 'Access Denied', 'Only students can scan.');
      const parsed = JSON.parse(data);
      const studentId = user.studentId || user.email;
      if (records.some(r => r.studentId === studentId && r.sessionId === parsed.sessionId)) return addNotification('warning', 'Already Scanned', "You've already checked in!");

      const course = courses.find(c => c.id === parsed.courseId);
      const courseName = course ? `${course.code}: ${course.name}` : 'Class';

      const newRecord: AttendanceRecord = { id: `rec-${Date.now()}`, courseId: parsed.courseId, studentId, studentName: user.name, timestamp: new Date().toISOString(), sessionId: parsed.sessionId, status: 'present' };
      setRecords(prev => [...prev, newRecord]);
      setLastScannedCourse(courseName);
      addNotification('success', 'Checked In!', `Successfully recorded for ${courseName}`);
    } catch (e) { addNotification('error', 'Oops', "That QR code doesn't look right."); }
  }, [user, records, courses, addNotification]);

  const handleMarkStatus = (student: User, status: AttendanceStatus) => {
    if (!selectedCourse || !activeSession) return;
    const studentId = student.studentId || student.email;
    const existingIndex = records.findIndex(r => r.studentId === studentId && r.sessionId === activeSession.id);
    if (existingIndex > -1) {
      const updated = [...records];
      updated[existingIndex] = { ...updated[existingIndex], status, timestamp: new Date().toISOString() };
      setRecords(updated);
    } else {
      const newRecord: AttendanceRecord = { id: `rec-${Date.now()}`, courseId: selectedCourse.id, studentId, studentName: student.name, timestamp: new Date().toISOString(), sessionId: activeSession.id, status };
      setRecords(prev => [...prev, newRecord]);
    }
    addNotification('info', 'Status Updated', `${student.name} marked as ${status}`);
  };

  const handleGenerateReport = async () => {
    if (!selectedCourse) return;
    setIsProcessing(true);
    addNotification('info', 'Analyzing', 'Looking through the attendance data...');
    const result = await generatePerformanceReport(records.filter(r => r.courseId === selectedCourse.id), selectedCourse.name);
    setReportData(result);
    setIsProcessing(false);
    addNotification('success', 'Done', 'Your insights are ready!');
  };

  const allStudents = useMemo(() => allUsers.filter(u => u.role === Role.STUDENT), [allUsers]);
  const studentStats = useMemo(() => allStudents.map(student => {
    const sRecords = records.filter(r => r.studentId === (student.studentId || student.email));
    return { ...student, presenceRate: sRecords.length > 0 ? Math.round((sRecords.filter(r => r.status === 'present').length / sRecords.length) * 100) : 0, lastSeen: sRecords.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]?.timestamp };
  }), [allStudents, records]);

  // UI Components
  const LandingPage = () => (
    <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors duration-300">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-1.5 rounded-xl shadow-lg">
            <CheckCircle2 className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-xl text-slate-900 dark:text-white tracking-tight">AttendEase</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className="p-2.5 rounded-full hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-500 transition-all">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button onClick={() => { setView('login'); setIsLanding(false); }} className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 hidden sm:block">Login</button>
          <button onClick={() => { setView('signup'); setIsLanding(false); }} className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-6 py-2.5 rounded-full text-sm font-semibold shadow-md hover:opacity-90 transition-all active:scale-95">Get Started</button>
        </div>
      </nav>

      <section className="pt-40 pb-24 px-6 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-full text-indigo-600 dark:text-indigo-400 text-xs font-bold mb-8">
          <Sparkles size={14} />
          The Modern Way to Track Attendance
        </div>
        <h1 className="text-6xl md:text-8xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mb-8">
          Take roll without<br /><span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-600">the headache.</span>
        </h1>
        <p className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
          No more paper sheets. No more calling names. Scan, check in, and get beautiful reports in seconds. Built for students and teachers.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
          <button onClick={() => { setSelectedRole(Role.LECTURER); setView('signup'); setIsLanding(false); }} className="w-full sm:w-auto px-10 py-5 bg-indigo-600 text-white rounded-full font-bold text-lg flex items-center justify-center gap-2 shadow-xl shadow-indigo-200 dark:shadow-none hover:translate-y-[-2px] transition-all">
            I'm a Teacher <ChevronRight size={20} />
          </button>
          <button onClick={() => { setSelectedRole(Role.STUDENT); setView('signup'); setIsLanding(false); }} className="w-full sm:w-auto px-10 py-5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-slate-100 dark:border-slate-800 rounded-full font-bold text-lg flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
            I'm a Student
          </button>
        </div>
      </section>

      <section className="py-24 px-6 border-t border-slate-50 dark:border-slate-900">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            { icon: <Zap className="text-amber-500" />, title: "Instant Check-in", desc: "Students just scan the code on their screen and they're done. Fast and easy." },
            { icon: <BarChart4 className="text-blue-500" />, title: "Live Insights", desc: "See who's in class in real-time. Spot trends and low attendance automatically." },
            { icon: <ShieldCheck className="text-green-500" />, title: "Secure & Verified", desc: "Dynamic QR codes prevent cheating. Secure ID scanning keeps everything official." }
          ].map((feature, i) => (
            <div key={i} className="text-left group p-2">
              <div className="w-14 h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">{feature.icon}</div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{feature.title}</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="py-16 px-6 border-t border-slate-50 dark:border-slate-900 text-center">
        <p className="text-slate-400 dark:text-slate-600 font-semibold text-sm">Made with <Heart size={14} className="inline text-red-400" /> for the classroom. © 2025 AttendEase Platform.</p>
      </footer>
    </div>
  );

  const renderWidget = (widgetId: string) => {
    if (!user) return null;
    switch (widgetId) {
      case 'stats':
        return (
          <div key="stats" className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
               <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">My Classes</p>
               <p className="text-4xl font-extrabold text-slate-900 dark:text-white">{courses.length}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
               <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Total Students</p>
               <p className="text-4xl font-extrabold text-indigo-600 dark:text-indigo-400">{allStudents.length}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
               <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Daily Presence</p>
               <div className="flex items-center gap-2">
                 <p className="text-4xl font-extrabold text-green-600">92%</p>
                 <TrendingUp size={20} className="text-green-500" />
               </div>
            </div>
          </div>
        );
      case 'trends':
        const chartData = courses.map(c => ({
          name: c.code,
          attendance: records.filter(r => r.courseId === c.id && r.status === 'present').length
        }));
        return (
          <div key="trends" className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white text-xl mb-8 flex items-center gap-2">Participation Graph</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                  <XAxis dataKey="name" fontSize={12} fontWeight="600" tickLine={false} axisLine={false} stroke="#64748b" />
                  <YAxis fontSize={12} fontWeight="600" tickLine={false} axisLine={false} stroke="#64748b" />
                  <Tooltip 
                    cursor={{ fill: theme === 'dark' ? '#0f172a' : '#f8fafc' }} 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: theme === 'dark' ? '#1e293b' : '#fff' }} 
                  />
                  <Bar dataKey="attendance" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      case 'courses':
        return (
          <div key="courses" className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20">
              <h3 className="font-bold text-slate-900 dark:text-white text-xl">My Courses</h3>
              <button className="text-indigo-600 hover:text-indigo-700 transition-colors"><Plus size={24} /></button>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-slate-800">
              {courses.map(course => (
                <div key={course.id} className="p-8 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-5 w-full sm:w-auto">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                      <BookOpen size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-lg">{course.code}: {course.name}</p>
                      <p className="text-sm text-slate-400 font-medium">Click to start tracking</p>
                    </div>
                  </div>
                  <button onClick={() => startSession(course)} className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 text-white rounded-full text-sm font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100 dark:shadow-none">Start Class</button>
                </div>
              ))}
            </div>
          </div>
        );
      case 'log':
        if (!selectedCourse || !activeSession) return null;
        return (
          <div key="log" className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex flex-col lg:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-xl">Current Session: {selectedCourse.code}</h3>
                <p className="text-sm text-slate-400 font-medium">Tracking students in real-time</p>
              </div>
              <div className="relative flex-1 lg:max-w-xs">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input type="text" placeholder="Find a student..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-6 py-3 rounded-full border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-400 uppercase text-[10px] font-bold tracking-widest border-b border-slate-50 dark:border-slate-800">
                  <tr><th className="px-8 py-5">Student</th><th className="px-8 py-5">Status</th><th className="px-8 py-5 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {allStudents.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(student => {
                    const record = records.find(r => r.studentId === (student.studentId || student.email) && r.sessionId === activeSession.id);
                    return (
                      <tr key={student.id} className="group transition-colors">
                        <td className="px-8 py-6">
                          <p className="font-bold text-slate-900 dark:text-white">{student.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{student.studentId || student.email}</p>
                        </td>
                        <td className="px-8 py-6">
                          {record ? (
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${record.status === 'present' ? 'bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400' : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'}`}>
                              {record.status}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-300 dark:text-slate-700 italic font-bold">Waiting...</span>
                          )}
                        </td>
                        <td className="px-8 py-6 text-right opacity-0 group-hover:opacity-100 transition-all">
                          <div className="flex justify-end gap-3">
                            <button onClick={() => handleMarkStatus(student, 'present')} className="p-2.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 rounded-full transition-all"><UserCheck size={20} /></button>
                            <button onClick={() => handleMarkStatus(student, 'absent')} className="p-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full transition-all"><UserX size={20} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      default: return null;
    }
  };

  if (isLanding) return <LandingPage />;

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 md:p-12 relative transition-colors duration-300">
        <button onClick={() => setIsLanding(true)} className="absolute top-10 left-10 flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-bold text-sm transition-colors"><ArrowLeft size={18} /> Home</button>
        <div className="absolute top-10 right-10 flex gap-4">
          <button onClick={toggleTheme} className="p-3 rounded-full bg-white dark:bg-slate-900 text-slate-500 border border-slate-100 dark:border-slate-800 shadow-sm transition-all">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
        {isIdScannerOpen && <IDScanner onCancel={() => setIsIdScannerOpen(false)} onExtracted={(details) => { setSignupForm(prev => ({ ...prev, name: details.name, studentId: details.studentId })); setIsIdScannerOpen(false); addNotification('success', 'Smart Scan Complete', `Verified ${details.name}`); }} />}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-10 md:p-16 w-full max-w-xl border border-slate-50 dark:border-slate-800">
           <div className="text-center mb-12">
             <div className="inline-flex bg-indigo-600 p-4 rounded-3xl mb-8 shadow-xl shadow-indigo-200 dark:shadow-none"><CheckCircle2 className="w-10 h-10 text-white" /></div>
             <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">Welcome Back</h1>
             <p className="text-slate-400 font-medium">Log in to your AttendEase account</p>
           </div>
           
           {view === 'role-select' ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-5">
                  <button onClick={() => { setSelectedRole(Role.LECTURER); setView('login'); }} className="group w-full bg-slate-50 dark:bg-slate-950/50 hover:bg-white dark:hover:bg-slate-800 py-8 px-10 rounded-[2rem] border-2 border-transparent hover:border-indigo-600 transition-all flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-6 text-left">
                      <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all"><ShieldCheck size={32} /></div>
                      <div><span className="text-xl font-bold block dark:text-white">I'm a Teacher</span><span className="text-sm text-slate-400 font-medium">Manage classes & roll</span></div>
                    </div>
                  </button>
                  <button onClick={() => { setSelectedRole(Role.STUDENT); setView('login'); }} className="group w-full bg-slate-50 dark:bg-slate-950/50 hover:bg-white dark:hover:bg-slate-800 py-8 px-10 rounded-[2rem] border-2 border-transparent hover:border-indigo-600 transition-all flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-6 text-left">
                      <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all"><GraduationCap size={32} /></div>
                      <div><span className="text-xl font-bold block dark:text-white">I'm a Student</span><span className="text-sm text-slate-400 font-medium">Check into class</span></div>
                    </div>
                  </button>
                </div>
                <div className="text-center pt-4">
                  <button onClick={() => setView('signup')} className="text-indigo-600 dark:text-indigo-400 font-bold text-sm hover:underline transition-all">Create a new account</button>
                </div>
              </div>
           ) : view === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="flex items-center gap-2 mb-8 cursor-pointer text-slate-400 hover:text-indigo-600 transition-colors" onClick={() => setView('role-select')}>
                  <ArrowLeft size={16} /><span className="text-xs font-bold uppercase tracking-wider">Back</span>
                </div>
                <div className="space-y-5">
                  <div className="relative">
                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                    <input type="text" required placeholder="Email or Student ID" className="w-full pl-16 pr-8 py-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border-none dark:text-white focus:ring-2 focus:ring-indigo-600 outline-none font-medium" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                    <input type="password" required placeholder="Password" className="w-full pl-16 pr-8 py-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border-none dark:text-white focus:ring-2 focus:ring-indigo-600 outline-none font-medium" />
                  </div>
                </div>
                <button type="submit" className="w-full bg-slate-900 dark:bg-indigo-600 text-white font-bold py-5 rounded-2xl shadow-xl hover:opacity-90 transition-all active:scale-95">Sign In</button>
              </form>
           ) : (
              <form onSubmit={handleSignup} className="space-y-6">
                <div className="flex items-center gap-2 mb-8 cursor-pointer text-slate-400 hover:text-indigo-600 transition-colors" onClick={() => setView('role-select')}>
                  <ArrowLeft size={16} /><span className="text-xs font-bold uppercase tracking-wider">Back</span>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <div className="grid grid-cols-2 gap-4">
                    <button type="button" onClick={() => setSignupForm({...signupForm, role: Role.STUDENT})} className={`py-4 rounded-2xl border-2 font-bold transition-all ${signupForm.role === Role.STUDENT ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-950 border-transparent text-slate-400'}`}>Student</button>
                    <button type="button" onClick={() => setSignupForm({...signupForm, role: Role.LECTURER})} className={`py-4 rounded-2xl border-2 font-bold transition-all ${signupForm.role === Role.LECTURER ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-950 border-transparent text-slate-400'}`}>Teacher</button>
                  </div>
                  
                  {signupForm.role === Role.STUDENT && (
                    <button type="button" onClick={() => setIsIdScannerOpen(true)} className="w-full flex items-center justify-center gap-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-2 border-indigo-100 dark:border-indigo-900/50 border-dashed py-5 rounded-2xl font-bold hover:bg-indigo-100 transition-all">
                      <ScanLine size={20} /> Quick Scan my ID Card
                    </button>
                  )}
                  
                  <input type="text" required placeholder="Full Name" className="w-full px-8 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border-none dark:text-white focus:ring-2 focus:ring-indigo-600 outline-none font-medium" value={signupForm.name} onChange={e => setSignupForm({...signupForm, name: e.target.value})} />
                  <input type="email" required placeholder="School Email" className="w-full px-8 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border-none dark:text-white focus:ring-2 focus:ring-indigo-600 outline-none font-medium" value={signupForm.email} onChange={e => setSignupForm({...signupForm, email: e.target.value})} />
                  
                  {signupForm.role === Role.STUDENT && (
                    <input type="text" required placeholder="Student ID Number" className="w-full px-8 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border-none dark:text-white focus:ring-2 focus:ring-indigo-600 outline-none font-medium" value={signupForm.studentId} onChange={e => setSignupForm({...signupForm, studentId: e.target.value})} />
                  )}
                </div>
                <button type="submit" className="w-full bg-slate-900 dark:bg-indigo-600 text-white font-bold py-5 rounded-2xl shadow-xl hover:opacity-90 transition-all active:scale-95">Create Account</button>
              </form>
           )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <div className="fixed top-6 right-6 z-[999] flex flex-col gap-4 w-full max-w-sm pointer-events-none">
        {notifications.map(notif => (
          <div key={notif.id} className={`pointer-events-auto p-6 rounded-3xl shadow-2xl border border-white/20 backdrop-blur-xl flex items-start gap-4 animate-in slide-in-from-right-full duration-300 ${notif.type === 'success' ? 'bg-green-600/90 text-white' : notif.type === 'error' ? 'bg-red-600/90 text-white' : notif.type === 'warning' ? 'bg-amber-500/90 text-white' : 'bg-slate-900/90 text-white'}`}>
            <div className="shrink-0 mt-1">{notif.type === 'success' ? <CheckCircle size={24} /> : notif.type === 'error' ? <AlertTriangle size={24} /> : <Info size={24} />}</div>
            <div className="flex-1"><h4 className="font-bold text-sm leading-tight">{notif.message}</h4>{notif.description && <p className="text-xs opacity-90 mt-1">{notif.description}</p>}</div>
            <button onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))} className="shrink-0 opacity-50"><X size={18} /></button>
          </div>
        ))}
      </div>

      <aside className={`${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:sticky top-0 left-0 z-50 md:z-auto w-72 h-full md:h-screen bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 transition-transform duration-300 flex flex-col shadow-2xl md:shadow-none`}>
        <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-1.5 rounded-xl"><CheckCircle2 className="text-white w-6 h-6" /></div>
          <span className="font-bold text-xl text-slate-900 dark:text-white tracking-tight">AttendEase</span>
        </div>
        <nav className="flex-1 p-6 space-y-2">
          <button onClick={() => { setActiveTab('overview'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-4 w-full p-4 rounded-2xl font-bold transition-all ${activeTab === 'overview' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
            <LayoutDashboard size={20} /> Dashboard
          </button>
          {user.role === Role.LECTURER && (
            <>
              <button onClick={() => { setActiveTab('students'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-4 w-full p-4 rounded-2xl font-bold transition-all ${activeTab === 'students' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                <Users size={20} /> Students
              </button>
              <button onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-4 w-full p-4 rounded-2xl font-bold transition-all ${activeTab === 'settings' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                <Sliders size={20} /> Class Settings
              </button>
            </>
          )}
        </nav>
        <div className="p-6 border-t border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 flex flex-col gap-2">
          <button onClick={toggleTheme} className="flex items-center gap-4 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 p-4 w-full rounded-2xl font-bold transition-all">
            {theme === 'light' ? <><Moon size={20} /> Dark Theme</> : <><Sun size={20} /> Light Theme</>}
          </button>
          <button onClick={() => { setUser(null); setIsLanding(true); }} className="flex items-center gap-4 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 p-4 w-full rounded-2xl font-bold transition-all">
            <LogOut size={20} /> Log Out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-12 lg:p-16 overflow-y-auto w-full max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-8">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {activeTab === 'overview' ? 'My Dashboard' : activeTab === 'students' ? 'Student Roster' : 'Class Settings'}
            </h1>
            <p className="text-slate-400 font-semibold mt-1">Logged in as <span className="text-indigo-600 dark:text-indigo-400">{user.name}</span></p>
          </div>
          <div className="flex items-center gap-4">
             <div className="bg-white dark:bg-slate-900 px-6 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-3 shadow-sm">
               <Calendar size={18} className="text-indigo-600" />
               {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
             </div>
          </div>
        </header>

        {activeTab === 'overview' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8 space-y-10">
              {user.role === Role.LECTURER ? widgets.map(w => w.visible ? renderWidget(w.id) : null) : (
                <div className="space-y-10">
                  <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-12 md:p-20 shadow-2xl border border-slate-100 dark:border-slate-800 text-center relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 w-80 h-80 bg-indigo-50 dark:bg-indigo-950/20 rounded-full opacity-30 blur-3xl"></div>
                    {lastScannedCourse ? (
                      <div className="animate-in zoom-in fade-in duration-500 p-10 bg-green-50 dark:bg-green-950/20 rounded-3xl">
                        <CheckCircle className="w-20 h-20 text-green-500 dark:text-green-400 mx-auto mb-6" />
                        <h3 className="text-3xl font-extrabold text-green-900 dark:text-green-400 mb-2">Checked In!</h3>
                        <p className="text-green-700 dark:text-green-300 font-bold text-lg">Your attendance for {lastScannedCourse} has been recorded.</p>
                        <button onClick={() => setLastScannedCourse(null)} className="mt-10 px-10 py-4 bg-green-600 text-white rounded-full font-bold shadow-lg hover:bg-green-700 transition-all">Done</button>
                      </div>
                    ) : (
                      <div className="relative z-10">
                        <div className="w-28 h-28 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 text-white shadow-xl shadow-indigo-100 dark:shadow-none">
                          <ScanLine size={56} />
                        </div>
                        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">Check into Class</h2>
                        <p className="text-lg text-slate-400 mb-12 font-medium max-w-sm mx-auto">Open the camera and scan the code shown on your teacher's screen.</p>
                        <QRScanner onScan={handleScan} />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="lg:col-span-4 space-y-10">
              {activeSession && selectedCourse && (
                <div className="sticky top-24">
                  <QRCodeGenerator 
                    key={activeSession.id}
                    sessionId={activeSession.id} 
                    courseId={activeSession.courseId} 
                    token={activeSession.qrToken} 
                    expiresAt={activeSession.expiresAt}
                    refreshFrequency={selectedCourse.qrRefreshFrequencySeconds}
                  />
                </div>
              )}
              {reportData && (
                <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl border border-indigo-50 dark:border-slate-800">
                  <div className="flex justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="bg-indigo-50 dark:bg-indigo-950/30 p-3 rounded-2xl"><Sparkles size={28} className="text-indigo-600" /></div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-xl">Smart Insights</h3>
                    </div>
                    <button onClick={() => setReportData(null)} className="text-slate-300 hover:text-slate-500"><X size={24} /></button>
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 text-sm space-y-5 whitespace-pre-line overflow-y-auto max-h-[500px] pr-4 custom-scrollbar custom-markdown font-medium">
                    {reportData}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'students' ? (
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in duration-500">
            <div className="p-10 border-b border-slate-50 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-800/30 flex flex-col md:flex-row items-center justify-between gap-8">
              <div>
                <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Class Roster</h2>
                <p className="text-slate-400 font-bold text-sm">Monitor participation and attendance trends.</p>
              </div>
              <button disabled={isProcessing} onClick={handleGenerateReport} className="px-8 py-4 bg-indigo-600 text-white rounded-full text-sm font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-100 dark:shadow-none transition-all flex items-center gap-3">
                <Zap size={20} /> {isProcessing ? 'Generating...' : 'Get Class Insights'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-400 uppercase text-[10px] font-bold tracking-[0.2em] border-b border-slate-50 dark:border-slate-800">
                  <tr><th className="px-10 py-6">Student Name</th><th className="px-10 py-6">Attendance Rate</th><th className="px-10 py-6">Last Check-in</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {studentStats.map(student => (
                    <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-10 py-8 font-bold text-slate-900 dark:text-white text-lg">{student.name}</td>
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-4">
                          <div className="flex-1 h-2.5 w-32 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-1000 ${student.presenceRate > 75 ? 'bg-green-500' : student.presenceRate > 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${student.presenceRate}%` }}></div>
                          </div>
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{student.presenceRate}%</span>
                        </div>
                      </td>
                      <td className="px-10 py-8 text-sm text-slate-400 font-bold">
                        {student.lastSeen ? new Date(student.lastSeen).toLocaleDateString() : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-10 animate-in fade-in duration-500">
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-10 rounded-[2rem] border border-slate-100 dark:border-slate-800">
               <div>
                  <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">Account Control</h3>
                  <p className="text-slate-400 font-bold">Manage your portal preferences.</p>
               </div>
               <button onClick={() => storageService.resetAll()} className="flex items-center gap-3 px-8 py-4 bg-red-50 text-red-600 rounded-full text-sm font-bold hover:bg-red-100 transition-all">
                  <RotateCcw size={18} /> Wipe My Data
               </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {courses.map(course => (
                <div key={course.id} className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center gap-5 mb-10">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                      <Settings size={24} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">{course.code}</h3>
                      <p className="text-xs text-slate-400 font-bold">Check-in Settings</p>
                    </div>
                  </div>
                  
                  <div className="space-y-8">
                    <div>
                      <div className="flex justify-between mb-3">
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Code Expiry</label>
                        <span className="text-xs font-bold text-indigo-600">{course.qrExpirationMinutes}m</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="60" 
                        value={course.qrExpirationMinutes} 
                        onChange={(e) => updateCourseSettings(course.id, { qrExpirationMinutes: parseInt(e.target.value) })}
                        className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between mb-3">
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Refresh Speed</label>
                        <span className="text-xs font-bold text-indigo-600">{course.qrRefreshFrequencySeconds}s</span>
                      </div>
                      <input 
                        type="range" 
                        min="5" 
                        max="300" 
                        step="5"
                        value={course.qrRefreshFrequencySeconds} 
                        onChange={(e) => updateCourseSettings(course.id, { qrRefreshFrequencySeconds: parseInt(e.target.value) })}
                        className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-10 bg-indigo-50 dark:bg-indigo-950/20 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-900/40">
               <div className="flex items-start gap-6">
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-sm"><Info size={28} className="text-indigo-600" /></div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 dark:text-white mb-2 text-xl tracking-tight">How our platform stays secure</h4>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                      AttendEase uses dynamic QR codes that refresh automatically. This means students can't just snap a photo and send it to their friends at home. The code is only valid for a few seconds, ensuring everyone is actually in the room. All your preferences are saved locally to this browser.
                    </p>
                  </div>
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
