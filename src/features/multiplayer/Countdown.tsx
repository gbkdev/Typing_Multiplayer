import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { sounds } from '@/lib/sounds'
import { useAppStore } from '@/store/useAppStore'

export function Countdown({ seconds, onComplete }: { seconds: number; onComplete: () => void }) {
  const [count, setCount] = useState(seconds)

  useEffect(() => {
    if (useAppStore.getState().soundEnabled) {
      if (count > 0) sounds.countdownTick()
      else sounds.go()
    }
    if (count <= 0) {
      const t = setTimeout(onComplete, 500)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count])

  return (
    <div className="flex h-40 items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.span
          key={count}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.4, opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="font-mono text-6xl font-bold text-caret"
        >
          {count > 0 ? count : 'GO'}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}
