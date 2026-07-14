import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import LiveCursors from '../LiveCursors';
import { useAppStore } from '../../store/appStore';

export default function Layout() {
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const location = useLocation();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#E5E5DF' }}>
      <Sidebar />
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        <Header />
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
      
      {/* Live Cursors - Shows other users' cursors */}
      <LiveCursors />
    </div>
  );
}