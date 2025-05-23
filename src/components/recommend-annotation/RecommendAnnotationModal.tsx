import React, { useState, useEffect, useRef } from "react";
import "./RecommendAnnotationModal.css";

import { MyDB } from "../../App";
import {
  createRecommender,
  predictSpecies,
  predictReactions,
  createRecommendationTable,
} from "../../libs/AMAS-js/src/recommend_annotation";

import { openDB, IDBPDatabase } from "idb";

/**
 * Represents the Match Score Selection Criteria (MSSC) used in AMAS.
 * Determines how AMAS selects candidates based on computed match scores:
 * - `TOP`: Recommends candidates with the highest match score at or above the cutoff (Default).
 * - `ABOVE`: Recommends all candidates with a match score at or above the cutoff.
 */
enum MSSC {
  TOP = "top",
  ABOVE = "above",
}

interface Recommendation {
  type: string;
  id: string;
  displayName: string;
  metaId: string;
  annotation: string;
  annotationLabel: string;
  matchScore: number;
  existing: number;
  updateAnnotation: string;
  isLowMatch: boolean;
}

enum SortOrder {
  ASC = "asc",
  DESC = "desc",
}

interface SortConfig {
  field: keyof Recommendation | null;
  order: SortOrder;
}

/**
 * @description RecommendAnnotationModalProps interface
 * @interface
 * @property {IDBPDatabase<MyDB> | null | undefined} db - The database
 * @property {function} setDb - Set the database
 * @property {function} onClose - Function to close the modal
 * @property {string} fileName - The name of the current selected file
 * @property {string} fileContent - The contents of the current selected file
 * @property {function} setFileContent - Sets the file content
 * @property {function} setUploadedFiles - Sets the uploaded files
 * @property {boolean} isConverted - True if the fileContent was previously Antimony (.ant) and converted to SBML (.xml).
 */
interface RecommendAnnotationModalProps {
  db: IDBPDatabase<MyDB> | null | undefined;
  setDb: (database: IDBPDatabase<MyDB> | null) => void;
  onClose: () => void;
  fileName: string;
  fileContent: string;
  setFileContent: (fileContent: string) => void;
  setUploadedFiles: (files: { name: string; content: string }[]) => void;
  isConverted: boolean;
}

/**
 * @description RecommendAnnotationModal component
 * @param db - RecommendAnnotationModalProp
 * @param setDb - RecommendAnnotationModalProp
 * @param onClose - RecommendAnnotationModalProp
 * @param fileName - RecommendAnnotationModalProp
 * @param fileContent - RecommendAnnotationModalProp
 * @param setFileContent - RecommendAnnotationModalProp
 * @param setUploadedFiles - RecommendAnnotationModalProp
 * @param isConverted - RecommendAnnotationModalProp
 * @example - <RecommendAnnotationModal
 *              db={db}
 *              setDb={setDb}
 *              onClose={onClose}
 *              fileName={fileName}
 *              fileContent={fileContent}
 *              setFileContent={setFileContent}
 *              setUploadedFile={setUploadedFiles}
 *              isConverted={isConverted}
 *            />
 * @returns - RecommendAnnotationModalProps component
 */
