"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

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
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Rate each statement from 1 (Strongly Disagree) to 5 (Strongly Agree)
      </p>

      {questions.map((question, i) => (
        <div key={i} className="space-y-2">
          <label className="block font-medium">{question}</label>
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
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1</span>
            <span>3</span>
            <span>5</span>
          </div>
        </div>
      ))}

      {error && <p className="text-red-500">{error}</p>}

      <Button onClick={submitSurvey} disabled={submitting}>
        {submitting ? "Submitting..." : "Submit Survey"}
      </Button>
    </div>
  )
}
