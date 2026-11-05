import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * NavDrawer – Slide-out hamburger navigation drawer.
 *
 * Props:
 *   isOpen  – boolean, controls visibility
 *   onClose – function, called when the drawer or backdrop is dismissed
 */
const NavDrawer = ({ isOpen, onClose }) => {
  const navigate = useNavigate()
  const { logout } = useAuth()

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  const go = (path) => {
    onClose()
    navigate(path)
  }

  const handleLogout = async () => {
    onClose()
    await logout()
    navigate('/login')
  }

  return (
    <>
      {/* ── Backdrop ─────────────────────────────────────────────────────── */}
      <div
        className={`fixed inset-0 z-40 backdrop-blur-sm bg-black/40 transition-opacity duration-200 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Drawer panel ─────────────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`fixed top-0 left-0 h-full w-72 bg-white border-r-4 border-black z-50
                    shadow-[6px_0px_0px_0px_rgba(0,0,0,1)]
                    transform transition-transform duration-250 ease-in-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-4 border-black px-5 py-4">
          <span className="text-xl font-black tracking-tight">Menu</span>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center border-2 border-black font-black text-lg
                       hover:bg-gray-100 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex flex-col p-4 gap-2">
          <NavItem icon="👤" label="My Profile" onClick={() => go('/profile')} />
          <NavItem icon="⚙️" label="Settings"   onClick={() => go('/settings')} />

          {/* Divider */}
          <div className="border-t-4 border-black my-2" />

          <NavItem
            icon="🚪"
            label="Log Out"
            onClick={handleLogout}
            danger
          />
        </nav>
      </div>
    </>
  )
}

// ── Single menu row ───────────────────────────────────────────────────────────
const NavItem = ({ icon, label, onClick, danger = false }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 w-full px-4 py-3 font-bold border-2 border-black
                shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
                active:translate-x-0.5 active:translate-y-0.5 active:shadow-none
                transition-all cursor-pointer text-left
                ${danger
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-white text-black hover:bg-gray-50'
                }`}
  >
    <span className="text-xl leading-none">{icon}</span>
    <span>{label}</span>
  </button>
)

export default NavDrawer
