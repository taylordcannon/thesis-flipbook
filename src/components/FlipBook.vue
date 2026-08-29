<script setup>
    import { onMounted, onBeforeUnmount, ref } from 'vue'
    import { PageFlip } from 'page-flip'
    import { renderPdfToImages } from '../utils/pdfRenderer'

    const bookElement = ref(null)
    const waterCanvas = ref(null)

    const loading = ref(true)
    const currentPage = ref(1)
    const totalPages = ref(0)

    let pageFlip = null
    let waterAnimationFrame = null
    let waterResizeObserver = null
    let stopWaterListeners = null

    const ripples = []

    function startWaterAnimation() {
        const canvas = waterCanvas.value

        if (!canvas) return

        const ctx = canvas.getContext('2d')

        let width = 0
        let height = 0

        const resize = () => {
            const parent = canvas.parentElement
            const rect = parent.getBoundingClientRect()
            const dpr = Math.min(window.devicePixelRatio || 1, 2)

            width = rect.width
            height = rect.height

            canvas.width = width * dpr
            canvas.height = height * dpr

            canvas.style.width = `${width}px`
            canvas.style.height = `${height}px`

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        }

        resize()

        waterResizeObserver = new ResizeObserver(resize)
        waterResizeObserver.observe(canvas.parentElement)

        function addRipple(x, y) {
            ripples.push({
                x,
                y,
                radius: 0,
                opacity: 0.28,
                speed: 1.8,
                phase: Math.random() * Math.PI * 2,
            })

            if (ripples.length > 24) {
                ripples.shift()
            }
        }

        let lastRippleTime = 0

        function handlePointerMove(event) {
            const rect = canvas.getBoundingClientRect()

            const x = event.clientX - rect.left
            const y = event.clientY - rect.top

            const now = performance.now()

            if (now - lastRippleTime > 70) {
                addRipple(x, y)
                lastRippleTime = now
            }
        }

        const parent = canvas.parentElement

        parent.addEventListener(
            'pointermove',
            handlePointerMove,
        )

        const startTime = performance.now()

        function drawWaterBase(time) {
            const gradient = ctx.createLinearGradient(
                0,
                0,
                width,
                height,
            )

            gradient.addColorStop(0, '#5a0500')
            gradient.addColorStop(0.4, '#8e0a00')
            gradient.addColorStop(0.75, '#a51b10')
            gradient.addColorStop(1, '#6b0802')

            ctx.fillStyle = gradient
            ctx.fillRect(0, 0, width, height)

            ctx.globalCompositeOperation = 'screen'

            for (let layer = 0; layer < 7; layer++) {
                ctx.beginPath()

                const amplitude = 8 + layer * 5
                const frequency = 0.006 + layer * 0.001

                for (let x = -40; x <= width + 40; x += 8) {
                    const y =
                        height * (0.1 + layer * 0.14) +
                        Math.sin(
                            x * frequency +
                            time * (0.3 + layer * 0.05),
                        ) *
                        amplitude +
                        Math.sin(
                            x * 0.0025 -
                            time * 0.28 +
                            layer,
                        ) *
                        10

                    if (x === -40) {
                        ctx.moveTo(x, y)
                    } else {
                        ctx.lineTo(x, y)
                    }
                }

                ctx.strokeStyle =
                    `rgba(255, 230, 220, ${0.02 + layer * 0.004
                    })`

                ctx.lineWidth = 12 + layer * 5
                ctx.lineCap = 'round'

                ctx.stroke()
            }

            ctx.globalCompositeOperation = 'source-over'
        }

        function drawRipples(time) {
            ctx.globalCompositeOperation = 'screen'

            for (let i = ripples.length - 1; i >= 0; i--) {
                const ripple = ripples[i]

                ripple.radius += ripple.speed
                ripple.opacity *= 0.982

                const waveCount = 5

                for (let wave = 0; wave < waveCount; wave++) {
                    const radius =
                        ripple.radius - wave * 12

                    if (radius <= 0) continue

                    const wobble =
                        Math.sin(
                            time * 3 +
                            ripple.phase +
                            wave,
                        ) * 2

                    const radiusX = Math.max(
                        radius + wobble,
                        0.1,
                    )

                    const radiusY = Math.max(
                        radius * 0.42 + wobble,
                        0.1,
                    )

                    ctx.beginPath()

                    ctx.ellipse(
                        ripple.x,
                        ripple.y,
                        radiusX,
                        radiusY,
                        0,
                        0,
                        Math.PI * 2,
                    )

                    const waveOpacity =
                        ripple.opacity *
                        (1 - wave / waveCount)

                    ctx.strokeStyle =
                        `rgba(255, 240, 235, ${waveOpacity})`

                    ctx.lineWidth =
                        1.4 +
                        Math.sin(time * 2 + wave) * 0.4

                    ctx.stroke()
                }

                const highlightRadius =
                    Math.max(ripple.radius - 4, 0)

                if (highlightRadius > 0) {
                    const glow =
                        ctx.createRadialGradient(
                            ripple.x,
                            ripple.y,
                            highlightRadius * 0.5,
                            ripple.x,
                            ripple.y,
                            highlightRadius * 1.15,
                        )

                    glow.addColorStop(
                        0,
                        'rgba(255,255,255,0)',
                    )

                    glow.addColorStop(
                        0.75,
                        `rgba(255,220,210,${ripple.opacity * 0.08
                        })`,
                    )

                    glow.addColorStop(
                        1,
                        'rgba(255,255,255,0)',
                    )

                    ctx.fillStyle = glow

                    ctx.beginPath()
                    ctx.arc(
                        ripple.x,
                        ripple.y,
                        highlightRadius * 1.15,
                        0,
                        Math.PI * 2,
                    )
                    ctx.fill()
                }

                if (ripple.opacity < 0.01) {
                    ripples.splice(i, 1)
                }
            }

            ctx.globalCompositeOperation = 'source-over'
        }

        function animate(now) {
            const time =
                (now - startTime) / 1000

            ctx.clearRect(
                0,
                0,
                width,
                height,
            )

            drawWaterBase(time)
            drawRipples(time)

            waterAnimationFrame =
                requestAnimationFrame(animate)
        }

        waterAnimationFrame =
            requestAnimationFrame(animate)

        return () => {
            parent.removeEventListener(
                'pointermove',
                handlePointerMove,
            )
        }
    }

    onMounted(async () => {
        stopWaterListeners = startWaterAnimation()

        try {
            const images =
                await renderPdfToImages('/magazine.pdf')

            totalPages.value = images.length

            pageFlip = new PageFlip(bookElement.value, {
                width: 544,
                height: 704,

                size: 'stretch',

                minWidth: 272,
                maxWidth: 544,

                minHeight: 352,
                maxHeight: 704,

                maxShadowOpacity: 0.5,

                showCover: true,

                mobileScrollSupport: false,

                useMouseEvents: true,

                swipeDistance: 30,

                flippingTime: 700,
            })

            pageFlip.on('flip', (event) => {
                currentPage.value = event.data + 1
            })

            pageFlip.loadFromImages(images)

            loading.value = false
        } catch (error) {
            console.error(
                'Unable to load magazine:',
                error,
            )
        }
    })

    onBeforeUnmount(() => {
        if (pageFlip) {
            pageFlip.destroy()
        }

        if (waterAnimationFrame) {
            cancelAnimationFrame(
                waterAnimationFrame,
            )
        }

        if (waterResizeObserver) {
            waterResizeObserver.disconnect()
        }

        if (stopWaterListeners) {
            stopWaterListeners()
        }
    })

    function nextPage() {
        pageFlip?.flipNext('bottom')
    }

    function previousPage() {
        pageFlip?.flipPrev('bottom')
    }
