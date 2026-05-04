import { Link } from 'react-router-dom';

export default function PublicNav() {
  return (
    <nav className="bg-white/95 backdrop-blur border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 grid grid-cols-[1fr_auto_1fr] items-center">
        <Link to="/" className="text-2xl font-bold text-blue-600 justify-self-start">EventEase</Link>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium justify-self-center">
          <Link to="/" className="text-gray-600 hover:text-blue-600">Home</Link>
          <Link to="/about" className="text-gray-600 hover:text-blue-600">About Us</Link>
          <Link to="/contact" className="text-gray-600 hover:text-blue-600">Contact</Link>
        </div>
        <Link to="/login" className="bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-800 transition justify-self-end">
          Sign In
        </Link>
      </div>
    </nav>
  );
}
