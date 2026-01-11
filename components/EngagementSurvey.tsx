"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const questions = [
  "I feel valued at work",
  "I have opportunities for growth",
  "My work is meaningful",
  "I receive adequate support",
  "I am satisfied with my compensation"
]

export function EngagementSurvey() {
  const router = useRouter()
  const [answers, setAnswers] = useState<number[]>([3, 3, 3, 3, 3])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submitSurvey = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const response = await fetch("/api/survey/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q1: answers[0],
          q2: answers[1],
          q3: answers[2],
          q4: answers[3],
          q5: answers[4]
        }),
        credentials: 'include'
      })
      if (response.ok) {
        router.push(`/employee/dashboard`)
      } else {
        const data = await response.json()
        setError(data.error || "Submission failed")
      }
    } catch (err) {
      setError("Network error")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-400 text-center">
        Rate each statement from 1 (Strongly Disagree) to 5 (Strongly Agree)
      </p>

      {questions.map((question, i) => (
        <Card key={i} className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="space-y-3">
              <p className="font-medium text-white">{question}</p>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={answers[i]}
                  onChange={(e) => {
                    const newAnswers = [...answers]
                    newAnswers[i] = +e.target.value
                    setAnswers(newAnswers)
                  }}
                  className="flex-1"
                />
                <span className="text-white font-semibold w-8 text-center">{answers[i]}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-teal-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((answers[i] - 1) / 4) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Strongly Disagree</span>
                <span>Neutral</span>
                <span>Strongly Agree</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {error && <p className="text-red-500 text-center">{error}</p>}

      <div className="text-center">
        <Button onClick={submitSurvey} disabled={submitting} className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-2">
          {submitting ? "Submitting..." : "Submit Survey"}
        </Button>
      </div>
    </div>
  )
}
