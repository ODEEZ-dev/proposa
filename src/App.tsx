import { Routes, Route, Navigate } from "react-router-dom"
import DashboardPage from "./pages/dashboard"
import ClientsPage from "./pages/clients"
import ClientDetailPage from "./pages/client-detail"
import ServicesPage from "./pages/services"
import NewProposalPage from "./pages/new-proposal"
import ProposalEditorPage from "./pages/proposal-editor"
import ProposalsPage from "./pages/proposals"
import SettingsPage from "./pages/settings"
import PublicProposalPage from "./pages/public-proposal"
import { AppLayout } from "./components/layout/app-layout"

export default function App() {
  return (
    <Routes>
      <Route path="/p/:shareToken" element={<PublicProposalPage />} />

      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/clients/:clientId" element={<ClientDetailPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/proposals" element={<ProposalsPage />} />
        <Route path="/proposals/new" element={<NewProposalPage />} />
        <Route path="/proposals/:proposalId/edit" element={<ProposalEditorPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}