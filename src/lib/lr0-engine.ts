import { Grammar, LR0Item, CanonicalState, CanonicalCollection } from './types';
import { EPSILON } from './grammar';

// Use a string representation for easy set membership checking
function itemToString(item: LR0Item): string {
    return `${item.production.id}:${item.dotPosition}`;
}

// Compare two item sets for equality
// Assumes items are sorted or consistent
function getSetKey(items: LR0Item[]): string {
    return items.map(itemToString).sort().join('|');
}

export function closure(items: LR0Item[], grammar: Grammar): LR0Item[] {
    const result = [...items];
    const itemSet = new Set(result.map(itemToString));
    let changed = true;

    while (changed) {
        changed = false;
        for (const item of result) {
            // If dot is at the end, continue
            if (item.dotPosition >= item.production.rhs.length) continue;

            const symbolAfterDot = item.production.rhs[item.dotPosition];

            // If symbol is non-terminal, add its productions
            if (grammar.nonTerminals.has(symbolAfterDot)) {
                const productions = grammar.productions.filter(p => p.lhs === symbolAfterDot);

                for (const prod of productions) {
                    // For a production B -> gamma, add B -> . gamma
                    // Note: If gamma is epsilon, dot is still at 0, effectively B -> . epsilon
                    const newItem: LR0Item = {
                        production: prod,
                        dotPosition: 0
                    };
                    const key = itemToString(newItem);

                    if (!itemSet.has(key)) {
                        itemSet.add(key);
                        result.push(newItem);
                        changed = true;
                    }
                }
            }
        }
    }
    return result;
}

export function goto(items: LR0Item[], symbol: string, grammar: Grammar): LR0Item[] {
    const movedItems: LR0Item[] = [];

    for (const item of items) {
        if (item.dotPosition >= item.production.rhs.length) continue;

        // Check symbol after dot
        const currentSymbol = item.production.rhs[item.dotPosition];

        // Special handling for Epsilon:
        // If we have A -> . epsilon, we can't "shift" epsilon. It's effectively reduced immediately.
        // So distinct items like A -> . epsilon don't generate transitions on epsilon.
        // However, the rule is standard: A -> alpha . X beta. If X == symbol, move dot.

        if (currentSymbol === symbol) {
            movedItems.push({
                production: item.production,
                dotPosition: item.dotPosition + 1
            });
        }
    }

    return closure(movedItems, grammar);
}

export function buildCanonicalCollection(grammar: Grammar): CanonicalCollection {
    // 1. Initial State: Closure of S' -> . S
    const initialProd = grammar.productions[0]; // S' -> S is guaranteed to be first by augmentGrammar
    const initialItem: LR0Item = {
        production: initialProd,
        dotPosition: 0
    };

    const initialStateItems = closure([initialItem], grammar);
    const initialState: CanonicalState = {
        id: 0,
        items: initialStateItems,
        transitions: {}
    };

    const states: CanonicalState[] = [initialState];
    const stateMap = new Map<string, number>(); // Key -> State ID
    stateMap.set(getSetKey(initialStateItems), 0);

    const symbols = new Set([...grammar.terminals, ...grammar.nonTerminals]);
    // Remove epsilon from transition symbols
    symbols.delete(EPSILON);

    let processedCount = 0;
    while (processedCount < states.length) {
        const currentState = states[processedCount];
        processedCount++;

        for (const symbol of symbols) {
            const nextItems = goto(currentState.items, symbol, grammar);

            if (nextItems.length === 0) continue;

            const key = getSetKey(nextItems);
            let nextStateId = stateMap.get(key);

            if (nextStateId === undefined) {
                // Create new state
                nextStateId = states.length;
                const newState: CanonicalState = {
                    id: nextStateId,
                    items: nextItems,
                    transitions: {}
                };
                states.push(newState);
                stateMap.set(key, nextStateId);
            }

            // Record transition
            currentState.transitions[symbol] = nextStateId;
        }
    }

    return {
        states,
        initialStateId: 0
    };
}
