import { createContext, useContext } from 'react';
import type {
  CommandResult,
  Homework,
  HomeworkEditorMode,
  HomeworkFormValues,
  HomeworkStudent,
  HomeworkSubmission,
} from '@domain/homework/homework';

export type HomeworkWorkspaceSnapshot = {
  homeworks: readonly Homework[];
  submissions: readonly HomeworkSubmission[];
  students: readonly HomeworkStudent[];
};

export type HomeworkWorkspaceStore = HomeworkWorkspaceSnapshot & {
  now: Date;
  currentStudentId: string;
  saveHomeworkDraft: (values: HomeworkFormValues, homeworkId?: string) => CommandResult<string>;
  publishHomework: (values: HomeworkFormValues, homeworkId?: string) => CommandResult<string>;
  gradeSubmission: (submissionId: string, score: number, comment: string) => CommandResult;
  returnSubmission: (submissionId: string, comment: string) => CommandResult;
  saveAnswerDraft: (homeworkId: string, answerText: string) => CommandResult;
  submitAnswer: (homeworkId: string, answerText: string, mode: HomeworkEditorMode) => CommandResult;
};

export const HomeworkWorkspaceContext = createContext<HomeworkWorkspaceStore | null>(null);

export function useHomeworkWorkspace(): HomeworkWorkspaceStore {
  const store = useContext(HomeworkWorkspaceContext);
  if (!store) throw new Error('useHomeworkWorkspace must be used within HomeworkWorkspaceProvider');
  return store;
}

export function selectHomeworkSubmissions(
  submissions: readonly HomeworkSubmission[],
  homeworkId: string,
): readonly HomeworkSubmission[] {
  return submissions.filter((submission) => submission.homeworkId === homeworkId);
}

export function selectStudentSubmission(
  submissions: readonly HomeworkSubmission[],
  homeworkId: string,
  studentId: string,
): HomeworkSubmission | undefined {
  return submissions.find(
    (submission) => submission.homeworkId === homeworkId && submission.studentId === studentId,
  );
}
