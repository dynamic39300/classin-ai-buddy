import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  gradeHomeworkSubmission,
  publishHomework as publishHomeworkRecord,
  returnHomeworkSubmission,
  saveAnswerDraft as saveAnswerDraftRecord,
  saveHomeworkDraft as saveHomeworkDraftRecord,
  submitHomeworkAnswer,
  type CommandResult,
  type HomeworkEditorMode,
  type HomeworkFormValues,
  type PublishedHomework,
  type HomeworkSubmission,
} from '@domain/homework/homework';
import {
  createHomeworkScenario,
  CURRENT_STUDENT_ID,
  HOMEWORK_NOW,
  type HomeworkScenario,
} from '@mocks/scenarios/homework';
import {
  HomeworkWorkspaceContext,
  type HomeworkWorkspaceSnapshot,
} from './homework-workspace-store';

type HomeworkWorkspaceProviderProps = {
  children: ReactNode;
  initialState?: HomeworkScenario;
  currentStudentId?: string;
  now?: Date;
  onHomeworkPublished?: (homework: PublishedHomework) => void;
};

function replaceSubmission(
  submissions: readonly HomeworkSubmission[],
  replacement: HomeworkSubmission,
): readonly HomeworkSubmission[] {
  const exists = submissions.some(({ id }) => id === replacement.id);
  return exists
    ? submissions.map((submission) => submission.id === replacement.id ? replacement : submission)
    : [...submissions, replacement];
}

export function HomeworkWorkspaceProvider({
  children,
  initialState,
  currentStudentId = CURRENT_STUDENT_ID,
  now = HOMEWORK_NOW,
  onHomeworkPublished,
}: HomeworkWorkspaceProviderProps) {
  const [snapshot, setSnapshot] = useState<HomeworkWorkspaceSnapshot>(() => initialState ?? createHomeworkScenario());
  const snapshotRef = useRef(snapshot);
  const sequenceRef = useRef(0);

  const commit = useCallback((update: (current: HomeworkWorkspaceSnapshot) => HomeworkWorkspaceSnapshot) => {
    setSnapshot((current) => {
      const next = update(current);
      snapshotRef.current = next;
      return next;
    });
  }, []);

  const saveHomeworkDraft = useCallback((values: HomeworkFormValues, homeworkId?: string): CommandResult<string> => {
    const current = snapshotRef.current;
    const existing = homeworkId ? current.homeworks.find(({ id }) => id === homeworkId) : undefined;
    if (homeworkId && !existing) return { ok: false, error: { code: 'not_found', message: '未找到该作业' } };
    const id = existing?.id ?? `homework-local-${++sequenceRef.current}`;
    const draft = saveHomeworkDraftRecord(values, id, 'teacher-001', now, existing);
    commit((state) => ({
      ...state,
      homeworks: existing
        ? state.homeworks.map((homework) => homework.id === id ? draft : homework)
        : [...state.homeworks, draft],
    }));
    return { ok: true, value: id };
  }, [commit, now]);

  const publishHomework = useCallback((values: HomeworkFormValues, homeworkId?: string): CommandResult<string> => {
    const current = snapshotRef.current;
    const existing = homeworkId ? current.homeworks.find(({ id }) => id === homeworkId) : undefined;
    if (homeworkId && !existing) return { ok: false, error: { code: 'not_found', message: '未找到该作业' } };
    const id = existing?.id ?? `homework-local-${++sequenceRef.current}`;
    const recipients = current.students
      .filter(({ classIds }) => values.classId !== null && classIds.includes(values.classId))
      .map(({ id: studentId }) => studentId);
    const result = publishHomeworkRecord(values, id, 'teacher-001', recipients, now, existing);
    if (!result.ok) return result;
    commit((state) => ({
      ...state,
      homeworks: existing
        ? state.homeworks.map((homework) => homework.id === id ? result.value : homework)
        : [...state.homeworks, result.value],
    }));
    onHomeworkPublished?.(result.value);
    return { ok: true, value: id };
  }, [commit, now, onHomeworkPublished]);

  const gradeSubmission = useCallback((submissionId: string, score: number, comment: string): CommandResult => {
    const submission = snapshotRef.current.submissions.find(({ id }) => id === submissionId);
    if (!submission) return { ok: false, error: { code: 'not_found', message: '未找到该作业提交' } };
    const result = gradeHomeworkSubmission(submission, score, comment, now);
    if (!result.ok) return result;
    commit((state) => ({ ...state, submissions: replaceSubmission(state.submissions, result.value) }));
    return { ok: true, value: undefined };
  }, [commit, now]);

  const returnSubmission = useCallback((submissionId: string, comment: string): CommandResult => {
    const submission = snapshotRef.current.submissions.find(({ id }) => id === submissionId);
    if (!submission) return { ok: false, error: { code: 'not_found', message: '未找到该作业提交' } };
    const result = returnHomeworkSubmission(submission, comment, now);
    if (!result.ok) return result;
    commit((state) => ({ ...state, submissions: replaceSubmission(state.submissions, result.value) }));
    return { ok: true, value: undefined };
  }, [commit, now]);

  const saveAnswerDraft = useCallback((homeworkId: string, answerText: string): CommandResult => {
    const current = snapshotRef.current;
    const homework = current.homeworks.find(({ id }) => id === homeworkId);
    if (!homework) return { ok: false, error: { code: 'not_found', message: '未找到该作业' } };
    const existing = current.submissions.find(
      (submission) => submission.homeworkId === homeworkId && submission.studentId === currentStudentId,
    );
    const result = saveAnswerDraftRecord(homework, currentStudentId, answerText, now, existing);
    if (!result.ok) return result;
    commit((state) => ({ ...state, submissions: replaceSubmission(state.submissions, result.value) }));
    return { ok: true, value: undefined };
  }, [commit, currentStudentId, now]);

  const submitAnswer = useCallback((
    homeworkId: string,
    answerText: string,
    mode: HomeworkEditorMode,
  ): CommandResult => {
    const current = snapshotRef.current;
    const homework = current.homeworks.find(({ id }) => id === homeworkId);
    if (!homework) return { ok: false, error: { code: 'not_found', message: '未找到该作业' } };
    const existing = current.submissions.find(
      (submission) => submission.homeworkId === homeworkId && submission.studentId === currentStudentId,
    );
    const result = submitHomeworkAnswer(homework, currentStudentId, answerText, mode, now, existing);
    if (!result.ok) return result;
    commit((state) => ({ ...state, submissions: replaceSubmission(state.submissions, result.value) }));
    return { ok: true, value: undefined };
  }, [commit, currentStudentId, now]);

  const value = useMemo(() => ({
    ...snapshot,
    now,
    currentStudentId,
    saveHomeworkDraft,
    publishHomework,
    gradeSubmission,
    returnSubmission,
    saveAnswerDraft,
    submitAnswer,
  }), [
    currentStudentId,
    gradeSubmission,
    now,
    publishHomework,
    returnSubmission,
    saveAnswerDraft,
    saveHomeworkDraft,
    snapshot,
    submitAnswer,
  ]);

  return <HomeworkWorkspaceContext.Provider value={value}>{children}</HomeworkWorkspaceContext.Provider>;
}
