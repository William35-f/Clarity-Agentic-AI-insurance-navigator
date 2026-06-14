import { Routes, Route, Navigate } from "react-router-dom";

import CustomerProfile from "./pages/CustomerProfile";
import DocumentChat from "./pages/DocumentChat";
import CustomerSummary from "./pages/CustomerSummary";
import BookMeeting from "./pages/BookMeeting";
import AdvisorDashboard from "./pages/AdvisorDashboard";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/customer-profile" />} />
      <Route path="/customer-profile" element={<CustomerProfile />} />
      <Route path="/document-chat" element={<DocumentChat />} />
      <Route path="/customer-summary" element={<CustomerSummary />} />
      <Route path="/book-meeting" element={<BookMeeting />} />
      <Route path="/advisor-dashboard" element={<AdvisorDashboard />} />
    </Routes>
  );
}

export default App;