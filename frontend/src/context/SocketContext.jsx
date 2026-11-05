import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext(null)

const SocketProvider = ({ children }) => {
  const { user } = useAuth()
  const socketRef = useRef(null)
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    if (!user) {
      // Disconnect and clean up when the user logs out
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
        setSocket(null)
      }
      return
    }

    // Prevent double-connecting if already live (e.g. React StrictMode double-invoke)
    if (socketRef.current?.connected) return

    /**
     * Fetch the raw JWT via the /api/auth/token endpoint so we can pass it
     * to Socket.IO's auth handshake (httpOnly cookies aren't readable by JS).
     */
    const connect = async () => {
      try {
        const res = await fetch('/api/auth/token', { credentials: 'include' })
        if (!res.ok) {
          console.error('[Socket] Failed to fetch token:', res.status)
          return
        }
        const { token } = await res.json()

        /**
         * Connect to the backend directly on port 5000.
         *
         * WHY NOT window.location.origin?
         * The Vite dev server runs on :5173. Its proxy only forwards /api
         * HTTP requests. Socket.IO needs to upgrade to WebSocket on /socket.io —
         * a separate path that Vite wouldn't proxy without explicit `ws: true`
         * config. Connecting straight to :5000 avoids the proxy entirely for
         * the socket, which is the most reliable approach in development.
         *
         * The /socket.io proxy rule in vite.config.js is kept as a fallback
         * so the app also works when served through a reverse proxy in
         * production-like setups.
         */
        const BACKEND_URL =
          import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

        const newSocket = io(BACKEND_URL, {
          auth: { token },
          withCredentials: true,
          // Try WebSocket first, fall back to HTTP long-polling
          transports: ['websocket', 'polling'],
        })

        newSocket.on('connect', () => {
          console.log('[Socket] Connected — id:', newSocket.id)
        })

        newSocket.on('connect_error', (err) => {
          console.error('[Socket] Connection error:', err.message)
        })

        newSocket.on('disconnect', (reason) => {
          console.log('[Socket] Disconnected:', reason)
        })

        socketRef.current = newSocket
        setSocket(newSocket)
      } catch (err) {
        console.error('[Socket] Unexpected error during connect:', err)
      }
    }

    connect()

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
        setSocket(null)
      }
    }
  }, [user])

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)
export default SocketProvider
