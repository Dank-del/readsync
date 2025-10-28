import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface ReaderState {
  // Page navigation
  pageNumber: number
  numPages: number | null

  // Scroll mode
  isScrollMode: boolean
  scrollDirection: 'vertical' | 'horizontal'
  currentScrollPage: number

  // Reading progress
  lastReadWord: { page: number; index: number; text: string } | null

  // Virtual scrolling
  visiblePages: Set<number>

  // Actions
  setPageNumber: (page: number) => void
  setNumPages: (numPages: number | null) => void
  setIsScrollMode: (isScrollMode: boolean) => void
  setScrollDirection: (direction: 'vertical' | 'horizontal') => void
  setCurrentScrollPage: (page: number) => void
  setLastReadWord: (word: { page: number; index: number; text: string } | null) => void
  setVisiblePages: (pages: Set<number>) => void

  // Reset
  reset: () => void
}

const initialState = {
  pageNumber: 1,
  numPages: null,
  isScrollMode: false,
  scrollDirection: 'vertical' as const,
  currentScrollPage: 1,
  lastReadWord: null,
  visiblePages: new Set<number>(),
}

export const useReaderStore = create<ReaderState>()(
  devtools(
    (set) => ({
      ...initialState,

      setPageNumber: (page) => set({ pageNumber: page }),
      setNumPages: (numPages) => set({ numPages }),
      setIsScrollMode: (isScrollMode) => set({ isScrollMode }),
      setScrollDirection: (direction) => set({ scrollDirection: direction }),
      setCurrentScrollPage: (page) => set({ currentScrollPage: page }),
      setLastReadWord: (word) => set({ lastReadWord: word }),
      setVisiblePages: (pages) => set({ visiblePages: pages }),

      reset: () => set(initialState),
    }),
    {
      name: 'reader-store',
    }
  )
)