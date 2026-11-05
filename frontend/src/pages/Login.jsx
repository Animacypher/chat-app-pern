import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

// Robust emoji detection regex covering all major Unicode emoji ranges
const emojiRegex =
  /[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{2300}-\u{23FF}]|[\u{2B00}-\u{2BFF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FAFF}]|[\u{FE0F}]/u

const hasSpace = (val) => /\s/.test(val)
const hasEmoji = (val) => emojiRegex.test(val)

/**
 * Returns the inline error message for space/emoji violations, or '' if clean.
 */
const getCharError = (val) => {
  if (hasSpace(val)) return 'Spaces are not allowed'
  if (hasEmoji(val)) return 'Emojis are not allowed'
  return ''
}

/** Bright-red inline warning rendered directly below a field. */
const CharError = ({ message }) =>
  message ? (
    <p className="text-red-600 font-bold text-sm mt-1">{message}</p>
  ) : null

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
)

const EyeSlashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
)

const Login = () => {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState('')
  const [serverErrorDetail, setServerErrorDetail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ── Per-field space / emoji error strings (empty = clean) ─────────────────
  const emailCharError = getCharError(email)
  const passwordCharError = getCharError(password)

  const hasCharViolations = !!emailCharError || !!passwordCharError

  const isFormValid =
    !hasCharViolations &&
    email.trim() !== '' &&
    password.trim() !== ''

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isFormValid) return

    setIsSubmitting(true)
    setServerError('')
    setServerErrorDetail('')

    try {
      const response = await axios.post(
        '/api/auth/login',
        { email, password },
        { withCredentials: true }
      )
      login(response.data.user)
      navigate('/')
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'An unexpected error occurred. Please try again.'
      setServerError(msg)
      setServerErrorDetail(error.response?.data?.detail || '')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#A7F3D0] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-black tracking-tight border-b-4 border-black pb-2 inline-block">
            Welcome Back
          </h1>
          <p className="text-gray-600 font-semibold mt-2">Sign in to continue.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Email Field */}
          <div className="mb-4">
            <label className="block font-bold mb-1 text-sm uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-2 border-black rounded-none focus:outline-none focus:ring-2 focus:ring-black w-full p-2"
              placeholder="you@example.com"
            />
            <CharError message={emailCharError} />
          </div>

          {/* Password Field */}
          <div className="mb-6">
            <label className="block font-bold mb-1 text-sm uppercase tracking-wide">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-2 border-black rounded-none focus:outline-none focus:ring-2 focus:ring-black w-full p-2 pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-600 hover:text-black transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeIcon /> : <EyeSlashIcon />}
              </button>
            </div>
            <CharError message={passwordCharError} />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className={`w-full font-bold py-3 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all ${
              !isFormValid || isSubmitting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                : 'bg-black text-white cursor-pointer'
            }`}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In →'}
          </button>

          {/* Server Error Banner */}
          {serverError && (
            <div className="mt-4 border-2 border-red-600 bg-red-50 p-3">
              <p className="text-red-600 font-bold text-sm">{serverError}</p>
              {serverErrorDetail && (
                <p className="text-red-500 font-mono text-xs mt-1 break-all">
                  {serverErrorDetail}
                </p>
              )}
            </div>
          )}
        </form>

        {/* Register Link */}
        <p className="mt-6 text-center text-sm font-semibold">
          Don&apos;t have an account?{' '}
          <Link
            to="/register"
            className="font-black underline hover:text-gray-600 transition-colors"
          >
            Register →
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Login
