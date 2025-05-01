import assert from 'assert';
import * as monaco from 'monaco-editor';
import * as fs from 'fs';
import { join } from 'path';
import { isSubtTypeOf, varTypes } from '../language-handler/Types';
import { AntimonyProgramAnalyzer } from '../language-handler/ModelSemanticChecker';
import { searchOntology, searchRhea } from '../features/AnnotationSearch';

// test('renders learn react link', () => {
//   render(<App />);
//   const linkElement = screen.getByText(/learn react/i);
//   expect(linkElement).toBeInTheDocument();
// });

describe('Antimony annotation keyword grammar parse error tests', function() {
    it('encodes annotation keyword no parse error', function() {
        const file1: string = fs.readFileSync(join(__dirname, 'testAntFiles', 'grammarAnnotationKeywordTestFiles/encodes.txt'), 'utf-8');
        const antAnalyzer = new AntimonyProgramAnalyzer(file1, "");
        assert.deepStrictEqual(antAnalyzer.getErrors(false), [])
    })
    
    it('hasPart annotation keyword no parse error', function() {
        const file1: string = fs.readFileSync(join(__dirname, 'testAntFiles/grammarAnnotationKeywordTestFiles/', 'hasPart.txt'), 'utf-8');
        const antAnalyzer = new AntimonyProgramAnalyzer(file1, "");
        assert.deepStrictEqual(antAnalyzer.getErrors(false), [])
    })
    
    it('hasProperty annotation keyword no parse error', function() {
        const file1: string = fs.readFileSync(join(__dirname, 'testAntFiles/grammarAnnotationKeywordTestFiles/', 'hasProperty.txt'), 'utf-8');
        const antAnalyzer = new AntimonyProgramAnalyzer(file1, "");
        assert.deepStrictEqual(antAnalyzer.getErrors(false), [])
    })
    
    it('hasTaxon annotation keyword no parse error', function() {
        const file1: string = fs.readFileSync(join(__dirname, 'testAntFiles/grammarAnnotationKeywordTestFiles/', 'hasTaxon.txt'), 'utf-8');
        const antAnalyzer = new AntimonyProgramAnalyzer(file1, "");
        assert.deepStrictEqual(antAnalyzer.getErrors(false), [])
    })
    
    it('hasVersion annotation keyword no parse error', function() {
        const file1: string = fs.readFileSync(join(__dirname, 'testAntFiles/grammarAnnotationKeywordTestFiles/', 'hasVersion.txt'), 'utf-8');
        const antAnalyzer = new AntimonyProgramAnalyzer(file1, "");
        assert.deepStrictEqual(antAnalyzer.getErrors(false), [])
    })
    
    it('identity annotation keyword no parse error', function() {
        const file1: string = fs.readFileSync(join(__dirname, 'testAntFiles/grammarAnnotationKeywordTestFiles/', 'identity.txt'), 'utf-8');
        const antAnalyzer = new AntimonyProgramAnalyzer(file1, "");
        assert.deepStrictEqual(antAnalyzer.getErrors(false), [])
    })
    
    it('isDescribedBy annotation keyword no parse error', function() {
        const file1: string = fs.readFileSync(join(__dirname, 'testAntFiles/grammarAnnotationKeywordTestFiles/', 'isDescribedBy.txt'), 'utf-8');
        const antAnalyzer = new AntimonyProgramAnalyzer(file1, "");
        assert.deepStrictEqual(antAnalyzer.getErrors(false), [])
    })
    
    it('isEncodedBy annotation keyword no parse error', function() {
        const file1: string = fs.readFileSync(join(__dirname, 'testAntFiles/grammarAnnotationKeywordTestFiles/', 'isEncodedBy.txt'), 'utf-8');
        const antAnalyzer = new AntimonyProgramAnalyzer(file1, "");
        assert.deepStrictEqual(antAnalyzer.getErrors(true), [])
    })
})

jest.mock('monaco-editor', () => ({
  MarkerSeverity: {
      Hint: 1,
      Info: 2,
      Warning: 4,
      Error: 8,
  },
}));

