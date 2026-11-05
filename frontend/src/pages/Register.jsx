import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Robust emoji detection regex covering all major Unicode emoji ranges
const emojiRegex =
  /[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{2300}-\u{23FF}]|[\u{2B00}-\u{2BFF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FAFF}]|[\u{FE0F}]/u

const hasSpace = (val) => /\s/.test(val)
const hasEmoji = (val) => emojiRegex.test(val)

/**
 * Returns the inline error message for space/emoji violations, or '' if clean.
 * Spaces are checked first so both errors don't pile up at once.
 */
const getCharError = (val) => {
  if (hasSpace(val)) return 'Spaces are not allowed'
  if (hasEmoji(val)) return 'Emojis are not allowed'
  return ''
}

const passwordRules = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'Contains numbers (0-9)', test: (p) => /[0-9]/.test(p) },
  { label: 'Mix of uppercase and lowercase letters', test: (p) => /[A-Z]/.test(p) && /[a-z]/.test(p) },
  { label: 'Contains special characters (e.g., !@#$%^&*)', test: (p) => /[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]/.test(p) },
]

// Animated requirement row — fades + collapses out when met, back in when broken
const RequirementRow = ({ rule, password }) => {
  const met = rule.test(password)
  return (
    <div
      className={`flex items-center gap-2 text-sm overflow-hidden transition-all duration-300 ease-in-out ${
        met ? 'max-h-0 opacity-0 mb-0' : 'max-h-10 opacity-100 mb-1'
      }`}
    >
      <span className="text-red-500 font-bold">✗</span>
      <span className="text-gray-700">{rule.label}</span>
    </div>
  )
}

/** Bright-red inline warning rendered directly below a field. */
const CharError = ({ message }) =>
  message ? (
    <p className="text-red-600 font-bold text-sm mt-1">{message}</p>
  ) : null

