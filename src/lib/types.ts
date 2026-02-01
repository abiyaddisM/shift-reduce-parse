export type SymbolType = 'TERMINAL' | 'NON_TERMINAL' | 'EPSILON' | 'END_MARKER';

export interface GrammarSymbol {
    value: string;
    type: SymbolType;
}

export interface Production {
    id: number; // Unique identifier for the production
    lhs: string; // Left-hand side (Non-terminal)
    rhs: string[]; // Right-hand side (Array of strings, can include terminals and non-terminals)
}

export interface Grammar {
    productions: Production[];
    terminals: Set<string>;
    nonTerminals: Set<string>;
    startSymbol: string;
    augmentedStartSymbol?: string; // S'
}

export interface LR0Item {
    production: Production;
    dotPosition: number; // Index in rhs where the dot is. 0 means before first symbol.
}

// Representing a unique set of LR0 Items (a State in the automaton)
export interface CanonicalState {
    id: number;
    items: LR0Item[];
    transitions: Record<string, number>; // symbol -> stateId
}

export interface CanonicalCollection {
    states: CanonicalState[];
    initialStateId: number;
}

export type ActionType = 'SHIFT' | 'REDUCE' | 'ACCEPT' | 'GOTO' | 'ERROR' | 'CONFLICT';

export interface ParsingAction {
    type: ActionType;
    payload?: number; // State ID for SHIFT/GOTO, Production ID for REDUCE
}

export interface ParsingTable {
    action: Record<number, Record<string, ParsingAction[]>>; // State -> Symbol -> Actions[] (Array for conflict detection)
    goto: Record<number, Record<string, number>>; // State -> Nonlinear -> State
}

export interface Conflict {
    stateId: number;
    symbol: string;
    type: 'SHIFT_REDUCE' | 'REDUCE_REDUCE';
    actions: ParsingAction[];
}
