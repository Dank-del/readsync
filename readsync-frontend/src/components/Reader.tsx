import { useEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useAuth } from '../hooks/useAuth'
import { pb } from '../lib/pb'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { ArrowLeft, Loader, X } from 'lucide-react'
import { useReaderStore } from '../stores/reader-store'

import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

// Derive asset base from the worker URL so we serve cmaps and standard fonts from the
// same pdfjs-dist package served by Vite (avoids CDN/CORS issues).
const _pdfjsBuildBase = (() => {
  try {
    // workerUrl should be something like '/assets/pdf.worker.min.js'. Replace the /pdf.worker... part
    // with / to point at the build folder: '/assets/' -> '/assets/'. Then append 'cmaps/' etc.
  const ws = (pdfjs.GlobalWorkerOptions && (pdfjs.GlobalWorkerOptions.workerSrc || '')) as string
  return ws.replace(/\/build\/pdf(?:\.worker)?(?:.*)?$/, '/build/')
  } catch (e) {
    // fallback to unpkg if something goes wrong
    return `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/`
  }
})()

const pdfOptions = {
  cMapUrl: `${_pdfjsBuildBase}cmaps/`,
  standardFontDataUrl: `${_pdfjsBuildBase}standard_fonts/`,
  disableFontFace: false,
  isEvalSupported: false,
  maxImageSize: 1024 * 1024 * 10,
  verbosity: 0,
}

