import { readFileSync } from "fs";
import { searchChebi, searchRhea, searchUniProt, searchOntology, AnnotationInfo } from "../../features/AnnotationSearch";
import path from "path";

describe("AnnotationSearch", function () {
  const makeMockKeyboardEvent = (text: string) => {
    return {
      target: { value: text },
    } as unknown as KeyboardEvent;
  };

  const mockBadResponse = { ok: false } as unknown as Response;

  const makeMockResponse = (text: string) => {
    return {
      ok: true,
      text: () => Promise.resolve(text),
    } as unknown as Response;
  };

  const makeMockJsonResponse = (json: any) => {
    return {
      ok: true,
      json: () => Promise.resolve(json),
    } as unknown as Response;
  };

  const makeMockRheaResponse =
    (rows: string[]) => makeMockResponse("Reaction identifier	Equation	EC number\n" + rows.join("\n"));

  const silenceConsoleLog = () => {
    jest.spyOn(global.console, "log").mockImplementation(() => { });
  };

  const spyOnFetchWithResponse = (response: Response) => {
    jest.spyOn(global, "fetch").mockImplementation(_ => {
      return Promise.resolve(response);
    });
  }

  const itShouldReturnZeroResultsForAppropriateCases = (
    searchFunction: any,
    ...extraParams: any[]
  ) => {
    it("should have no results when zero are requested", async () => {
      const result = await (searchFunction)(makeMockKeyboardEvent(""), 0, ...extraParams);
      expect(result).toEqual([]);
    });

    it("should have no results when zero results are requested", async () => {
      const result = await (searchFunction)(makeMockKeyboardEvent(""), 0, ...extraParams);
      expect(result).toEqual([]);
    });

    it("should have no results on empty input", async () => {
      const result = await (searchFunction)(makeMockKeyboardEvent(""), 10, ...extraParams);
      expect(result).toEqual([]);
    });

    it("should have no results on empty input 2", async () => {
      const result = await (searchFunction)(makeMockKeyboardEvent(""), 1, ...extraParams);
      expect(result).toEqual([]);
    });

    it("should have be undefined on bad response", async () => {
      spyOnFetchWithResponse(mockBadResponse);

      const result = await (searchFunction)(makeMockKeyboardEvent("a"), 1, ...extraParams);
      expect(result).toBeUndefined();
    });
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("ChEBI", () => {
    itShouldReturnZeroResultsForAppropriateCases(searchChebi);

    // Could maybe write a script to grab these files in the future.
    const chebiLiteText = readFileSync(path.resolve(__dirname, "./queries/chebi_lite.xml"), "utf8").toString();
    const chebiFaultText = readFileSync(path.resolve(__dirname, "./queries/chebi_fault.xml"), "utf8").toString();
    const chebiFullEntries: Record<string, string> = {
      ["CHEBI:211886"]: readFileSync(path.resolve(__dirname, "./queries/chebi_full_211886.xml"), "utf8").toString(),
      ["CHEBI:211893"]: readFileSync(path.resolve(__dirname, "./queries/chebi_full_211893.xml"), "utf8").toString(),
      ["CHEBI:224188"]: readFileSync(path.resolve(__dirname, "./queries/chebi_full_224188.xml"), "utf8").toString(),
      ["CHEBI:224192"]: readFileSync(path.resolve(__dirname, "./queries/chebi_full_224192.xml"), "utf8").toString(),
      ["CHEBI:224197"]: readFileSync(path.resolve(__dirname, "./queries/chebi_full_224197.xml"), "utf8").toString(),
    }

    it("should return undefined on CHEBI webservice fault", async () => {
      silenceConsoleLog();
      spyOnFetchWithResponse(makeMockResponse(chebiFaultText));

      jest.spyOn(global, "fetch").mockImplementation(() => Promise.resolve(makeMockResponse(chebiFaultText)));

      const result = await searchChebi(makeMockKeyboardEvent("a"), 1);
      expect(result).toBeUndefined();
    });

    it("should work with real-world sample", async () => {
      jest.spyOn(global, "fetch").mockImplementation((url: any) => {
        if (/getLiteEntity/.test(url)) {
          return Promise.resolve(makeMockResponse(chebiLiteText));
        } else {
          const id = /chebiId=CHEBI:(\d+)/.exec(url)?.[1];
          if (!id) {
            throw new Error("No ID found in URL");
          }

          return Promise.resolve(makeMockResponse(chebiFullEntries[id]));
        }
      });

      // CHEBI doesn't seem to provide any descriptive text in getCompleteEntity.
      const result = await searchChebi(makeMockKeyboardEvent("a"), 1);
      expect(result).toEqual([
        { id: "CHEBI:211886", name: "Heydenoic acid A", description: "", link: "http://identifiers.org/chebi/CHEBI:211886" },
        { id: "CHEBI:211893", name: "Heydenoic acid B", description: "", link: "http://identifiers.org/chebi/CHEBI:211893" },
        { id: "CHEBI:224188", name: "Iheyamide A", description: "", link: "http://identifiers.org/chebi/CHEBI:224188" },
        { id: "CHEBI:224192", name: "Iheyamide B", description: "", link: "http://identifiers.org/chebi/CHEBI:224192" },
        { id: "CHEBI:224197", name: "Iheyamide C", description: "", link: "http://identifiers.org/chebi/CHEBI:224197" },
      ]);
    });
  });

  describe("UniProt", () => {
    // Command: curl "https://rest.uniprot.org/uniprotkb/search?fields=accession%2Creviewed%2Cid%2Cprotein_name%2Cgene_names%2Corganism_name%2Clength&query=%28ok%29&size=6" >> src/__tests__/features/queries/uniprot_sample.txt
    const sampleQuery = readFileSync(path.resolve(__dirname, "./queries/uniprot_sample.json"), "utf8").toString();

    itShouldReturnZeroResultsForAppropriateCases(searchUniProt);

    it("should return empty array when there's no results", async () => {
      spyOnFetchWithResponse(makeMockJsonResponse({ results: [] }));
      const result = await searchUniProt(makeMockKeyboardEvent("asdfaefpafl"), 1);
      expect(result).toEqual([]);
    });

    it("should work with real-world sample", async () => {
      spyOnFetchWithResponse(makeMockJsonResponse(JSON.parse(sampleQuery)));
      
      const result = await searchUniProt(makeMockKeyboardEvent("UNIPROT"), 1);
      expect(result).toEqual([
        {
          id: "KLH18_HUMAN", name: "Kelch-like protein 18", description: "", link: "https://www.uniprot.org/uniprotkb/O94889/entry",
          organism: { scientificName: "Homo sapiens", commonName: "Human" }
        },
        {
          id: "NOTUM_HUMAN", name: "Palmitoleoyl-protein carboxylesterase NOTUM", description: "", link: "https://www.uniprot.org/uniprotkb/Q6P988/entry",
          organism: { scientificName: "Homo sapiens", commonName: "Human" }
        },
        {
          id: "TYSY_HUMAN", name: "Thymidylate synthase", description: "", link: "https://www.uniprot.org/uniprotkb/P04818/entry",
          organism: { scientificName: "Homo sapiens", commonName: "Human" }
        },
        {
          id: "CTNB1_HUMAN", name: "Catenin beta-1", description: "", link: "https://www.uniprot.org/uniprotkb/P35222/entry",
          organism: { scientificName: "Homo sapiens", commonName: "Human" }
        },
        {
          id: "NIP7_HUMAN", name: "60S ribosome subunit biogenesis protein NIP7 homolog", description: "", link: "https://www.uniprot.org/uniprotkb/Q9Y221/entry",
          organism: { scientificName: "Homo sapiens", commonName: "Human" }
        },
        {
          id: "TBB5_HUMAN", name: "Tubulin beta chain", description: "", link: "https://www.uniprot.org/uniprotkb/P07437/entry",
          organism: { scientificName: "Homo sapiens", commonName: "Human" }
        },
      ]);
    });
  });


  describe("Rhea", () => {
    const sampleQuery = readFileSync(path.resolve(__dirname, "./queries/rhea_sample.txt"), "utf8").toString();

    itShouldReturnZeroResultsForAppropriateCases(searchRhea);

    it("should parse no EC number", async () => {
      spyOnFetchWithResponse(makeMockRheaResponse(["RHEA:37891	aclacinomycin T + H2O = 15-demethylaclacinomycin T + methanol	"]));

      const result = await searchRhea(makeMockKeyboardEvent("h"), 1) as AnnotationInfo[];
      expect(result[0]?.ec).toEqual([]);
    });

    it("should parse one EC number", async () => {
      spyOnFetchWithResponse(makeMockRheaResponse(["RHEA:37891	aclacinomycin T + H2O = 15-demethylaclacinomycin T + methanol	EC:1"]));

      const result = await searchRhea(makeMockKeyboardEvent("h"), 1) as AnnotationInfo[];
      expect(result[0]?.ec).toEqual(["1"]);
    });

    it("should parses multiple EC numbers", async () => {
      spyOnFetchWithResponse(makeMockRheaResponse(["RHEA:37891	aclacinomycin T + H2O = 15-demethylaclacinomycin T + methanol	EC:1.2.3.4;EC:5.6.7.8;EC:9.10.11"]));

      const result = await searchRhea(makeMockKeyboardEvent("h"), 1) as AnnotationInfo[];
      expect(result[0]?.ec).toEqual(["1.2.3.4", "5.6.7.8", "9.10.11"]);
    });

    // sample acquired with curl "https://www.rhea-db.org/rhea/?query=t&columns=rhea-id,equation,ec&format=tsv&limit=16" (Apr 2025)
    it("should correctly parse a real-world sample", async () => {
      spyOnFetchWithResponse(makeMockResponse(sampleQuery));

      const result = await searchRhea(makeMockKeyboardEvent("a"), 16);
      expect(result).toEqual([
        { id: "37891", name: "aclacinomycin T + H2O = 15-demethylaclacinomycin T + methanol", description: "", link: "https://www.rhea-db.org/rhea/37891", ec: ["3.1.1.95"] },
        { id: "45800", name: "15-demethylaclacinomycin T + AH2 + O2 = 10-decarboxymethylaclacinomycin T + A + CO2 + H2O", description: "", link: "https://www.rhea-db.org/rhea/45800", ec: [] },
        { id: "41564", name: "dTDP-beta-L-rhodosamine + aklavinone = aclacinomycin T + dTDP + 2 H(+)", description: "", link: "https://www.rhea-db.org/rhea/41564", ec: ["2.4.1.326"] },
        { id: "41568", name: "dTDP-2-deoxy-beta-L-fucose + aclacinomycin T = aclacinomycin S + dTDP + H(+)", description: "", link: "https://www.rhea-db.org/rhea/41568", ec: ["2.4.1.327"] },
        { id: "65304", name: "verruculide A + 2-oxoglutarate + O2 = chrodrimanin T + succinate + CO2", description: "", link: "https://www.rhea-db.org/rhea/65304", ec: [] },
        { id: "65336", name: "chrodrimanin T + NADPH + O2 + H(+) = chrodrimanin A + NADP(+) + H2O", description: "", link: "https://www.rhea-db.org/rhea/65336", ec: [] },
        { id: "16037", name: "thymidine + phosphate = 2-deoxy-alpha-D-ribose 1-phosphate + thymine", description: "", link: "https://www.rhea-db.org/rhea/16037", ec: ["2.4.2.2", "2.4.2.4"] },
        { id: "67360", name: "L-threonyl-L-threonine + H2O = 2 L-threonine", description: "", link: "https://www.rhea-db.org/rhea/67360", ec: [] },
        { id: "67372", name: "L-seryl-L-threonine + H2O = L-threonine + L-serine", description: "", link: "https://www.rhea-db.org/rhea/67372", ec: [] },
        { id: "67364", name: "L-threonyl-L-serine + H2O = L-threonine + L-serine", description: "", link: "https://www.rhea-db.org/rhea/67364", ec: [] },
        { id: "24624", name: "tRNA(Thr) + L-threonine + ATP = L-threonyl-tRNA(Thr) + AMP + diphosphate + H(+)", description: "", link: "https://www.rhea-db.org/rhea/24624", ec: ["6.1.1.3"] },
        { id: "28791", name: "5,6-dihydrothymine + NAD(+) = thymine + NADH + H(+)", description: "", link: "https://www.rhea-db.org/rhea/28791", ec: ["1.3.1.1"] },
        { id: "28883", name: "L-threonine(in) + H(+)(in) = L-threonine(out) + H(+)(out)", description: "", link: "https://www.rhea-db.org/rhea/28883", ec: [] },
        { id: "28995", name: "L-threonine(in) + H(+)(out) = L-threonine(out) + H(+)(in)", description: "", link: "https://www.rhea-db.org/rhea/28995", ec: [] },
        { id: "29955", name: "thymidine(in) + H(+)(in) = thymidine(out) + H(+)(out)", description: "", link: "https://www.rhea-db.org/rhea/29955", ec: [] },
        { id: "30579", name: "O-phospho-L-threonine + H2O = L-threonine + phosphate", description: "", link: "https://www.rhea-db.org/rhea/30579", ec: [] },
      ]);
    });
  });

  describe("Ontology", () => {
    // Command: curl "https://www.ebi.ac.uk/ols4/api/v2/entities?search=hi&size=6&page=0&ontologyId=cl&lang=en&exactMatch=false&includeObsoleteEntities=false&isDefiningOntology=true" > src/__tests__/features/queries/ontology_sample.json
    const sampleQuery = readFileSync(path.resolve(__dirname, "./queries/ontology_sample.json"), "utf8").toString();
    
    itShouldReturnZeroResultsForAppropriateCases(searchOntology, "cl");

    it("should return empty array with invalid ontology ID", async () => {
      const result = await searchOntology(makeMockKeyboardEvent("a"), 1, "okawekfawekdosafk");
      expect(result).toEqual([]);
    });

    it("should work with real-world sample", async () => {
      spyOnFetchWithResponse(makeMockJsonResponse(JSON.parse(sampleQuery)));

      const result = await searchOntology(makeMockKeyboardEvent("abc"), 1, "cl");
      expect(result).toEqual([
        { id: "CL:1001580", name: "hippocampal glial cell", description: "A glial cell that is part of the hippocampus.", link: "http://purl.obolibrary.org/obo/CL_1001580" },
        { id: "CL:0002604", name: "hippocampal astrocyte", description: "An astrocyte that is part of the hippocampus.", link: "http://purl.obolibrary.org/obo/CL_0002604" },
        { id: "CL:1001571", name: "hippocampal pyramidal neuron", description: "A pyramidal neuron with a soma found in the hippocampus.", link: "http://purl.obolibrary.org/obo/CL_1001571" },
        { id: "CL:0000373", name: "histoblast", description: "A progenitor cell found in the larval epidermis of insects and that gives rise to the adult abdominal epidermis.", link: "http://purl.obolibrary.org/obo/CL_0000373" },
        { id: "CL:0017010", name: "hillock cell of urethral epithelium", description: "A hillock cell that is part of the urethra.", link: "http://purl.obolibrary.org/obo/CL_0017010" },
        { id: "CL:4030024", name: "hillock cell", description: "An epithelial, transitional cell type between basal and secretory; located in stratified, non-ciliated structures (called hillocks) with high cell turnover in epithelium. In some mammalian species, this cell type has been noted to express KRT13 and is postulated to play a role in squamous barrier function and immunomodulation.", link: "http://purl.obolibrary.org/obo/CL_4030024" },
      ]);
    });
  });
});