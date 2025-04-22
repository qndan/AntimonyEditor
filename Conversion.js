// Keep the require for local testing using node path/to/Conversion.js or can use npm start
// libantimony = require('./libantimony.js');

var sbmlResult = "None";

var loadAntimonyString; // libantimony function
var loadString;   // 		"
var loadSBMLString; //		"
var getSBMLString; //		"
var getAntimonyString; //	"
var getCompSBMLString; //	"
var clearPreviousLoads; //	"
var getLastError; //		"
var getWarnings;  //		"
var getSBMLInfoMessages; //	"
var getSBMLWarnings; //		"
var freeAll;      //		"
var jsFree;         // emscripten function
var jsAllocateUTF8; //

/**
 * @description Loads LibAntimonyJs and converts an Antimony model string to SBML.
 *              This function directly returns the converted SBML string.
 * @param {string} antimonyString - The Antimony string to convert to SBML.
 * @returns {Promise<string>} The converted SBML string, or "" if an error occurs.
 */
async function convertAntimonyToSBML(antimonyString) {
  try {
    const libantimonyInstance = await libantimony();
    const loadAntimonyString = libantimonyInstance.cwrap('loadAntimonyString', 'number', ['string']);
    const getSBMLString = libantimonyInstance.cwrap('getSBMLString', 'string', ['null']);
    const getLastError = libantimonyInstance.cwrap('getLastError', 'string', ['null']);
    const jsAllocateUTF8 = (str) => libantimonyInstance.allocateUTF8(str);
    const jsFree = (ptr) => libantimonyInstance._free(ptr);

    const ptrAntCode = jsAllocateUTF8(antimonyString);
    const loadResult = loadAntimonyString(antimonyString);

    if (loadResult > 0) {
      sbmlResult = getSBMLString();
    } else {
      const errorStr = getLastError();
      window.alert(errorStr);
    }

    jsFree(ptrAntCode);

    return sbmlResult;
  } catch (err) {
    console.error("Load LibAntimonyJs error: ", err);
    return "";
  }
}

/**
 * @description Loads LibAntimonyJs and converts an SBML model string to Antimony.
 *              This function directly returns the converted Antimony string.
 * @param {string} sbmlString - The SBML string to convert to Antimony.
 * @returns {Promise<string>} The converted Antimony string, or "" if an error occurs.
 */
async function convertSBMLToAntimony(sbmlString) {
  try {
    const libantimonyInstance = await libantimony();
    const loadSBMLString = libantimonyInstance.cwrap('loadSBMLString', 'number', ['string']);
    const getAntimonyString = libantimonyInstance.cwrap('getAntimonyString', 'string', ['null']);
    const getLastError = libantimonyInstance.cwrap('getLastError', 'string', ['null']);
    const clearPreviousLoads = libantimonyInstance.cwrap('clearPreviousLoads', 'null', ['null']);
    const jsAllocateUTF8 = (str) => libantimonyInstance.allocateUTF8(str);
    const jsFree = (ptr) => libantimonyInstance._free(ptr);

    clearPreviousLoads();
    const ptrSBMLCode = jsAllocateUTF8(sbmlString);
    const loadResult = loadSBMLString(sbmlString);

    let antimonyResult = "";
    if (loadResult > 0) {
      antimonyResult = getAntimonyString();

      if (window.conversion === "biomodels") {
        const citation = window.citation ? `// Citation: ${window.citation}` : "// No citation provided by PubMed";
        antimonyResult = `// Link to the paper: ${window.url}\n` +
          `// Link to BioModels: ${window.biomodelsUrl}\n` +
          `// Title: ${window.title}\n` +
          `// Authors: ${window.authors}\n` +
          `// Journal: ${window.journal}\n` +
          `${citation}\n` +
          `// Date: ${window.date}\n` +
          antimonyResult;

        window.conversion = "standard";
      }
    } else {
      const errorStr = getLastError();
      window.alert(errorStr);
    }

    jsFree(ptrSBMLCode);
    return antimonyResult;
  } catch (err) {
    console.error("Load LibAntimonyJs error: ", err);
    return "";
  }
}

// Save convertAntimonyToSBML and convertSBMLToAntimony function as global function to be used in AntimonyEditor. THIS IS IMPORTANT DO NOT REMOVE.
window.convertAntimonyToSBML = convertAntimonyToSBML;
window.convertSBMLToAntimony = convertSBMLToAntimony;
