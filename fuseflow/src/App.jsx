import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import DashboardLayout from './components/DashboardLayout';
import PageGuard from './components/PageGuard';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminLogin from './pages/AdminLogin';
import AdminRegister from './pages/AdminRegister';
import Overview from './pages/Overview';
import Sessions from './pages/Sessions';
import SendMessage from './pages/SendMessage';
import SmartBroadcast from './pages/SmartBroadcast';
import MessageLogs from './pages/MessageLogs';
import Contacts from './pages/Contacts';
import Campaigns from './pages/Campaigns';
import AutoReply from './pages/AutoReply';
import FlowBuilder from './pages/FlowBuilder';
import KnowledgeBase from './pages/KnowledgeBase';
import WorkspaceUsers from './pages/WorkspaceUsers';
import AdminPlans from './pages/AdminPlans';
import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';
import Billing from './pages/Billing';
import LiveChat from './pages/LiveChat';
import RenewSubscription from './pages/RenewSubscription';

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
          <Route path="/renew-subscription" element={<RenewSubscription />} />

          {/* Public Admin Authentication Routes */}
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin-register" element={<AdminRegister />} />

          {/* Protected Dashboard Routes */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Overview />} />
            <Route path="sessions" element={<Sessions />} />
            <Route path="live-chat" element={<LiveChat />} />
            <Route
              path="send-message"
              element={
                <PageGuard permissionKey="sendMessage">
                  <SendMessage />
                </PageGuard>
              }
            />
            <Route
              path="smart-broadcast"
              element={
                <PageGuard gate="bulkScheduling" permissionKey="smartBroadcast">
                  <SmartBroadcast />
                </PageGuard>
              }
            />
            <Route
              path="message-logs"
              element={
                <PageGuard permissionKey="messageLogs">
                  <MessageLogs />
                </PageGuard>
              }
            />
            <Route
              path="contacts"
              element={
                <PageGuard permissionKey="contacts">
                  <Contacts />
                </PageGuard>
              }
            />
            <Route
              path="campaigns"
              element={
                <PageGuard gate="bulkScheduling" permissionKey="bulkScheduling">
                  <Campaigns />
                </PageGuard>
              }
            />
            <Route
              path="autoreply"
              element={
                <PageGuard gate="aiAutoReply" permissionKey="aiAutoReply">
                  <AutoReply />
                </PageGuard>
              }
            />
            <Route
              path="flows"
              element={
                <PageGuard gate="flowBuilder" permissionKey="flowBuilder">
                  <FlowBuilder />
                </PageGuard>
              }
            />
            <Route
              path="kb"
              element={
                <PageGuard gate="kb" permissionKey="kb">
                  <KnowledgeBase />
                </PageGuard>
              }
            />
            <Route path="users" element={<WorkspaceUsers />} />
            <Route path="plans" element={<AdminPlans />} />
            <Route path="admin" element={<AdminPanel />} />
            <Route path="profile" element={<Profile />} />
            <Route path="billing" element={<Billing />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
