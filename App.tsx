
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
  Activity
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: 'stats', label: 'Attendance Metrics', visible: true },
  { id: 'trends', label: 'Participation Trends', visible: true },
  { id: 'courses', label: 'Assigned Courses', visible: true },
  { id: 'log', label: 'Live Session Monitor', visible: true },
];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>(storageService.getUsers());
  const [records, setRecords] = useState<AttendanceRecord[]>(storageService.getRecords());
  const [widgets, setWidgets] = useState<DashboardWidget[]>(DEFAULT_WIDGETS);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  
  const [isLanding, setIsLanding] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'database'>('overview');
  const [view, setView] = useState<'role-select' | 'login' | 'signup'>('role-select');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [reportData, setReportData] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isIdScannerOpen, setIsIdScannerOpen] = useState(false);
  const [lastScannedCourse, setLastScannedCourse] = useState<string | null>(null);

  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [signupForm, setSignupForm] = useState({ name: '', email: '', role: Role.STUDENT, studentId: '' });

  // Synchronization
  useEffect(() => { storageService.saveUsers(allUsers); }, [allUsers]);
  useEffect(() => { storageService.saveRecords(records); }, [records]);
  useEffect(() => { storageService.saveWidgets(widgets); }, [widgets]);

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
        addNotification('error', 'Auth Error', `Account role mismatch.`);
        return;
      }
      setUser(foundUser);
      setIsLanding(false);
      addNotification('success', 'Access Granted', `Identity verified: ${foundUser.name}`);
    } else {
      addNotification('error', 'Authentication Failed', "Account not recognized.");
    }
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupForm.name || !signupForm.email) return addNotification('warning', 'Incomplete', 'All fields are mandatory.');
    if (allUsers.some(u => u.email.toLowerCase() === signupForm.email.toLowerCase())) return addNotification('error', 'Account Exists', 'Credentials already in use.');

    const newUser: User = { id: `u-${Date.now()}`, ...signupForm, studentId: signupForm.role === Role.STUDENT ? signupForm.studentId : undefined };
    setAllUsers(prev => [...prev, newUser]);
    setUser(newUser);
    setIsLanding(false);
    addNotification('success', 'Profile Created', 'Your registration is complete.');
  };

  const startSession = (course: Course) => {
    const newSession: AttendanceSession = { id: `session-${Date.now()}`, courseId: course.id, startTime: new Date().toISOString(), qrToken: Math.random().toString(36).substring(7) };
    setActiveSession(newSession);
    setSelectedCourse(course);
    addNotification('info', 'System Active', `${course.code} session is live.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScan = useCallback((data: string) => {
    try {
      if (!user || user.role !== Role.STUDENT) return addNotification('error', 'Invalid Access', 'Portal restricted.');
      const parsed = JSON.parse(data);
      const studentId = user.studentId || user.email;
      if (records.some(r => r.studentId === studentId && r.sessionId === parsed.sessionId)) return addNotification('warning', 'Already Logged', 'Entry recorded.');

      const course = MOCK_COURSES.find(c => c.id === parsed.courseId);
      const courseName = course ? `${course.code}: ${course.name}` : 'Class';

      const newRecord: AttendanceRecord = { id: `rec-${Date.now()}`, courseId: parsed.courseId, studentId, studentName: user.name, timestamp: new Date().toISOString(), sessionId: parsed.sessionId, status: 'present' };
      setRecords(prev => [...prev, newRecord]);
      setLastScannedCourse(courseName);
      addNotification('success', 'Attendance Verified', courseName);
    } catch (e) { addNotification('error', 'Scan Error', 'Data format not recognized.'); }
  }, [user, records, addNotification]);

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
    addNotification('info', 'Status Overridden', `${student.name}: ${status}`);
  };

  const handleGenerateReport = async () => {
    if (!selectedCourse) return;
    setIsProcessing(true);
    addNotification('info', 'Generating Report', 'Parsing participation data...');
    const result = await generatePerformanceReport(records.filter(r => r.courseId === selectedCourse.id), selectedCourse.name);
    setReportData(result);
    setIsProcessing(false);
    addNotification('success', 'Audit Complete', 'Insights generated successfully.');
  };

  const allStudents = useMemo(() => allUsers.filter(u => u.role === Role.STUDENT), [allUsers]);
  const studentStats = useMemo(() => allStudents.map(student => {
    const sRecords = records.filter(r => r.studentId === (student.studentId || student.email));
    return { ...student, presenceRate: sRecords.length > 0 ? Math.round((sRecords.filter(r => r.status === 'present').length / sRecords.length) * 100) : 0, lastSeen: sRecords.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]?.timestamp };
  }), [allStudents, records]);

  // UI Components
  const LandingPage = () => (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-100">
            <CheckCircle2 className="text-white w-5 h-5" />
          </div>
          <span className="font-black text-xl text-gray-900 tracking-tighter">SmartAttend</span>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => { setView('login'); setIsLanding(false); }} className="text-sm font-bold text-gray-500 hover:text-indigo-600 transition-colors hidden sm:block">Log In</button>
          <button onClick={() => { setView('signup'); setIsLanding(false); }} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">Launch Portal</button>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-6 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full text-indigo-600 text-[10px] font-black uppercase tracking-widest mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Activity size={12} className="text-indigo-600" />
          Advanced Attendance Logic
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tighter leading-none mb-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
          High-precision tracking<br /><span className="text-indigo-600">for modern institutions.</span>
        </h1>
        <p className="text-xl text-gray-400 font-medium max-w-2xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-12 duration-1000">
          Automate classroom logbooks, process credentials via OCR, and generate deep performance audits with our proprietary analytics engine.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-16 duration-1000">
          <button onClick={() => { setSelectedRole(Role.LECTURER); setView('signup'); setIsLanding(false); }} className="w-full sm:w-auto px-8 py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-2xl shadow-indigo-200 hover:-translate-y-1 transition-all">
            Lecturer Portal <ChevronRight size={20} />
          </button>
          <button onClick={() => { setSelectedRole(Role.STUDENT); setView('signup'); setIsLanding(false); }} className="w-full sm:w-auto px-8 py-5 bg-white text-gray-900 border-2 border-gray-100 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-gray-50 transition-all">
            Student Portal
          </button>
        </div>
      </section>

      <section className="bg-gray-50 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { icon: <ScanLine className="text-blue-600" />, title: "Precision Scanning", desc: "Reliable QR recognition optimized for any lighting condition or device." },
              { icon: <BarChart4 className="text-purple-600" />, title: "Strategic Audit Reports", desc: "Our system identifies participation irregularities and attendance risks automatically." },
              { icon: <Shield className="text-green-600" />, title: "Automated OCR Sync", desc: "Securely scan student credentials to eliminate manual database entry errors." }
            ].map((f, i) => (
              <div key={i} className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-indigo-50 transition-all group">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">{f.icon}</div>
                <h3 className="text-2xl font-black text-gray-900 mb-4">{f.title}</h3>
                <p className="text-gray-400 font-bold leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-12 px-6 border-t border-gray-50 text-center">
        <p className="text-gray-400 font-bold text-sm">© 2025 SmartAttend. Advanced Institutional Logic.</p>
      </footer>
    </div>
  );

  const renderWidget = (widgetId: string) => {
    if (!user) return null;
    switch (widgetId) {
      case 'stats':
        return (
          <div key="stats" className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
               <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Database Size</p>
               <p className="text-3xl font-black text-gray-900 mt-2">{MOCK_COURSES.length} Modules</p>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
               <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Registry Count</p>
               <p className="text-3xl font-black text-indigo-600 mt-2">{allStudents.length} Students</p>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
               <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Reliability Index</p>
               <div className="flex items-end gap-2 mt-2">
                 <p className="text-3xl font-black text-green-600">92%</p>
                 <TrendingUp size={20} className="text-green-500 mb-1" />
               </div>
            </div>
          </div>
        );
      case 'trends':
        const chartData = MOCK_COURSES.map(c => ({
          name: c.code,
          attendance: records.filter(r => r.courseId === c.id && r.status === 'present').length
        }));
        return (
          <div key="trends" className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="font-black text-gray-900 mb-6 flex items-center gap-2">Participation Metrics</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="attendance" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      case 'courses':
        return (
          <div key="courses" className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-black text-gray-900">Module Management</h3>
              <Plus size={20} className="text-indigo-600 cursor-pointer" />
            </div>
            <div className="divide-y divide-gray-100">
              {MOCK_COURSES.map(course => (
                <div key={course.id} className="p-6 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-100">
                      <BookOpen size={20} />
                    </div>
                    <div><p className="font-black text-gray-900">{course.code}: {course.name}</p><p className="text-xs text-gray-400 font-bold">Monitor logs & registry</p></div>
                  </div>
                  <button onClick={() => startSession(course)} className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95">Open Session</button>
                </div>
              ))}
            </div>
          </div>
        );
      case 'log':
        if (!selectedCourse || !activeSession) return null;
        return (
          <div key="log" className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex flex-col lg:flex-row items-center justify-between gap-4">
              <div><h3 className="font-black text-gray-900">Module Monitor: {selectedCourse.code}</h3><p className="text-xs text-gray-400 font-bold">Real-time participation log</p></div>
              <div className="relative flex-1 lg:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} /><input type="text" placeholder="Filter registry..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
            </div>
            <div className="overflow-x-auto"><table className="w-full text-left">
              <thead className="bg-gray-50/50 text-gray-400 uppercase text-[10px] font-bold tracking-widest border-b border-gray-100"><tr><th className="px-6 py-4">Identity</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Manual Action</th></tr></thead>
              <tbody className="divide-y divide-gray-100">{allStudents.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(student => {
                const record = records.find(r => r.studentId === (student.studentId || student.email) && r.sessionId === activeSession.id);
                return (
                  <tr key={student.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-5"><p className="font-black text-gray-900 text-sm">{student.name}</p><p className="text-[10px] text-gray-400">{student.studentId || student.email}</p></td>
                    <td className="px-6 py-5">{record ? <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${record.status === 'present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{record.status}</span> : <span className="text-[10px] text-gray-300 italic">No entry</span>}</td>
                    <td className="px-6 py-5 text-right opacity-0 group-hover:opacity-100 transition-all"><div className="flex justify-end gap-2"><button onClick={() => handleMarkStatus(student, 'present')} className="p-2 text-green-600 hover:bg-green-50 rounded-xl"><UserCheck size={18} /></button><button onClick={() => handleMarkStatus(student, 'absent')} className="p-2 text-red-600 hover:bg-red-50 rounded-xl"><UserX size={18} /></button></div></td>
                  </tr>
                );
              })}</tbody>
            </table></div>
          </div>
        );
      default: return null;
    }
  };

  if (isLanding) return <LandingPage />;

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 md:p-8 relative">
        <button onClick={() => setIsLanding(true)} className="absolute top-8 left-8 flex items-center gap-2 text-gray-400 hover:text-indigo-600 font-black text-xs uppercase tracking-widest transition-colors"><ArrowLeft size={16} /> Exit to Site</button>
        {isIdScannerOpen && <IDScanner onCancel={() => setIsIdScannerOpen(false)} onExtracted={(details) => { setSignupForm(prev => ({ ...prev, name: details.name, studentId: details.studentId })); setIsIdScannerOpen(false); addNotification('success', 'Profile Synced', details.name); }} />}
        <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-14 w-full max-w-lg border border-gray-100">
           <div className="text-center mb-10"><div className="inline-flex bg-gradient-to-tr from-indigo-600 to-purple-600 w-20 h-20 rounded-3xl items-center justify-center mb-6 shadow-2xl shadow-indigo-200 rotate-3"><CheckCircle2 className="w-10 h-10 text-white" /></div><h1 className="text-4xl font-black text-gray-900 tracking-tighter mb-2">SmartAttend</h1><p className="text-gray-400 font-bold text-sm">Institutional Enrollment Portal.</p></div>
           {view === 'role-select' ? (
              <div className="space-y-6"><div className="grid grid-cols-1 gap-4"><button onClick={() => { setSelectedRole(Role.LECTURER); setView('login'); }} className="group w-full bg-white border-2 border-gray-100 hover:border-indigo-600 py-6 px-8 rounded-3xl transition-all flex items-center justify-between shadow-sm"><div className="flex items-center gap-5 text-left"><div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all"><ShieldCheck size={28} /></div><div><span className="text-lg font-black block">Staff Access</span><span className="text-xs text-gray-400 font-bold">Administer modules</span></div></div></button><button onClick={() => { setSelectedRole(Role.STUDENT); setView('login'); }} className="group w-full bg-white border-2 border-gray-100 hover:border-purple-600 py-6 px-8 rounded-3xl transition-all flex items-center justify-between shadow-sm"><div className="flex items-center gap-5 text-left"><div className="p-3 bg-purple-50 rounded-2xl text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all"><GraduationCap size={28} /></div><div><span className="text-lg font-black block">Student Access</span><span className="text-xs text-gray-400 font-bold">Entry scanner</span></div></div></button></div><div className="text-center pt-4"><button onClick={() => setView('signup')} className="text-indigo-600 font-black text-sm hover:underline">Enrollment</button></div></div>
           ) : view === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-6"><div className="flex items-center gap-2 mb-6 cursor-pointer text-gray-400 hover:text-indigo-600 transition-colors" onClick={() => setView('role-select')}><ArrowLeft size={16} /><span className="text-xs font-black uppercase tracking-widest">Back</span></div><div className="space-y-4"><div className="relative"><Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} /><input type="text" required placeholder={selectedRole === Role.STUDENT ? "ID / Email" : "Institutional Email"} className="w-full pl-14 pr-6 py-5 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-indigo-600 outline-none font-bold" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} /></div><div className="relative"><Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} /><input type="password" required placeholder="PIN / Password" className="w-full pl-14 pr-6 py-5 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-indigo-600 outline-none font-bold" /></div></div><button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95">Verify Identity</button></form>
           ) : (
              <form onSubmit={handleSignup} className="space-y-6"><div className="flex items-center gap-2 mb-4 cursor-pointer text-gray-400 hover:text-indigo-600 transition-colors" onClick={() => setView('role-select')}><ArrowLeft size={16} /><span className="text-xs font-black uppercase tracking-widest">Back</span></div><div className="grid grid-cols-1 gap-5"><div className="grid grid-cols-2 gap-3"><button type="button" onClick={() => setSignupForm({...signupForm, role: Role.STUDENT})} className={`py-4 rounded-2xl border-2 font-black transition-all ${signupForm.role === Role.STUDENT ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-50 text-gray-400'}`}>Student</button><button type="button" onClick={() => setSignupForm({...signupForm, role: Role.LECTURER})} className={`py-4 rounded-2xl border-2 font-black transition-all ${signupForm.role === Role.LECTURER ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-50 text-gray-400'}`}>Staff</button></div>{signupForm.role === Role.STUDENT && <button type="button" onClick={() => setIsIdScannerOpen(true)} className="w-full flex items-center justify-center gap-3 bg-indigo-50 text-indigo-700 border-2 border-indigo-100 border-dashed py-5 rounded-2xl font-black group hover:bg-indigo-100 transition-all"><ScanLine />Sync Identity Card</button>}<input type="text" required placeholder="Full Name" className="w-full px-6 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-indigo-600 outline-none font-bold" value={signupForm.name} onChange={e => setSignupForm({...signupForm, name: e.target.value})} /><input type="email" required placeholder="Academic Email" className="w-full px-6 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-indigo-600 outline-none font-bold" value={signupForm.email} onChange={e => setSignupForm({...signupForm, email: e.target.value})} />{signupForm.role === Role.STUDENT && <input type="text" required placeholder="Enrollment ID" className="w-full px-6 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-indigo-600 outline-none font-bold" value={signupForm.studentId} onChange={e => setSignupForm({...signupForm, studentId: e.target.value})} />}</div><button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95">Enroll Now</button></form>
           )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      <div className="fixed top-6 right-6 z-[999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        {notifications.map(notif => (
          <div key={notif.id} className={`pointer-events-auto p-5 rounded-2xl shadow-2xl border border-white/20 backdrop-blur-xl flex items-start gap-4 animate-in slide-in-from-right-full duration-300 ${notif.type === 'success' ? 'bg-green-600/90 text-white' : notif.type === 'error' ? 'bg-red-600/90 text-white' : notif.type === 'warning' ? 'bg-amber-500/90 text-white' : 'bg-indigo-600/90 text-white'}`}>
            <div className="shrink-0 mt-1">{notif.type === 'success' ? <CheckCircle size={24} /> : notif.type === 'error' ? <AlertTriangle size={24} /> : <Info size={24} />}</div>
            <div className="flex-1"><h4 className="font-black text-sm">{notif.message}</h4>{notif.description && <p className="text-xs opacity-80 mt-1">{notif.description}</p>}</div>
            <button onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))} className="shrink-0 opacity-50"><X size={16} /></button>
          </div>
        ))}
      </div>

      <aside className={`${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:sticky top-0 left-0 z-50 md:z-auto w-80 h-full md:h-screen bg-white border-r border-gray-100 transition-transform duration-300 flex flex-col shadow-2xl md:shadow-none`}>
        <div className="p-10 border-b border-gray-50 hidden md:flex items-center gap-4"><div className="bg-indigo-600 p-2 rounded-2xl"><CheckCircle2 className="text-white w-7 h-7" /></div><span className="font-black text-2xl text-gray-900 tracking-tighter">SmartAttend</span></div>
        <nav className="flex-1 p-8 space-y-3">
          <button onClick={() => { setActiveTab('overview'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-4 w-full p-4 rounded-2xl font-black transition-all ${activeTab === 'overview' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-400 hover:bg-gray-50'}`}><LayoutDashboard size={22} />Portal Hub</button>
          {user.role === Role.LECTURER && <button onClick={() => { setActiveTab('database'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-4 w-full p-4 rounded-2xl font-black transition-all ${activeTab === 'database' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-400 hover:bg-gray-50'}`}><Database size={22} />Identity Registry</button>}
        </nav>
        <div className="p-8 border-t border-gray-50 bg-gray-50/50">
          <button onClick={() => { setUser(null); setIsLanding(true); }} className="flex items-center gap-3 text-red-500 hover:bg-red-50 p-4 w-full rounded-2xl font-black transition-all"><LogOut size={20} />Disconnect</button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-12 lg:p-16 overflow-y-auto w-full max-w-screen-2xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
          <div><h1 className="text-4xl font-black text-gray-900 tracking-tighter">{activeTab === 'overview' ? 'Portal Dashboard' : 'Identity Registry'}</h1><p className="text-gray-400 font-bold mt-2 text-lg">Identity: <span className="text-indigo-600">{user.name}</span></p></div>
          <div className="hidden sm:flex items-center gap-4"><div className="bg-white px-6 py-4 rounded-2xl border border-gray-100 text-sm font-black text-gray-700 flex items-center gap-4 shadow-sm"><Calendar size={20} className="text-indigo-600" />{new Date().toDateString()}</div></div>
        </header>

        {activeTab === 'overview' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8 space-y-10">{user.role === Role.LECTURER ? widgets.map(w => w.visible ? renderWidget(w.id) : null) : (
              <div className="space-y-10">
                <div className="bg-white rounded-[3rem] p-10 md:p-16 shadow-2xl border border-gray-100 text-center relative overflow-hidden group">
                  <div className="absolute -top-10 -right-10 w-64 h-64 bg-indigo-50 rounded-full opacity-30 blur-3xl"></div>
                  {lastScannedCourse ? (
                    <div className="animate-in zoom-in fade-in duration-500 p-8 bg-green-50 rounded-3xl"><CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" /><h3 className="text-2xl font-black text-green-900 mb-2">Authenticated</h3><p className="text-green-700 font-bold">Entry verified for {lastScannedCourse}</p><button onClick={() => setLastScannedCourse(null)} className="mt-6 px-6 py-2 bg-green-600 text-white rounded-xl font-bold">New Scan</button></div>
                  ) : (
                    <><div className="w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-10 text-white"><Users size={48} /></div><h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tighter">Register Presence</h2><p className="text-lg text-gray-400 mb-12 font-bold max-w-md mx-auto">Position your device to scan the session credentials.</p><QRScanner onScan={handleScan} /></>
                  )}
                </div>
              </div>
            )}</div>
            <div className="lg:col-span-4 space-y-10">{activeSession && <div className="sticky top-24"><QRCodeGenerator sessionId={activeSession.id} courseId={activeSession.courseId} token={activeSession.qrToken} /></div>}{reportData && <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-indigo-50"><div className="flex justify-between mb-8"><div className="flex items-center gap-4"><div className="bg-indigo-50 p-2.5 rounded-2xl"><FileText size={28} className="text-indigo-600" /></div><h3 className="font-black text-gray-900 text-xl tracking-tighter">System Audit</h3></div><button onClick={() => setReportData(null)} className="text-gray-300"><X size={24} /></button></div><div className="text-gray-600 text-sm space-y-5 whitespace-pre-line overflow-y-auto max-h-[500px] pr-4 custom-scrollbar custom-markdown font-medium">{reportData}</div></div>}</div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-500">
            <div className="p-8 border-b border-gray-50 bg-gray-50/50 flex flex-col md:flex-row items-center justify-between gap-6">
              <div><h2 className="text-3xl font-black text-gray-900 tracking-tighter">Student Registry</h2><p className="text-gray-400 font-bold text-sm">Review participación database & risks.</p></div>
              <button disabled={isProcessing} onClick={handleGenerateReport} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all flex items-center gap-2"><Activity size={20} /> {isProcessing ? 'Auditing...' : 'Run Module Audit'}</button>
            </div>
            <div className="overflow-x-auto"><table className="w-full text-left">
              <thead className="bg-gray-50/50 text-gray-400 uppercase text-[10px] font-black tracking-[0.2em] border-b border-gray-100"><tr><th className="px-8 py-5">Full Identity</th><th className="px-8 py-5">Log Presence</th><th className="px-8 py-5">Last Verification</th></tr></thead>
              <tbody className="divide-y divide-gray-100">{studentStats.map(student => (
                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-8 py-6 font-black text-gray-900">{student.name}</td>
                  <td className="px-8 py-6"><div className="flex items-center gap-3"><div className="flex-1 h-2 w-24 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${student.presenceRate > 75 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${student.presenceRate}%` }}></div></div><span className="text-xs font-black">{student.presenceRate}%</span></div></td>
                  <td className="px-8 py-6 text-xs text-gray-400 font-bold">{student.lastSeen ? new Date(student.lastSeen).toLocaleDateString() : 'Awaiting entry'}</td>
                </tr>
              ))}</tbody>
            </table></div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
