import { Link, useLocation } from 'react-router-dom';

export default function PublicNav() {
  const { pathname } = useLocation();

  const scrollIfCurrent = (to: string) => {
    if (pathname === to) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav className="bg-white/95 backdrop-blur border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 grid grid-cols-[1fr_auto_1fr] items-center">
        <Link to="/" onClick={() => scrollIfCurrent('/')} className="text-2xl font-bold text-blue-600 justify-self-start">EventEase</Link>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium justify-self-center">
          <Link to="/" onClick={() => scrollIfCurrent('/')} className="text-gray-600 hover:text-blue-600">Home</Link>
          <Link to="/about" onClick={() => scrollIfCurrent('/about')} className="text-gray-600 hover:text-blue-600">About Us</Link>
          <Link to="/contact" onClick={() => scrollIfCurrent('/contact')} className="text-gray-600 hover:text-blue-600">Contact</Link>
        </div>
        <div className="justify-self-end flex items-center gap-2">
          <Link to="/register" className="hidden sm:inline-flex text-sm font-semibold text-gray-700 hover:text-blue-600 transition">
            Register
          </Link>
          <Link to="/login" className="bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-800 transition">
            Sign In
          </Link>
        </div>
      </div>
    </nav>
  );
}
