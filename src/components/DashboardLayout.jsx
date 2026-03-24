import Sidebar from './Sidebar';

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:ml-64 pt-14 lg:pt-0">
        {children}
      </div>
    </div>
  );
}
