import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Inbox from './pages/Inbox'
import Chat  from './pages/Chat'

function PrivateRoute({ children }) {
  return localStorage.getItem('access_token') ? children : <Navigate to="/login"/>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login/>}/>
        <Route path="/" element={<PrivateRoute><Inbox/></PrivateRoute>}/>
        <Route path="/chat/:userId" element={<PrivateRoute><Chat/></PrivateRoute>}/>
      </Routes>
    </BrowserRouter>
  )
}
