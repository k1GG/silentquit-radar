"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function EngagementSurvey({ employeeId }: { employeeId: string }) {
  const [q1, setQ1] = useState(3)
  const [q2, setQ2] = useState(3)
  const [q3, setQ3] = useState(3)
  const [submitted, setSubmitted] = useState(false)

  const submitSurvey = async () => {
    await fetch("/api/survey/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employee_id: employeeId, q1, q2, q3 }),
    })

    setSubmitted(true)
  }

  if (submitted) {
    return (
      <p className="text-green-600">
        Thank you! Your feedback has been recorded.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Engagement Survey</h2>

      {[q1, q2, q3].map((q, i) => (
        <div key={i}>
          <label>Question {i + 1}</label>
          <input
            type="range"
            min={1}
            max={5}
            value={q}
            onChange={(e) =>
              i === 0
                ? setQ1(+e.target.value)
                : i === 1
                ? setQ2(+e.target.value)
                : setQ3(+e.target.value)
            }
          />
        </div>
      ))}

      <Button onClick={submitSurvey}>Submit Survey</Button>
    </div>
  )
}
