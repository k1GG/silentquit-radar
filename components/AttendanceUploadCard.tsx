'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { uploadAttendanceCsv } from '@/app/actions/uploadAttendanceCsv'
import { useToast } from '@/hooks/use-toast'

export default function AttendanceUploadCard() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{
  success: boolean
  processed: number
} | null>(null)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.toLowerCase().endsWith('.csv')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select a CSV file',
          variant: 'destructive'
        })
        return
      }
      setFile(selectedFile)
      setResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select a CSV file to upload',
        variant: 'destructive'
      })
      return
    }

    setUploading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const result = await uploadAttendanceCsv(formData)
      setResult(result)

      toast({
        title: 'Upload successful',
        description: `Attendance uploaded: ${result.inserted} records processed`,
      })
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive'
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Upload Attendance Data</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="attendance-csv" className="text-gray-300">
            CSV File
          </Label>
          <Input
            id="attendance-csv"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={uploading}
            className="text-gray-300 file:text-gray-300"
          />
          <p className="text-sm text-gray-400">
            Format: employee_email,attendance_date,status
          </p>
        </div>

        <Button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full"
        >
          {uploading ? 'Uploading...' : 'Upload Attendance'}
        </Button>

        {result && (
          <div className="p-3 bg-gray-700 rounded-md">
            <p className="text-sm text-gray-300">
              Attendance uploaded: {result.inserted} records processed
              {result.skipped > 0 && `, ${result.skipped} skipped`}
            </p>
          </div>
        )}

        <p className="text-xs text-gray-400 text-center">
          Attendance data is used only to enhance engagement insights.
          No tracking or surveillance data is collected.
        </p>
      </CardContent>
    </Card>
  )
}