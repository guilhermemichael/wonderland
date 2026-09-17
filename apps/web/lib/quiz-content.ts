export type AnswerId = string;
export type QuestionId = "q1" | "q2" | "q3" | "q4";

export interface AnswerDefinition {
  id: AnswerId;
  label: string;
}

export interface QuestionDefinition {
  id: QuestionId;
  text: string;
  answers: AnswerDefinition[];
}

export const QUIZ_QUESTIONS: QuestionDefinition[] = [
  {
    id: "q1",
    text: "You find a key made of glass on the forest floor. What does it unlock?",
    answers: [
      { id: "q1_a", label: "The door that is too small for me." },
      { id: "q1_b", label: "The box I haven't found yet." },
      { id: "q1_c", label: "Nothing. It locks things that were left open." },
    ],
  },
  {
    id: "q2",
    text: "Which way ought you to go from here?",
    answers: [
      { id: "q2_a", label: "That depends a good deal on where I want to get to." },
      { id: "q2_b", label: "Anywhere, as long as it is somewhere else." },
      { id: "q2_c", label: "The path that doesn't exist until I walk it." },
    ],
  },
  {
    id: "q3",
    text: "The table is entirely out of clean cups. What is the solution?",
    answers: [
      { id: "q3_a", label: "Move down to the next seat." },
      { id: "q3_b", label: "Break them. The pieces don't need washing." },
      { id: "q3_c", label: "Pretend you are no longer thirsty." },
    ],
  },
  {
    id: "q4",
    text: "Who are you?",
    answers: [
      { id: "q4_a", label: "I knew who I was this morning, but I've changed a few times since then." },
      { id: "q4_b", label: "I am the one who painted the roses red." },
      { id: "q4_c", label: "I am exactly what you think I am, which is entirely wrong." },
    ],
  },
];
