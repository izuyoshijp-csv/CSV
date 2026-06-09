"use client"

import * as React from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type ConfirmDialogOptions = {
  title?: string
  description: string
  confirmText?: string
  cancelText?: string
}

export function useConfirmDialog() {
  const resolverRef = React.useRef<((value: boolean) => void) | null>(null)
  const [options, setOptions] = React.useState<ConfirmDialogOptions | null>(null)

  const confirm = React.useCallback((nextOptions: ConfirmDialogOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current?.(false)
      resolverRef.current = resolve
      setOptions(nextOptions)
    })
  }, [])

  const close = React.useCallback((value: boolean) => {
    resolverRef.current?.(value)
    resolverRef.current = null
    setOptions(null)
  }, [])

  const dialog = (
    <AlertDialog open={Boolean(options)} onOpenChange={(open) => !open && close(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{options?.title ?? "確認"}</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-wrap">
            {options?.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => close(false)}>
            {options?.cancelText ?? "キャンセル"}
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => close(true)}>
            {options?.confirmText ?? "はい"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  return { confirm, dialog }
}
