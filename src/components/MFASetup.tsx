import React, { useState } from 'react'
import {
  Box,
  Button,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material'
import { useAuth } from '../hooks/useAuth'

const steps = ['Choose Method', 'Verify Code']

export function MFASetup() {
  const { setupMFA, verifyMFA, loading, error } = useAuth()
  const [activeStep, setActiveStep] = useState(0)
  const [method, setMethod] = useState<'sms' | 'email'>('email')
  const [code, setCode] = useState('')
  const [verificationError, setVerificationError] = useState<string | null>(null)
  const [isSetupComplete, setIsSetupComplete] = useState(false)

  const handleMethodChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setMethod(event.target.value as 'sms' | 'email')
  }

  const handleCodeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCode(event.target.value)
    setVerificationError(null)
  }

  const handleNext = async () => {
    try {
      if (activeStep === 0) {
        await setupMFA(method)
        setActiveStep(1)
      } else {
        const isValid = await verifyMFA(code)
        if (isValid) {
          setIsSetupComplete(true)
        } else {
          setVerificationError('Invalid verification code')
        }
      }
    } catch (error) {
      console.error('MFA setup error:', error)
      setVerificationError(error instanceof Error ? error.message : 'Setup failed')
    }
  }

  const handleBack = () => {
    setActiveStep(0)
    setCode('')
    setVerificationError(null)
  }

  if (isSetupComplete) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          p: 3,
        }}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          Two-factor authentication has been successfully set up!
        </Alert>
        <Typography variant="body1" color="text.secondary">
          You will now be required to enter a verification code when signing in.
        </Typography>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        p: 3,
      }}
    >
      <Stepper activeStep={activeStep} sx={{ width: '100%', mb: 3 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ width: '100%' }}>
          {error.message}
        </Alert>
      )}

      {verificationError && (
        <Alert severity="error" sx={{ width: '100%' }}>
          {verificationError}
        </Alert>
      )}

      {activeStep === 0 ? (
        <FormControl fullWidth>
          <InputLabel>Verification Method</InputLabel>
          <Select
            value={method}
            label="Verification Method"
            onChange={handleMethodChange}
            disabled={loading}
          >
            <MenuItem value="email">Email</MenuItem>
            <MenuItem value="sms">SMS</MenuItem>
          </Select>
        </FormControl>
      ) : (
        <TextField
          fullWidth
          label="Verification Code"
          value={code}
          onChange={handleCodeChange}
          disabled={loading}
          error={!!verificationError}
          helperText={verificationError}
        />
      )}

      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        {activeStep > 0 && (
          <Button
            variant="outlined"
            onClick={handleBack}
            disabled={loading}
          >
            Back
          </Button>
        )}
        <Button
          variant="contained"
          onClick={handleNext}
          disabled={loading || (activeStep === 1 && !code)}
        >
          {loading ? (
            <CircularProgress size={24} />
          ) : activeStep === 0 ? (
            'Next'
          ) : (
            'Verify'
          )}
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        {activeStep === 0
          ? 'Choose how you want to receive verification codes'
          : 'Enter the verification code sent to your device'}
      </Typography>
    </Box>
  )
} 