import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import DashboardLayout from './components/DashboardLayout';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminLogin from './pages/AdminLogin';
import AdminRegister from './pages/AdminRegister';
import Overview from './pages/Overview';
import Sessions from './pages/Sessions';
import Contacts from './pages/Contacts';
import Campaigns from './pages/Campaigns';
import AutoReply from './pages/AutoReply';
import KnowledgeBase from './pages/KnowledgeBase';
import WorkspaceUsers from './pages/WorkspaceUsers';
import AdminTenants from './pages/AdminTenants';
import AdminPlans from './pages/AdminPlans';
import AdminPanel from './pages/AdminPanel';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Public User Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Public Admin Authentication Routes */}
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin-register" element={<AdminRegister />} />

          {/* Protected Dashboard Routes */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Overview />} />
            <Route path="sessions" element={<Sessions />} />
            <Route path="contacts" element={<Contacts />} />
            <Route path="campaigns" element={<Campaigns />} />
            <Route path="autoreply" element={<AutoReply />} />
            <Route path="kb" element={<KnowledgeBase />} />
            <Route path="users" element={<WorkspaceUsers />} />
            <Route path="tenants" element={<AdminTenants />} />
            <Route path="plans" element={<AdminPlans />} />
            <Route path="admin" element={<AdminPanel />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
