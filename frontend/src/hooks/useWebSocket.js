import { useEffect, useRef } from 'react'

export default function useWebSocket(userId, onMessage) {
  const socketRef = useRef(null)

  useEffect(() => {
    if (!userId) return
    const token = localStorage.getItem('access_token') || ''
    const ws = new WebSocket(`wss://${location.host}/ws/chat/${userId}/?token=${token}`)
    socketRef.current = ws
    ws.onmessage = e => onMessage(JSON.parse(e.data))
    ws.onopen  = () => console.log('WS connected')
    ws.onclose = () => console.log('WS disconnected')
    return () => ws.close()
  }, [userId])

  const send = (data) => {
    if (socketRef.current?.readyState === WebSocket.OPEN)
      socketRef.current.send(JSON.stringify(data))
  }

  return { send, socket: socketRef }
}
