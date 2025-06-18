"use client"

import { useState, useEffect, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { useSearchParams } from "next/navigation"
import imageCompression from "browser-image-compression"

function UploadAvatarContent() {
  const searchParams = useSearchParams()
  const gameId = searchParams.get("gameId")
  const playerId = searchParams.get("playerId")
  
  console.log("UploadAvatarPage loaded with:", { gameId, playerId })
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [compressedFile, setCompressedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    console.log("UploadAvatarPage useEffect - gameId:", gameId, "playerId:", playerId)
    console.log("Current URL:", window.location.href)
    console.log("User Agent:", navigator.userAgent)
    
    if (!gameId || !playerId) {
      setErrorMessage("Invalid URL: Missing game or player information")
    } else {
      console.log("URL parameters are valid")
    }
  }, [gameId, playerId])

  const compressImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 0.5, // Max 500KB
      maxWidthOrHeight: 400, // Max dimension
      useWebWorker: true,
      fileType: 'image/jpeg',
    }

    try {
      const compressedFile = await imageCompression(file, options)
      return compressedFile
    } catch (error) {
      console.error('Error compressing image:', error)
      throw new Error('Failed to compress image')
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setErrorMessage("Please select an image file")
        return
      }
      
      // Validate file size (max 10MB before compression)
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage("File size must be less than 10MB")
        return
      }

      setSelectedFile(file)
      setErrorMessage("")
      setIsCompressing(true)
      
      try {
        // Compress the image
        const compressed = await compressImage(file)
        setCompressedFile(compressed)
        
        // Create preview from compressed file
        const reader = new FileReader()
        reader.onload = (e) => {
          setPreviewUrl(e.target?.result as string)
        }
        reader.readAsDataURL(compressed)
      } catch (error) {
        setErrorMessage("Failed to process image. Please try another file.")
        setSelectedFile(null)
      } finally {
        setIsCompressing(false)
      }
    }
  }

  const handleUpload = async () => {
    if (!compressedFile || !gameId || !playerId) return

    setIsUploading(true)
    setUploadStatus("idle")

    try {
      const formData = new FormData()
      formData.append("file", compressedFile)
      formData.append("gameId", gameId)
      formData.append("playerId", playerId)

      const response = await fetch("/api/upload-avatar", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        setUploadStatus("success")
        // WebSocket will handle the real-time update automatically
      } else {
        const error = await response.text()
        setErrorMessage(error || "Upload failed")
        setUploadStatus("error")
      }
    } catch (error) {
      setErrorMessage("Network error occurred")
      setUploadStatus("error")
    } finally {
      setIsUploading(false)
    }
  }

  if (!gameId || !playerId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Invalid URL</CardTitle>
            <CardDescription>
              This upload link is invalid or has expired.
            </CardDescription>
            <div className="text-xs text-gray-500 mt-2">
              <p>URL: {typeof window !== 'undefined' ? window.location.href : 'Loading...'}</p>
              <p>Game ID: {gameId || 'Missing'}</p>
              <p>Player ID: {playerId || 'Missing'}</p>
            </div>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Upload Your Avatar</CardTitle>
          <CardDescription>
            Choose a profile picture for your game avatar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Input */}
          <div className="space-y-2">
            <label htmlFor="avatar-upload" className="block text-sm font-medium">
              Select Image
            </label>
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="avatar-upload"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {isCompressing ? (
                    <Loader2 className="w-8 h-8 mb-4 text-gray-500 animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8 mb-4 text-gray-500" />
                  )}
                  <p className="mb-2 text-sm text-gray-500">
                    {isCompressing ? (
                      "Processing image..."
                    ) : (
                      <span className="font-semibold">Click to upload</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {isCompressing ? "Please wait..." : "PNG, JPG, GIF up to 10MB"}
                  </p>
                </div>
                <input
                  id="avatar-upload"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileSelect}
                  disabled={isCompressing}
                />
              </label>
            </div>
          </div>

          {/* Preview */}
          {previewUrl && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">Preview</label>
              <div className="flex justify-center">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <XCircle className="w-5 h-5 text-red-500" />
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
          )}

          {/* Success Message */}
          {uploadStatus === "success" && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <p className="text-sm text-green-700">Avatar uploaded successfully!</p>
            </div>
          )}

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={!compressedFile || isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload Avatar"
            )}
          </Button>

          {/* File Info */}
          {compressedFile && (
            <div className="text-xs text-gray-500 space-y-1">
              <p>Original size: {(selectedFile?.size || 0) / 1024 / 1024} MB</p>
              <p>Compressed size: {(compressedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              <p>Compression ratio: {((1 - compressedFile.size / (selectedFile?.size || 1)) * 100).toFixed(1)}%</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
          <CardDescription>
            Preparing upload form...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function UploadAvatarPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <UploadAvatarContent />
    </Suspense>
  )
} 