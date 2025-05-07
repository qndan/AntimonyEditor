import React, { useRef, useEffect, useState, useCallback } from "react";
import * as monaco from "monaco-editor";
import { antimonyLanguage } from "../../language-handler/antlr/AntimonyLanguage";
import { antimonyTheme } from "../../language-handler/AntimonyTheme";
import "./AntimonyEditor.css";
import { getBiomodels, getModel } from "../../features/BrowseBiomodels";
import Loader from "../Loader";
import CreateAnnotationModal from "../create-annotation/CreateAnnotationModal";
import ModelSemanticsChecker from "../../language-handler/ModelSemanticChecker";
import { IDBPDatabase, DBSchema } from "idb";
import { SrcPosition, SrcRange } from "../../language-handler/Types";
import TurndownService from "turndown";

/**
 * @description AntimonyEditorProps interface
 * @interface
 * @property {string} content - The content of the editor
 * @property {string} fileName - The name of the file
 * @property {object} editorInstance - The current editor instance
 * @property {function} setEditorInstance - The function to set the current editor instance
 * @property {object} selectedFilePosition -
 * @property {function} handleSelectedPosition -
 * @property {function} handleConversionSBML - Handle the SBML to Antimony file conversion
 */
export interface AntimonyEditorProps {
  fileName: string;
  annotUnderlinedOn: boolean;
  setAnnotUnderlinedOn: (value: React.SetStateAction<boolean>) => void;
  editorInstance: monaco.editor.IStandaloneCodeEditor | null;
  setEditorInstance: React.Dispatch<React.SetStateAction<monaco.editor.IStandaloneCodeEditor | null>>;
  selectedFilePosition: SrcPosition;
  handleSelectedPosition: (position: SrcPosition) => void;
  highlightColor: string;
  handleNewFile: (newFileName: string, newFileContent: string) => Promise<void>;
}

/**
 * @description IndexedDB schema
 * @interface
 * @property {object} files - The files object
 * @property {string} files.key - The key of the files object
 * @property {object} files.value - The value of the files object
 * @property {string} files.value.name - The name of the file
 * @property {string} files.value.content - The content of the file
 * @extends DBSchema
 */
interface MyDB extends DBSchema {
  files: {
    key: string;
    value: { name: string; content: string };
  };
}

/**
 * @description Declare global variables
 * @global
 * @property {string} antimonyString - The Antimony string
 * @property {string} sbmlString - The SBML string
 */
declare global {
  interface Window {
    antimonyString: string; // Define the antimonyString variable
    sbmlString: string; // Define the sbmlString variable
    sbmlResult: string; // Define the sbmlResult variable
    antimonyResult: string; // Define the antimonyResult variable
    fileName: string; // Define the fileName variable
    modelId: string; // Define the modelId variable
    url: string; // Define the link variable
    biomodelsUrl: string; // Define the biomodels link variable
    biomodelsOptionSet: boolean; // Define the biomodelsOptionSet variable
    title: string; // Define the title variable
    authors: string[]; // Define the authors variable
    citation: string | null; // Define the citation variable
    date: string; // Define the date variable
    journal: string; // Define the journal variable
    conversion: string; // Define the conversion variable
    convertAntimonyToSBML?: ( antimonyString: string ) => Promise<string> // Define the convertAntimonyToSBML function
    convertSBMLToAntimony?: ( sbmlString: string ) => Promise<string> // Define the convertSBMLToAntimony function
    selectedFile: string; // Define the selectedFile variable
    libsbml: any; // Define the libsbml variable
  }
}

export const processContent = (content: string) => {
  const turndownService = new TurndownService();
  const regex = /```([\s\S]*?)```/g;   // Match content inside triple backticks

  let processedContent = content.replace(regex, (match, htmlContent) => {
    // Check if the content inside the backticks is HTML (simple check)
    const isHtml = /<\/?[a-z][\s\S]*>/i.test(htmlContent);
    if (isHtml) {
      // Convert HTML to Markdown
      const markdown = turndownService.turndown(htmlContent);
      const indentedMarkdown = markdown
        .split('\n')
        .map(line => `\t\t${line}`) // Add a tab to the beginning of each line
        .join('\n');
      return `\`\`\`\n${indentedMarkdown}\n\t\`\`\``;
    }
    return match; // Return original if no HTML found
  });

  return processedContent
};

