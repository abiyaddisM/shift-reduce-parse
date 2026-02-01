import {
    Grammar,
    CanonicalCollection,
    ParsingTable,
    ParsingAction,
    ActionType
} from './types';
import { EPSILON } from './grammar';
import { END_MARKER, computeFirstSets, computeFollowSets } from './sets';

export type TableType = 'LR0' | 'SLR1';

export function buildParsingTable(
    grammar: Grammar,
    collection: CanonicalCollection,
    type: TableType
): ParsingTable {
    const table: ParsingTable = {
        action: {},
        goto: {} // State -> NonTerminal -> State
    };

    // Pre-calculate FOLLOW sets only if needed (for SLR1)
    let followSets: Map<string, Set<string>> | null = null;
    if (type === 'SLR1') {
        const firstSets = computeFirstSets(grammar);
        followSets = computeFollowSets(grammar, firstSets);
    }

    // Initialize rows
    collection.states.forEach(state => {
        table.action[state.id] = {};
        table.goto[state.id] = {};
    });

    const allTerminals = [...Array.from(grammar.terminals), END_MARKER];

    collection.states.forEach(state => {
        // 1. SHIFT Actions (and GOTO)
        // Identify transitions from the canonical collection
        for (const [symbol, nextStateId] of Object.entries(state.transitions)) {
            if (grammar.terminals.has(symbol)) {
                // Shift
                addAction(table, state.id, symbol, { type: 'SHIFT', payload: nextStateId });
            } else if (grammar.nonTerminals.has(symbol)) {
                // Goto
                table.goto[state.id][symbol] = nextStateId;
            }
        }

        // 2. REDUCE (and ACCEPT) Actions
        for (const item of state.items) {
            // If dot is at the end: A -> alpha .
            if (item.dotPosition === item.production.rhs.length || (item.production.rhs.length === 1 && item.production.rhs[0] === EPSILON && item.dotPosition === 0)) {

                if (item.production.lhs === grammar.augmentedStartSymbol) {
                    // ACCEPT: S' -> S .
                    addAction(table, state.id, END_MARKER, { type: 'ACCEPT' });
                } else {
                    // REDUCE
                    const prodId = item.production.id;

                    if (type === 'LR0') {
                        // Reduce on ALL terminals + $
                        for (const term of allTerminals) {
                            addAction(table, state.id, term, { type: 'REDUCE', payload: prodId });
                        }
                    } else if (type === 'SLR1' && followSets) {
                        // Reduce only on FOLLOW(A)
                        const follow = followSets.get(item.production.lhs);
                        if (follow) {
                            for (const term of follow) {
                                addAction(table, state.id, term, { type: 'REDUCE', payload: prodId });
                            }
                        }
                    }
                }
            }
        }
    });

    return table;
}

function addAction(table: ParsingTable, stateId: number, symbol: string, action: ParsingAction) {
    if (!table.action[stateId][symbol]) {
        table.action[stateId][symbol] = [];
    }

    // De-duplicate: check if identical action exists
    const existing = table.action[stateId][symbol];
    const isDuplicate = existing.some(a =>
        a.type === action.type && a.payload === action.payload
    );

    if (!isDuplicate) {
        table.action[stateId][symbol].push(action);
    }
}
