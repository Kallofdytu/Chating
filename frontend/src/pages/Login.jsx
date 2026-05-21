import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res = await axios.post('/api/token/', { username, password })
      localStorage.setItem('access_token',  res.data.access)
      localStorage.setItem('refresh_token', res.data.refresh)
      localStorage.setItem('user_id',       res.data.user_id)
      localStorage.setItem('username',      res.data.username)
      navigate('/')
    } catch {
      setError('Invalid username or password.')
    } finally { setLoading(false) }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>💬</div>
        <h1 style={s.title}>Welcome back</h1>
        <p style={s.subtitle}>Sign in to continue chatting</p>
        <form onSubmit={handleLogin} style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Username</label>
            <input
              style={s.input}
              placeholder="Enter your username"
              value={username}
              autoFocus
              onChange={e => setUsername(e.target.value)}
            />
          </div>
          <div style={s.field}>
            <label style={s.label}>Password</label>
            <input
              style={s.input}
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          {error && <div style={s.error}>{error}</div>}
          <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

const s = {
  page:     { minHeight:'100vh', background:'linear-gradient(135deg,#667eea 0%,#764ba2 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' },
  card:     { background:'#fff', borderRadius:'24px', padding:'48px 40px', width:'100%', maxWidth:'400px', boxShadow:'0 20px 60px rgba(0,0,0,.2)', textAlign:'center' },
  logo:     { fontSize:'48px', marginBottom:'16px' },
  title:    { fontSize:'26px', fontWeight:'700', color:'#1a1a2e', marginBottom:'8px' },
  subtitle: { color:'#6b6b80', fontSize:'15px', marginBottom:'32px' },
  form:     { textAlign:'left' },
  field:    { marginBottom:'18px' },
  label:    { display:'block', fontSize:'13px', fontWeight:'600', color:'#6b6b80', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'.05em' },
  input:    { width:'100%', padding:'13px 16px', border:'2px solid #e4e4e8', borderRadius:'12px', fontSize:'15px', outline:'none', transition:'border-color .2s', background:'#fafafa' },
  btn:      { width:'100%', padding:'14px', background:'linear-gradient(135deg,#6c63ff,#764ba2)', color:'#fff', border:'none', borderRadius:'12px', fontSize:'15px', fontWeight:'600', cursor:'pointer', marginTop:'8px', transition:'opacity .2s, transform .1s' },
  error:    { background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', padding:'10px 14px', borderRadius:'10px', fontSize:'14px', marginBottom:'16px' },
}