</script>

<template>
    <main class="magazine-viewer">
        <canvas ref="waterCanvas" class="water-background" aria-hidden="true"></canvas>

        <div v-if="loading" class="loading">
            Loading magazine...
        </div>

        <div ref="bookElement" class="flipbook"></div>

        <div v-if="!loading" class="controls">
            <button type="button" @click="previousPage" aria-label="Previous page">
                ←
            </button>

            <span>
                {{ currentPage }} / {{ totalPages }}
            </span>

            <button type="button" @click="nextPage" aria-label="Next page">
                →
            </button>
        </div>
    </main>
</template>

<style scoped>
    .magazine-viewer {
        position: relative;

        width: 100%;
        min-height: 100vh;

        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;

        gap: 24px;

        padding: 40px 24px;

        box-sizing: border-box;

        overflow: hidden;

        background: #8e0a00;
    }

    .water-background {
        position: absolute;

        inset: 0;

        width: 100%;
        height: 100%;

        z-index: 0;

        pointer-events: none;
    }

    .flipbook,
    .controls,
    .loading {
        position: relative;
        z-index: 2;
    }

    .flipbook {
        width: min(100%, 1200px);

        filter:
            drop-shadow(0 24px 28px rgba(25, 0, 0, 0.24)) drop-shadow(0 6px 8px rgba(25, 0, 0, 0.18));
    }

    .controls {
        display: flex;
        align-items: center;

        gap: 18px;

        color: white;

        font-size: 0.95rem;
        font-weight: 600;

        letter-spacing: 0.08em;
    }

    .controls button {
        width: 48px;
        height: 48px;

        display: grid;
        place-items: center;

        border:
            1px solid rgba(255, 255, 255, 0.7);

        border-radius: 50%;

        background:
            rgba(80, 0, 0, 0.25);

        backdrop-filter: blur(8px);

        color: white;

        font-size: 24px;

        cursor: pointer;

        transition:
            background-color 150ms ease,
            transform 150ms ease;
    }

    .controls button:hover {
        background:
            rgba(255, 255, 255, 0.18);

        transform: scale(1.06);
    }

    .loading {
        color: white;

        font-size: 1rem;

        letter-spacing: 0.1em;

        text-transform: uppercase;
    }

    @media (max-width: 700px) {
        .magazine-viewer {
            padding:
                24px 12px 30px;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .water-background {
            display: none;
        }

        .magazine-viewer {
            background: #8e0a00;
        }
    }
</style>