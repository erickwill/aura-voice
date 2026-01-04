import { createSignal, createMemo, onMount, onCleanup, For } from "solid-js"
import { useTheme } from "../context"

const ICONS = ["+", "×", "*", "○"]
const FILLER_WORDS = [
  "Wandering...",
  "Exploring...",
  "Pondering...",
  "Thinking...",
  "Analyzing...",
  "Processing...",
]
const TIPS = [
  "Tip: Use ctrl+v to paste images from your clipboard",
  "Tip: Press Esc to interrupt at any time",
  "Tip: Use /help to see available commands",
  "Tip: Use /clear to start a fresh conversation",
]

// Shine effect colors (bright to dim)
function getShineColor(distance: number): string {
  if (distance === 0) return "#FFFFFF"
  if (distance === 1) return "#B0B0B0"
  return "#707070"
}

export function ThinkingIndicator() {
  const { theme } = useTheme()

  const [iconIndex, setIconIndex] = createSignal(0)
  const [wordIndex, setWordIndex] = createSignal(0)
  const [shinePos, setShinePos] = createSignal(0)
  const [tipIndex, setTipIndex] = createSignal(Math.floor(Math.random() * TIPS.length))

  const currentWord = () => FILLER_WORDS[wordIndex()] || "Thinking..."
  const currentIcon = () => ICONS[iconIndex()] || "+"
  const currentTip = () => TIPS[tipIndex()] || ""

  // Pre-compute the characters array with shine effect
  const chars = createMemo(() => {
    const word = currentWord()
    const pos = shinePos()
    return word.split("").map((char, i) => ({
      char: String(char),
      color: getShineColor(Math.abs(i - pos))
    }))
  })

  onMount(() => {
    // Rotate icon every 400ms
    const iconInterval = setInterval(() => {
      setIconIndex((i) => (i + 1) % ICONS.length)
    }, 400)

    // Rotate filler word every 3000ms
    const wordInterval = setInterval(() => {
      setWordIndex((i) => (i + 1) % FILLER_WORDS.length)
    }, 3000)

    // Shine sweep every 80ms
    const shineInterval = setInterval(() => {
      setShinePos((p) => (p + 1) % (currentWord().length + 4))
    }, 80)

    // Rotate tip every 6000ms
    const tipInterval = setInterval(() => {
      setTipIndex((i) => (i + 1) % TIPS.length)
    }, 6000)

    onCleanup(() => {
      clearInterval(iconInterval)
      clearInterval(wordInterval)
      clearInterval(shineInterval)
      clearInterval(tipInterval)
    })
  })

  return (
    <box flexDirection="column" marginTop={1}>
      {/* Main line with animated icon and shiny text */}
      <box flexDirection="row">
        <text fg={theme.primary} bold>{currentIcon()}</text>
        <text>{" "}</text>
        <For each={chars()}>
          {(c) => <text fg={c.color}>{c.char}</text>}
        </For>
        <text fg={theme.textMuted}>{" (esc to interrupt · thinking)"}</text>
      </box>

      {/* Tip line */}
      <text fg={theme.textMuted}>{`└─ ${currentTip()}`}</text>
    </box>
  )
}
