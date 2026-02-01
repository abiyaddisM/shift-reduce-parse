import { Grammar } from './types';
import { EPSILON } from './grammar';

export const END_MARKER = '$';

export function computeFirstSets(grammar: Grammar): Map<string, Set<string>> {
    const first = new Map<string, Set<string>>();

    // Initialize for terminals
    grammar.terminals.forEach((term) => {
        first.set(term, new Set([term]));
    });
    first.set(EPSILON, new Set([EPSILON]));
    first.set(END_MARKER, new Set([END_MARKER]));

    // Initialize for non-terminals
    grammar.nonTerminals.forEach((nt) => {
        first.set(nt, new Set());
    });

    let changed = true;
    while (changed) {
        changed = false;
        for (const prod of grammar.productions) {
            const lhs = prod.lhs;
            const rhs = prod.rhs;

            const firstLhs = first.get(lhs)!;
            let allNullable = true;
            const initialSize = firstLhs.size;

            for (const symbol of rhs) {
                if (symbol === EPSILON) {
                    continue;
                }

                const firstSymbol = first.get(symbol);
                if (!firstSymbol) continue; // Should not happen if grammar is consistent

                // Add FIRST(symbol) to FIRST(lhs), excluding epsilon
                for (const f of firstSymbol) {
                    if (f !== EPSILON) {
                        firstLhs.add(f);
                    }
                }

                if (!firstSymbol.has(EPSILON)) {
                    allNullable = false;
                    break; // Stop if current symbol is not nullable
                }
            }

            // If all symbols in RHS are nullable (or RHS is epsilon), add epsilon
            if (allNullable || (rhs.length === 1 && rhs[0] === EPSILON)) {
                firstLhs.add(EPSILON);
            }

            if (firstLhs.size > initialSize) {
                changed = true;
            }
        }
    }

    return first;
}

export function computeFollowSets(
    grammar: Grammar,
    firstSets: Map<string, Set<string>>
): Map<string, Set<string>> {
    const follow = new Map<string, Set<string>>();

    grammar.nonTerminals.forEach((nt) => {
        follow.set(nt, new Set());
    });

    // Start symbol gets $
    if (grammar.augmentedStartSymbol) {
        follow.get(grammar.augmentedStartSymbol)?.add(END_MARKER);
    } else {
        follow.get(grammar.startSymbol)?.add(END_MARKER);
    }

    let changed = true;
    while (changed) {
        changed = false;
        for (const prod of grammar.productions) {
            const rhs = prod.rhs;

            // A -> α B β
            for (let i = 0; i < rhs.length; i++) {
                const symbol = rhs[i];
                if (!grammar.nonTerminals.has(symbol)) continue;

                const currentFollow = follow.get(symbol)!;
                const initialSize = currentFollow.size;

                // Compute FIRST(β) where β is everything after symbol
                let remainderNullable = true;

                // Loop through subsequent symbols
                for (let j = i + 1; j < rhs.length; j++) {
                    const nextSym = rhs[j];
                    const firstNext = firstSets.get(nextSym)!;

                    for (const f of firstNext) {
                        if (f !== EPSILON) {
                            currentFollow.add(f);
                        }
                    }

                    if (!firstNext.has(EPSILON)) {
                        remainderNullable = false;
                        break;
                    }
                }

                // If β is empty or nullable, add FOLLOW(A) to FOLLOW(B)
                if (remainderNullable) {
                    const lhsFollow = follow.get(prod.lhs)!;
                    for (const f of lhsFollow) {
                        currentFollow.add(f);
                    }
                }

                if (currentFollow.size > initialSize) {
                    changed = true;
                }
            }
        }
    }

    return follow;
}
