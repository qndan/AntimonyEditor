import React, { useRef, useEffect, useState } from 'react';
import * as monaco from 'monaco-editor';
import { antimonyLanguage } from '../../languages/antlr/AntimonyLanguage';
import { antimonyTheme } from '../../languages/AntimonyTheme';
import CustomButton from '../CustomButton';
import './AntimonyEditor.css';
import { getBiomodels, getModel, searchModels } from '../../features/BrowseBiomodels';
import Loader from '../Loader';
import ModelParser from '../../languages/ModelParser';
import handleDownload from '../../features/HandleDownload';
import { IDBPDatabase, DBSchema } from 'idb';
// import { loadAntimonyString, loadSBMLString, processAntimony } from '../../libAntimony/UseLibAnt';

interface AntimonyEditorProps {
  content: string;
  fileName: string;
}
interface MyDB extends DBSchema {
  files: {
    key: string;
    value: { name: string; content: string };
  };
}

let currentHoverDisposable: monaco.IDisposable | null = null;

declare global {
  interface Window {
    antimonyString: string;
  }
}

const AntimonyEditor: React.FC<AntimonyEditorProps & { database: IDBPDatabase<MyDB> }> = ({ content, fileName, database }) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [chosenModel, setChosenModel] = useState<string | null>(null);
  const [editorInstance, setEditorInstance] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [originalContent, setOriginalContent] = useState<string>(content); // Track the original content
  const [newContent, setNewContent] = useState<string>(content); // Track the new content
  const [selectedFile, setSelectedFile] = useState<string>('')

  let typingTimer: any;
  
  const delayedModelParser = (editor: monaco.editor.IStandaloneCodeEditor) => {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      ModelParser(editor, true);
    }, 300);
  };

  useEffect(() => {
    if (editorRef.current) {
      // Load the custom language
      monaco.languages.register({ id: 'antimony' });
      monaco.languages.setMonarchTokensProvider('antimony', antimonyLanguage);

      // Load the custom theme
      monaco.editor.defineTheme('antimonyTheme', antimonyTheme);
      monaco.editor.setTheme('antimonyTheme');

      // Retrieve content and file name from IndexedDB
      database.transaction('files').objectStore('files').get(fileName).then((data) => {
        if (data) {
          setOriginalContent(data.content);
          setNewContent(data.content);
          setSelectedFile(data.name);
          editor.setValue(data.content);
        }
      });

      // Create the editor
      const editor = monaco.editor.create(editorRef.current, {
        bracketPairColorization: { enabled: true }, // Enable bracket pair colorization
        value: content,
        language: 'antimony',
      });

      // Set language configuration for bracket pair colorization
      monaco.languages.setLanguageConfiguration('antimony', {
        brackets: [
          ['{', '}'],
          ['[', ']'],
          ['(', ')'],
          // Add any other bracket pairs used in your language, including nested ones
        ],
      });

      // Set the hover provider
      ModelParser(editor, false);

      setOriginalContent(editor.getValue());

      editor.onDidChangeModelContent(() => {
        setNewContent(editor.getValue());
        delayedModelParser(editor);
      });

      getBiomodels(setLoading, setChosenModel);

      setEditorInstance(editor);

      setSelectedFile(fileName);

      window.antimonyString = editor.getValue();
      console.log('string' + window.antimonyString);

      // processAntimony(editor.getValue());

      // loadAntimonyString(editor.getValue());

      return () => editor.dispose();
    }
  }, [content, database, fileName]);

  // Use IndexedDB to save content and file name whenever they change
  useEffect(() => {
    if (database && editorInstance) {
      setNewContent(editorInstance.getValue());
      const transaction = database.transaction('files', 'readwrite');
      transaction.objectStore('files').put({
        name: selectedFile,
        content: newContent,
      });
    }
  }, [newContent, selectedFile, database]);

  useEffect(() => {
    // Display dropdown when a user searches for a model
    if (chosenModel) {
      const dropdown = document.getElementById('dropdown');
      dropdown!.style.display = "none";
      setLoading(true);
      getModel(chosenModel).then((model) => {
        setLoading(false);
        const editor = monaco.editor.getModels()[0];
        editor.setValue(model);
      });
    }
  }, [chosenModel]);

  return (
    <div>
      <div className='menu'>
        <button className='button' onClick={() => handleDownload(editorInstance, fileName)}>Save File</button>
        {/* <button className='button' onClick={save}> Save Changes </button> */}
        <CustomButton name={'Create Annotations'} />
        <CustomButton name={'Navigate to Edit Annotations'} />
        <CustomButton name={'Insert Rate Law'} />
        <CustomButton name={'Convert to SBML'} />
        <CustomButton name={'Annotated Variable Highlight Off'} />
        <input id='biomodel-browse' type='text' placeholder='Search for a model' />
        <ul id='dropdown' />
        <Loader loading={loading} />
      </div>
      <div className="code-editor" ref={editorRef}></div>
    </div>
  );
};

export default AntimonyEditor;
