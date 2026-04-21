import React, { useState } from 'react'
import CopyIcon from '../assets/icons/copy.svg?react'
import { writeToClipboard } from '../utils/clipboard'

type Props = {
  textToCopy: string | (() => Promise<string> | string)
  title?: string
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode // Optional custom content instead of CopyIcon
}

export default function CopyButton({ textToCopy, title, className = '', style, children }: Props) {
  const [status, setStatus] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle')

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    if (status === 'copying') return
    try {
      setStatus('copying')
      const text = typeof textToCopy === 'function' ? await textToCopy() : textToCopy
      await writeToClipboard(text)
      setStatus('copied')
      setTimeout(() => setStatus('idle'), 2500)
    } catch (err) {
      console.error('Copy failed', err)
      setStatus('error')
      setTimeout(() => setStatus('idle'), 2500)
    }
  }

  return (
    <button
      className={className}
      onClick={handleCopy}
      title={title}
      aria-label={title}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}
    >
      {status === 'copied' ? (
        <span className="text-green-600 dark:text-green-500 font-bold px-1 select-none flex items-center justify-center">✓</span>
      ) : (
        children || <CopyIcon className="w-4 h-4" />
      )}
    </button>
  )
}
