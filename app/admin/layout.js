'use client';

import AdminSidebar from "./components/AdminSidebar";

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col md:flex-row antialiased selection:bg-yellow-500 selection:text-black">
      <AdminSidebar />

      <main className="flex-1 min-w-0 flex flex-col min-h-screen overflow-x-hidden pb-20 md:pb-6">
        {children}
      </main>
    </div>
  );
}
