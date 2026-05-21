import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/auth'

function Avatar({ name, size = 44, color = '#6c63ff' }) {
  const initials = name?.slice(0, 2).toUpperCase() || '?'
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: '700', fontSize: size * 0.36, flexShrink: 0,
    }}>{initials}</div>
  )
}

const COLORS = ['#6c63ff','#f59e0b','#10b981','#ef4444','#3b82f6','#ec4899','#8b5cf6']
function userColor(name) { let h=0; for(const c of name||'') h=(h*31+c.charCodeAt(0))%COLORS.length; return COLORS[h] }

export default function Inbox() {
  const [users,   setUsers]   = useState([])
  const [search,  setSearch]  = useState('')
  const [loading, setLoading] = useState(true)
  const navigate  = useNavigate()
  const me = localStorage.getItem('username') || ''

  useEffect(() => {
    if (!localStorage.getItem('access_token')) { navigate('/login'); return }
    api.get('/users/')
      .then(r => setUsers(r.data))
      .catch(() => navigate('/login'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = users.filter(u => u.username.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={s.page}>
      {/* Sidebar */}
      <aside style={s.sidebar}>
        {/* Header */}
        <div style={s.sideHeader}>
          <div style={s.brandRow}>
            <div style={s.brandIcon}>💬</div>
            <span style={s.brandName}>Chats</span>
          </div>
          <div style={s.meRow}>
            <Avatar name={me} size={36} color={userColor(me)}/>
            <div style={s.meInfo}>
              <div style={s.meName}>{me}</div>
              <div style={s.meStatus}>● Online</div>
            </div>
            <button style={s.logoutBtn} onClick={() => { localStorage.clear(); navigate('/login') }} title="Logout">
              ↩
            </button>
          </div>
        </div>

        {/* Search */}
        <div style={s.searchWrap}>
          <span style={s.searchIcon}>🔍</span>
          <input
            style={s.searchInput}
            placeholder="Search people…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* User list */}
        <div style={s.list}>
          {loading && <div style={s.empty}>Loading…</div>}
          {!loading && filtered.length === 0 && <div style={s.empty}>No users found</div>}
          {filtered.map(u => (
            <div key={u.id} style={s.userRow} onClick={() => navigate(`/chat/${u.id}`)}>
              <div style={{ position:'relative' }}>
                <Avatar name={u.username} size={46} color={userColor(u.username)}/>
                <span style={s.onlineDot}/>
              </div>
              <div style={s.userInfo}>
                <div style={s.userName}>{u.username}</div>
                <div style={s.userLast}>Tap to chat</div>
              </div>
              <span style={s.arrow}>›</span>
            </div>
          ))}
        </div>
      </aside>

      {/* Welcome panel */}
      <main style={s.main}>
        <div style={s.welcome}>
          <div style={s.welcomeIcon}>💬</div>
          <h2 style={s.welcomeTitle}>Select a conversation</h2>
          <p style={s.welcomeText}>Choose a person from the left to start chatting</p>
        </div>
      </main>
    </div>
  )
}

const s = {
  page:        { display:'flex', height:'100vh', background:'#f0f2f8', fontFamily:'system-ui,sans-serif' },
  sidebar:     { width:'320px', background:'#fff', display:'flex', flexDirection:'column', borderRight:'1px solid #e8e8f0', flexShrink:0 },
  sideHeader:  { padding:'20px 16px 12px', borderBottom:'1px solid #f0f0f5' },
  brandRow:    { display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' },
  brandIcon:   { fontSize:'24px' },
  brandName:   { fontSize:'20px', fontWeight:'700', color:'#1a1a2e' },
  meRow:       { display:'flex', alignItems:'center', gap:'10px' },
  meInfo:      { flex:1 },
  meName:      { fontSize:'14px', fontWeight:'600', color:'#1a1a2e' },
  meStatus:    { fontSize:'12px', color:'#22c55e' },
  logoutBtn:   { background:'#f5f5fa', border:'none', borderRadius:'8px', width:'32px', height:'32px', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center', color:'#6b6b80' },
  searchWrap:  { display:'flex', alignItems:'center', gap:'8px', margin:'12px 16px', background:'#f5f5fa', borderRadius:'12px', padding:'8px 14px' },
  searchIcon:  { fontSize:'15px' },
  searchInput: { border:'none', background:'transparent', outline:'none', fontSize:'14px', flex:1, color:'#1a1a2e' },
  list:        { flex:1, overflowY:'auto', padding:'4px 0' },
  userRow:     { display:'flex', alignItems:'center', gap:'12px', padding:'12px 16px', cursor:'pointer', transition:'background .15s', borderRadius:'0' },
  onlineDot:   { position:'absolute', bottom:2, right:2, width:11, height:11, borderRadius:'50%', background:'#22c55e', border:'2px solid #fff' },
  userInfo:    { flex:1, minWidth:0 },
  userName:    { fontSize:'15px', fontWeight:'600', color:'#1a1a2e', marginBottom:'2px' },
  userLast:    { fontSize:'13px', color:'#a0a0b0', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  arrow:       { color:'#c0c0d0', fontSize:'20px' },
  empty:       { padding:'32px', textAlign:'center', color:'#a0a0b0', fontSize:'14px' },
  main:        { flex:1, display:'flex', alignItems:'center', justifyContent:'center' },
  welcome:     { textAlign:'center' },
  welcomeIcon: { fontSize:'64px', marginBottom:'16px' },
  welcomeTitle:{ fontSize:'22px', fontWeight:'700', color:'#1a1a2e', marginBottom:'8px' },
  welcomeText: { fontSize:'15px', color:'#a0a0b0' },
}