const RecommendAnnotationModal: React.FC<RecommendAnnotationModalProps> = ({
  db,
  setDb,
  onClose,
  fileName,
  fileContent,
  setFileContent,
  setUploadedFiles,
  isConverted,
}) => {
  const [step, setStep] = useState<number>(1);
  const [progress, setProgress] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>("Loading...");
  const [cutoff, setCutoff] = useState<number>(0.01);
  const [mssc, setMSSC] = useState<MSSC>(MSSC.TOP);
  const [recommender, setRecommender] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [selectedRecommendations, setSelectedRecommendations] = useState<
    Record<string, boolean>
  >({});
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: null,
    order: SortOrder.ASC,
  });
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose(); // Close the modal if the click is outside the modal
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  /**
   * Handles changes to the cutoff value input field.
   * Ensures the value stays within the valid range of 0.0 to 1.0.
   *
   * @param event - The change event from the number input field.
   */
  const handleCutoff = (event: React.ChangeEvent<HTMLInputElement>) => {
    let value = parseFloat(event.target.value);
    if (value >= 0.0 && value <= 1.0) {
      setCutoff(value);
    }
  };

  /**
   * Handles changes to the MSSC dropdown selection.
   *
   * @param event - The change event from the dropdown select element.
   */
  const handleMSSC = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setMSSC(event.target.value as MSSC);
  };

  /**
   * Handles the generation of annotation recommendations.
   * This involves creating a recommender model, predicting species and reactions,
   * and generating a recommendation table, while updating the progress at each step.
   */
  const handleGenerateAnnotations = async () => {
    try {
      setStep(2);
      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });

      const recom = await createRecommender({
        file: fileContent,
        fileName: fileName,
      });
      const numSpecies = recom.getSpeciesIDs().length;
      const numReactions = recom.getReactionIDs().length;

      setRecommender(recom);
      setProgressMessage(`Predicting ${numSpecies} species...`);
      setProgress(0.25);
      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });

      // Predict species
      const predSpec = await predictSpecies({
        recom,
        mssc,
        cutoff,
      });

      setProgressMessage(`Predicting ${numReactions} reactions...`);
      setProgress(0.5);
      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });

      // Predict reactions
      const predReac = await predictReactions({
        recom,
        mssc,
        cutoff,
      });

      setProgressMessage("Creating recommendations table...");
      setProgress(0.75);
      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });

      // Generate recommendations table
      const recomTable = await createRecommendationTable({
        recom,
        predSpec,
        predReac,
      });

      setProgress(100);
      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });

      // Determine low matches
      const groupedRecommendations = recomTable.reduce(
        (groups: Record<string, Recommendation[]>, rec: Recommendation) => {
          if (!groups[rec.id]) {
            groups[rec.id] = [];
          }
          groups[rec.id].push(rec);
          return groups;
        },
        {}
      );

      const checkLowMatch = (group: Recommendation[]): Recommendation[] => {
        const existingZeros = group.filter((rec) => rec.existing === 0);

        return group.map((rec) => {
          if (rec.existing === 1) {
            const hasLowMatch = existingZeros.some(
              (existingZero) => rec.matchScore < existingZero.matchScore
            );
            return { ...rec, isLowMatch: hasLowMatch };
          }
          return rec;
        });
      };

      const processedRecommendations = recomTable.map((rec: Recommendation) => {
        const group = groupedRecommendations[rec.id];
        const checkedGroup = checkLowMatch(group);
        const updatedRec = checkedGroup.find(
          (r) => getRecommendationKey(r) === getRecommendationKey(rec)
        );
        return { ...rec, isLowMatch: updatedRec?.isLowMatch || false };
      });

      setRecommendations(processedRecommendations);
      setSelectedRecommendations(
        recomTable.reduce(
          (acc: Record<string, boolean>, rec: Recommendation) => {
            const key = getRecommendationKey(rec);
            acc[key] = rec.existing === 1;
            return acc;
          },
          {} as Record<string, boolean>
        )
      );
      setStep(3);
    } catch (error) {
      console.error("Unable to generate annotation recommendations:", error);
      onClose();
    }
  };

  /**
   * Generates a unique key for a recommendation using its ID and annotation.
   * This ensures selections remain stable even when sorting or filtering the list.
   *
   * @param rec - The recommendation object.
   * @returns A string key in the format "id-annotation".
   */
  const getRecommendationKey = (rec: Recommendation) =>
    `${rec.id}-${rec.annotation}`;

  /**
   * Toggles the selection of a recommendation by its recommendation key generated by getRecommendationKey.
   * If the recommendation is already selected, it will be deselected, and vice versa.
   */
  const handleSelect = (key: string) => {
    setSelectedRecommendations((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  /**
   * Updates the sorting configuration based on the selected field.
   * Toggles between ascending and descending order if the same field is clicked.
   *
   * @param field - The recommendation field to sort by.
   */
  const handleSort = (field: keyof Recommendation) => {
    setSortConfig((prev) => ({
      field,
      order:
        prev.field === field && prev.order === SortOrder.ASC
          ? SortOrder.DESC
          : SortOrder.ASC,
    }));
  };

  /**
   * Sort recommendations based on the sort config.
   */
  const sortedRecommendations =
    sortConfig.field !== null
      ? [...recommendations].sort((a, b) => {
          const field = sortConfig.field as keyof typeof a;
          const valueA = a[field];
          const valueB = b[field];

          if (typeof valueA === "number" && typeof valueB === "number") {
            return sortConfig.order === SortOrder.ASC
              ? valueA - valueB
              : valueB - valueA;
          } else if (typeof valueA === "string" && typeof valueB === "string") {
            return sortConfig.order === SortOrder.ASC
              ? valueA.localeCompare(valueB)
              : valueB.localeCompare(valueA);
          }
          return 0;
        })
      : recommendations;

  /**
   * Updates the file with selected annotations by generating an SBML document.
   * Converts it to Antimony if needed.
   */
  const handleUpdateAnnotations = async () => {
    try {
      if (recommender) {
        const selected = recommendations.filter(
          (rec) => selectedRecommendations[getRecommendationKey(rec)]
        );

        const updatedSBMLString = recommender.getSBMLDocument({
          sbmlDocument: recommender.sbmlDocument,
          chosen: selected,
          autoFeedback: true,
        });

        // Update AWE
        let updatedContent;
        if (isConverted) {
          // Convert to Antimony if needed
          if (window.convertSBMLToAntimony) {
            updatedContent = await window.convertSBMLToAntimony(
              updatedSBMLString
            );
            window.antimonyString = updatedContent;
          } else {
            console.error(
              "convertSBMLToAntimony function not found in the global scope."
            );
            return;
          }
        } else {
          updatedContent = updatedSBMLString;
          window.sbmlString = updatedContent;
        }

        setFileContent(updatedContent);
        window.localStorage.setItem("current_file", updatedContent);
        if (db) {
          const updatedFile = { name: fileName, content: updatedContent };
          await db.put("files", updatedFile);
          const updatedFiles = await db.getAll("files");
          const updatedDatabase = await openDB<MyDB>("antimony_editor_db", 1);
          setUploadedFiles(updatedFiles);
          setDb(updatedDatabase);
        }
      }
    } catch (error) {
      console.error("Unable to update annotations:", error);
    } finally {
      onClose();
    }
  };

  return (
    <>
      <div className="shadow-background" />
      <div
        className="annot-modal"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title-container">
          <div className="modal-title">
            {step === 1 && `Select arguments:`}
            {step === 2 && (
              <div>
                <div>{progressMessage}</div>
                <progress value={progress} />
              </div>
            )}
            {step === 3 && `Select annotations to update:`}
          </div>
        </div>

        {step === 1 && (
          <>
            <div className="annot-arguments-container">
              <div className="annot-argument-container">
                <label htmlFor="cutoffInput">Cutoff Score (0.0 - 1.0):</label>
                <input
                  id="cutoffInput"
                  type="number"
                  value={cutoff}
                  onChange={handleCutoff}
                  min="0.0"
                  max="1.0"
                  step="0.01"
                />
              </div>
              <div className="annot-argument-container">
                <label htmlFor="msscInput">
                  Match Score Selection Criteria (MSSC):
                </label>
                <select id="msscInput" value={mssc} onChange={handleMSSC}>
                  {Object.values(MSSC).map((value) => (
                    <option key={value} value={value}>
                      {value.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div
              className="annot-recommend-button"
              onClick={handleGenerateAnnotations}
            >
              Generate annotation recommendations
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="annot-grid">
              <div className="annot-grid-header-container">
                <div
                  className="annot-grid-header sortable-header"
                  onClick={() => handleSort("type")}
                >
                  <div>Type</div>
                  <div>
                    {sortConfig.field === "type"
                      ? sortConfig.order === SortOrder.ASC
                        ? "↑"
                        : "↓"
                      : "↕"}
                  </div>
                </div>
                <div className="annot-grid-header">ID</div>
                <div className="annot-grid-header">Display Name</div>
                <div className="annot-grid-header">Annotation</div>
                <div className="annot-grid-header">Annotation Label</div>
                <div
                  className="annot-grid-header sortable-header"
                  onClick={() => handleSort("matchScore")}
                >
                  <div>Match Score</div>
                  <div>
                    {sortConfig.field === "matchScore"
                      ? sortConfig.order === SortOrder.ASC
                        ? "↑"
                        : "↓"
                      : "↕"}
                  </div>
                </div>
                <div className="annot-grid-header">Selected Annotation</div>
              </div>

              {sortedRecommendations.map((rec) => {
                const key = getRecommendationKey(rec);
                return (
                  <div
                    className={`annot-grid-row ${
                      rec.isLowMatch && "low-match"
                    }`}
                    key={key}
                  >
                    <div className="annot-grid-item">{rec.type}</div>
                    <div className="annot-grid-item">{rec.id}</div>
                    <div className="annot-grid-item">{rec.displayName}</div>
                    <div className="annot-grid-item">{rec.annotation}</div>
                    <div className="annot-grid-item">{rec.annotationLabel}</div>
                    <div className="annot-grid-item">{rec.matchScore}</div>
                    <div className="annot-grid-item">
                      <input
                        type="checkbox"
                        checked={selectedRecommendations[key] || false}
                        onChange={() => handleSelect(key)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div
              className="annot-recommend-button"
              onClick={handleUpdateAnnotations}
            >
              Update annotations
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default RecommendAnnotationModal;