export function Reader() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams({ from: '/reader/$id' })
  const queryClient = useQueryClient()
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Zustand store
  const { 
    numPages,
    setNumPages,
    currentScrollPage,
    setCurrentScrollPage,
    lastReadWord,
    setLastReadWord,
    setIsScrollMode,
    setScrollDirection
  } = useReaderStore()

  const { data: doc } = useQuery({
    queryKey: ['document', id],
    queryFn: () => pb.collection('documents').getOne(id),
    enabled: !!id,
  })

  const { data: progress } = useQuery({
    queryKey: ['progress', id, user?.id],
    queryFn: () =>
      pb.collection('reading_progress').getList(1, 1, {
        filter: `document = "${id}" && user.id = "${user?.id}"`,
        sort: '-created',
      }),
    enabled: !!id && !!user,
  })

  const { data: fileToken } = useQuery({
    queryKey: ['fileToken'],
    queryFn: () => pb.files.getToken(),
    enabled: !!user,
  })

  const saveProgress = useMutation({
    mutationFn: (data: { page: number; word_index?: number; word_text?: string }) =>
      pb.collection('reading_progress').create({
        user: [user!.id],
        document: id,
        ...data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress', id, user?.id] })
    },
  })

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages)
    setIsScrollMode(true) // Always scroll mode
    setScrollDirection('vertical') // Always vertical scrolling

    if (progress?.items[0]) {
      const savedProgress = progress.items[0]
      const savedPage = Math.max(1, Math.min(numPages, savedProgress.page))
      setCurrentScrollPage(savedPage)

  // After setting stored page, attempt to scroll to it (retrying until page DOM exists)
  setTimeout(() => scrollToPageInContainer(savedPage), 80)

      if (savedProgress.word_index !== undefined && savedProgress.word_text) {
        setLastReadWord({
          page: savedPage,
          index: savedProgress.word_index,
          text: savedProgress.word_text
        })
      }
    }
  }

  // Scroll helper: try to scroll the container to a page element, retrying briefly until page DOM exists
  function scrollToPageInContainer(page: number) {
    const container = scrollContainerRef.current
    if (!container) return

    let tries = 0
    const maxTries = 15
    const tryScroll = () => {
      const el = container.querySelector(`[data-page-number="${page}"]`) as HTMLElement | null
      if (el) {
        // scroll so the page top is at the top of the container (preserve any header spacing)
        const top = el.offsetTop
        container.scrollTo({ top, behavior: 'auto' })
        return
      }
      tries += 1
      if (tries <= maxTries) {
        setTimeout(tryScroll, 100)
      }
    }
    tryScroll()
  }

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current || !numPages) return

      const container = scrollContainerRef.current

      // Calculate which page is currently most visible
      const pageElements = container.querySelectorAll('[data-page-number]')
      let currentPage = 1

      for (let i = 0; i < pageElements.length; i++) {
        const pageElement = pageElements[i] as HTMLElement
        const rect = pageElement.getBoundingClientRect()
        const containerRect = container.getBoundingClientRect()

        // Check if this page is visible in the viewport
        if (rect.top <= containerRect.bottom && rect.bottom >= containerRect.top) {
          const pageNumber = parseInt(pageElement.getAttribute('data-page-number') || '1')
          currentPage = pageNumber
          break
        }
      }

      // Save progress for the current page
      if (currentPage !== currentScrollPage) {
        setCurrentScrollPage(currentPage)
        saveProgress.mutate({ page: currentPage })
      }
    }

    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true })
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [numPages, currentScrollPage, setCurrentScrollPage, saveProgress])

  // Responsive PDF width calculation (edge-to-edge)
  const [pdfContainerWidth, setPdfContainerWidth] = useState<number>(window.innerWidth)

  useEffect(() => {
    function updateWidth() {
      if (!scrollContainerRef.current) return
      setPdfContainerWidth(scrollContainerRef.current.offsetWidth)
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    // Use ResizeObserver for dynamic container changes
    let observer: ResizeObserver | undefined
    if (window.ResizeObserver && scrollContainerRef.current) {
      observer = new ResizeObserver(updateWidth)
      observer.observe(scrollContainerRef.current)
    }
    return () => {
      window.removeEventListener('resize', updateWidth)
      if (observer && scrollContainerRef.current) observer.disconnect()
    }
  }, [])

  // Fallback: if progress becomes available after document load, ensure we scroll to saved page
  useEffect(() => {
    if (!numPages) return
    const saved = progress?.items?.[0]
    if (saved) {
      const savedPage = Math.max(1, Math.min(numPages, saved.page))
      setCurrentScrollPage(savedPage)
      setTimeout(() => scrollToPageInContainer(savedPage), 80)
    }
  }, [numPages, progress])

  if (!user) {
    navigate({ to: '/login' })
    return null
  }

  if (!doc) return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center">
        <Loader className="w-6 h-6 sm:w-8 sm:h-8 animate-spin mx-auto mb-3 sm:mb-4 text-primary" />
        <p className="text-muted-foreground text-sm sm:text-base">Loading document...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-2 py-3 max-w-6xl sm:px-4 sm:py-6">
        <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground sm:text-2xl lg:text-3xl overflow-wrap-anywhere pr-12">
              {doc?.name}
            </h1>
            {doc?.description && (
              <p className="text-muted-foreground mt-1 text-sm sm:text-base overflow-wrap-anywhere">
                {doc.description}
              </p>
            )}
            {numPages && currentScrollPage && (
              <p className="text-sm text-muted-foreground mt-2">
                Page {currentScrollPage} of {numPages}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            {/* {numPages && currentScrollPage && (
              <div className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1 text-sm">
                <span className="font-medium">Page {currentScrollPage}</span>
                <span className="text-muted-foreground">of {numPages}</span>
              </div>
            )} */}
            <Button
              onClick={() => navigate({ to: '/dashboard' })}
              variant="outline"
              size="sm"
              className="shrink-0 h-9 px-3 text-sm sm:h-10 sm:px-4"
            >
              <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Back to Dashboard</span>
              <span className="xs:hidden">Back</span>
            </Button>
          </div>
        </div>

        <Card className="shadow-sm sm:shadow-md">
          <CardContent className="p-0">
            <div
              ref={scrollContainerRef}
              className="overflow-y-auto min-h-[60vh] max-h-[75vh] flex flex-col items-center gap-3 py-3 sm:min-h-[50vh] sm:max-h-[80vh] sm:gap-4 sm:py-4"
              style={{
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'thin',
                touchAction: 'pan-y',
                width: '100%',
                boxSizing: 'border-box',
                paddingLeft: 0,
                paddingRight: 0,
              }}
            >
              <Document
                file={doc && fileToken ? pb.files.getURL(doc, doc.document, { token: fileToken }) : undefined}
                onLoadSuccess={onDocumentLoadSuccess}
                options={pdfOptions}
                loading={
                  <div className="flex items-center justify-center py-8 sm:py-12">
                    <div className="text-center">
                      <Loader className="w-6 h-6 sm:w-8 sm:h-8 animate-spin mx-auto mb-3 sm:mb-4 text-primary" />
                      <p className="text-muted-foreground text-sm sm:text-base">Loading PDF...</p>
                    </div>
                  </div>
                }
                error={
                  <div className="flex items-center justify-center py-8 sm:py-12 px-4">
                    <div className="text-center max-w-sm">
                      <p className="text-destructive text-sm sm:text-base font-medium mb-2">Failed to load PDF</p>
                      <p className="text-muted-foreground text-xs sm:text-sm">
                        Please check your connection and try again
                      </p>
                    </div>
                  </div>
                }
              >
                {Array.from(
                  new Array(numPages),
                  (_, index) => (
                    <div key={`page_${index + 1}`} data-page-number={index + 1} style={{ width: '100%' }}>
                      <Page
                        pageNumber={index + 1}
                        width={pdfContainerWidth}
                        // Only render the text layer for the visible page or when we need highlighting
                        renderAnnotationLayer={false}
                        renderTextLayer={Boolean((lastReadWord && lastReadWord.page === index + 1) || (currentScrollPage === index + 1))}
                        customTextRenderer={({ str }) => {
                          try {
                            if (lastReadWord && lastReadWord.page === index + 1 &&
                                lastReadWord.text && str.includes(lastReadWord.text)) {
                              return str.replace(
                                new RegExp(`(${lastReadWord.text})`, 'gi'),
                                '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>'
                              )
                            }
                          } catch (e) {
                            // If custom rendering fails, fall back to raw text.
                            return str
                          }
                          return str
                        }}
                      />
                    </div>
                  ),
                )}
              </Document>
            </div>
          </CardContent>
        </Card>

        {numPages && (
          <div className="text-center mt-3 sm:mt-4 px-2">
            <p className="text-xs sm:text-sm text-muted-foreground mb-2">
              {numPages} pages total • Scroll to navigate
            </p>
            {lastReadWord && (
              <div className="inline-flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1 text-xs">
                <span>Last read:</span>
                <span className="font-medium">"{lastReadWord.text}"</span>
                <span className="text-muted-foreground">on page {lastReadWord.page}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 hover:bg-destructive/20 ml-1"
                  onClick={() => setLastReadWord(null)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
