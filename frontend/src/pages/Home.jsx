import { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import NavDrawer from '../components/NavDrawer'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const genderEmoji = (gender) => (gender === 'M' ? '👨' : '👩')

const formatTime = (ts) => {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** A single row in the conversations / search-results list */
const UserRow = ({ user, lastMessage, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 border-b-2 border-black text-left
                transition-colors cursor-pointer
                ${isActive ? 'bg-yellow-300' : 'bg-white hover:bg-gray-50'}`}
  >
    <span className="text-2xl leading-none flex-shrink-0">{genderEmoji(user.gender)}</span>
    <div className="flex-1 min-w-0">
      <p className="font-black text-sm truncate">@{user.username}</p>
      {lastMessage && (
        <p className="text-xs text-gray-500 font-medium truncate">{lastMessage}</p>
      )}
    </div>
  </button>
)

/** Placeholder shown in the right pane when no conversation is selected */
const EmptyPane = () => (
  <div className="flex-1 flex items-center justify-center bg-[#F8F8F0]">
    <div className="border-4 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] px-8 py-6 text-center max-w-xs">
      <div className="text-4xl mb-3">💬</div>
      <p className="font-black text-lg">Select a chat to start messaging</p>
    </div>
  </div>
)

/** A single chat bubble */
const MessageBubble = ({ message, isOwn }) => (
  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
    <div
      className={`max-w-[70%] px-4 py-2 border-2 border-black text-sm font-medium
                  ${isOwn
                    ? 'bg-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]'
                    : 'bg-white text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                  }`}
    >
      <p className="break-words">{message.content}</p>
      <p className={`text-[10px] mt-1 text-right ${isOwn ? 'text-gray-400' : 'text-gray-500'}`}>
        {formatTime(message.created_at)}
      </p>
    </div>
  </div>
)

// ─── Home Page ─────────────────────────────────────────────────────────────────
const Home = () => {
  const { user } = useAuth()
  const socket = useSocket()

  // ── Drawer ────────────────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false)

  // ── Conversations list ────────────────────────────────────────────────────
  const [conversations, setConversations] = useState([])
  const [loadingConvos, setLoadingConvos] = useState(true)

  // ── Search ────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchError, setSearchError] = useState('')
  // True only after the user has explicitly triggered a search (Enter / button click)
  const [searchExecuted, setSearchExecuted] = useState(false)
  const searchInputRef = useRef(null)

  // ── Active conversation ───────────────────────────────────────────────────
  const [activeChat, setActiveChat] = useState(null) // { id, username, gender }
  const [messages, setMessages] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [messageInput, setMessageInput] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)
  const prevChatIdRef = useRef(null)

  // ─── Load conversations on mount ───────────────────────────────────────────
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await axios.get('/api/messages', { withCredentials: true })
        setConversations(res.data.conversations)
      } catch (err) {
        console.error('Failed to load conversations:', err)
      } finally {
        setLoadingConvos(false)
      }
    }
    fetchConversations()
  }, [])

  // ─── Socket: receive messages ──────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return

    const handleReceive = (msg) => {
      // Append to message list if this message belongs to the currently open conversation.
      // The message is part of the conversation when either:
      //   • the other person sent it to us  (sender = activeChat, receiver = us)
      //   • we sent it to the other person  (sender = us, receiver = activeChat)
      if (activeChat) {
        const belongsHere =
          (msg.sender_id === activeChat.id && msg.receiver_id === user.id) ||
          (msg.sender_id === user.id      && msg.receiver_id === activeChat.id)

        if (belongsHere) {
          setMessages((prev) => [...prev, msg])
        }
      }

      // Update (or insert) this conversation's last message in the sidebar
      setConversations((prev) => {
        const otherId =
          msg.sender_id === user.id ? msg.receiver_id : msg.sender_id

        const existing = prev.find((c) => c.other_id === otherId)
        if (existing) {
          return [
            { ...existing, last_message: msg.content, last_message_at: msg.created_at },
            ...prev.filter((c) => c.other_id !== otherId),
          ]
        }
        // New conversation — we need at minimum other_id + last_message
        return [
          {
            other_id: otherId,
            username: activeChat?.id === otherId ? activeChat.username : 'Unknown',
            gender: activeChat?.id === otherId ? activeChat.gender : 'Male',
            last_message: msg.content,
            last_message_at: msg.created_at,
          },
          ...prev,
        ]
      })
    }

    socket.on('receive_message', handleReceive)
    return () => socket.off('receive_message', handleReceive)
  }, [socket, activeChat, user?.id])

  // ─── Join / leave socket rooms when active chat changes ───────────────────
  useEffect(() => {
    if (!socket) return

    if (prevChatIdRef.current) {
      socket.emit('leave_conversation', { otherUserId: prevChatIdRef.current })
    }
    if (activeChat) {
      socket.emit('join_conversation', { otherUserId: activeChat.id })
    }
    prevChatIdRef.current = activeChat?.id ?? null
  }, [socket, activeChat])

  // ─── Load message history when active chat changes ────────────────────────
  useEffect(() => {
    if (!activeChat) {
      setMessages([])
      return
    }

    const fetchMessages = async () => {
      setLoadingMessages(true)
      try {
        const res = await axios.get(`/api/messages/${activeChat.id}`, {
          withCredentials: true,
        })
        setMessages(res.data.messages)
      } catch (err) {
        console.error('Failed to load messages:', err)
      } finally {
        setLoadingMessages(false)
      }
    }
    fetchMessages()
  }, [activeChat])

  // ─── Auto-scroll to bottom on new messages ────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ─── Search ───────────────────────────────────────────────────────────────
  const executeSearch = useCallback(async () => {
    const q = searchQuery.trim()
    if (!q) return

    setIsSearching(true)
    setSearchError('')
    setSearchResults([])
    setSearchExecuted(true)

    try {
      const res = await axios.get('/api/users/search', {
        params: { query: q },
        withCredentials: true,
      })
      setSearchResults(res.data.users)
    } catch (err) {
      setSearchError('Search failed. Try again.')
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery])

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') executeSearch()
  }

  const handleSearchBlur = () => {
    // Delay so click on result registers before clearing focus
    setTimeout(() => {
      if (searchQuery.trim() === '') {
        setSearchFocused(false)
        setSearchResults([])
        setSearchError('')
      }
    }, 150)
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setSearchError('')
    setSearchExecuted(false)
    setSearchFocused(false)
    searchInputRef.current?.blur()
  }

  // ─── Open a conversation ──────────────────────────────────────────────────
  const openConversation = (chatUser) => {
    setActiveChat({ id: chatUser.other_id ?? chatUser.id, username: chatUser.username, gender: chatUser.gender })
    clearSearch()
  }

  // ─── Send message ─────────────────────────────────────────────────────────
  const sendMessage = useCallback(() => {
    const text = messageInput.trim()
    if (!socket || !activeChat || !text || sending) return

    // Optimistically clear the input immediately so the user can keep typing
    setMessageInput('')
    setSending(true)

    socket.emit('send_message', {
      receiverId: activeChat.id,
      content: text,
    })

    // Re-enable the button after a short guard window to prevent double-send
    setTimeout(() => setSending(false), 300)
  }, [socket, activeChat, messageInput, sending])

  const handleMessageKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <NavDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="flex h-screen bg-[#93C5FD] overflow-hidden">

        {/* ══ LEFT SIDEBAR ══════════════════════════════════════════════════ */}
        <aside className="w-80 flex-shrink-0 flex flex-col bg-white border-r-4 border-black">

          {/* ── Top bar ─────────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 px-4 py-3 border-b-4 border-black bg-yellow-300">
            {/* Hamburger button */}
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="w-10 h-10 flex items-center justify-center border-2 border-black font-black text-xl
                         bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
                         hover:bg-gray-50 active:translate-x-0.5 active:translate-y-0.5
                         active:shadow-none transition-all cursor-pointer flex-shrink-0"
            >
              ☰
            </button>

            {/* App title */}
            <span className="font-black text-lg tracking-tight flex-1">ChatApp</span>

            {/* Current user avatar */}
            <span className="text-2xl leading-none">{genderEmoji(user?.gender)}</span>
          </div>

          {/* ── Search bar ──────────────────────────────────────────────── */}
          <div className="px-3 py-3 border-b-2 border-black">
            <div className="flex gap-2">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  // Reset "no users found" state when the user edits the query
                  if (searchExecuted) setSearchExecuted(false)
                }}
                onFocus={() => setSearchFocused(true)}
                onBlur={handleSearchBlur}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search users…"
                className="flex-1 border-2 border-black px-3 py-2 text-sm font-medium
                           focus:outline-none focus:ring-2 focus:ring-black
                           shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              />
              {/* Search submit button — always visible, never shifts */}
              <button
                onClick={executeSearch}
                disabled={!searchQuery.trim() || isSearching}
                className="px-3 py-2 border-2 border-black bg-black text-white font-bold text-sm
                           shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                           hover:bg-gray-800 active:translate-x-0.5 active:translate-y-0.5
                           active:shadow-none transition-all cursor-pointer
                           disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Search"
              >
                {isSearching ? '…' : '→'}
              </button>
            </div>
          </div>

          {/* ── List area ───────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto">

            {/* Search results view */}
            {searchFocused ? (
              <>
                {searchError && (
                  <p className="px-4 py-3 text-sm font-bold text-red-600 border-b-2 border-black">
                    {searchError}
                  </p>
                )}
                {isSearching && (
                  <p className="px-4 py-3 text-sm font-bold text-gray-500 border-b-2 border-black">
                    Searching…
                  </p>
                )}
                {!isSearching && searchExecuted && searchResults.length === 0 && searchQuery.trim() && !searchError && (
                  <p className="px-4 py-3 text-sm font-bold text-gray-500 border-b-2 border-black">
                    No users found.
                  </p>
                )}
                {!isSearching && searchResults.length === 0 && !searchQuery.trim() && (
                  <p className="px-4 py-3 text-sm font-medium text-gray-400">
                    Type a username and press Enter or →
                  </p>
                )}
                {searchResults.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    isActive={activeChat?.id === u.id}
                    onClick={() => openConversation(u)}
                  />
                ))}
              </>
            ) : (
              /* Recent conversations view */
              <>
                {loadingConvos && (
                  <p className="px-4 py-3 text-sm font-bold text-gray-500">Loading…</p>
                )}
                {!loadingConvos && conversations.length === 0 && (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm font-bold text-gray-400">No conversations yet.</p>
                    <p className="text-xs text-gray-400 mt-1">Search for a user to get started!</p>
                  </div>
                )}
                {conversations.map((c) => (
                  <UserRow
                    key={c.other_id}
                    user={{ id: c.other_id, username: c.username, gender: c.gender }}
                    lastMessage={c.last_message}
                    isActive={activeChat?.id === c.other_id}
                    onClick={() =>
                      openConversation({
                        other_id: c.other_id,
                        username: c.username,
                        gender: c.gender,
                      })
                    }
                  />
                ))}
              </>
            )}
          </div>
        </aside>

        {/* ══ RIGHT PANE ════════════════════════════════════════════════════ */}
        <main className="flex-1 flex flex-col min-w-0">
          {activeChat ? (
            <>
              {/* ── Chat header ─────────────────────────────────────────── */}
              <div className="flex items-center gap-3 px-5 py-3 bg-white border-b-4 border-black">
                <span className="text-2xl leading-none">{genderEmoji(activeChat.gender)}</span>
                <div>
                  <p className="font-black">@{activeChat.username}</p>
                </div>
              </div>

              {/* ── Messages area ───────────────────────────────────────── */}
              <div className="flex-1 overflow-y-auto px-6 py-4 bg-[#F8F8F0]">
                {loadingMessages && (
                  <p className="text-center text-sm font-bold text-gray-400 py-4">
                    Loading messages…
                  </p>
                )}
                {!loadingMessages && messages.length === 0 && (
                  <div className="flex justify-center mt-6">
                    <div className="border-2 border-black bg-white px-4 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                      <p className="text-xs font-bold text-gray-500">
                        No messages yet. Say hello! 👋
                      </p>
                    </div>
                  </div>
                )}
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isOwn={msg.sender_id === user?.id}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* ── Message input ────────────────────────────────────────── */}
              <div className="px-4 py-3 bg-white border-t-4 border-black flex gap-3">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={handleMessageKeyDown}
                  placeholder="Type a message… (Enter to send)"
                  className="flex-1 border-2 border-black px-4 py-3 text-sm font-medium
                             focus:outline-none focus:ring-2 focus:ring-black
                             shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                />
                <button
                  onClick={sendMessage}
                  disabled={!messageInput.trim() || sending || !socket}
                  className="px-5 py-3 bg-black text-white font-black border-2 border-black
                             shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                             hover:bg-gray-800 active:translate-x-0.5 active:translate-y-0.5
                             active:shadow-none transition-all cursor-pointer
                             disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Send →
                </button>
              </div>
            </>
          ) : (
            <EmptyPane />
          )}
        </main>
      </div>
    </>
  )
}

export default Home
