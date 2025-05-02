import { readFile, readFileSync } from "fs";
import { searchChebi, searchRhea, AnnotationInfo, searchUniProt } from "../../features/AnnotationSearch";
import path from "path";

describe("AnnotationSearch", function () {
  const makeMockKeyboardEvent = (text: string) => {
    return {
      target: { value: text },
    } as unknown as KeyboardEvent;
  };

  const mockBadResponse = { ok: false } as unknown as Response;

  const makeMockResponse = (text: string) => {
    return Promise.resolve({
      ok: true,
      text: () => Promise.resolve(text),
    } as unknown as Response);
  };
  
  const makeMockRheaResponse =
    (rows: string[]) => makeMockResponse("Reaction identifier	Equation	EC number\n" + rows.join("\n"));

  const itShouldReturnZeroResultsForAppropriateCases = (searchFunction: (event: KeyboardEvent, limit: number) => Promise<AnnotationInfo[] | undefined>) => {
    it("should have no results when zero are requested", async () => {
      const result = await (searchFunction)(makeMockKeyboardEvent(""), 0);
      expect(result).toEqual([]);
    });

    it("should have no results when zero results are requested", async () => {
      const result = await (searchFunction)(makeMockKeyboardEvent(""), 0);
      expect(result).toEqual([]);
    });

    it("should have no results on empty input", async () => {
      const result = await (searchFunction)(makeMockKeyboardEvent(""), 10);
      expect(result).toEqual([]);
    });

    it("should have no results on empty input 2", async () => {
      const result = await (searchFunction)(makeMockKeyboardEvent(""), 1);
      expect(result).toEqual([]);
    });

    it("should have be undefined on bad response", async () => {
      jest.spyOn(global, "fetch").mockImplementation(() => Promise.resolve(mockBadResponse));
      const result = await (searchFunction)(makeMockKeyboardEvent("a"), 1);
      expect(result).toBeUndefined();
    });
  };

  afterEach(() => {
    jest.resetAllMocks();
  });

  beforeEach(() => {
    jest.spyOn(global.console, "log").mockImplementation(() => {});
  })

  describe("Chebi", () => {
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
      jest.spyOn(global, "fetch").mockImplementation(() => Promise.resolve(makeMockResponse(chebiFaultText)));
      
      const result = await searchChebi(makeMockKeyboardEvent("a"), 1);
      expect(result).toBeUndefined();
    });

    it("should work with real-world sample", async () => {
      jest.spyOn(global, "fetch").mockImplementation((url: any) => {
        if (/getLiteEntity/.test(url)) {
          return makeMockResponse(chebiLiteText);
        } else {
          const id = /chebiId=CHEBI:(\d+)/.exec(url)?.[1];
          if (!id) {
            throw new Error("No ID found in URL");
          }
          return makeMockResponse(chebiFullEntries[id]);
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

  describe("Rhea", () => {
    const sampleQuery = readFileSync(path.resolve(__dirname, "./queries/rhea_sample.txt"), "utf8").toString();

    itShouldReturnZeroResultsForAppropriateCases(searchRhea);

    it("should parse no EC number", async () => {
      jest.spyOn(global, "fetch").mockImplementation(() =>
        makeMockRheaResponse(["RHEA:37891	aclacinomycin T + H2O = 15-demethylaclacinomycin T + methanol	"]));

      const result = await searchRhea(makeMockKeyboardEvent("h"), 1) as AnnotationInfo[];
      expect(result[0]?.ec).toEqual([]);
    });

    it("should parse one EC number", async () => {
      jest.spyOn(global, "fetch").mockImplementation(() =>
        makeMockRheaResponse(["RHEA:37891	aclacinomycin T + H2O = 15-demethylaclacinomycin T + methanol	EC:1"]));

      const result = await searchRhea(makeMockKeyboardEvent("h"), 1) as AnnotationInfo[];
      expect(result[0]?.ec).toEqual(["1"]);
    });

    it("should parses multiple EC numbers", async () => {
      jest.spyOn(global, "fetch").mockImplementation(() =>
        makeMockRheaResponse(["RHEA:37891	aclacinomycin T + H2O = 15-demethylaclacinomycin T + methanol	EC:1.2.3.4;EC:5.6.7.8;EC:9.10.11"]));
      
      const result = await searchRhea(makeMockKeyboardEvent("h"), 1) as AnnotationInfo[];
      expect(result[0]?.ec).toEqual(["1.2.3.4", "5.6.7.8", "9.10.11"]);
    });

    // sample acquired with curl "https://www.rhea-db.org/rhea/?query=t&columns=rhea-id,equation,ec&format=tsv&limit=16" (Apr 2025)
    it("should correctly parse a real-world sample", async () => {
      jest.spyOn(global, "fetch").mockImplementation(() => makeMockResponse(sampleQuery));

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


  // it('basic rhea query', async () => {
  //     global.fetch = () => Promise.resolve({
  //         ok: true,
  //         json: () => Promise.resolve({ results: [
  //             {id: '1', equation: 'kevin' },
  //             {id: '2', equation: 'edison' },
  //             {id: '3', equation: 'eva' },
  //             {id: '4', equation: 'anish' },
  //             {id: '5', equation: 'steve' }
  //         ]}),
  //         // body: new Readable,
  //         // bodyUsed: true,
  //         // headers: new Headers(),
  //         // redirected: false,
  //         // status: 200,
  //         // statusText: 'OK',
  //         // type: 'cors',
  //         // url: '',
  //     });

  //     (searchInput.target as HTMLInputElement).value = 'Test'
  //     const result = await searchRhea(searchInput, 1);
  //     assert.deepStrictEqual(result, [
  //         {description: "", id: '1', name: 'kevin', link: "https://www.rhea-db.org/rhea/1"},
  //         {description: "", id: '2', name: 'edison', link: "https://www.rhea-db.org/rhea/2"},
  //         {description: "", id: '3', name: 'eva', link: "https://www.rhea-db.org/rhea/3"},
  //         {description: "", id: '4', name: 'anish', link: "https://www.rhea-db.org/rhea/4"},
  //         {description: "", id: '5', name: 'steve', link: "https://www.rhea-db.org/rhea/5"}
  //     ]);
  // })

  // it('basic ontology query', async () => {
  //     global.fetch = () => Promise.resolve({
  //         ok: true,
  //         json: () => Promise.resolve({ results: {elements: [
  //             {curie: '1', label: 'kevin', description: {value: "goat"}, iri: "link1", type: ["class", "entity"]},
  //             {curie: '2', label: 'edison', description: {value: "slack variable"}, iri: "link2", type: ["class", "entity"]},
  //             {curie: '3', label: 'eva' , description: {value: "god"}, iri: "link3", type: ["class", "entity"]},
  //             {curie: '4', label: 'anish', description: {value: "smart"}, iri: "link4", type: ["class", "entity"]},
  //             {curie: '5', label: 'steve', description: {value: "the steve"}, iri:"link5", type: ["class", "entity"]}
  //         ]}}),
  //     });

  //     (searchInput.target as HTMLInputElement).value = 'Test'
  //     const result = await searchOntology(searchInput, 1, "go");
  //     assert.deepStrictEqual(result, [
  //         {description: "goat", id: '1', name: 'kevin', link: "https://www.rhea-db.org/rhea/1"},
  //         {description: "slack variable", id: '2', name: 'edison', link: "https://www.rhea-db.org/rhea/2"},
  //         {description: "god", id: '3', name: 'eva', link: "https://www.rhea-db.org/rhea/3"},
  //         {description: "smart", id: '4', name: 'anish', link: "https://www.rhea-db.org/rhea/4"},
  //         {description: "the steve", id: '5', name: 'steve', link: "https://www.rhea-db.org/rhea/5"}
  //     ]);
  // })
})