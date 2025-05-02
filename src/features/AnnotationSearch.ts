import React from "react";
import convert from "xml-js";
const corsProxyUrl = "https://corsproxy.io/?"; // "https://api.allorigins.win/raw?url=";

/**
 * @description Holds relevant information for a single annotation search result
 */
export type AnnotationInfo = {
  name: string;
  id: string;
  description: string;
  link?: string; // the link that will appear for the annotation
  ec?: string[]; // for rhea only
  organism?: {scientificName: string, commonName: string} // for uniprot only, to differentiate between protein names
};

/**
 * @description Represents the inability to retrieve data from the database.
 */
const unableToRetrieve: AnnotationInfo = {
  name: "Unable to retrieve data from the database",
  id: "unable-to-retrieve",
  description: "",
};

/**
 * @description Represents when no results are found for a query.
 */
const noResultsFound: AnnotationInfo = {
  name: "No results found",
  id: "no-results-found",
  description: "",
};

/**
 * @description Represents valid ontology IDs.
 */
const validOntologyIds: string[] = [
  "cl", // Cell Type Ontology
  "go", // Gene Ontology
  "pr", // Protein Ontology
  "obi", // Ontology for Biomedical Investigations
  "fma", // Foundation Model of Anatomy
  "ma", // Mouse Adult Gross Anatomy
];

/**
 * @description Asynchronously searches the ChEBI database.
 * @param search Holds query information.
 * @param size Number of results to return.
 * @returns {Promise<AnnotationInfo[] | undefined>} A promise that resolves to an array of AnnotationInfo objects if successful,
 * otherwise undefined.
 */
