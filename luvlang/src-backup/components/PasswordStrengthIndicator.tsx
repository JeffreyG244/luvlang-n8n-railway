import React from 'react'
import { validatePasswordStrength, checkPasswordInBreach } from '../lib/security'

interface PasswordStrengthIndicatorProps {
  password: string
  onValidationChange?: (isValid: boolean) => void
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  onValidationChange
}) => {
  const [isChecking, setIsChecking] = React.useState(false)
  const [isBreached, setIsBreached] = React.useState(false)
  const [checkComplete, setCheckComplete] = React.useState(false)

  const validation = validatePasswordStrength(password)

  React.useEffect(() => {
    if (password.length > 0 && validation.isValid) {
      checkBreachStatus()
    } else {
      setIsBreached(false)
      setCheckComplete(false)
    }
  }, [password, validation.isValid])

  React.useEffect(() => {
    const finalValid = validation.isValid && !isBreached
    onValidationChange?.(finalValid)
  }, [validation.isValid, isBreached, onValidationChange])

  const checkBreachStatus = async () => {
    if (password.length < 8) return

    setIsChecking(true)
    try {
      const breached = await checkPasswordInBreach(password)
      setIsBreached(breached)
    } catch (error) {
      console.warn('Could not check password breach status:', error)
      setIsBreached(false)
    } finally {
      setIsChecking(false)
      setCheckComplete(true)
    }
  }

  const getStrengthColor = (score: number) => {
    if (score >= 5) return 'bg-green-500'
    if (score >= 3) return 'bg-yellow-500'
    if (score >= 1) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getStrengthText = (score: number) => {
    if (score >= 5) return 'Very Strong'
    if (score >= 3) return 'Strong'
    if (score >= 1) return 'Weak'
    return 'Very Weak'
  }

  if (!password) return null

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Password Strength</span>
        <span className={`text-xs font-medium ${
          validation.score >= 3 ? 'text-green-600' : 'text-red-600'
        }`}>
          {getStrengthText(validation.score)}
        </span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(validation.score)}`}
          style={{ width: `${Math.max((validation.score / 6) * 100, 10)}%` }}
        />
      </div>

      {validation.feedback.length > 0 && (
        <ul className="text-xs text-red-600 space-y-1">
          {validation.feedback.map((feedback, index) => (
            <li key={index} className="flex items-center space-x-1">
              <span className="w-1 h-1 bg-red-600 rounded-full" />
              <span>{feedback}</span>
            </li>
          ))}
        </ul>
      )}

      {password.length >= 8 && (
        <div className="flex items-center space-x-2">
          {isChecking ? (
            <>
              <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-gray-600">Checking for security breaches...</span>
            </>
          ) : checkComplete ? (
            isBreached ? (
              <>
                <span className="w-3 h-3 bg-red-600 rounded-full" />
                <span className="text-xs text-red-600">
                  This password has been found in data breaches. Please choose a different password.
                </span>
              </>
            ) : (
              <>
                <span className="w-3 h-3 bg-green-600 rounded-full" />
                <span className="text-xs text-green-600">
                  Password not found in known breaches ✓
                </span>
              </>
            )
          ) : null}
        </div>
      )}

      <div className="text-xs text-gray-500 space-y-1">
        <div className="grid grid-cols-2 gap-2">
          <div className={`flex items-center space-x-1 ${
            password.length >= 8 ? 'text-green-600' : 'text-gray-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              password.length >= 8 ? 'bg-green-600' : 'bg-gray-300'
            }`} />
            <span>8+ characters</span>
          </div>
          <div className={`flex items-center space-x-1 ${
            /[a-z]/.test(password) ? 'text-green-600' : 'text-gray-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              /[a-z]/.test(password) ? 'bg-green-600' : 'bg-gray-300'
            }`} />
            <span>Lowercase</span>
          </div>
          <div className={`flex items-center space-x-1 ${
            /[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              /[A-Z]/.test(password) ? 'bg-green-600' : 'bg-gray-300'
            }`} />
            <span>Uppercase</span>
          </div>
          <div className={`flex items-center space-x-1 ${
            /\d/.test(password) ? 'text-green-600' : 'text-gray-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              /\d/.test(password) ? 'bg-green-600' : 'bg-gray-300'
            }`} />
            <span>Number</span>
          </div>
          <div className={`flex items-center space-x-1 ${
            /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password) ? 'text-green-600' : 'text-gray-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password) ? 'bg-green-600' : 'bg-gray-300'
            }`} />
            <span>Special char</span>
          </div>
          <div className={`flex items-center space-x-1 ${
            checkComplete && !isBreached ? 'text-green-600' : 'text-gray-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              checkComplete && !isBreached ? 'bg-green-600' : 'bg-gray-300'
            }`} />
            <span>Not breached</span>
          </div>
        </div>
      </div>
    </div>
  )
}