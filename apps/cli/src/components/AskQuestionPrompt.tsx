import { createSignal, For, Show } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import { useTheme } from "../context"
import type { Question } from "@10x/core"

interface AskQuestionPromptProps {
  questions: Question[]
  onResponse: (answers: Record<string, string>) => void
}

export function AskQuestionPrompt(props: AskQuestionPromptProps) {
  const { theme } = useTheme()
  const [currentQuestionIndex, setCurrentQuestionIndex] = createSignal(0)
  const [selectedIndices, setSelectedIndices] = createSignal<number[]>([])
  const [answers, setAnswers] = createSignal<Record<string, string>>({})
  const [customInput, setCustomInput] = createSignal("")
  const [showCustomInput, setShowCustomInput] = createSignal(false)
  const [submitted, setSubmitted] = createSignal(false)

  const currentQuestion = () => props.questions[currentQuestionIndex()]

  // Options including "Other" for custom input
  const allOptions = () => {
    const q = currentQuestion()
    if (!q) return []
    return [...q.options, { label: "Other", description: "Provide custom answer" }]
  }

  const isMultiSelect = () => currentQuestion()?.multiSelect ?? false

  useKeyboard((evt) => {
    if (submitted()) return

    // Handle custom input mode
    if (showCustomInput()) {
      if (evt.name === "return") {
        // Submit custom answer
        const answer = customInput().trim()
        if (answer) {
          submitAnswer(answer)
        }
        return
      }
      if (evt.name === "escape") {
        setShowCustomInput(false)
        setCustomInput("")
        return
      }
      // Handle text input
      if (evt.name === "backspace") {
        setCustomInput(prev => prev.slice(0, -1))
        return
      }
      if (evt.sequence && evt.sequence.length === 1 && !evt.ctrl && !evt.meta) {
        setCustomInput(prev => prev + evt.sequence)
        return
      }
      return
    }

    const options = allOptions()
    const indices = selectedIndices()

    // Navigation
    if (evt.name === "up" || evt.name === "k") {
      if (indices.length === 0) {
        setSelectedIndices([options.length - 1])
      } else {
        const current = indices[indices.length - 1]
        const newIdx = current > 0 ? current - 1 : options.length - 1
        if (isMultiSelect()) {
          // In multiselect, up/down just moves cursor to last selected
          setSelectedIndices([...indices.filter(i => i !== current), newIdx])
        } else {
          setSelectedIndices([newIdx])
        }
      }
      return
    }

    if (evt.name === "down" || evt.name === "j") {
      if (indices.length === 0) {
        setSelectedIndices([0])
      } else {
        const current = indices[indices.length - 1]
        const newIdx = current < options.length - 1 ? current + 1 : 0
        if (isMultiSelect()) {
          setSelectedIndices([...indices.filter(i => i !== current), newIdx])
        } else {
          setSelectedIndices([newIdx])
        }
      }
      return
    }

    // Selection
    if (evt.name === "space" && isMultiSelect()) {
      // Toggle selection in multiselect mode
      const current = indices[indices.length - 1] ?? 0
      if (current === options.length - 1) {
        // "Other" option
        setShowCustomInput(true)
        return
      }
      if (indices.includes(current)) {
        setSelectedIndices(indices.filter(i => i !== current))
      } else {
        setSelectedIndices([...indices, current])
      }
      return
    }

    if (evt.name === "return") {
      const selected = indices[indices.length - 1] ?? 0

      // Check if "Other" is selected
      if (selected === options.length - 1) {
        setShowCustomInput(true)
        return
      }

      // Get selected option(s)
      if (isMultiSelect()) {
        const selectedLabels = indices
          .filter(i => i < options.length - 1) // Exclude "Other"
          .map(i => options[i].label)
        if (selectedLabels.length > 0) {
          submitAnswer(selectedLabels.join(", "))
        }
      } else {
        const option = options[selected]
        if (option) {
          submitAnswer(option.label)
        }
      }
      return
    }

    // Number keys for quick selection (1-4)
    const numKey = parseInt(evt.sequence || "", 10)
    if (numKey >= 1 && numKey <= 4 && numKey <= options.length) {
      if (isMultiSelect()) {
        const idx = numKey - 1
        if (indices.includes(idx)) {
          setSelectedIndices(indices.filter(i => i !== idx))
        } else {
          setSelectedIndices([...indices, idx])
        }
      } else {
        const option = options[numKey - 1]
        if (option && numKey - 1 < options.length - 1) {
          submitAnswer(option.label)
        }
      }
      return
    }
  })

  const submitAnswer = (answer: string) => {
    const q = currentQuestion()
    if (!q) return

    const newAnswers = { ...answers(), [q.question]: answer }
    setAnswers(newAnswers)
    setShowCustomInput(false)
    setCustomInput("")
    setSelectedIndices([])

    // Move to next question or finish
    if (currentQuestionIndex() < props.questions.length - 1) {
      setCurrentQuestionIndex(i => i + 1)
    } else {
      setSubmitted(true)
      props.onResponse(newAnswers)
    }
  }

  const q = () => currentQuestion()

  return (
    <box
      flexDirection="column"
      border={["top", "bottom", "left", "right"]}
      borderColor={theme.info}
      paddingLeft={1}
      paddingRight={1}
      marginTop={1}
      marginBottom={1}
    >
      <box>
        <text fg={theme.info} bold>
          Question {currentQuestionIndex() + 1}/{props.questions.length}
        </text>
        <Show when={q()}>
          <text fg={theme.textMuted}> [{q()!.header}]</text>
        </Show>
      </box>

      <Show when={q()}>
        <box marginTop={1}>
          <text fg={theme.text}>{q()!.question}</text>
        </box>

        <Show when={isMultiSelect()}>
          <box marginTop={1}>
            <text fg={theme.textMuted}>(Select multiple with Space, confirm with Enter)</text>
          </box>
        </Show>

        <box marginTop={1} flexDirection="column">
          <For each={allOptions()}>
            {(option, index) => {
              const isSelected = () => selectedIndices().includes(index())
              const isCursor = () => {
                const indices = selectedIndices()
                return indices.length > 0 && indices[indices.length - 1] === index()
              }
              const isOther = () => index() === allOptions().length - 1

              return (
                <box>
                  <text fg={isCursor() ? theme.primary : theme.textMuted}>
                    {isCursor() ? "> " : "  "}
                  </text>
                  <Show when={isMultiSelect()}>
                    <text fg={isSelected() ? theme.success : theme.textMuted}>
                      {isSelected() && !isOther() ? "[x] " : "[ ] "}
                    </text>
                  </Show>
                  <text fg={isOther() ? theme.warning : theme.text} bold={isCursor()}>
                    {option.label}
                  </text>
                  <Show when={option.description && !isOther()}>
                    <text fg={theme.textMuted}> - {option.description}</text>
                  </Show>
                </box>
              )
            }}
          </For>
        </box>

        <Show when={showCustomInput()}>
          <box marginTop={1} flexDirection="column">
            <text fg={theme.warning}>Enter custom answer:</text>
            <box marginTop={0}>
              <text fg={theme.primary}>&gt; </text>
              <text fg={theme.text}>{customInput()}</text>
              <text fg={theme.primary}>_</text>
            </box>
          </box>
        </Show>
      </Show>

      <box marginTop={1}>
        <text fg={theme.textMuted}>
          {showCustomInput()
            ? "Enter to submit, Esc to cancel"
            : isMultiSelect()
              ? "Space to toggle, Enter to confirm, 1-4 for quick select"
              : "Enter or 1-4 to select"}
        </text>
      </box>
    </box>
  )
}
