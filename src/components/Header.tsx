import logo from '../assets/LOGO.png';

const Header = () => {
  return (
    <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
      <div className="flex items-center justify-center px-4 py-3 h-14 relative">
        <img src={logo} alt="어디 비움 로고" className="h-8 object-contain" />
      </div>
    </div>
  );
};

export default Header;
