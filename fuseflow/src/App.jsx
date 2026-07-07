import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import DashboardLayout from './components/DashboardLayout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Overview from './pages/Overview';
import Sessions from './pages/Sessions';
import Contacts from './pages/Contacts';
import Campaigns from './pages/Campaigns';
import AutoReply from './pages/AutoReply';
import KnowledgeBase from './pages/KnowledgeBase';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected Dashboard Routes */}
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Overview />} />
            <Route path="sessions" element={<Sessions />} />
            <Route path="contacts" element={<Contacts />} />
            <Route path="campaigns" element={<Campaigns />} />
            <Route path="autoreply" element={<AutoReply />} />
            <Route path="kb" element={<KnowledgeBase />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