describe('grammar tests', function() {
    it('predefined constants no error', function() {
        const file1: string = fs.readFileSync(join(__dirname, 'testAntFiles', 'predefConstantNoError.ant'), 'utf-8');
        const antAnalyzer = new AntimonyProgramAnalyzer(file1, "");
        assert.deepStrictEqual(antAnalyzer.getErrors(false), [])
    })

    it('predefined constants reassign value error', function() {
        const file1: string = fs.readFileSync(join(__dirname, 'testAntFiles', 'predefConstantValueAssignError.ant'), 'utf-8');
        const antAnalyzer = new AntimonyProgramAnalyzer(file1, "");
        assert.deepStrictEqual(antAnalyzer.getErrors(false), [
             {
                "endColumn": 7,
                "endLineNumber": 1,
                "message": "Cannot assign value to 'pi' as it is a predefined constant",
                "severity": 8,
                "startColumn": 1,
                "startLineNumber": 1,
            },
            {
                "endColumn": 13,
                "endLineNumber": 2,
                "message": "Cannot assign value to 'avogadro' as it is a predefined constant",
                "severity": 8,
                "startColumn": 1,
                "startLineNumber": 2,
            },
            {
                "endColumn": 21,
                "endLineNumber": 3,
                "message": "Cannot assign value to 'NaN' as it is a predefined constant",
                "severity": 8,
                "startColumn": 9,
                "startLineNumber": 3,
            },
            {
                "endColumn": 12,
                "endLineNumber": 3,
                "message": "Unable to set type to 'species' because it is a predefined constant",
                "severity": 8,
                "startColumn": 9,
                "startLineNumber": 3,
            },
        ])
    })

    it('predefined constants reassign type error', function() {
        const file1: string = fs.readFileSync(join(__dirname, 'testAntFiles', 'predefConstantTypeAssignError.ant'), 'utf-8');
        const antAnalyzer = new AntimonyProgramAnalyzer(file1, "");
        assert.deepStrictEqual(antAnalyzer.getErrors(false), [
            {
                "endColumn": 11,
                "endLineNumber": 1,
                "message": "Unable to set type to 'species' because it is a predefined constant",
                "severity": 8,
                "startColumn": 9,
                "startLineNumber": 1,
            },
            {
                "endColumn": 16,
                "endLineNumber": 2,
                "message": "Cannot assign value to 'inf' as it is a predefined constant",
                "severity": 8,
                "startColumn": 9,
                "startLineNumber": 2,
            },
            {
                "endColumn": 12,
                "endLineNumber": 2,
                "message": "Unable to set type to 'species' because it is a predefined constant",
                "severity": 8,
                "startColumn": 9,
                "startLineNumber": 2,
            },
            {
                "endColumn": 21,
                "endLineNumber": 3,
                "message": "Unable to set type to 'compartment' because it is a predefined constant",
                "severity": 8,
                "startColumn": 13,
                "startLineNumber": 3,
            },
        ])
    })
})
  
