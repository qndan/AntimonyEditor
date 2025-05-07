export const MarkerSeverity = {
  Hint: 1,
  Info: 2,
  Warning: 4,
  Error: 8,
};

// KeyMod has fields like CtrlCmd and F10 which you can compose with bitwise OR
// Since we don't care about this, just return 1 for all properties so the
// OR still works.
// Exception is chord, where we just return a function that combines all the keys
// into an array.
export const KeyMod = new Proxy({}, {
  get(_, prop: string) {
    if (prop === 'chord') {
      return (...args: any[]) => [...args];
    } else {
      return 1;
    }
  }
});

export const KeyCode = new Proxy({}, {
  get() {
    return 1;
  }
});

/** Makes a fake editor. */
const createEditorMock = (_: HTMLElement, options: any) => {
  const mockEditor = {
    options: options,
    actions: [] as any[],

    getValue: jest.fn(() => options.value),
    setValue: jest.fn((value: string) => {
      options.value = value;
    }),
    getPosition: jest.fn(() => {
      return {
        lineNumber: 1,
        column: 1,
      };
    }),
    
    addAction: jest.fn((action: any) => {
      mockEditor.actions.push(action);
    }),
    mockRunAction: (id: string) => {
      const action = mockEditor.actions.find(a => a.id === id);
      action.run(mockEditor);
    },

    setSelection: jest.fn(),
    revealLineInCenter: jest.fn(),

    getModel: jest.fn(() => {
      return {
        getLineMaxColumn: jest.fn(() => 80),
        getWordAtPosition: jest.fn(() => {
          return {
            word: 'word',
            startColumn: 1,
            endColumn: 5,
          };
        }),
      };
    }),

    deltaDecorations: jest.fn(),
    dispose: jest.fn(),
    onDidChangeModelContent: jest.fn(),
    onDidChangeCursorPosition: jest.fn(),
  };

  return mockEditor;
};

export const editor = {
  create: jest.fn(createEditorMock),

  defineTheme: jest.fn(),
  setTheme: jest.fn(),
  
  removeAllMarkers: jest.fn(),
  setModelMarkers: jest.fn(),

  editorActions: [] as any[],
  addEditorAction: jest.fn(),
  mockRunEditorAction: (id: string) => {
    const action = editor.editorActions.find(a => a.id === id);
    action.run();
  },
};

export const languages = {
  register: jest.fn(),
  setLanguageConfiguration: jest.fn(),
  setMonarchTokensProvider: jest.fn(),
  registerHoverProvider: jest.fn(),
}