import { Grammar, Production } from './types';

export const EPSILON = 'ε';

export function parseGrammar(input: string): Grammar {
    const productions: Production[] = [];
    const nonTerminals = new Set<string>();
    const terminals = new Set<string>();
    let startSymbol = '';
    let productionIdCounter = 0;

    const lines = input.split(/\n/).filter((line) => line.trim().length > 0);

    lines.forEach((line, index) => {
        // Split by ->
        const parts = line.split('->');
        if (parts.length !== 2) {
            throw new Error(`Invalid rule format at line ${index + 1}: ${line}`);
        }

        const lhs = parts[0].trim();
        const rhsParts = parts[1].split('|');

        nonTerminals.add(lhs);
        if (index === 0) {
            startSymbol = lhs;
        }

        rhsParts.forEach((rhsPart) => {
            const symbols = rhsPart
                .trim()
                .split(/\s+/)
                .filter((s) => s.length > 0);

            const cleanSymbols = symbols.map(s => s === 'epsilon' || s === '' ? EPSILON : s);

            productions.push({
                id: productionIdCounter++,
                lhs,
                rhs: cleanSymbols.length === 0 ? [EPSILON] : cleanSymbols,
            });
        });
    });

    // Identify terminals
    productions.forEach((prod) => {
        prod.rhs.forEach((sym) => {
            if (!nonTerminals.has(sym) && sym !== EPSILON) {
                terminals.add(sym);
            }
        });
    });

    return {
        productions,
        terminals,
        nonTerminals,
        startSymbol,
    };
}

export function augmentGrammar(grammar: Grammar): Grammar {
    const newStart = `${grammar.startSymbol}'`;

    // Create a deep copy of productions to avoid mutating independent references
    const newProductions = [...grammar.productions];

    // Re-id everything to be safe, starting with the augmented rule as 0? 
    // Standard practice: Augmented rule is often prioritized or 0.
    // We'll append it for now or prepend. Let's prepend to strictly follow S' -> S being the first.

    const augmentedProduction: Production = {
        id: -1, // Placeholder
        lhs: newStart,
        rhs: [grammar.startSymbol],
    };

    const allProductions = [augmentedProduction, ...newProductions].map((p, i) => ({
        ...p,
        id: i
    }));

    return {
        productions: allProductions,
        terminals: new Set(grammar.terminals), // Terminals don't change
        nonTerminals: new Set([...grammar.nonTerminals, newStart]),
        startSymbol: grammar.startSymbol,
        augmentedStartSymbol: newStart
    };
}
