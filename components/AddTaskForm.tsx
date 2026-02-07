'use client'

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function AddTaskForm({ interventionId }: { interventionId: string }) {
  const [task, setTask] = useState("")
  const [dueDate, setDueDate] = useState("")

  const handleAdd = async () => {
    if (!task || !dueDate) return

    await supabase.from("intervention_tasks").insert({
      intervention_id: interventionId,
      task,
      due_date: dueDate,
      completed: false
    })

    setTask("")
    setDueDate("")
    location.reload()
  }

  return (
    <div className="flex gap-2 mt-2">
      <Input
        placeholder="New task..."
        value={task}
        onChange={(e) => setTask(e.target.value)}
      />
      <Input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
      />
      <Button size="sm" onClick={handleAdd}>Add</Button>
    </div>
  )
}
