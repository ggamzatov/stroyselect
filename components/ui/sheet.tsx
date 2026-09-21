"use client"

import * as React from "react"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

function Sheet({ ...props }: React.ComponentProps<typeof Dialog>) {
  return <Dialog {...props} />
}

function SheetContent({ className, ...props }: React.ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent
      className={cn(
        "top-auto bottom-0 max-w-none translate-x-[-50%] translate-y-0 rounded-b-none rounded-t-[var(--radius-lg)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[var(--shadow-modal)] sm:max-w-lg",
        className
      )}
      {...props}
    />
  )
}

const SheetTrigger = DialogTrigger
const SheetClose = DialogClose
const SheetHeader = DialogHeader
const SheetFooter = DialogFooter
const SheetTitle = DialogTitle
const SheetDescription = DialogDescription

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
}
