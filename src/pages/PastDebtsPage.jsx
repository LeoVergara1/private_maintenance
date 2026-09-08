import DashboardLayout from '../components/DashboardLayout';
import PastDebtsPanel from '../components/PastDebtsPanel';

export default function PastDebtsPage() {
  return (
    <DashboardLayout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PastDebtsPanel />
      </main>
    </DashboardLayout>
  );
}
