"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { QrCode, Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import QRCode from "qrcode"

interface AvatarProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
  gameId?: string
  playerId?: string
  onAvatarClick?: () => void
}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, gameId, playerId, onAvatarClick, ...props }, ref) => {
  const [showQRModal, setShowQRModal] = React.useState(false)
  const [qrCodeUrl, setQrCodeUrl] = React.useState("")
  const [qrCodeDataUrl, setQrCodeDataUrl] = React.useState("")

  const handleClick = async () => {
    if (gameId && playerId) {
      // Generate unique upload URL
      const uploadUrl = `http://192.168.0.190:3000/upload-avatar?gameId=${gameId}&playerId=${playerId}`
      // // Generate unique upload URL - use relative path for better compatibility
      // const uploadUrl = `${window.location.origin}/upload-avatar?gameId=${gameId}&playerId=${playerId}`
      setQrCodeUrl(uploadUrl)
      
      try {
        // Generate QR code
        const qrDataUrl = await QRCode.toDataURL(uploadUrl, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        })
        setQrCodeDataUrl(qrDataUrl)
      } catch (err) {
        console.error('Error generating QR code:', err)
      }
      
      setShowQRModal(true)
    }
    onAvatarClick?.()
  }

  return (
    <>
      <AvatarPrimitive.Root
        ref={ref}
        className={cn(
          "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-lg cursor-pointer hover:opacity-80 transition-opacity",
          className
        )}
        onClick={handleClick}
        {...props}
      />
      
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Avatar</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Scan this QR code with your phone to upload your avatar
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              {qrCodeDataUrl ? (
                <img 
                  src={qrCodeDataUrl} 
                  alt="QR Code" 
                  className="w-48 h-48"
                />
              ) : (
                <div className="w-48 h-48 bg-gray-100 flex items-center justify-center">
                  <QrCode className="h-12 w-12 text-gray-400" />
                  <p className="text-xs text-gray-500 ml-2">Loading...</p>
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Or visit: <span className="font-mono text-xs break-all">{qrCodeUrl}</span>
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
})
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square rounded-sm h-full w-full", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-lg bg-muted",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
