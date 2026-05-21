import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/auth'
import useWebSocket from '../hooks/useWebSocket'

const COLORS = ['#6c63ff','#f59e0b','#10b981','#ef4444','#3b82f6','#ec4899','#8b5cf6']
function userColor(name) { let h=0; for(const c of name||'') h=(h*31+c.charCodeAt(0))%COLORS.length; return COLORS[h] }

function Avatar({ name, size=36 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:userColor(name), color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'700', fontSize:size*0.38, flexShrink:0 }}>
      {name?.slice(0,2).toUpperCase()||'?'}
    </div>
  )
}

function TypingDots() {
  return (
    <div style={{ display:'flex', gap:'4px', alignItems:'center', padding:'4px 2px' }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ width:7, height:7, borderRadius:'50%', background:'#c0c0d0',
          animation:'bounce 1.2s infinite', animationDelay:`${i*0.2}s` }}/>
      ))}
      <style>{`@keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}`}</style>
    </div>
  )
}

export default function Chat() {
  const { userId } = useParams()
  const navigate   = useNavigate()
  const currentId  = Number(localStorage.getItem('user_id'))
  const token      = localStorage.getItem('access_token')

  const [messages,    setMessages]    = useState([])
  const [otherUser,   setOtherUser]   = useState(null)
  const [text,        setText]        = useState('')
  const [typing,      setTyping]      = useState(false)
  const [connected,   setConnected]   = useState(false)
  const [recording,   setRecording]   = useState(false)
  const [preview,     setPreview]     = useState(null)

  const bottomRef     = useRef(null)
  const typingTimeout = useRef(null)
  const amTyping      = useRef(false)
  const fileRef       = useRef(null)
  const mediaRecorder = useRef(null)
  const audioChunks   = useRef([])

  const onMessage = useCallback((data) => {
    if (data.message_type === 'typing' && data.sender_id !== currentId) {
      setTyping(data.is_typing); return
    }
    if (['call-offer','call-answer','ice-candidate','call-end','call-reject','call-request'].includes(data.message_type)) return
    setMessages(prev => [...prev, data])
  }, [currentId])

  const { send, socket } = useWebSocket(userId, onMessage)

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    api.get('/users/').then(r => { const u = r.data.find(u => u.id === Number(userId)); if(u) setOtherUser(u) })
    api.get(`/messages/${userId}/`).then(r => setMessages(r.data))
  }, [userId])

  useEffect(() => {
    const ws = socket.current; if (!ws) return
    ws.onopen  = () => setConnected(true)
    ws.onclose = () => setConnected(false)
  })

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages, typing])

  function sendText() {
    const c = text.trim(); if (!c) return
    send({ message: c, message_type: 'text' })
    setText('')
    amTyping.current = false
    send({ message_type: 'typing', is_typing: false })
    clearTimeout(typingTimeout.current)
  }

  function handleInput(e) {
    setText(e.target.value)
    if (!amTyping.current) { amTyping.current = true; send({ message_type: 'typing', is_typing: true }) }
    clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => { amTyping.current = false; send({ message_type: 'typing', is_typing: false }) }, 2000)
  }

  async function sendPhoto(e) {
    const file = e.target.files[0]; if (!file) return
    const fd = new FormData(); fd.append('file', file); fd.append('message_type', 'image')
    const res = await fetch(`/api/upload/${userId}/`, { method:'POST', headers:{ Authorization:'Bearer '+token }, body:fd })
    if (res.ok) { const d = await res.json(); send(d) }
    e.target.value = ''
  }

  async function startRecord(e) {
    e.preventDefault()
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder.current = new MediaRecorder(stream)
    audioChunks.current = []
    mediaRecorder.current.ondataavailable = ev => audioChunks.current.push(ev.data)
    mediaRecorder.current.start()
    setRecording(true)
  }

  async function stopRecord() {
    if (!mediaRecorder.current) return
    mediaRecorder.current.stop(); setRecording(false)
    mediaRecorder.current.onstop = async () => {
      const blob = new Blob(audioChunks.current, { type:'audio/webm' })
      const fd = new FormData(); fd.append('file', blob, 'voice.webm'); fd.append('message_type', 'voice')
      const res = await fetch(`/api/upload/${userId}/`, { method:'POST', headers:{ Authorization:'Bearer '+token }, body:fd })
      if (res.ok) { const d = await res.json(); send(d) }
      mediaRecorder.current.stream.getTracks().forEach(t => t.stop())
    }
  }

  function isMine(msg) {
    if (msg.sender_id !== undefined) return msg.sender_id === currentId
    return msg.sender?.id === currentId
  }
  function getName(msg) { return msg.sender?.username || msg.sender_username || '' }
  function getTime(iso)  { const d=new Date(iso); return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0') }

  return (
    <div style={s.page}>
      {/* Header */}
      <header style={s.header}>
        <button style={s.backBtn} onClick={() => navigate('/')}>←</button>
        {otherUser && <Avatar name={otherUser.username} size={40}/>}
        <div style={s.headerInfo}>
          <div style={s.headerName}>{otherUser?.username || '…'}</div>
          <div style={s.headerStatus}>
            {typing ? <span style={{color:'#6c63ff'}}>typing…</span>
              : <span style={{color: connected ? '#22c55e' : '#a0a0b0'}}>{connected ? '● Online' : '○ Connecting'}</span>}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div style={s.messages}>
        {messages.length === 0 && (
          <div style={s.emptyChat}>
            <div style={s.emptyChatIcon}>👋</div>
            <div style={s.emptyChatText}>Say hello to {otherUser?.username}!</div>
          </div>
        )}

        {messages.map((msg, i) => {
          const mine = isMine(msg)
          const type = msg.message_type || 'text'
          const showAvatar = !mine && (i === 0 || isMine(messages[i-1]) || getName(messages[i-1]) !== getName(msg))
          return (
            <div key={i} style={{ ...s.row, justifyContent: mine ? 'flex-end' : 'flex-start' }}>
              {!mine && (
                <div style={{ width:32, flexShrink:0 }}>
                  {showAvatar && <Avatar name={getName(msg)} size={32}/>}
                </div>
              )}
              <div style={{ maxWidth:'65%' }}>
                {!mine && showAvatar && <div style={s.senderName}>{getName(msg)}</div>}
                <div style={{ ...s.bubble, ...(mine ? s.mineBubble : s.theirsBubble) }}>
                  {type === 'image' && (
                    <img
                      src={msg.file || msg.file_url}
                      style={s.imgMsg}
                      alt="img"
                      onClick={() => setPreview(msg.file || msg.file_url)}
                    />
                  )}
                  {type === 'voice' && (
                    <audio controls src={msg.file || msg.file_url} style={s.audioMsg}/>
                  )}
                  {type === 'text' && <span style={s.msgText}>{msg.content}</span>}
                  <div style={{ ...s.time, color: mine ? 'rgba(255,255,255,.6)' : '#a0a0b0' }}>
                    {getTime(msg.created_at)}
                    {mine && <span style={s.tick}>✓✓</span>}
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {typing && (
          <div style={{ ...s.row, justifyContent:'flex-start' }}>
            <div style={{ width:32, flexShrink:0 }}><Avatar name={otherUser?.username} size={32}/></div>
            <div style={{ ...s.bubble, ...s.theirsBubble }}><TypingDots/></div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Input bar */}
      <div style={s.inputBar}>
        <button style={s.iconBtn} onClick={() => fileRef.current.click()} title="Send photo">📷</button>
        <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={sendPhoto}/>
        <button
          style={{ ...s.iconBtn, ...(recording ? s.iconBtnRed : {}) }}
          onMouseDown={startRecord} onMouseUp={stopRecord}
          onTouchStart={startRecord} onTouchEnd={stopRecord}
          title="Hold to record"
        >🎤</button>
        <div style={s.inputWrap}>
          <input
            style={s.input}
            value={text}
            onChange={handleInput}
            onKeyDown={e => e.key === 'Enter' && sendText()}
            placeholder="Type a message…"
          />
        </div>
        <button
          style={{ ...s.sendBtn, opacity: text.trim() ? 1 : 0.5 }}
          onClick={sendText}
        >➤</button>
      </div>

      {/* Image preview modal */}
      {preview && (
        <div style={s.modal} onClick={() => setPreview(null)}>
          <img src={preview} style={s.modalImg} alt="preview"/>
          <button style={s.modalClose} onClick={() => setPreview(null)}>✕</button>
        </div>
      )}
    </div>
  )
}

const s = {
  page:         { display:'flex', flexDirection:'column', height:'100vh', background:'#f0f2f8', fontFamily:'system-ui,sans-serif' },
  header:       { display:'flex', alignItems:'center', gap:'12px', padding:'12px 16px', background:'#fff', borderBottom:'1px solid #eee', boxShadow:'0 1px 8px rgba(0,0,0,.06)', flexShrink:0, zIndex:10 },
  backBtn:      { background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:'#6c63ff', padding:'4px 8px', borderRadius:'8px' },
  headerInfo:   { flex:1 },
  headerName:   { fontSize:'16px', fontWeight:'700', color:'#1a1a2e' },
  headerStatus: { fontSize:'12px', marginTop:'1px' },
  messages:     { flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:'4px' },
  emptyChat:    { margin:'auto', textAlign:'center' },
  emptyChatIcon:{ fontSize:'48px', marginBottom:'12px' },
  emptyChatText:{ color:'#a0a0b0', fontSize:'15px' },
  row:          { display:'flex', alignItems:'flex-end', gap:'8px', marginBottom:'2px' },
  senderName:   { fontSize:'12px', color:'#6b6b80', marginBottom:'4px', marginLeft:'4px' },
  bubble:       { padding:'10px 14px', borderRadius:'18px', maxWidth:'100%' },
  mineBubble:   { background:'linear-gradient(135deg,#6c63ff,#764ba2)', color:'#fff', borderBottomRightRadius:'4px', boxShadow:'0 2px 8px rgba(108,99,255,.3)' },
  theirsBubble: { background:'#fff', color:'#1a1a2e', borderBottomLeftRadius:'4px', boxShadow:'0 1px 4px rgba(0,0,0,.08)' },
  msgText:      { fontSize:'15px', lineHeight:'1.45', wordBreak:'break-word' },
  time:         { fontSize:'11px', marginTop:'4px', textAlign:'right', display:'flex', alignItems:'center', justifyContent:'flex-end', gap:'4px' },
  tick:         { fontSize:'12px' },
  imgMsg:       { maxWidth:'220px', maxHeight:'220px', borderRadius:'12px', display:'block', cursor:'pointer' },
  audioMsg:     { maxWidth:'220px', borderRadius:'8px' },
  inputBar:     { display:'flex', alignItems:'center', gap:'8px', padding:'10px 14px', background:'#fff', borderTop:'1px solid #eee', flexShrink:0 },
  iconBtn:      { background:'#f5f5fa', border:'none', borderRadius:'50%', width:'42px', height:'42px', fontSize:'18px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'background .15s' },
  iconBtnRed:   { background:'#fee2e2', animation:'pulse 1s infinite' },
  inputWrap:    { flex:1 },
  input:        { width:'100%', padding:'11px 18px', border:'1.5px solid #e8e8f0', borderRadius:'24px', fontSize:'15px', outline:'none', background:'#f9f9fc', transition:'border-color .2s' },
  sendBtn:      { background:'linear-gradient(135deg,#6c63ff,#764ba2)', color:'#fff', border:'none', borderRadius:'50%', width:'44px', height:'44px', fontSize:'18px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 2px 8px rgba(108,99,255,.3)', transition:'opacity .2s' },
  modal:        { position:'fixed', inset:0, background:'rgba(0,0,0,.88)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 },
  modalImg:     { maxWidth:'90vw', maxHeight:'90vh', borderRadius:'12px', boxShadow:'0 20px 60px rgba(0,0,0,.5)' },
  modalClose:   { position:'absolute', top:'20px', right:'24px', background:'rgba(255,255,255,.15)', border:'none', color:'#fff', fontSize:'20px', width:'40px', height:'40px', borderRadius:'50%', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' },
}
