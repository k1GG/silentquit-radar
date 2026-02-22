"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { uploadAttendanceCsv } from "@/app/actions/uploadAttendanceCsv"

export default function AttendanceUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<{ message: string; type: "success" | "error" } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setStatus(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setStatus({ message: "Please select a CSV file", type: "error" })
      return
    }

    setUploading(true)
    setStatus(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const result = await uploadAttendanceCsv(formData)
      setStatus({ message: `Attendance uploaded: ${result.inserted} records processed`, type: "success" })
      setFile(null)
    } catch (error) {
      setStatus({ message: error instanceof Error ? error.message : "Upload failed", type: "error" })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-semibold">Attendance Upload</h1>

      <Card>
        <CardHeader>
          <CardTitle>Upload Attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={uploading}
            />
            <p className="text-sm text-muted-foreground mt-2">
              CSV format: employee_email, date, status
            </p>
          </div>

          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full"
          >
            {uploading ? "Uploading..." : "Upload"}
          </Button>

          {status && (
            <div
              className={`p-3 rounded-md ${
                status.type === "success"
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              }`}
            >
              {status.message}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
