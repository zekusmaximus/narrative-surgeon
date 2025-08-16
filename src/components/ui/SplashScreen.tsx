/**
 * Professional Splash Screen Component
 * Displays during application startup with loading progress
 */

import React, { useState, useEffect } from 'react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Feather, Target, BarChart3, Users, Download } from 'lucide-react'

interface SplashScreenProps {
  isVisible: boolean
  onComplete?: () => void
}

interface LoadingStep {
  id: string
  label: string
  icon: React.ComponentType<any>
  duration: number
}

export function SplashScreen({ isVisible, onComplete }: SplashScreenProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  const loadingSteps: LoadingStep[] = [
    {
      id: 'init',
      label: 'Initializing application',
      icon: BookOpen,
      duration: 800
    },
    {
      id: 'editor',
      label: 'Loading writing engine',
      icon: Feather,
      duration: 600
    },
    {
      id: 'ai',
      label: 'Connecting to AI services',
      icon: BarChart3,
      duration: 1000
    },
    {
      id: 'publishing',
      label: 'Preparing publishing tools',
      icon: Target,
      duration: 700
    },
    {
      id: 'agents',
      label: 'Loading agent database',
      icon: Users,
      duration: 500
    },
    {
      id: 'export',
      label: 'Initializing export formats',
      icon: Download,
      duration: 400
    }
  ]

  useEffect(() => {
    if (!isVisible) {
      setProgress(0)
      setCurrentStep(0)
      setIsComplete(false)
      return
    }

    let stepIndex = 0
    let totalElapsed = 0
    const totalDuration = loadingSteps.reduce((sum, step) => sum + step.duration, 0)

    const runStep = () => {
      if (stepIndex >= loadingSteps.length) {
        setIsComplete(true)
        setTimeout(() => {
          onComplete?.()
        }, 500)
        return
      }

      const step = loadingSteps[stepIndex]
      setCurrentStep(stepIndex)

      const startTime = Date.now()
      const updateProgress = () => {
        const elapsed = Date.now() - startTime
        const stepProgress = Math.min(elapsed / step.duration, 1)
        const overallProgress = ((totalElapsed + elapsed) / totalDuration) * 100
        
        setProgress(overallProgress)

        if (stepProgress < 1) {
          requestAnimationFrame(updateProgress)
        } else {
          totalElapsed += step.duration
          stepIndex++
          setTimeout(runStep, 50) // Small delay between steps
        }
      }

      requestAnimationFrame(updateProgress)
    }

    const timer = setTimeout(runStep, 500)
    return () => clearTimeout(timer)
  }, [isVisible, onComplete])

  if (!isVisible) return null

  const currentStepData = loadingSteps[currentStep] || loadingSteps[0]
  const IconComponent = currentStepData.icon

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center z-50">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-repeat" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000' fill-opacity='0.1'%3E%3Cpath d='M20 20c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10zm10 0c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10z'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center max-w-md mx-auto px-8">
        {/* Logo */}
        <div className="mb-8">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Narrative Surgeon
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Professional manuscript writing & publishing
          </p>
        </div>

        {/* Loading indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg">
              <IconComponent className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {currentStepData.label}
          </div>
          
          <Progress 
            value={progress} 
            className="w-full h-2 mb-2"
          />
          
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {Math.round(progress)}% complete
          </div>
        </div>

        {/* Features preview */}
        <div className="grid grid-cols-2 gap-3 mb-6 text-xs">
          <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg backdrop-blur-sm">
            <Feather className="w-3 h-3 text-blue-500" />
            <span>AI-Powered Writing</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg backdrop-blur-sm">
            <Target className="w-3 h-3 text-green-500" />
            <span>Agent Research</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg backdrop-blur-sm">
            <BarChart3 className="w-3 h-3 text-purple-500" />
            <span>Performance Analytics</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg backdrop-blur-sm">
            <Download className="w-3 h-3 text-orange-500" />
            <span>Industry Exports</span>
          </div>
        </div>

        {/* Version info */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Badge variant="secondary" className="text-xs">
            v1.0.0
          </Badge>
          <span>•</span>
          <span>Professional Edition</span>
        </div>

        {/* Completion animation */}
        {isComplete && (
          <div className="absolute inset-0 bg-gradient-to-t from-green-50 to-transparent dark:from-green-900/20 flex items-center justify-center rounded-lg">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <div className="text-lg font-semibold text-green-700 dark:text-green-400">
                Ready to Write
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading dots animation */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="flex space-x-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-2 h-2 bg-blue-500 rounded-full animate-pulse`}
              style={{
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1s'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default SplashScreen