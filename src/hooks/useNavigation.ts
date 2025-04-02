import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUI } from '../contexts/UIContext'

interface NavigationCommand {
  type: 'navigate' | 'scroll' | 'click' | 'search'
  target?: string
  value?: string
}

export function useNavigation() {
  const navigate = useNavigate()
  const { uiPreferences } = useUI()
  const [isListening, setIsListening] = useState(false)
  const [gestureRecognizer, setGestureRecognizer] = useState<any>(null)

  useEffect(() => {
    if (uiPreferences.voiceNavigation) {
      setupVoiceRecognition()
    }
    if (uiPreferences.gestureNavigation) {
      setupGestureRecognition()
    }

    return () => {
      if (gestureRecognizer) {
        gestureRecognizer.stop()
      }
    }
  }, [uiPreferences.voiceNavigation, uiPreferences.gestureNavigation])

  const setupVoiceRecognition = () => {
    if (!('webkitSpeechRecognition' in window)) {
      console.warn('Voice recognition not supported')
      return
    }

    const recognition = new (window as any).webkitSpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('')

      handleVoiceCommand(transcript)
    }

    recognition.onerror = (event: any) => {
      console.error('Voice recognition error:', event.error)
      setIsListening(false)
    }

    recognition.onend = () => {
      if (isListening) {
        recognition.start()
      }
    }

    return recognition
  }

  const setupGestureRecognition = async () => {
    try {
      // Load TensorFlow.js and the gesture recognition model
      const tf = await import('@tensorflow/tfjs')
      const model = await import('@tensorflow-models/handpose')

      // Initialize the model
      const recognizer = await model.load()
      setGestureRecognizer(recognizer)

      // Start video stream
      const video = document.createElement('video')
      video.width = 640
      video.height = 480
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      video.srcObject = stream

      // Start gesture recognition loop
      const detectGestures = async () => {
        if (!gestureRecognizer) return

        const predictions = await gestureRecognizer.estimateHands(video)
        if (predictions.length > 0) {
          handleGestureCommand(predictions[0])
        }

        requestAnimationFrame(detectGestures)
      }

      detectGestures()
    } catch (error) {
      console.error('Gesture recognition setup error:', error)
    }
  }

  const handleVoiceCommand = (transcript: string) => {
    const command = parseVoiceCommand(transcript)
    if (command) {
      executeCommand(command)
    }
  }

  const handleGestureCommand = (prediction: any) => {
    const command = parseGestureCommand(prediction)
    if (command) {
      executeCommand(command)
    }
  }

  const parseVoiceCommand = (transcript: string): NavigationCommand | null => {
    const lowerTranscript = transcript.toLowerCase()

    // Navigation commands
    if (lowerTranscript.includes('go to') || lowerTranscript.includes('navigate to')) {
      const target = transcript.split('to')[1]?.trim()
      return { type: 'navigate', target }
    }

    // Scroll commands
    if (lowerTranscript.includes('scroll')) {
      if (lowerTranscript.includes('up')) {
        return { type: 'scroll', target: 'up' }
      }
      if (lowerTranscript.includes('down')) {
        return { type: 'scroll', target: 'down' }
      }
    }

    // Click commands
    if (lowerTranscript.includes('click') || lowerTranscript.includes('tap')) {
      const target = transcript.split('click')[1]?.trim() || transcript.split('tap')[1]?.trim()
      return { type: 'click', target }
    }

    // Search commands
    if (lowerTranscript.includes('search for')) {
      const query = transcript.split('search for')[1]?.trim()
      return { type: 'search', value: query }
    }

    return null
  }

  const parseGestureCommand = (prediction: any): NavigationCommand | null => {
    // Map hand gestures to commands
    const gestures = {
      swipeUp: { type: 'scroll', target: 'up' },
      swipeDown: { type: 'scroll', target: 'down' },
      tap: { type: 'click' },
      search: { type: 'search' },
    }

    // Analyze hand landmarks to determine gesture
    const landmarks = prediction.landmarks
    const gesture = analyzeHandLandmarks(landmarks)

    return gestures[gesture] || null
  }

  const analyzeHandLandmarks = (landmarks: any[]): string => {
    // Implement hand landmark analysis logic
    // This is a simplified example
    const thumb = landmarks[4]
    const index = landmarks[8]
    const middle = landmarks[12]

    // Calculate distances and angles between landmarks
    const thumbIndexDistance = calculateDistance(thumb, index)
    const indexMiddleDistance = calculateDistance(index, middle)

    // Determine gesture based on landmark positions
    if (thumbIndexDistance < 0.1) {
      return 'tap'
    } else if (indexMiddleDistance > 0.2) {
      return 'search'
    }

    return ''
  }

  const calculateDistance = (point1: any, point2: any): number => {
    return Math.sqrt(
      Math.pow(point1[0] - point2[0], 2) +
      Math.pow(point1[1] - point2[1], 2) +
      Math.pow(point1[2] - point2[2], 2)
    )
  }

  const executeCommand = useCallback((command: NavigationCommand) => {
    switch (command.type) {
      case 'navigate':
        if (command.target) {
          navigate(`/${command.target.toLowerCase().replace(/\s+/g, '-')}`)
        }
        break

      case 'scroll':
        if (command.target === 'up') {
          window.scrollBy({ top: -100, behavior: 'smooth' })
        } else if (command.target === 'down') {
          window.scrollBy({ top: 100, behavior: 'smooth' })
        }
        break

      case 'click':
        if (command.target) {
          const element = findElementByText(command.target)
          if (element) {
            element.click()
          }
        }
        break

      case 'search':
        if (command.value) {
          navigate(`/search?q=${encodeURIComponent(command.value)}`)
        }
        break
    }
  }, [navigate])

  const findElementByText = (text: string): HTMLElement | null => {
    const elements = document.querySelectorAll('button, a, [role="button"]')
    for (const element of elements) {
      if (element.textContent?.toLowerCase().includes(text.toLowerCase())) {
        return element as HTMLElement
      }
    }
    return null
  }

  const startListening = useCallback(() => {
    if (uiPreferences.voiceNavigation) {
      setIsListening(true)
      const recognition = setupVoiceRecognition()
      recognition?.start()
    }
  }, [uiPreferences.voiceNavigation])

  const stopListening = useCallback(() => {
    setIsListening(false)
  }, [])

  return {
    isListening,
    startListening,
    stopListening,
  }
} 