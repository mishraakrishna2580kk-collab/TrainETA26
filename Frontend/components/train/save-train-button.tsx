'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BookmarkIcon, BookmarkCheckIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useSWRConfig } from 'swr'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/providers/auth-provider'
import {
  isTrainSaved,
  removeSavedTrain,
  saveTrain,
} from '@/lib/train-service'
import type { Train } from '@/lib/types'

interface SaveTrainButtonProps {
  train: Train
  variant?: 'icon' | 'full'
  className?: string
}

export function SaveTrainButton({
  train,
  variant = 'icon',
  className,
}: SaveTrainButtonProps) {
  const { user } = useAuth()
  const { mutate } = useSWRConfig()
  const router = useRouter()
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setSaved(isTrainSaved(train.number))
  }, [train.number])

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      toast.info('Sign in to save trains', {
        description: 'Create a free account to track and get alerts.',
        action: { label: 'Sign in', onClick: () => router.push('/login') },
      })
      return
    }

    if (saved) {
      const updated = await removeSavedTrain(train.number)
      setSaved(false)
      void mutate('saved-trains', updated, false)
      toast.success(`Removed ${train.name} from saved`)
    } else {
      const updated = await saveTrain(train)
      setSaved(true)
      void mutate('saved-trains', updated, false)
      toast.success(`Saved ${train.name}`, {
        description: 'You will get alerts for delays and platform changes.',
      })
    }
  }

  if (variant === 'full') {
    return (
      <Button
        type="button"
        variant={saved ? 'secondary' : 'outline'}
        onClick={handleToggle}
        className={className}
      >
        {saved ? <BookmarkCheckIcon data-icon="inline-start" /> : <BookmarkIcon data-icon="inline-start" />}
        {saved ? 'Saved' : 'Save train'}
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={saved ? 'Remove from saved' : 'Save train'}
      aria-pressed={saved}
      onClick={handleToggle}
      className={cn(saved && 'text-primary', className)}
    >
      {saved ? <BookmarkCheckIcon /> : <BookmarkIcon />}
    </Button>
  )
}
