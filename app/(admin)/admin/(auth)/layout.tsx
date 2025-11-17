
import {
    ArrowRightOnRectangleIcon,
  } from "@heroicons/react/24/outline";
  import ClientSideLink from "./client-side-link";
  import AdminNavbar from "@/app/components/AdminNavbar/Index";
import "@/app/globals.css";



  
  
  export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-md flex flex-col h-screen overflow-y-auto">
          
          <div className="flex-1 px-3 py-4">
            <div className="mb-6 px-4 flex flex-col gap-2">
            <div className="flex items-center text-black">
        <span className="text-[20px] font-bold">Dummy Website</span>
          </div>
            </div>
            <nav className="space-y-1">
              <AdminNavbar />
            </nav>
          </div>
  
          {/* Logout Section */}
          <div className="px-3 py-4 border-t border-gray-200">
            <ClientSideLink
              href="/admin/logout"
              name="Logout"
              icon={<ArrowRightOnRectangleIcon className="h-5 w-5" />}
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
            />
          </div>
        </aside>
  
        {/* Main content */}
        <main className="flex-1 h-screen overflow-y-auto bg-gray-100 text-black">{children}</main>
      </div>
    );
  }
  