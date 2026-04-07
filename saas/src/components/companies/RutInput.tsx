'use client'

import { formatRutInputValue } from '@/lib/rut-chile'
import { useState } from 'react'

type Props = Omit<
  React.ComponentProps<'input'>,
  'value' | 'onChange' | 'type' | 'inputMode'
>

export function RutInput({ className, ...props }: Props) {
  const [value, setValue] = useState('')

  return (
    <input
      {...props}
      name="rut"
      type="text"
      inputMode="text"
      autoComplete="off"
      value={value}
      onChange={(e) => setValue(formatRutInputValue(e.target.value))}
      className={className}
    />
  )
}
