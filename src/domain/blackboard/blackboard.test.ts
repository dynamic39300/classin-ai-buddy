import { describe, expect, it } from 'vitest';
import { appendStroke, clearBlackboard, INITIAL_BLACKBOARD, markBlackboardSaved, redoStroke, undoStroke, type BlackboardStroke } from './blackboard';

const stroke = (id: string): BlackboardStroke => ({ id, tool: 'pen', colorToken: '--color-canvas-immersive-text', width: 5, points: [{ x: 0.1, y: 0.2 }, { x: 0.4, y: 0.5 }] });

describe('blackboard document', () => {
  it('commits strokes, clears redo on a new stroke, and marks the document dirty', () => {
    const first = appendStroke(INITIAL_BLACKBOARD, stroke('one'));
    const undone = undoStroke(first);
    const next = appendStroke(undone, stroke('two'));
    expect(next.strokes.map(({ id }) => id)).toEqual(['two']);
    expect(next.redoStack).toHaveLength(0);
    expect(next.saveState).toBe('dirty');
  });

  it('undoes and redoes one stroke without mutating the previous document', () => {
    const document = appendStroke(appendStroke(INITIAL_BLACKBOARD, stroke('one')), stroke('two'));
    const undone = undoStroke(document);
    expect(undone.strokes.map(({ id }) => id)).toEqual(['one']);
    expect(redoStroke(undone).strokes.map(({ id }) => id)).toEqual(['one', 'two']);
    expect(document.strokes).toHaveLength(2);
  });

  it('restores all strokes when undoing a clear action', () => {
    const document = appendStroke(appendStroke(INITIAL_BLACKBOARD, stroke('one')), stroke('two'));
    const cleared = clearBlackboard(document);
    expect(cleared.strokes).toHaveLength(0);
    expect(undoStroke(cleared).strokes.map(({ id }) => id)).toEqual(['one', 'two']);
  });

  it('ignores empty strokes and marks a real document saved', () => {
    const empty = { ...stroke('empty'), points: [] };
    expect(appendStroke(INITIAL_BLACKBOARD, empty)).toBe(INITIAL_BLACKBOARD);
    expect(markBlackboardSaved(appendStroke(INITIAL_BLACKBOARD, stroke('one'))).saveState).toBe('saved');
  });

  it('leaves an empty history unchanged', () => {
    expect(undoStroke(INITIAL_BLACKBOARD)).toBe(INITIAL_BLACKBOARD);
    expect(redoStroke(INITIAL_BLACKBOARD)).toBe(INITIAL_BLACKBOARD);
    expect(clearBlackboard(INITIAL_BLACKBOARD)).toBe(INITIAL_BLACKBOARD);
  });
});