export async function searchChebi(
  search: KeyboardEvent,
  size: number
): Promise<AnnotationInfo[] | undefined> {
  try {
    const queryText = encodeURIComponent((search.target as HTMLInputElement).value.trim());
    if (size <= 0 || queryText.length === 0) {
      return [];
    }

    const response = await fetch(
      corsProxyUrl +
        `https://www.ebi.ac.uk/webservices/chebi/2.0/test/getLiteEntity?search=${queryText}&searchCategory=a&maximumResults=${size}&starsCategory=ALL`
    );

    if (!response.ok) {
      return undefined;
    }

    const data = await response.text();
    let jsonStr = convert.xml2json(data, {
      compact: true,
      spaces: 2,
    });
    const results = JSON.parse(jsonStr);
    let chebiList = results["S:Envelope"]["S:Body"];

    if (chebiList["S:Fault"] !== undefined) {
      throw new Error("Unable to establish a connection to ChEBI.");
    }

    // let info: AnnotationInfo[] = [];
    let listElements = chebiList["getLiteEntityResponse"]["return"]["ListElement"];
    if (!Array.isArray(listElements)) {
      listElements = [listElements];
    }
    let info: AnnotationInfo[] = await Promise.all(
      listElements.map(async (element: any) => {
        let description: string = await getCompleteChebiEntity(element.chebiId._text);
        return {
          id: element.chebiId._text,
          name: element.chebiAsciiName._text,
          description: description, // TODO: Get description
          link: "http://identifiers.org/chebi/" + element.chebiId._text,
        };
      })
    );

    return info;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

/**
 * @description Retreives the specific information relative to a given chebi id
 * @param id The chebi id
 * @returns {Promise<string | any>} promise holding the definition of the species (if it exists), otherwsie empty string or any.
 */
async function getCompleteChebiEntity(id: string): Promise<string | any> {
  try {
    const response = await fetch(
      corsProxyUrl +
        `https://www.ebi.ac.uk/webservices/chebi/2.0/test/getCompleteEntity?chebiId=${encodeURIComponent(id)}`
    );

    if (response.ok) {
      const data = await response.text();
      let jsonStr = convert.xml2json(data, {
        compact: true,
        spaces: 2,
      });
      const results = JSON.parse(jsonStr);
      let resBody = results["S:Envelope"]["S:Body"];

      if (resBody["S:Fault"] === undefined) {
        return resBody["getCompleteEntityResponse"]["return"]["definition"]._text as string;
      }
      return "";
    }
  } catch (e) {
    return "";
  }
}

/**
 * @description Asynchronously searches the UniProt database.
 * @param search Holds query information.
 * @param size Number of results to return.
 * @returns {Promise<AnnotationInfo[] | undefined>} A promise that resolves to an array of AnnotationInfo objects if successful,
 * otherwise undefined.
 */
export async function searchUniProt(
  search: KeyboardEvent,
  size: number
): Promise<AnnotationInfo[] | undefined> {
  try {
    const queryText = encodeURIComponent((search.target as HTMLInputElement).value.trim());
    if (size <= 0 || queryText.length === 0) {
      return [];
    }

    const response = await fetch(
      `https://rest.uniprot.org/uniprotkb/search?fields=accession%2Creviewed%2Cid%2Cprotein_name%2Cgene_names%2Corganism_name%2Clength&query=%28${queryText}%29&size=${size}`
    );

    if (!response.ok) {
      return undefined;
    }

    const data = await response.json();
    const info: AnnotationInfo[] = data.results.map((result: any) => {
      return {
        id: result.uniProtkbId,
        name:
          result.proteinDescription?.recommendedName?.fullName.value ||
          result.proteinDescription?.submissionNames[0]?.fullName.value,
        description: "", // TODO: Get description
        link: "https://www.uniprot.org/uniprotkb/" + result.primaryAccession + "/entry",
        organism: {scientificName: result.organism.scientificName, commonName: result.organism.commonName},
      };
    });

    return info;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

/**
 * @description Asynchronously searches the Rhea database.
 * @param search Holds query information.
 * @param size Number of results to return.
 * @returns {Promise<AnnotationInfo[] | undefined>} A promise that resolves to an array of AnnotationInfo objects if successful;
 * otherwise, undefined.
 */
export async function searchRhea(
  search: KeyboardEvent,
  size: number
): Promise<AnnotationInfo[] | undefined> {
  try {
    const queryText = encodeURIComponent((search.target as HTMLInputElement).value.trim());
    if (size <= 0 || queryText.length === 0) {
      return [];
    }

    const response = await fetch(`https://www.rhea-db.org/rhea/?query=${queryText}&columns=rhea-id,equation,ec&format=tsv&limit=${size}`);

    if (!response.ok) {
      return undefined;
    }
    const data = await response.text();
    let split = data.split('\n');
    
    let output: AnnotationInfo[] = []

    // get fields
    for (let i = 1; i < split.length; i++) {
      if (split[i].length !== 0) {
        let currLine = split[i].split('\t');
        let reactionId = currLine[0].substring(5);
        let equation = currLine[1];

        // format: EC:12.2.121;EC:1242.24.24
        let ec: string[] = currLine[2].substring(3).split(';EC:').filter(e => e.length > 0);

        output.push({
          id: reactionId,
          name: equation,
          description: "",
          link: "https://www.rhea-db.org/rhea/" + reactionId,
          ec: ec,
        });
      }
    }

    return output;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

/**
 * @description Asynchronously searches the Ontology database.
 * @param search Holds query information.
 * @param size Number of results to return.
 * @param ontologyId Filters the ontology type; must be one of the following:
 *      cl = Cell Type Ontology
 *      go = Gene Ontology
 *      pr = Protein Ontology
 *      obi = Ontology for Biomedical Investigations
 *      fma = Foundation Model of Anatomy
 *      ma = Mouse Adult Gross Anatomy
 * @returns {Promise<AnnotationInfo[] | undefined>} A promise that resolves to an array of AnnotationInfo objects if successful;
 * otherwise, undefined.
 */
export async function searchOntology(
  search: KeyboardEvent,
  size: number,
  ontologyId: string
): Promise<AnnotationInfo[] | undefined> {
  try {
    const queryText = encodeURIComponent((search.target as HTMLInputElement).value.trim());
    if (size <= 0 || queryText.length === 0 || !validOntologyIds.includes(ontologyId)) {
      return [];
    }

    const response = await fetch(
      `https://www.ebi.ac.uk/ols4/api/v2/entities?search=${queryText}&size=${size}&page=0&ontologyId=${encodeURIComponent(ontologyId)}&lang=en&exactMatch=false&includeObsoleteEntities=false&isDefiningOntology=true`
    );

    if (!response.ok) {
      return undefined;
    }

    const data = await response.json();
    console.log(data)
    let info: AnnotationInfo[] = data.elements.map((result: any) => {
      if (result.type[0] === "class" && result.type[1] === "entity") {
        // Get description
        let description: string = "";
        if (typeof result.description === "string") {
          description = result.description;
        } else if (result.definition?.value) {
          description = result.definition.value;
        } else {
          if (Array.isArray(result.definition)) {
            for (let i = 0; i < result.definition.length; i++) {
              if (result.definition[i].value) {
                description = result.definition[i].value;
                break;
              }
            }
          }
        }

        // Add this element to the list of results
        return {
          id: result.curie,
          name: result.label,
          description: description,
          link: result.iri,
        };
      }
      return [];
    });

    return info;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

export function getChebi(
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setSearchResults: React.Dispatch<React.SetStateAction<AnnotationInfo[]>>,
  ref: React.RefObject<HTMLInputElement>
) {
  let timer: ReturnType<typeof setTimeout>;
  const waitTime = 1000;

  const chebiBrowse = ref.current;

  if (chebiBrowse) {
    chebiBrowse.addEventListener("keyup", async (val) => {
      if ((val.target as HTMLInputElement).value.length < 1) {
        setSearchResults([]);
        return;
      }
      clearTimeout(timer);
      timer = setTimeout(async () => {
        setSearchResults([]);
        setLoading(true);
        const searchResults = await searchChebi(val, 100);

        // Error: Unable to connect to ChEBI
        if (searchResults === undefined) {
          setLoading(false);
          setSearchResults([unableToRetrieve]);
          return;
        }

        // No results found in ChEBI
        if (searchResults.length === 0) {
          setLoading(false);
          setSearchResults([noResultsFound]);
          return;
        }

        // Otherwise, display results
        setLoading(false);
        setSearchResults(searchResults);
      }, waitTime);
    });
  }
}

export function getUniProt(
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setSearchResults: React.Dispatch<React.SetStateAction<AnnotationInfo[]>>,
  ref: React.RefObject<HTMLInputElement>
) {
  let timer: ReturnType<typeof setTimeout>;
  const waitTime = 300;

  const uniBrowse = ref.current;

  if (uniBrowse) {
    uniBrowse.addEventListener("keyup", async (val) => {
      if ((val.target as HTMLInputElement).value.length < 1) {
        setSearchResults([]);
        return;
      }
      clearTimeout(timer);
      timer = setTimeout(async () => {
        setSearchResults([]);
        setLoading(true);
        const searchResults = await searchUniProt(val, 100);

        // Error: Unable to connect to UniProt
        if (searchResults === undefined) {
          setLoading(false);
          setSearchResults([unableToRetrieve]);
          return;
        }

        // No results found in UniProt
        if (searchResults.length === 0) {
          setLoading(false);
          setSearchResults([noResultsFound]);
          return;
        }

        // Otherwise, display results
        setLoading(false);
        setSearchResults(searchResults);
      }, waitTime);
    });
  }
}

export function getRhea(
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setSearchResults: React.Dispatch<React.SetStateAction<AnnotationInfo[]>>,
  ref: React.RefObject<HTMLInputElement>
) {
  let timer: ReturnType<typeof setTimeout>;
  const waitTime = 1000;

  const rheaBrowse = ref.current;

  if (rheaBrowse) {
    rheaBrowse.addEventListener("keyup", async (val) => {
      if ((val.target as HTMLInputElement).value.length < 1) {
        setSearchResults([]);
        return;
      }
      clearTimeout(timer);
      timer = setTimeout(async () => {
        setSearchResults([]);
        setLoading(true);
        const searchResults = await searchRhea(val, 100);

        // Error: Unable to connect to Rhea
        if (searchResults === undefined) {
          setLoading(false);
          setSearchResults([unableToRetrieve]);
          return;
        }

        // No results found in Rhea
        if (searchResults.length === 0) {
          setLoading(false);
          setSearchResults([noResultsFound]);
          return;
        }

        // Otherwise, display results
        setSearchResults(searchResults);
        setLoading(false);
      }, waitTime);
    });
  }
}

export function getOntology(
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setSearchResults: React.Dispatch<React.SetStateAction<AnnotationInfo[]>>,
  ref: React.RefObject<HTMLInputElement>,
  ontologyId?: string
) {
  let timer: ReturnType<typeof setTimeout>;
  const waitTime = 1000;

  const ontologyBrowse = ref.current;

  if (ontologyBrowse) {
    ontologyBrowse.addEventListener("keyup", async (val) => {
      if ((val.target as HTMLInputElement).value.length < 1 || ontologyId === undefined) {
        setSearchResults([]);
        return;
      }
      clearTimeout(timer);
      timer = setTimeout(async () => {
        setSearchResults([]);
        setLoading(true);
        const searchResults = await searchOntology(val, 100, ontologyId);

        // Error: Unable to connect to ontologyId
        if (searchResults === undefined) {
          setLoading(false);
          setSearchResults([unableToRetrieve]);
          return;
        }

        // No results found in ontologyId
        if (searchResults.length === 0) {
          setLoading(false);
          setSearchResults([noResultsFound]);
          return;
        }

        // Otherwise, display results
        setLoading(false);
        setSearchResults(searchResults);
      }, waitTime);
    });
  }
}
