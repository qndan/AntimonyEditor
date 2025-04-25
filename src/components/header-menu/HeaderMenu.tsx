import React, { useState, useEffect, useRef } from "react";
import HeaderMenuDropdown, { HeaderMenuOption, SimpleHeaderMenuOption } from "./HeaderMenuDropdown";
import "./HeaderMenu.css";

import { MyDB } from "../../App";
import RecommendAnnotationModal from "../recommend-annotation/RecommendAnnotationModal";

import { IDBPDatabase } from "idb";

export interface HeaderMenuProps {
  /* The database with all the files and stuff */
  db: IDBPDatabase<MyDB> | null | undefined;
  setDb: (database: IDBPDatabase<MyDB> | null) => void;

  /* Name of the current selected file */
  fileName: string;
  /* Contents of the current selected file */
  fileContent: string;
  /* Set the contents of the current selected file */
  setFileContent: (fileContent: string) => void;
  /* Set files */
  setUploadedFiles: (files: { name: string; content: string }[]) => void;

  /** Handle the Antimony to SBML file conversion process */
  handleConversionAntimony: () => void;
  /** Handle the SBML to Antimony file conversion */
  handleConversionSBML: () => void;
  /** Handle the file download */
  handleFileDownload: () => void;
  /** Handle the file upload */
  handleFileUpload: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => Promise<void>;
  /**  Handle a new file */
  handleNewFile: (newFileName: string, fileContent: string) => Promise<void>;

  /** Current highlight color */
  highlightColor: string,
  /** Change the current highlight color */
  setHighlightColor: (color: string) => void;
  /** Options for the highlight color  */
  colors: { name: string; color: string }[];
}