/**
 * @description AntimonyEditor component
 * @param content - AntimonyEditorProp
 * @param fileName - AntimonyEditorProp
 * @param database - IDBPDatabase<MyDB>
 * @example - <AntimonyEditor content={content} fileName={fileName} database={database} />
 * @returns - AntimonyEditor component
 */
const AntimonyEditor: React.FC<AntimonyEditorProps & { database: IDBPDatabase<MyDB> }> =
    ({
       fileName,
       database,
       annotUnderlinedOn,
       setAnnotUnderlinedOn,
       editorInstance,
       setEditorInstance,
       selectedFilePosition,
       handleSelectedPosition,
       highlightColor,
       handleNewFile,
     }) => {
      const editorRef = useRef<HTMLDivElement | null>(null);
      const [loading, setLoading] = useState<boolean>(false);
      const [isModalVisible, setModalVisible] = useState<boolean>(false);
      const [chosenModel, setChosenModel] = useState<string | null>(null);
      // const [originalContent, setOriginalContent] = useState<string>(content); // Track the original content
      const [initialContent, setInitialContent] = useState<string>("");
      const [newContent, setNewContent] = useState<string>(""); // Track the new content
      const [selectedFile, setSelectedFile] = useState<string>("");
      const [annotationAddPosition, setAnnotationAddPosition] = useState<SrcPosition | null>(null);
      const [varToAnnotate, setVarToAnnotate] =
          useState<{id: string, name: string | undefined} | null>(null);
      const [decorations, setDecorations] = useState<string[]>([]);
      const [searchMode, setSearchMode] = useState<'standard' | 'model_number'>('standard');

      /**
       * @description adds the menu option to create an annotation
       * @param editor
       */
      const addAnnotationOption = (editor: any) => {
        if (editorRef.current) {
          // Adds the create annotations option to the context menu of the editor
          editor.addAction({
            id: "create-annotation", // Unique identifier of the contributed action
            label: "Create Annotations", // Label of the action that will be presented to the user
            keybindings: [
              monaco.KeyMod.CtrlCmd | monaco.KeyCode.F10, // Keybinding using Ctrl or Cmd with F10
              monaco.KeyMod.chord( // Chorded keybinding, requiring a sequence of keys
                  monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK,
                  monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyM
              ),
            ],
            precondition: null, // No precondition for this action
            keybindingContext: null, // No additional rules to evaluate for keybinding dispatch
            contextMenuGroupId: "navigation", // Group where this action will appear in the context menu
            contextMenuOrder: 1, // Order within the group where this action will appear
            run: function (ed: monaco.editor.IStandaloneCodeEditor) { // Function to execute when action is triggered
              const position = ed.getPosition(); // Gets the current cursor position in the editor
              if (position) {
                const word = ed.getModel()?.getWordAtPosition(position); // Gets the word at the cursor position
                if (word) {
                  // Defines the start and end position for the word
                  let start: SrcPosition = new SrcPosition(position.lineNumber, word.startColumn);
                  let end: SrcPosition = new SrcPosition(position.lineNumber, word.endColumn);
                  let srcRange: SrcRange = new SrcRange(start, end); // Creates a source range from start to end
                  // Check and retrieve variable annotation information if available
                  let { symbolTable: ST } = ModelSemanticsChecker(ed, annotUnderlinedOn, false, highlightColor, decorations);
                  let varAndAnnotationPositionInfo = ST.hasVarAtLocation(word.word, srcRange);
                  if (varAndAnnotationPositionInfo) {
                    setModalVisible(true); // Shows modal for adding annotations
                    setAnnotationAddPosition(varAndAnnotationPositionInfo.annotationPositon); // Sets position for new annotation
                    let displayName = varAndAnnotationPositionInfo.varInfo.displayName?.replaceAll("\"", ""); // Cleans display name from quotes
                    setVarToAnnotate({ id: word.word, name: displayName }); // Prepares variable information for annotation
                  } else {
                    alert("Please select a variable to annotate."); // Alerts user to select a variable if none is found
                  }
                } else {
                  alert("Please select a variable to annotate."); // Alerts user if no word is selected
                }
              }
            },
          });
        }
      };

      /**
       * @description handles adding the menu option to highlight unannotated variables
       * @param editor
       */
      const addAnnotationVarUnderlineOption = (editor: any) => {
        if (editorRef.current) {
          // Adds the "Highlight Unannotated Variables" option to the context menu.
          // Checks if the cursor is on an actual variable or not.
          editor.addAction({
            // An unique identifier of the contributed action.
            id: "underline-annotation",

            // A label of the action that will be presented to the user.
            label: `Highlight Unannotated Variables ${annotUnderlinedOn ? "Off" : "On"}`,

            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.F10],

            // A precondition for this action.
            precondition: null,

            // A rule to evaluate on top of the precondition in order to dispatch the keybindings.
            keybindingContext: null,

            contextMenuGroupId: "navigation",

            contextMenuOrder: 1.5,

            run: function (editor: monaco.editor.IStandaloneCodeEditor) {
              setAnnotUnderlinedOn((prevAnnotUnderlinedOn) => !prevAnnotUnderlinedOn);
            },
          });
        }
      };

      /**
       * @description Adds the menu option to navigate to the first annotation (by line number) for a selected variable.
       * @param editor The Monaco editor instance.
       */
      const addNavigateEditAnnotationOption = (editor: any) => {
        if (editorRef.current) {
          editor.addAction({
            // An unique identifier of the contributed action.
            id: "Navigate to Edit Annotation",

            // A label of the action that will be presented to the user.
            label: `Navigate to Edit Annotation`,

            // A precondition for this action.
            precondition: null,

            // A rule to evaluate on top of the precondition in order to dispatch the keybindings.
            keybindingContext: null,

            // The group in which this action is included in the context menu.
            contextMenuGroupId: "navigation",

            // The order of this action in the context menu group.
            contextMenuOrder: 1.5,

            // Method that will be executed when the action is triggered.
            // @param ed The editor instance is passed in as a convenience.
            run: function (ed: monaco.editor.IStandaloneCodeEditor) {
              const position = ed.getPosition();
              if (position) {
                const word = ed.getModel()?.getWordAtPosition(position);
                if (word) {
                  // Determine the start and end positions of the selected word.
                  let start: SrcPosition = new SrcPosition(position.lineNumber, word.startColumn);
                  let end: SrcPosition = new SrcPosition(position.lineNumber, word.endColumn);
                  let srcRange: SrcRange = new SrcRange(start, end);

                  // Check if the variable exists at the specified location.
                  // This might be optimized in the future by caching the symbol table.
                  let { symbolTable: ST } = ModelSemanticsChecker(ed, annotUnderlinedOn, false, highlightColor, decorations)
                  let info = ST.hasVarAtLocation(word.word, srcRange);

                  if (info && info.varInfo.annotations.length > 0) {
                    // Find the line number of the first annotation.
                    let line = Number.MAX_VALUE;
                    for (const value of info.varInfo.annotationLineNum.values()) {
                      line = Math.min(value.start.line, line);
                    }

                    // Set the editor selection to the annotation's line and reveal it.
                    const range = {
                      startLineNumber: line,
                      startColumn: 1,
                      endLineNumber: line,
                      endColumn: editor.getModel().getLineMaxColumn(line),
                    };
                    ed.setSelection(range);
                    ed.revealLineInCenter(line);
                  } else {
                    alert("Please select an annotated variable");
                  }
                } else {
                  alert("Please select an annotated variable");
                }
              }
            },
          });
        }
      };

      // Takes in an a file in the database and loads it into the editor.
      const loadFile = (fName: string) => {
        let processedContent: string;
        database
              .transaction("files")
              .objectStore("files")
              .get(fName)
              .then((data) => {
                if (data) {
                  if (data.content) {
                    processedContent = processContent(data.content);
                  } else {
                    processedContent = "";
                  }
                  setInitialContent(processedContent);
                  window.antimonyString = processedContent;
                  window.selectedFile = data.name;
                  setSelectedFile(fName);
                } else {
                  console.log("File called to load does not exist in database");
                }
              }
            );
      }

      /**
       * @description Initial load of the selected file, retrieve the data, activates loading the editor by setting selectedFile state
       */
      useEffect(() => {
        loadFile(fileName);
      }, [fileName, database]) 


      /**
       * @description Loads the editor and sets the language, theme, and content
       */
      useEffect(() => {
        if (editorRef.current) {
          let editor: any;
          
          // Load the custom language
          monaco.languages.register({ id: "antimony" });
          monaco.languages.setMonarchTokensProvider("antimony", antimonyLanguage);

          // Load the custom theme
          monaco.editor.defineTheme("antimonyTheme", antimonyTheme);
          monaco.editor.setTheme("antimonyTheme");

          if (fileName.includes(".xml")) {
            // Create the editor
            editor = monaco.editor.create(editorRef.current, {
              bracketPairColorization: { enabled: true }, // Enable bracket pair colorization
              value: initialContent,
              language: "xml",
              automaticLayout: true,
            });

            // Set the antimonyString variable to the editor content
            window.sbmlString = editor.getValue();
          } else {
            editor = monaco.editor.create(editorRef.current, {
              bracketPairColorization: { enabled: true }, // Enable bracket pair colorization
              value: initialContent,
              language: "antimony",
              automaticLayout: true,
              wordWrap: 'on',  // Enable word wrap
              wordWrapColumn: 80,  // Max column width before wrapping
              wrappingIndent: 'same',
            });
            // Set the antimonyString variable to the editor content
            window.antimonyString = editor.getValue();
            ModelSemanticsChecker(editor, annotUnderlinedOn, true, highlightColor, decorations);
          }

          // Adds the create annotations option to the context menu
          // Checks if the cursor is on an actual variable or not
          addAnnotationOption(editor);

          // Adds the "Underline Unannotated Variables" option to the context menu.
          // Checks if the cursor is on an actual variable or not.
          addAnnotationVarUnderlineOption(editor);

          // Adds the "Navigate to Edit Annotation" option to the context menu
          // checks if the cursor is on an actual variable or not.
          addNavigateEditAnnotationOption(editor);

          // Set language configuration for bracket pair colorization
          monaco.languages.setLanguageConfiguration("antimony", {
            comments: {
              lineComment: "//",
            },
            brackets: [
              ["{", "}"],
              ["[", "]"],
              ["(", ")"],
            ],
          });

          handleEditorContentChange(editor);
          handleCursorPositionChange(editor);
          getBiomodels(setLoading, setChosenModel);
          setEditorInstance(editor);
          
          return () => editor.dispose();
        }
      }, [annotUnderlinedOn, selectedFile, initialContent]);

      /**
       * @description Adds the link action to the editor context menu
       */
      useEffect(() => {
        if (editorInstance) {
          let biomodelsUrl = editorInstance.getValue().split('BioModels: ')[1];
          if (biomodelsUrl && biomodelsUrl.startsWith('http')) {
            window.biomodelsUrl = biomodelsUrl.substring(0, biomodelsUrl.indexOf('\n'));
          } else {
            biomodelsUrl = editorInstance.getValue().split('model_entity_is ')[1];
            if (biomodelsUrl) {
              window.biomodelsUrl = biomodelsUrl.substring(1, biomodelsUrl.indexOf('"', 2));
            } else {
              window.biomodelsUrl = '';
            }
          }

          if (!window.biomodelsOptionSet) {
            window.biomodelsOptionSet = true;
            monaco.editor.addEditorAction({
              id: 'link',
              label: 'Open in Biomodels',
              contextMenuGroupId: 'navigation',
              run: _ => {
                if (window.biomodelsUrl) {
                  window.open(window.biomodelsUrl, '_blank');
                } else {
                  alert('No BioModels link found in the model.');
                }
              }
            });
          }
        }
      }, [editorInstance]);

      /**
       * @description Saves the name and content of the file selected to IndexedDB
       */
      useEffect(() => {
        if (database && editorInstance) {
          let processedContent = processContent(editorInstance.getValue());
          const transaction = database.transaction("files", "readwrite");
          transaction.objectStore("files").put({
            name: selectedFile,
            content: processedContent,
          });
          window.localStorage.setItem("current_file", processedContent);
          window.antimonyString = processedContent;
        } else {
          if (!database) console.log("Database state is null!");
        }
      }, [newContent]);

      /**
       * @description Handles displaying the dropdown when a user searches for a model
       */
      useEffect(() => {
        if (chosenModel) {
          const dropdown = document.getElementById("biomddropdown");
          dropdown!.style.display = "none";
          setLoading(true);
          if (chosenModel === "") {
            setLoading(false);
            return;
          }
          getModel(chosenModel).then((model) => {
            window.modelId = model.modelId;
            window.biomodelsUrl = "https://www.ebi.ac.uk/biomodels/" + window.modelId;
            window.title = model.title;
            window.authors = model.authors;
            window.url = model.url;
            window.citation = model.citation;
            window.date = model.date;
            window.journal = model.journal;
            window.fileName = model.modelId;
            window.sbmlString = model.sbmlData;
            window.conversion = "biomodels";
            if (window.convertSBMLToAntimony) {
              window.convertSBMLToAntimony(model.sbmlData).then((converted) => {
                handleNewFile(window.fileName + ".ant", (converted ? processContent(converted) : ""))
              });
            } else {
              console.log("null");
            }
            setLoading(false);
          });
        }
      }, [chosenModel]);

      /**
       * when the cursor position changes in the editor
       * we use the callback function `handleSelectedPosition`
       * to update state.
       * @param editor
       */
      const handleCursorPositionChange = (editor: any) => {
        editor.onDidChangeCursorPosition(() => {
          let position: monaco.Position = editor.getPosition();
          if (position) {
            handleSelectedPosition(new SrcPosition(position.lineNumber, position.column));
          }
        });
      };
      
      let typingTimer: any;

      const handleEditorContentChange = (editor: any) => {
        const delayedModelParser = (editor: monaco.editor.IStandaloneCodeEditor) => {
          clearTimeout(typingTimer);
          typingTimer = setTimeout(() => {
            ModelSemanticsChecker(editor, annotUnderlinedOn, true, highlightColor, decorations);
          }, 100);
        };
      
        editor.onDidChangeModelContent(() => {
          let currentContent = editor.getValue()
          let processedContent = processContent(currentContent);

          if (currentContent !== processedContent) {
            editor.setValue(processedContent);
          }
          setNewContent(processedContent);
          window.localStorage.setItem("current_file", processedContent);
          window.antimonyString = processedContent;
          delayedModelParser(editor);
        });
      };
      
      /**
       * Tracks the current selected biomodel search mode,
       * this does not do anything yet.
       * @param e 
       */
      const handleBiomodelSearchModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSearchMode(e.target.value as 'standard' | 'model_number');
      };

      return (
        <>
          <div className="search-container">
            <Loader loading={loading} />
            <div className="search-input-group">
              <select id="search-mode" defaultValue="standard" onChange={handleBiomodelSearchModeChange}>
                <option value="standard">Standard Search</option>
                <option value="model_number">Model Number Search</option>
              </select>
              <div className="input-wrapper">
                <input
                  id="biomodel-browse"
                  type="text"
                  placeholder="Search biomodels"
                />
                <div id="biomddropdown">
                  <ul />
                </div>
              </div>
            </div>
          </div>
          <div className="code-editor" ref={editorRef}></div>
          {isModalVisible && (
            <CreateAnnotationModal
              onClose={() => setModalVisible(false)}
              annotationAddPosition={annotationAddPosition}
              editorInstance={editorInstance}
              varToAnnotate={varToAnnotate}
            />
          )}
        </>
      );
    };

export default AntimonyEditor;
