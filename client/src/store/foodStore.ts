import { create } from 'zustand'
import { load, save } from '../lib/storage.ts'

export const MAX_FOODS = 8
export const FOOD_NAME_MAX = 15

/** A food the user added: a name and a small picture (data URL). */
export interface Food {
  id: string
  name: string
  image: string
}

interface FoodState {
  /** The user's own foods. The default tomato is always there and isn't stored. */
  foods: Food[]
  addFood: (name: string, image: string) => void
  deleteFood: (id: string) => void
}

export const useFoodStore = create<FoodState>((set) => ({
  foods: load('foods', [] as Food[]),
  addFood: (name, image) =>
    set((s) =>
      s.foods.length >= MAX_FOODS || !name.trim()
        ? s
        : { foods: [...s.foods, { id: crypto.randomUUID(), name: name.trim().slice(0, FOOD_NAME_MAX), image }] },
    ),
  deleteFood: (id) => set((s) => ({ foods: s.foods.filter((f) => f.id !== id) })),
}))

useFoodStore.subscribe((s) => save('foods', s.foods))

/** Shrinks a picked image to fit 160px so it fits in storage. */
export function imageToDataUrl(file: File, max = 160): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.width * scale))
      canvas.height = Math.max(1, Math.round(img.height * scale))
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that image'))
    }
    img.src = url
  })
}