describe('Type Tests', function() {
  it('isSubTypeOf tests', function() {
      assert.deepStrictEqual(isSubtTypeOf(varTypes.Variable, varTypes.Unknown), true);
      assert.deepStrictEqual(isSubtTypeOf(varTypes.Model, varTypes.Unknown), true);
      assert.deepStrictEqual(isSubtTypeOf(varTypes.Function, varTypes.Unknown), true);
      assert.deepStrictEqual(isSubtTypeOf(varTypes.Unit, varTypes.Unknown), true);
      assert.deepStrictEqual(isSubtTypeOf(varTypes.ModularModel, varTypes.Unknown), true);
      assert.deepStrictEqual(isSubtTypeOf(varTypes.Import, varTypes.Unknown), true);
      
      // missing interaction and event
      assert.deepStrictEqual(isSubtTypeOf(varTypes.Parameter, varTypes.Variable), true);
      assert.deepStrictEqual(isSubtTypeOf(varTypes.Species, varTypes.Variable), true);
      assert.deepStrictEqual(isSubtTypeOf(varTypes.Compartment, varTypes.Variable), true);
      assert.deepStrictEqual(isSubtTypeOf(varTypes.Reaction, varTypes.Variable), true);
      assert.deepStrictEqual(isSubtTypeOf(varTypes.Constraint, varTypes.Variable), true);

      assert.deepStrictEqual(isSubtTypeOf(varTypes.Variable ,varTypes.Parameter), false);
      assert.deepStrictEqual(isSubtTypeOf(varTypes.Variable ,varTypes.Species), false);
      assert.deepStrictEqual(isSubtTypeOf(varTypes.Variable ,varTypes.Compartment), false);
      assert.deepStrictEqual(isSubtTypeOf(varTypes.Variable ,varTypes.Reaction), false);
      assert.deepStrictEqual(isSubtTypeOf(varTypes.Variable ,varTypes.Constraint), false);

      

      assert.deepStrictEqual(isSubtTypeOf(varTypes.Parameter, varTypes.Parameter), true);
      assert.deepStrictEqual(isSubtTypeOf(varTypes.Species, varTypes.Parameter), true);
      assert.deepStrictEqual(isSubtTypeOf(varTypes.Compartment, varTypes.Parameter), true);
      assert.deepStrictEqual(isSubtTypeOf(varTypes.Reaction, varTypes.Parameter), true);
      assert.deepStrictEqual(isSubtTypeOf(varTypes.Constraint, varTypes.Parameter), true);


      assert.deepStrictEqual(isSubtTypeOf(varTypes.Parameter, varTypes.Species), false);
      assert.deepStrictEqual(isSubtTypeOf(varTypes.Parameter, varTypes.Compartment), false);
      assert.deepStrictEqual(isSubtTypeOf(varTypes.Parameter, varTypes.Reaction), false);
      assert.deepStrictEqual(isSubtTypeOf(varTypes.Parameter, varTypes.Constraint), false);

      assert.deepStrictEqual(isSubtTypeOf(varTypes.Event, varTypes.Variable), true);
  })  
})

