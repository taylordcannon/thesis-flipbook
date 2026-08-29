import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export async function renderPdfToImages(pdfUrl) {
  const loadingTask = pdfjsLib.getDocument({
    url: pdfUrl,
  })

  const pdf = await loadingTask.promise
  const images = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)

    const viewport = page.getViewport({
      scale: 3,
    })

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    canvas.width = viewport.width
    canvas.height = viewport.height

    await page.render({
      canvasContext: context,
      viewport,
    }).promise

    const isFirstPage = pageNumber === 1
    const isLastPage = pageNumber === pdf.numPages

    if (isFirstPage || isLastPage) {
      images.push(
        canvas.toDataURL('image/jpeg', 0.92)
      )

      continue
    }

    const halfWidth = Math.floor(canvas.width / 2)

    const leftCanvas = document.createElement('canvas')
    const leftContext = leftCanvas.getContext('2d')

    leftCanvas.width = halfWidth
    leftCanvas.height = canvas.height

    leftContext.drawImage(
      canvas,

      // Source area
      0,
      0,
      halfWidth,
      canvas.height,

      // Destination area
      0,
      0,
      halfWidth,
      canvas.height
    )

    const rightCanvas = document.createElement('canvas')
    const rightContext = rightCanvas.getContext('2d')

    rightCanvas.width = canvas.width - halfWidth
    rightCanvas.height = canvas.height

    rightContext.drawImage(
      canvas,

      // Source area
      halfWidth,
      0,
      canvas.width - halfWidth,
      canvas.height,

      // Destination area
      0,
      0,
      canvas.width - halfWidth,
      canvas.height
    )

    images.push(
      leftCanvas.toDataURL('image/jpeg', 0.92)
    )

    images.push(
      rightCanvas.toDataURL('image/jpeg', 0.92)
    )
  }

  return images
}