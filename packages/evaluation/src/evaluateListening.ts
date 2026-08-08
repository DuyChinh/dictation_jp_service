export type ListeningChoice = {
  id: string;
  correct: boolean;
  text: { ja?: string; vi?: string; en?: string };
  explanation?: { vi?: string; en?: string; ja?: string };
  evidence_segment_ids?: string[];
};

export type ListeningEvaluateInput = {
  selectedChoiceId: string;
  choices: ListeningChoice[];
};

export type ListeningEvaluateResult = {
  correct: boolean;
  selected_choice_id: string;
  correct_choice_id: string | null;
  selected?: ListeningChoice;
  correct_choice?: ListeningChoice;
};

/**
 * Evaluate listening MC against SoT `choices[].correct`.
 */
export function evaluateListening(
  input: ListeningEvaluateInput,
): ListeningEvaluateResult {
  const correctChoice =
    input.choices.find((c) => c.correct === true) ?? null;
  const selected = input.choices.find((c) => c.id === input.selectedChoiceId);

  return {
    correct: Boolean(selected?.correct),
    selected_choice_id: input.selectedChoiceId,
    correct_choice_id: correctChoice?.id ?? null,
    selected,
    correct_choice: correctChoice ?? undefined,
  };
}
