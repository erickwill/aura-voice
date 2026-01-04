import { createSignal, onMount, onCleanup } from "solid-js"
import { setAskQuestionPromptFn, clearAskQuestionPromptFn } from "@10x/core"
import type { Question, AskQuestionPromptFn } from "@10x/core"

export type { Question, AskQuestionPromptFn }

export interface QuestionRequest {
  questions: Question[]
  resolve: (answers: Record<string, string>) => void
}

export interface UseAskQuestionReturn {
  pendingRequest: QuestionRequest | null
  respond: (answers: Record<string, string>) => void
}

export function useAskQuestion(): UseAskQuestionReturn {
  const [pendingRequest, setPendingRequest] = createSignal<QuestionRequest | null>(null)

  onMount(() => {
    const promptFn: AskQuestionPromptFn = (questions) => {
      return new Promise<Record<string, string>>((resolve) => {
        setPendingRequest({ questions, resolve })
      })
    }

    setAskQuestionPromptFn(promptFn)
  })

  onCleanup(() => {
    clearAskQuestionPromptFn()
  })

  const respond = (answers: Record<string, string>) => {
    const request = pendingRequest()
    if (request) {
      request.resolve(answers)
      setPendingRequest(null)
    }
  }

  return {
    get pendingRequest() {
      return pendingRequest()
    },
    respond,
  }
}
