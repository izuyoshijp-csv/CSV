import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore"

import { getFirestoreSafe } from "@/lib/firebase/client"
import { taskMockData } from "./task-mock-data"
import type { Task } from "./types/task-types"

const TASKS_COLLECTION = "tasks"

export async function getTasks(): Promise<Task[]> {
  const db = getFirestoreSafe()
  if (!db) return taskMockData

  const snapshot = await getDocs(collection(db, TASKS_COLLECTION))

  const result = snapshot.docs.map((document) => {
    const data = document.data() as Task

    return {
      ...data,
      id: data.id ?? document.id,
    }
  })

  return JSON.parse(JSON.stringify(result))
}

export async function seedTasksWithClient(): Promise<Task[]> {
  const db = getFirestoreSafe()
  if (!db) return taskMockData

  const batch = writeBatch(db)

  taskMockData.forEach((task) => {
    batch.set(doc(db, TASKS_COLLECTION, task.id), task, { merge: true })
  })

  await batch.commit()
  return getTasks()
}

export async function createTask(task: Task): Promise<Task> {
  const db = getFirestoreSafe()
  if (!db) return task

  await setDoc(doc(db, TASKS_COLLECTION, task.id), task)

  return task
}

export async function updateTask(task: Task): Promise<Task> {
  const db = getFirestoreSafe()
  if (!db) return task

  await updateDoc(doc(db, TASKS_COLLECTION, task.id), task)

  return task
}

export async function deleteTask(taskId: string): Promise<void> {
  const db = getFirestoreSafe()
  if (!db) return

  await deleteDoc(doc(db, TASKS_COLLECTION, taskId))
}

export function getTaskStats(tasks: Task[]) {
  const total = tasks.length

  return {
    total,
    completed: tasks.filter((task) => task.status === "completed").length,
    inProgress: tasks.filter((task) => task.status === "in progress").length,
    pending: tasks.filter((task) => task.status === "pending").length,
  }
}