const HeaderMenu: React.FC<HeaderMenuProps> = ({
  db,
  setDb,

  fileName,
  fileContent,
  setFileContent,
  setUploadedFiles,

  handleConversionAntimony,
  handleConversionSBML,
  handleFileDownload,
  handleFileUpload,
  handleNewFile,

  highlightColor,
  setHighlightColor,
  colors,
}) => {
  const [isModalVisible, setModalVisible] = useState(false);
  const [convertedFileContent, setConvertedFileContent] = useState("");
  const [isConverted, setIsConverted] = useState(false);

  const [visibleDropdown, setVisibleDropdown] = useState("");
  const headerRef = useRef<HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isAboutModalVisible, setAboutModalVisible] = useState(false);
  const [aboutContent, setAboutContent] = useState('');

  /// Behavior ///

  /**
   * Handles the file annotation process.
   * It checks the file type and either opens a modal or converts an Antimony file to SBML before opening the modal.
   */
  const handleAnnotateClick = async () => {
    if (fileName.endsWith(".xml")) {
      setModalVisible(true);
    } else if (fileName.endsWith(".ant")) {
      try {
        if (window.convertAntimonyToSBML) {
          setConvertedFileContent(
            await window.convertAntimonyToSBML(window.antimonyString)
          );
          setIsConverted(true);
          setModalVisible(true);
        } else {
          console.error(
            "convertAntimonyToSBML function not found in the global scope."
          );
        }
      } catch (err) {
        console.error("Error during Antimony to SBML conversion:", err);
      }
    } else {
      // If the file is neither .xml nor .ant
      alert(
        "Invalid file type.\nOnly AMAS (.ant) and SBML (.xml) files can be annotated using AMAS."
      );
    }
  };

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Check if Alt+N is pressed
      if (event.altKey && event.key === "n") {
        event.preventDefault();
        handleNewFile("untitled.ant", "");
      }

      // Check if Ctrl+O is pressed
      if (event.ctrlKey && event.key === "o") {
        event.preventDefault();
        fileInputRef.current?.click();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleFileUpload, handleNewFile]);

  useEffect(() => {
    if (isAboutModalVisible) {
      fetch('./about.html')
        .then(response =>response.text())
        .then(html => {
          setAboutContent(html);
        });
    }
  }, [isAboutModalVisible]);

  /// Header and dropdown visual handling ///

  const handleMenuOptionClick = (option: string) => {
    if (visibleDropdown === option) {
      setVisibleDropdown("");
    } else {
      setVisibleDropdown(option);
    }
  };

  const handleMenuOptionHover = (option: string) => {
    if (visibleDropdown) {
      setVisibleDropdown(option);
    }
  };

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (
        headerRef.current &&
        !headerRef.current.contains(e.target as Node)
      ) {
        setVisibleDropdown("");
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [visibleDropdown]);

  /** Wraps an onSelected handler so it makes sure to turn off the dropdown. */
  const wrapOnSelected = (onSelected: SimpleHeaderMenuOption["onSelected"]) => {
    return (...args: Parameters<SimpleHeaderMenuOption["onSelected"]>) => {
      setVisibleDropdown("");
      onSelected(...args);
    };
  };

  const headerOptions: Record<string, HeaderMenuOption[]> = {
    File: [
      { name: "New File", hotkey: "Alt-N", onSelected: wrapOnSelected(() => handleNewFile("untitled.ant", "")) },
      { name: "Open File(s)", hotkey: "Ctrl-O", onSelected: wrapOnSelected(() => fileInputRef.current?.click()) },
      { name: "Save to Downloads", onSelected: wrapOnSelected(handleFileDownload) },
      "---",
      {
        name: "Convert Antimony → SBML",
        onSelected: wrapOnSelected(() => {
          if (fileName.endsWith(".ant")) {
            handleConversionAntimony();
          } else {
            alert(
              "Invalid file type.\nOnly Antimony (.ant) files can be converted to SBML (.xml)."
            );
          }
        })
      },
      {
        name: "Convert SBML → Antimony",
        onSelected: wrapOnSelected(() => {
          if (fileName.endsWith(".xml")) {
            handleConversionSBML();
          } else {
            alert(
              "Invalid file type.\nOnly SBML (.xml) files can be converted to Antimony (.ant)."
            );
          }
        })
      },
    ],

    Annotate: [
      { name: "Recommend Annotations for All", onSelected: wrapOnSelected(handleAnnotateClick) },
    ],

    Settings: [
      { 
        name: "Color",
        options: [
          {
            name: "Highlight",
            options: colors.map(color => ({
              name: color.name,
              active: highlightColor === color.color,
              extra:
                <div
                  className="color-square"
                  style={{ backgroundColor: color.color }}
                />,
              onSelected: wrapOnSelected(() => setHighlightColor(color.color)),
            })),
          },
        ],
      },
    ],

    Help: [
      { name: "Documentation", link: "https://github.com/sys-bio/AntimonyEditor" },
      { name: "Report Issue", link: "https://github.com/sys-bio/AntimonyEditor/issues" },
      { name: "About", onSelected: wrapOnSelected(() => setAboutModalVisible(true)) },
    ],
  };

  return (
    <>
      <header ref={headerRef}>
        <h1 className="title">Antimony Web Editor</h1>
        <input
          ref={fileInputRef}
          id="file-upload"
          type="file"
          multiple
          onChange={handleFileUpload}
          accept=".ant,.xml,.txt"
        />
        <nav>
          <ul className="header-menu">
            {Object.entries(headerOptions).map(([name, options]) =>
              <li key={name} className="header-menu-option">
                <button
                  onClick={() => handleMenuOptionClick(name)}
                  onMouseEnter={() => handleMenuOptionHover(name)}
                >{name}</button>

                {visibleDropdown === name &&
                  <HeaderMenuDropdown
                    options={options}
                  />
                }
              </li>
            )}
          </ul>
        </nav>
      </header>

      {isModalVisible && (
        <RecommendAnnotationModal
          db={db}
          setDb={setDb}
          onClose={() => setModalVisible(false)}
          fileName={fileName}
          fileContent={isConverted ? convertedFileContent : fileContent}
          setFileContent={setFileContent}
          setUploadedFiles={setUploadedFiles}
          isConverted={isConverted}
        />
      )}
      
      {isAboutModalVisible && (
        <div 
        className="modal-background" 
        onClick={() => setAboutModalVisible(false)}
      >
        <div 
          className="about-modal" 
          onClick={(e) => e.stopPropagation()}
        >
          <div dangerouslySetInnerHTML={{ __html: aboutContent }} />
        </div>
      </div>
      )}
    </>
  );
};

export default HeaderMenu;