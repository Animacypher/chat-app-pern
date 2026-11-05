import { useNavigate } from 'react-router-dom'

// ─── Settings Page ─────────────────────────────────────────────────────────────
const Settings = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#93C5FD] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-8">

        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 font-bold text-sm border-2 border-black px-3 py-2
                     shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50
                     active:translate-x-0.5 active:translate-y-0.5 active:shadow-none
                     transition-all cursor-pointer mb-6"
        >
          ← Back to Chat
        </button>

        {/* Icon */}
        <div className="text-5xl text-center mb-4">⚙️</div>

        {/* Heading */}
        <h1 className="text-2xl font-black tracking-tight text-center border-b-4 border-black pb-4 mb-6">
          Settings
        </h1>

        {/* Placeholder content */}
        <div className="border-2 border-black p-4 bg-yellow-50 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-sm font-bold text-center text-gray-600">
            ✨ Settings coming soon…
          </p>
        </div>
      </div>
    </div>
  )
}

export default Settings
