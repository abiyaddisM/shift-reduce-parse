import { parseGrammar, augmentGrammar } from './src/lib/grammar';
import { buildCanonicalCollection } from './src/lib/lr0-engine';
import { buildParsingTable } from './src/lib/table-builder';

const grammarInput = `E -> E + T | T
T -> T * F | F
F -> ( E ) | id`;

// Manually mocking what src/lib/grammar does to ensure it works in isolation with ts-node if needed, 
// strictly we should just use the files but I want to be quick. 
// I'll try to rely on the actual files if I can run them. 
// But since I can't easily run ts-node on the project files without proper setup with tsconfig paths etc.
// I will just read the files and verify logic or try to compile.

console.log("Starting Debug...");

try {
    const grammar = parseGrammar(grammarInput);
    console.log("Parsed Grammar:", JSON.stringify(grammar, null, 2));

    const augmented = augmentGrammar(grammar);
    console.log("Augmented Grammar:", JSON.stringify(augmented, null, 2));

    const collection = buildCanonicalCollection(augmented);
    console.log("Canonical Collection States:", collection.states.length);
    // console.log("Can. Coll:", JSON.stringify(collection, null, 2));

    const table = buildParsingTable(augmented, collection, 'SLR1');
    console.log("Parsing Table Actions:", Object.keys(table.action).length);
    console.log("Parsing Table Action[0]:", JSON.stringify(table.action[0], null, 2));
} catch (e) {
    console.error("Error:", e);
}
