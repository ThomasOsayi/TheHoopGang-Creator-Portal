// src/app/admin/layout.tsx

import { AdminSidebar } from '@/components/ui/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Admin Sidebar */}
      <AdminSidebar />
      
      {/* Main Content Area */}
      {/* On desktop: offset by sidebar width (lg:pl-64) */}
      {/* On mobile: offset by mobile header height (pt-16) */}
      <main className="lg:pl-64 pt-16 lg:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}