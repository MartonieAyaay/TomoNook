import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react'

/** Textarea that grows with its content instead of scrolling. */
export default function AutoTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [props.value])

  return <textarea ref={ref} rows={1} {...props} />
}
