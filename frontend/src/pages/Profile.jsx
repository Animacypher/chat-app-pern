import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

// ─── Delete Confirmation Modal ─────────────────────────────────────────────────
const DeleteAccountModal = ({ onCancel, onConfirm, isDeleting }) => (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="w-full max-w-sm bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-8">
      {/* Warning Icon */}
      <div className="text-4xl text-center mb-4">⚠️</div>

      {/* Heading */}
      <h2 className="text-2xl font-black tracking-tight text-center border-b-4 border-black pb-3 mb-4">
        Are you absolutely sure?
      </h2>

      {/* Description */}
      <p className="text-gray-700 font-semibold text-sm text-center leading-relaxed mb-8">
        This will permanently delete your account and remove all data from our
        servers.{' '}
        <span className="font-black text-black">This action cannot be undone.</span>
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        <button
          onClick={onConfirm}
          disabled={isDeleting}
          className={`w-full font-bold py-3 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all ${
            isDeleting
              ? 'bg-red-300 text-red-100 cursor-not-allowed shadow-none'
              : 'bg-red-600 text-white cursor-pointer hover:bg-red-700'
          }`}
        >
          {isDeleting ? 'Deleting...' : 'Confirm Delete'}
        </button>

        <button
          onClick={onCancel}
          disabled={isDeleting}
          className="w-full bg-white text-black font-bold py-3 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)

// ─── Profile Page ──────────────────────────────────────────────────────────────
const Profile = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const genderLabel = user?.gender === 'M' ? 'Male' : 'Female'
  const genderEmoji = user?.gender === 'M' ? '👨' : '👩'

  const handleConfirmDelete = async () => {
    setIsDeleting(true)
    setDeleteError('')

    try {
      await axios.delete('/api/users/me', { withCredentials: true })
      await logout()
      navigate('/register')
    } catch (error) {
      setDeleteError(
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Failed to delete account. Please try again.'
      )
      setIsDeleting(false)
    }
  }

  return (
    <>
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteAccountModal
          onCancel={() => {
            setShowDeleteModal(false)
            setDeleteError('')
          }}
          onConfirm={handleConfirmDelete}
          isDeleting={isDeleting}
        />
      )}

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

          {/* Avatar / Emoji */}
          <div className="text-6xl text-center mb-4">{genderEmoji}</div>

          {/* Welcome Text */}
          <div className="text-center mb-4">
            <p className="text-gray-600 font-semibold">Your profile</p>
            <p className="text-2xl font-black tracking-tight">@{user?.username}</p>
          </div>

          {/* Gender Badge */}
          <div className="flex justify-center mb-4">
            <span className="bg-black text-white px-3 py-1 text-sm font-bold border-2 border-black inline-block">
              {genderLabel}
            </span>
          </div>

          {/* Divider */}
          <hr className="border-2 border-black my-6" />

          {/* Delete Error */}
          {deleteError && (
            <div className="mb-4 border-2 border-red-600 bg-red-50 p-3">
              <p className="text-red-600 font-bold text-sm">{deleteError}</p>
            </div>
          )}

          {/* Delete Account Button */}
          <button
            onClick={() => {
              setDeleteError('')
              setShowDeleteModal(true)
            }}
            className="w-full bg-red-500 text-white font-bold py-3 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer hover:bg-red-600"
          >
            Delete Account
          </button>
        </div>
      </div>
    </>
  )
}

export default Profile
