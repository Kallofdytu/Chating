import { useRef, useState, useCallback } from 'react'

export default function useWebRTC(send, currentId) {
  const [callState, setCallState] = useState('idle')
  const [callType, setCallType]   = useState(null)
  const [caller, setCaller]       = useState(null)

  const localStream = useRef(null)
  const pc          = useRef(null)
  const localVideo  = useRef(null)
  const remoteVideo = useRef(null)

  const createPC = useCallback(() => {
    const p = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
    p.onicecandidate = e => { if (e.candidate) send({ message_type:'ice-candidate', candidate: e.candidate }) }
    p.ontrack = e => { if (remoteVideo.current) remoteVideo.current.srcObject = e.streams[0] }
    pc.current = p
    return p
  }, [send])

  const startCall = useCallback(async (type) => {
    setCallType(type); setCallState('calling')
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' })
    localStream.current = stream
    if (localVideo.current) localVideo.current.srcObject = stream
    const p = createPC()
    stream.getTracks().forEach(t => p.addTrack(t, stream))
    const offer = await p.createOffer()
    await p.setLocalDescription(offer)
    send({ message_type: 'call-offer', offer, call_type: type })
  }, [createPC, send])

  const acceptCall = useCallback(async (offer, type) => {
    setCallState('active')
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' })
    localStream.current = stream
    if (localVideo.current) localVideo.current.srcObject = stream
    const p = createPC()
    stream.getTracks().forEach(t => p.addTrack(t, stream))
    await p.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await p.createAnswer()
    await p.setLocalDescription(answer)
    send({ message_type: 'call-answer', answer })
  }, [createPC, send])

  const endCall = useCallback(() => {
    send({ message_type: 'call-end' })
    pc.current?.close(); pc.current = null
    localStream.current?.getTracks().forEach(t => t.stop())
    if (localVideo.current)  localVideo.current.srcObject  = null
    if (remoteVideo.current) remoteVideo.current.srcObject = null
    setCallState('idle'); setCallType(null); setCaller(null)
  }, [send])

  const handleSignal = useCallback(async (data) => {
    if (data.sender_id === currentId) return
    if (data.message_type === 'call-offer') {
      setCaller(data); setCallType(data.call_type); setCallState('receiving')
      await acceptCall(data.offer, data.call_type)
    } else if (data.message_type === 'call-answer' && pc.current) {
      await pc.current.setRemoteDescription(new RTCSessionDescription(data.answer))
      setCallState('active')
    } else if (data.message_type === 'ice-candidate' && pc.current) {
      await pc.current.addIceCandidate(new RTCIceCandidate(data.candidate))
    } else if (data.message_type === 'call-end' || data.message_type === 'call-reject') {
      pc.current?.close(); pc.current = null
      localStream.current?.getTracks().forEach(t => t.stop())
      if (localVideo.current)  localVideo.current.srcObject  = null
      if (remoteVideo.current) remoteVideo.current.srcObject = null
      setCallState('idle'); setCallType(null); setCaller(null)
    }
  }, [acceptCall, currentId])

  return { callState, callType, caller, localVideo, remoteVideo, startCall, endCall, handleSignal }
}
