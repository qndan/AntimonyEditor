// TODO: needs to test if annotated variable actions work

import * as monaco from "monaco-editor";
import { act, render, RenderResult } from "@testing-library/react";
import { useState } from "react";

import AntimonyEditor, { processContent, AntimonyEditorProps } from "../../components/antimony-editor/AntimonyEditor";
import { SrcPosition } from "../../language-handler/Types";

describe("AntimonyEditor", () => {
  // We have secret mock functions inside of the mock module.
  const monacoMock = monaco as any;

  const DEFAULT_FILES = [
    {name: "file.ant", content: "hello world"},
  ];

  const ANTIMONY_WITH_NOTES =
      "A: lprll1p2r1lplp laplfsdf\n"
      + "model notes ```\n"
      + "\t\t<b>convert this to markdown</b>\n"
      + "```";

  const createMockDatabase = (files: { name: string, content: string }[]) => {
    const objectStore = {
      get: (fileName: string) =>
        Promise.resolve(files.find(f => f.name === fileName)),
      put: jest.fn(),
    };
    const transaction = {
      objectStore: () => objectStore,
    };
    
    return {
      transaction: () => transaction,
    }
  };

  const MockAntimonyEditor = (
    props: {
      files: {name: string, content: string}[],
      mockDatabase?: any,
      // hack to get editor instance out of the rendered AntimonyEditor.
      // use it like this:
      // let editor: any;
      // ...
      //   editorInstanceExtractor: (e) => myEditor = e,
      editorInstanceExtractor?: (editor: any) => void,
    } & Partial<AntimonyEditorProps>
  ) => {
    const [annotUnderlinedOn, setAnnotUnderlinedOn] = useState(false);
    const [editorInstance, setEditorInstance] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
    const [selectedFilePosition, setSelectedFilePosition] = useState(new SrcPosition(1, 1));

    return (
      <AntimonyEditor
        fileName={props.files[0].name}
        database={props.mockDatabase ?? createMockDatabase(props.files) as any}

        annotUnderlinedOn={annotUnderlinedOn}
        setAnnotUnderlinedOn={setAnnotUnderlinedOn}
        
        editorInstance={editorInstance}
        setEditorInstance={e => {
          if (props.editorInstanceExtractor) props.editorInstanceExtractor(e);
          setEditorInstance(e);
        }}

        selectedFilePosition={selectedFilePosition}
        handleSelectedPosition={setSelectedFilePosition}
        highlightColor={"red"}
        handleNewFile={jest.fn()}
        {...props}
      />
    );
  };

  it("should use xml language features when opening .xml", async () => {
    let antimonyEditor: RenderResult;
    let mockMonacoEditor: any;
    // doesn't work without `act` :(
    await act(async () => {
      antimonyEditor = render(<MockAntimonyEditor
        files={[ {name: "test.xml", content: "hello"} ]}
        editorInstanceExtractor={e => mockMonacoEditor = e}
      />);
    });

    expect(mockMonacoEditor.options.language).toBe("xml");
  });

  it("should use antimony language features when opening .ant", async () => {
    let antimonyEditor: RenderResult;
    let mockMonacoEditor: any;
    // doesn't work without `act` :(
    await act(async () => {
      antimonyEditor = render(<MockAntimonyEditor
        files={[ {name: "test.ant", content: "hello"} ]}
        editorInstanceExtractor={e => mockMonacoEditor = e}
      />);
    });

    expect(mockMonacoEditor.options.language).toBe("antimony");
  });

  describe("processContent", () => {
    it("should convert HTML to markdown within notes", () => {
      const processed = processContent(ANTIMONY_WITH_NOTES);
      expect(processed).toContain("**convert this to markdown**");
    });
  });

  it("should convert HTML to markdown within notes when you type", async () => {
    let antimonyEditor: RenderResult;
    let mockMonacoEditor: any;
    // doesn't work without `act` :(
    await act(async () => {
      antimonyEditor = render(<MockAntimonyEditor
        files={[ {name: "test.ant", content: "no notes"} ]}
        editorInstanceExtractor={e => mockMonacoEditor = e}
      />);
    });

    expect(mockMonacoEditor.getValue()).not.toContain("**convert this to markdown**");

    await act(async () => {
      mockMonacoEditor.setValue(ANTIMONY_WITH_NOTES);
      mockMonacoEditor.onDidChangeModelContent.mock.lastCall[0]();
    });

    expect(mockMonacoEditor.getValue()).toContain("**convert this to markdown**");
  });

  it("should tell you to select a variable when you want to add an annotation but aren't on one", async () => {
    let antimonyEditor: RenderResult;
    let mockMonacoEditor: any;
    // doesn't work without `act` :(
    await act(async () => {
      antimonyEditor = render(<MockAntimonyEditor
        files={DEFAULT_FILES}
        editorInstanceExtractor={e => mockMonacoEditor = e}
      />);
    });

    const originalAlert = global.alert;
    const mockAlert = jest.fn();
    global.alert = mockAlert;

    await act(async() => {
      mockMonacoEditor.mockRunAction("create-annotation");
    });

    expect(mockAlert).toBeCalled();

    global.alert = originalAlert;
  });

  it("should tell you to select a variable when you want to go to an annotation but aren't on one", async () => {
    let antimonyEditor: RenderResult;
    let mockMonacoEditor: any;
    // doesn't work without `act` :(
    await act(async () => {
      antimonyEditor = render(<MockAntimonyEditor
        files={DEFAULT_FILES}
        editorInstanceExtractor={e => mockMonacoEditor = e}
      />);
    });

    const originalAlert = global.alert;
    const mockAlert = jest.fn();
    global.alert = mockAlert;

    await act(async() => {
      mockMonacoEditor.mockRunAction("Navigate to Edit Annotation");
    });

    expect(mockAlert).toBeCalled();

    global.alert = originalAlert;
  });

  it("should save to IndexedDB when you edit", async () => {
    let antimonyEditor: RenderResult;
    let mockMonacoEditor: any;
    const files = [{ name: "test.ant", content: "not saved yet" }];
    const mockDatabase = createMockDatabase(files);
    // doesn't work without `act` :(
    await act(async () => {
      antimonyEditor = render(<MockAntimonyEditor
        files={files}
        mockDatabase={mockDatabase}
        editorInstanceExtractor={e => mockMonacoEditor = e}
      />);
    });

    await act(async () => {
      mockMonacoEditor.setValue("SAVE ME");
      mockMonacoEditor.onDidChangeModelContent.mock.lastCall[0]();
    });

    expect(mockDatabase.transaction().objectStore().put).toBeCalledWith({name: "test.ant", content: "SAVE ME"});
  });
});