// note that these tests only test for errors found by symbol tables, and not by the semantic visitor.
describe('SymbolTableVisitor Error Tests', function() {
  it('Event errors', function() {
    const file1: string = fs.readFileSync(join(__dirname, 'testAntFiles', 'eventBasic.ant'), 'utf-8');
    const antAnalyzer = new AntimonyProgramAnalyzer(file1, "");
    assert.deepStrictEqual(antAnalyzer.getErrors(false), [])
  })
  
  it('Math expression errors', function() {
    const file1: string = fs.readFileSync(join(__dirname, 'testAntFiles', 'mathExprBasic.ant'), 'utf-8');
    const antAnalyzer = new AntimonyProgramAnalyzer(file1, "");
    assert.deepStrictEqual(antAnalyzer.getErrors(false), [
      {
        startLineNumber: 5,
        startColumn: 10,
        endLineNumber: 5,
        endColumn: 11,
        message: 'Unable to set the type to \'function\' because it is already set to be the incompatible type \'parameter\' on line 3:7',
        severity: monaco.MarkerSeverity.Error
      },
      {
        startLineNumber: 9,
        startColumn: 10,
        endLineNumber: 9,
        endColumn: 11,
        message: 'Unable to set the type to \'function\' because it is already set to be the incompatible type \'parameter\' on line 1:26',
        severity: monaco.MarkerSeverity.Error
      }
    ]);
  })

  it('func redeclaration errors', function() {
    const file1: string = fs.readFileSync(join(__dirname, 'testAntFiles', 'repeatFuncDecl.ant'), 'utf-8');
    const antAnalyzer = new AntimonyProgramAnalyzer(file1, "");
    assert.deepStrictEqual(antAnalyzer.getErrors(false), [
        {
            startLineNumber: 5,
            startColumn: 10,
            endLineNumber: 5,
            endColumn: 12,
            message: 'function \'fn\' already defined on line 1:10',
            severity: monaco.MarkerSeverity.Error
        },
        {
            startLineNumber: 9,
            startColumn: 10,
            endLineNumber: 9,
            endColumn: 12,
            message: 'function \'fn\' already defined on line 1:10',
            severity: monaco.MarkerSeverity.Error
        },
        {
            startLineNumber: 17,
            startColumn: 10,
            endLineNumber: 17,
            endColumn: 12,
            message: 'function \'on\' already defined on line 13:10',
            severity: monaco.MarkerSeverity.Error
        }
    ]);
  })

  it('model redeclaration errors', function() {
    const file1: string = fs.readFileSync(join(__dirname, 'testAntFiles', 'repeatModelDecl.ant'), 'utf-8');
    const antAnalyzer = new AntimonyProgramAnalyzer(file1, "");
    assert.deepStrictEqual(antAnalyzer.getErrors(false), [
        {
            startLineNumber: 6,
            startColumn: 1,
            endLineNumber: 9,
            endColumn: 2,
            message: 'model \'m1\' already defined on line 1:7',
            severity: monaco.MarkerSeverity.Error
        },
        {
            startLineNumber: 11,
            startColumn: 1,
            endLineNumber: 14,
            endColumn: 2,
            message: 'model \'m1\' already defined on line 1:7',
            severity: monaco.MarkerSeverity.Error
        },
        {
            startLineNumber: 22,
            startColumn: 1,
            endLineNumber: 27,
            endColumn: 2,
            message: 'model \'m2\' already defined on line 16:7',
            severity: monaco.MarkerSeverity.Error
        }
    ]);
  })

  it('assignment override warnings', function() {
    const file1: string = fs.readFileSync(join(__dirname, 'testAntFiles', 'assignmentOverride.ant'), 'utf-8');
    const antAnalyzer = new AntimonyProgramAnalyzer(file1, "");
    assert.deepStrictEqual(antAnalyzer.getErrors(false), [
        {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 6,
            message: 'Value assignment to \'A\' is being overridden by a later assignment on line 2:1',
            severity: monaco.MarkerSeverity.Warning
        },
        {
            startLineNumber: 2,
            startColumn: 1,
            endLineNumber: 2,
            endColumn: 6,
            message: 'Value assignment to \'A\' is overriding previous assignment on line 1:1',
            severity: monaco.MarkerSeverity.Warning
        },
        {
            startLineNumber: 2,
            startColumn: 1,
            endLineNumber: 2,
            endColumn: 6,
            message: 'Value assignment to \'A\' is being overridden by a later assignment on line 3:1',
            severity: monaco.MarkerSeverity.Warning
        },
        {
            startLineNumber: 3,
            startColumn: 1,
            endLineNumber: 3,
            endColumn: 6,
            message: 'Value assignment to \'A\' is overriding previous assignment on line 2:1',
            severity: monaco.MarkerSeverity.Warning
        },

        {
            startLineNumber: 5,
            startColumn: 9,
            endLineNumber: 5,
            endColumn: 15,
            message: 'Value assignment to \'B1\' is being overridden by a later assignment on line 6:9',
            severity: monaco.MarkerSeverity.Warning
        },
        {
            startLineNumber: 6,
            startColumn: 9,
            endLineNumber: 6,
            endColumn: 15,
            message: 'Value assignment to \'B1\' is overriding previous assignment on line 5:9',
            severity: monaco.MarkerSeverity.Warning
        },
        {
            startLineNumber: 6,
            startColumn: 9,
            endLineNumber: 6,
            endColumn: 15,
            message: 'Value assignment to \'B1\' is being overridden by a later assignment on line 7:9',
            severity: monaco.MarkerSeverity.Warning
        },
        {
            startLineNumber: 7,
            startColumn: 9,
            endLineNumber: 7,
            endColumn: 15,
            message: 'Value assignment to \'B1\' is overriding previous assignment on line 6:9',
            severity: monaco.MarkerSeverity.Warning
        },
    ]);
  })

  it('type override errors', function() {
    const file1: string = fs.readFileSync(join(__dirname, 'testAntFiles', 'typeOverride.ant'), 'utf-8');
    const antAnalyzer = new AntimonyProgramAnalyzer(file1, "");
    assert.deepStrictEqual(antAnalyzer.getErrors(false), [
        {
            startLineNumber: 3,
            startColumn: 9,
            endLineNumber: 3,
            endColumn: 10,
            message: 'Unable to set the type to \'species\' because it is already set to be the incompatible type \'compartment\' on line 2:13',
            severity: monaco.MarkerSeverity.Error
        },
        {
            startLineNumber: 4,
            startColumn: 1,
            endLineNumber: 4,
            endColumn: 2,
            message: 'Unable to set the type to \'species\' because it is already set to be the incompatible type \'compartment\' on line 2:13',
            severity: monaco.MarkerSeverity.Error
        },
        {
            startLineNumber: 4,
            startColumn: 5,
            endLineNumber: 4,
            endColumn: 6,
            message: 'Unable to set the type to \'species\' because it is already set to be the incompatible type \'compartment\' on line 2:16',
            severity: monaco.MarkerSeverity.Error
        },
        {
            startLineNumber: 4,
            startColumn: 14,
            endLineNumber: 4,
            endColumn: 15,
            message: 'Unable to set the type to \'species\' because it is already set to be the incompatible type \'compartment\' on line 2:13',
            severity: monaco.MarkerSeverity.Error
        },
        {
            startLineNumber: 4,
            startColumn: 18,
            endLineNumber: 4,
            endColumn: 19,
            message: 'Unable to set the type to \'species\' because it is already set to be the incompatible type \'compartment\' on line 2:16',
            severity: monaco.MarkerSeverity.Error
        }
    ]);
  })

  it('reaction statement errors', function() {
    const file1: string = fs.readFileSync(join(__dirname, 'testAntFiles', 'reactionCompartment.ant'), 'utf-8');
    const antAnalyzer = new AntimonyProgramAnalyzer(file1, "");
    assert.deepStrictEqual(antAnalyzer.getErrors(false), [
        {
            startLineNumber: 2,
            startColumn: 22,
            endLineNumber: 2,
            endColumn: 24,
            message: 'Unable to set the type to \'compartment\' because it is already set to be the incompatible type \'species\' on line 1:9',
            severity: monaco.MarkerSeverity.Error
        },
        {
            startLineNumber: 3,
            startColumn: 18,
            endLineNumber: 3,
            endColumn: 20,
            message: 'Unable to set the type to \'compartment\' because it is already set to be the incompatible type \'species\' on line 1:9',
            severity: monaco.MarkerSeverity.Error
        },
        {
            startLineNumber: 12,
            startColumn: 22,
            endLineNumber: 12,
            endColumn: 24,
            message: 'Unable to set the type to \'compartment\' because it is already set to be the incompatible type \'function\' on line 9:10',
            severity: monaco.MarkerSeverity.Error
        },
        {
            startLineNumber: 13,
            startColumn: 18,
            endLineNumber: 13,
            endColumn: 20,
            message: 'Unable to set the type to \'compartment\' because it is already set to be the incompatible type \'function\' on line 9:10',
            severity: monaco.MarkerSeverity.Error
        },
        {
            startLineNumber: 18,
            startColumn: 22,
            endLineNumber: 18,
            endColumn: 24,
            message: 'Unable to set the type to \'compartment\' because it is already set to be the incompatible type \'model\' on line 15:7',
            severity: monaco.MarkerSeverity.Error
        },
        {
            startLineNumber: 19,
            startColumn: 18,
            endLineNumber: 19,
            endColumn: 20,
            message: 'Unable to set the type to \'compartment\' because it is already set to be the incompatible type \'model\' on line 15:7',
            severity: monaco.MarkerSeverity.Error
        },
    ]);
  })

  it('reaction no rate rule warning', function() {
    const file1: string = fs.readFileSync(join(__dirname, 'testAntFiles', 'reactionNoRateRule.ant'), 'utf-8');
    const antAnalyzer1 = new AntimonyProgramAnalyzer(file1, "");
    assert.deepStrictEqual(antAnalyzer1.getErrors(false), [
        {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 21,
            message: "Reaction 'R4' missing rate law",
            severity: monaco.MarkerSeverity.Warning
        },
        {
            startLineNumber: 2,
            startColumn: 1,
            endLineNumber: 2,
            endColumn: 16,
            message: "Reaction 'R5' missing rate law",
            severity: monaco.MarkerSeverity.Warning
        },
        {
            startLineNumber: 3,
            startColumn: 1,
            endLineNumber: 3,
            endColumn: 17,
            message: "Reaction '' missing rate law",
            severity: monaco.MarkerSeverity.Warning
        },
        {
            startLineNumber: 4,
            startColumn: 1,
            endLineNumber: 4,
            endColumn: 12,
            message: "Reaction '' missing rate law",
            severity: monaco.MarkerSeverity.Warning
        },
    ])

    const file2: string = fs.readFileSync(join(__dirname, 'testAntFiles', 'uninitRateRuleRepeatError.ant'), 'utf-8');
    const antAnalyzer2 = new AntimonyProgramAnalyzer(file2, "");
    assert.deepStrictEqual(antAnalyzer2.getErrors(false), [])
  })
})
