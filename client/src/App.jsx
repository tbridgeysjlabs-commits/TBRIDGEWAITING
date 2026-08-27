import { Navigate, Route, Routes } from 'react-router-dom';
import { WaitingFlowProvider } from './context/WaitingFlowContext';
import CustomerShell from './components/customer/CustomerShell';
import HomePage from './pages/customer/HomePage';
import PartyPage from './pages/customer/PartyPage';
import AgreementPage from './pages/customer/AgreementPage';
import RegisteredPage from './pages/customer/RegisteredPage';
import CompletePage from './pages/customer/CompletePage';
import PostponePage from './pages/customer/PostponePage';
import CancelPage from './pages/customer/CancelPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import WaitingManagePage from './pages/admin/WaitingManagePage';
import HistoryPage from './pages/admin/HistoryPage';
import SettingsPage from './pages/admin/SettingsPage';
import CustomersPage from './pages/admin/CustomersPage';
import BillingPage from './pages/admin/BillingPage';
import BillingResultPage from './pages/admin/BillingResultPage';
import SystemLoginPage from './pages/system/SystemLoginPage';
import FacilitiesPage from './pages/system/FacilitiesPage';
import SystemHistoryPage from './pages/system/SystemHistoryPage';
import SystemCustomersPage from './pages/system/SystemCustomersPage';
import SystemBillingPage from './pages/system/SystemBillingPage';
import SystemNoticesPage from './pages/system/SystemNoticesPage';
import SystemSettingsPage from './pages/system/SystemSettingsPage';
import NoticesPage from './pages/admin/NoticesPage';
import SignagePage from './pages/signage/SignagePage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/w/demo-park" replace />} />

      <Route
        path="/w/:facilityCode"
        element={
          <WaitingFlowProvider>
            <CustomerShell />
          </WaitingFlowProvider>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="party" element={<PartyPage />} />
        <Route path="agreement" element={<AgreementPage />} />
        <Route path="registered" element={<RegisteredPage />} />
      </Route>

      <Route path="/w/:facilityCode/complete/:waitingId" element={<CompletePage />} />
      <Route
        path="/w/:facilityCode/complete/:waitingId/postpone"
        element={<PostponePage />}
      />
      <Route
        path="/w/:facilityCode/complete/:waitingId/cancel"
        element={<CancelPage />}
      />

      <Route path="/signage/:facilityCode" element={<SignagePage />} />

      <Route path="/admin/:facilityCode/login" element={<AdminLoginPage />} />
      <Route path="/admin/:facilityCode/waiting" element={<WaitingManagePage />} />
      <Route path="/admin/:facilityCode/history" element={<HistoryPage />} />
      <Route path="/admin/:facilityCode/customers" element={<CustomersPage />} />
      <Route path="/admin/:facilityCode/billing" element={<BillingPage />} />
      <Route
        path="/admin/:facilityCode/billing/result"
        element={<BillingResultPage />}
      />
      <Route path="/admin/:facilityCode/notices" element={<NoticesPage />} />
      <Route path="/admin/:facilityCode/settings" element={<SettingsPage />} />

      <Route path="/system-admin/login" element={<SystemLoginPage />} />
      <Route path="/system-admin/facilities" element={<FacilitiesPage />} />
      <Route path="/system-admin/notices" element={<SystemNoticesPage />} />
      <Route path="/system-admin/history" element={<SystemHistoryPage />} />
      <Route path="/system-admin/customers" element={<SystemCustomersPage />} />
      <Route path="/system-admin/billing" element={<SystemBillingPage />} />
      <Route path="/system-admin/settings" element={<SystemSettingsPage />} />

      <Route path="*" element={<div className="center-page">페이지를 찾을 수 없습니다.</div>} />
    </Routes>
  );
}
