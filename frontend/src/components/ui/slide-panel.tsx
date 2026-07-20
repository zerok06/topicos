import React from 'react'
import { X } from 'lucide-react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from './drawer'
import { useIsMobile } from '../../hooks/useIsMobile'
import { cn } from '../../lib/utils'

interface SlidePanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
  contentClassName?: string
  width?: string
}

export const SlidePanel: React.FC<SlidePanelProps> = ({
  open,
  onOpenChange,
  title,
  children,
  footer,
  className,
  contentClassName,
  width,
}) => {
  const isMobile = useIsMobile()

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      direction={isMobile ? 'bottom' : 'right'}
    >
      <DrawerContent
        showHandle={isMobile}
        side={isMobile ? 'bottom' : 'right'}
        className={cn(
          !isMobile && (width || 'w-[500px] max-w-[90vw]'),
          className,
        )}
      >
        {isMobile ? (
          <div className="flex flex-col">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="text-white/90 text-base">{title}</DrawerTitle>
            </DrawerHeader>
            <div className={cn('px-4 pb-6 space-y-3 max-h-[60vh] overflow-y-auto', contentClassName)}>
              {children}
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <DrawerHeader className="border-b border-white/10 pb-3 flex-row items-center justify-between">
              <DrawerTitle className="text-white/90 text-lg truncate pr-8">{title}</DrawerTitle>
              <button
                onClick={() => onOpenChange(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </DrawerHeader>
            <div className={cn('flex-1 overflow-y-auto px-4 py-4 space-y-4', contentClassName)}>
              {children}
            </div>
            {footer && (
              <div className="border-t border-white/10 p-4 space-y-2">
                {footer}
              </div>
            )}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  )
}