const Register = () => {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [gender, setGender] = useState('')

  const [usernameBlurError, setUsernameBlurError] = useState('')
  const [showPasswordRules, setShowPasswordRules] = useState(false)
  const [serverError, setServerError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const passwordBlurTimer = useRef(null)

  // ── Per-field space / emoji error strings (empty = clean) ─────────────────
  const usernameCharError = getCharError(username)
  const emailCharError = getCharError(email)
  const passwordCharError = getCharError(password)
  const confirmPasswordCharError = getCharError(confirmPassword)

  const hasCharViolations =
    !!usernameCharError ||
    !!emailCharError ||
    !!passwordCharError ||
    !!confirmPasswordCharError

  const isEmailValid = emailRegex.test(email)
  const isPasswordValid = passwordRules.every((r) => r.test(password))
  const passwordsMatch = confirmPassword !== '' && password === confirmPassword

  // Hide the dropdown box entirely when all rules are met
  const allRulesMet = isPasswordValid

  const isFormValid =
    !hasCharViolations &&
    username.trim() !== '' &&
    username.trim().length <= 30 &&
    isEmailValid &&
    isPasswordValid &&
    passwordsMatch &&
    gender !== ''

  const handleUsernameBlur = () => {
    if (username.trim() === '') {
      setUsernameBlurError('Username cannot be empty')
    } else {
      setUsernameBlurError('')
    }
  }

  const handlePasswordFocus = () => {
    if (passwordBlurTimer.current) clearTimeout(passwordBlurTimer.current)
    setShowPasswordRules(true)
  }

  const handlePasswordBlur = () => {
    passwordBlurTimer.current = setTimeout(() => {
      setShowPasswordRules(false)
    }, 200)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isFormValid) return

    setIsSubmitting(true)
    setServerError('')

    try {
      const response = await axios.post(
        '/api/auth/register',
        { username, email, password, gender },
        { withCredentials: true }
      )
      login(response.data.user)
      navigate('/')
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Registration failed. Please try again.'
      setServerError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Eye icon components
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

  return (
    <div className="min-h-screen bg-[#FEF08A] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-black tracking-tight border-b-4 border-black pb-2 inline-block">
            Create Account
          </h1>
          <p className="text-gray-600 font-semibold mt-2">Join the conversation.</p>
        </div>

        {/* Server Error Banner */}
        {serverError && (
          <div className="mb-4 border-2 border-red-600 bg-red-50 p-3">
            <p className="text-red-600 font-bold text-sm">{serverError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Username Field */}
          <div className="mb-4">
            <label className="block font-bold mb-1 text-sm uppercase tracking-wide">
              Username
            </label>
            <div className="flex">
              <span className="bg-black text-white px-3 py-2 font-bold border-2 border-black flex-shrink-0 flex items-center">
                @
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onBlur={handleUsernameBlur}
                maxLength={30}
                className="flex-1 border-2 border-black border-l-0 rounded-none focus:outline-none focus:ring-2 focus:ring-black p-2 w-full"
                placeholder="yourusername"
              />
            </div>
            {/* Space/emoji errors take priority over the blur-empty error */}
            {usernameCharError
              ? <CharError message={usernameCharError} />
              : usernameBlurError && (
                <p className="text-red-600 font-bold text-sm mt-1">{usernameBlurError}</p>
              )
            }
            {/* Character counter — shown once the user starts typing */}
            {username.length > 0 && !usernameCharError && (
              <p className={`text-xs font-semibold mt-1 text-right ${username.length >= 30 ? 'text-red-600' : 'text-gray-400'}`}>
                {username.length}/30
              </p>
            )}
          </div>

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
            {emailCharError
              ? <CharError message={emailCharError} />
              : email !== '' && !isEmailValid && (
                <p className="text-red-600 font-bold text-sm mt-1">Invalid email address</p>
              )
            }
          </div>

          {/* Password Field */}
          <div className="mb-4 relative">
            <label className="block font-bold mb-1 text-sm uppercase tracking-wide">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={handlePasswordFocus}
                onBlur={handlePasswordBlur}
                className="border-2 border-black rounded-none focus:outline-none focus:ring-2 focus:ring-black w-full p-2 pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()} // prevent blur firing before toggle
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-600 hover:text-black transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeIcon /> : <EyeSlashIcon />}
              </button>
            </div>

            {/* Space/emoji inline error for password */}
            <CharError message={passwordCharError} />

            {/* Animated requirements dropdown */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                showPasswordRules && !allRulesMet
                  ? 'max-h-60 opacity-100 mt-1'
                  : 'max-h-0 opacity-0'
              }`}
            >
              <div className="absolute z-10 left-0 right-0 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3">
                <p className="font-bold text-xs uppercase tracking-wide mb-2">Password Requirements</p>
                {passwordRules.map((rule, idx) => (
                  <RequirementRow key={idx} rule={rule} password={password} />
                ))}
              </div>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div className="mb-4">
            <label className="block font-bold mb-1 text-sm uppercase tracking-wide">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="border-2 border-black rounded-none focus:outline-none focus:ring-2 focus:ring-black w-full p-2 pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-600 hover:text-black transition-colors"
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? <EyeIcon /> : <EyeSlashIcon />}
              </button>
            </div>
            {/* Space/emoji errors take priority over the match check */}
            {confirmPasswordCharError
              ? <CharError message={confirmPasswordCharError} />
              : confirmPassword !== '' && (
                passwordsMatch ? (
                  <p className="text-green-600 font-bold text-sm mt-1">✓ Passwords match</p>
                ) : (
                  <p className="text-red-600 font-bold text-sm mt-1">✗ Passwords do not match</p>
                )
              )
            }
          </div>

          {/* Gender Field */}
          <div className="mb-6">
            <label className="block font-bold mb-2 text-sm uppercase tracking-wide">
              Gender
            </label>
            <div className="flex gap-2">
              {[{ value: 'M', label: 'Male' }, { value: 'F', label: 'Female' }].map(({ value, label }) => (
                <div
                  key={value}
                  onClick={() => setGender(value)}
                  className={`border-2 border-black px-4 py-2 cursor-pointer font-bold transition-colors select-none ${
                    gender === value
                      ? 'bg-black text-white'
                      : 'bg-white text-black hover:bg-gray-100'
                  }`}
                >
                  {label}
                </div>
              ))}
            </div>
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
            {isSubmitting ? 'Creating Account...' : 'Create Account →'}
          </button>
        </form>

        {/* Login Link */}
        <p className="mt-6 text-center text-sm font-semibold">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-black underline hover:text-gray-600 transition-colors"
          >
            Log in →
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Register
