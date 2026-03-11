import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Departments from './pages/Departments';
import Visitors from './pages/Visitors';
import VisitorDetails from './pages/VisitorDetails';
import Visits from './pages/Visits';
import NewVisit from './pages/NewVisit';
import Users from './pages/Users';
import Agenda from './pages/Agenda';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Privacy from './pages/Privacy';
import TotemWelcome from './pages/totem/TotemWelcome';
import TotemFace from './pages/totem/TotemFace';
import TotemIdentify from './pages/totem/TotemIdentify';
import TotemVisitorData from './pages/totem/TotemVisitorData';
import TotemConfirm from './pages/totem/TotemConfirm';
import TotemSuccess from './pages/totem/TotemSuccess';
import TotemFinish from './pages/totem/TotemFinish';
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

const PrivateRoute = () => {
  const { signed, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  }

  if (!signed) {
    return <Navigate to="/login" />;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex items-center p-4 pb-0">
          <SidebarTrigger />
        </div>
        <div className="p-4">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

const RoleRoute = ({ children, allowedRoles }: { children: ReactNode, allowedRoles: string[] }) => {
  const { user, loading } = useAuth();
  
  if (loading) return null; // Or spinner
  
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/privacy" element={<Privacy />} />
          
          {/* Totem Routes - Protected for ADMIN and RECEPCIONISTA only */}
          <Route element={
            <RoleRoute allowedRoles={['ADMIN', 'RECEPCIONISTA']}>
              <Outlet />
            </RoleRoute>
          }>
            <Route path="/totem" element={<TotemWelcome />} />
            <Route path="/totem/face" element={<TotemFace />} />
            <Route path="/totem/identify" element={<TotemIdentify />} />
            <Route path="/totem/visitor-data" element={<TotemVisitorData />} />
            <Route path="/totem/confirm" element={<TotemConfirm />} />
            <Route path="/totem/success" element={<TotemSuccess />} />
            <Route path="/totem/finish" element={<TotemFinish />} />
          </Route>

          <Route element={<PrivateRoute />}>
             <Route path="/dashboard" element={<Dashboard />} />
             <Route path="/departments" element={<Departments />} />
             
             <Route path="/visits/new" element={
               <RoleRoute allowedRoles={['ADMIN', 'RECEPCIONISTA', 'COLABORADOR']}>
                 <NewVisit />
               </RoleRoute>
             } />
             
             <Route path="/reports" element={
               <RoleRoute allowedRoles={['ADMIN']}>
                 <Reports />
               </RoleRoute>
             } />

             <Route path="/visits" element={
               <RoleRoute allowedRoles={['ADMIN', 'RECEPCIONISTA', 'COLABORADOR']}>
                 <Visits />
               </RoleRoute>
             } />
             
             {/* Restricted Routes */}
             <Route path="/visitors" element={
               <RoleRoute allowedRoles={['ADMIN', 'RECEPCIONISTA']}>
                 <Visitors />
               </RoleRoute>
             } />
             <Route path="/visitors/:id" element={
               <RoleRoute allowedRoles={['ADMIN', 'RECEPCIONISTA']}>
                 <VisitorDetails />
               </RoleRoute>
             } />
             <Route path="/users" element={
               <RoleRoute allowedRoles={['ADMIN']}>
                 <Users />
               </RoleRoute>
             } />
             
             <Route path="/calendar" element={<Agenda />} />
             
             <Route path="/settings" element={
               <RoleRoute allowedRoles={['ADMIN', 'RECEPCIONISTA']}>
                 <Settings />
               </RoleRoute>
             } />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
