import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Code2, History, LayoutDashboard, LogOut } from 'lucide-react';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/review', icon: Code2, label: 'Review' },
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/history', icon: History, label: 'History' },
  ];

  return (
    <div className="flex h-screen bg-gray-950 text-white">

      {/* Sidebar */}
      <div className="w-16 md:w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Code2 className="w-4 h-4 text-white" />
            </div>
            <span className="hidden md:block font-bold text-white">CodeReview AI</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-violet-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="hidden md:block text-sm font-medium">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-gray-800">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 bg-violet-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold">{user?.name?.charAt(0).toUpperCase()}</span>
            </div>
            <div className="hidden md:block flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
            <button onClick={handleLogout} className="hidden md:block text-gray-400 hover:text-red-400 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;