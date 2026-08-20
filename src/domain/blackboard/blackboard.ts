export type BlackboardTool = 'pen' | 'highlighter' | 'eraser' | 'shape' | 'text';
export type BlackboardSaveState = 'clean' | 'dirty' | 'saving' | 'saved';

export type BlackboardPoint = { x: number; y: number };

export type BlackboardStroke = {
  id: string;
  tool: BlackboardTool;
  colorToken: string;
  width: number;
  points: readonly BlackboardPoint[];
};

export type BlackboardDocument = {
  strokes: readonly BlackboardStroke[];
  redoStack: readonly BlackboardStroke[];
  clearBackup: readonly BlackboardStroke[] | null;
  saveState: BlackboardSaveState;
};

export const INITIAL_BLACKBOARD: BlackboardDocument = {
  strokes: [],
  redoStack: [],
  clearBackup: null,
  saveState: 'clean',
};

export function appendStroke(document: BlackboardDocument, stroke: BlackboardStroke): BlackboardDocument {
  if (stroke.points.length === 0) return document;
  return { strokes: [...document.strokes, stroke], redoStack: [], clearBackup: null, saveState: 'dirty' };
}

export function undoStroke(document: BlackboardDocument): BlackboardDocument {
  if (document.strokes.length === 0 && document.clearBackup) {
    return { ...document, strokes: document.clearBackup, clearBackup: null, saveState: 'dirty' };
  }
  const stroke = document.strokes.at(-1);
  if (!stroke) return document;
  return {
    strokes: document.strokes.slice(0, -1),
    redoStack: [...document.redoStack, stroke],
    clearBackup: null,
    saveState: 'dirty',
  };
}

export function redoStroke(document: BlackboardDocument): BlackboardDocument {
  const stroke = document.redoStack.at(-1);
  if (!stroke) return document;
  return {
    strokes: [...document.strokes, stroke],
    redoStack: document.redoStack.slice(0, -1),
    clearBackup: null,
    saveState: 'dirty',
  };
}

export function clearBlackboard(document: BlackboardDocument): BlackboardDocument {
  if (document.strokes.length === 0) return document;
  return { strokes: [], redoStack: [], clearBackup: document.strokes, saveState: 'dirty' };
}

export function markBlackboardSaved(document: BlackboardDocument): BlackboardDocument {
  return { ...document, saveState: 'saved' };
}
