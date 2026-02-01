import { create } from 'zustand';
import {
    Grammar,
    CanonicalCollection,
    ParsingTable,
    ParsingAction
} from '@/lib/types';
import { parseGrammar, augmentGrammar } from '@/lib/grammar';
import { buildCanonicalCollection } from '@/lib/lr0-engine';
import { buildParsingTable, TableType } from '@/lib/table-builder';
import { END_MARKER } from '@/lib/sets';

export interface SimulationStep {
    stack: number[]; // Stack of State IDs. Bottom is index 0.
    symbolStack: string[]; // Stack of Symbols corresponding to state transitions.
    input: string[]; // Remaining input tokens
    actionTaken: ParsingAction | null;
    stepIndex: number;
}

export interface ParserState {
    // Configuration
    grammarInput: string;
    inputString: string;
    tableType: TableType;

    // Processed Data
    grammar: Grammar | null;
    canonicalCollection: CanonicalCollection | null;
    parsingTable: ParsingTable | null;
    error: string | null;

    // Simulation State
    simulationSteps: SimulationStep[];
    currentStepIndex: number;
    playbackSpeed: number; // ms
    isPlaying: boolean;

    // Actions
    setGrammarInput: (input: string) => void;
    setInputString: (input: string) => void;
    setTableType: (type: TableType) => void;
    setPlaybackSpeed: (speed: number) => void;

    processGrammar: () => void;
    resetSimulation: () => void;
    stepForward: () => void;
    stepBackward: () => void;
    togglePlay: () => void;
}

export const useParserStore = create<ParserState>((set, get) => ({
    grammarInput: `E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id`,
    inputString: `id + id * id`,
    tableType: 'SLR1',

    grammar: null,
    canonicalCollection: null,
    parsingTable: null,
    error: null,

    simulationSteps: [],
    currentStepIndex: -1,
    playbackSpeed: 1000,
    isPlaying: false,

    setGrammarInput: (input) => set({ grammarInput: input }),
    setInputString: (input) => set({ inputString: input }),
    setTableType: (type) => {
        set({ tableType: type });
        // Rebuild table if grammar exists
        const { grammar, canonicalCollection } = get();
        if (grammar && canonicalCollection) {
            const table = buildParsingTable(grammar, canonicalCollection, type);
            set({ parsingTable: table });
            // Reset simulation to ensure consistency with new table
            get().resetSimulation();
        }
    },
    setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

    processGrammar: () => {
        try {
            const { grammarInput, tableType } = get();
            const rawGrammar = parseGrammar(grammarInput);
            const grammar = augmentGrammar(rawGrammar);
            const canonicalCollection = buildCanonicalCollection(grammar);
            const parsingTable = buildParsingTable(grammar, canonicalCollection, tableType);

            set({
                grammar,
                canonicalCollection,
                parsingTable,
                error: null,
            });

            // Auto-reset simulation when grammar changes
            get().resetSimulation();

        } catch (e: any) {
            set({ error: e.message });
        }
    },

    resetSimulation: () => {
        const { inputString, grammar } = get();
        if (!grammar) return;

        // Tokenize simple space-separated for now, or minimal lexer
        // We treat everything that matches a terminal as a token.
        // Ideally we split by spaces and validate against grammar terminals.

        // Simple tokenizer: add spaces around special chars if needed, but for now assume space separated or simple
        // Let's assume user provides space separated for clarity, or we split by regex for operators.
        // For this educational tool, space separated is safest requirement, or basic split.
        const tokens = inputString.trim().split(/\s+/);
        tokens.push(END_MARKER);

        const initialStep: SimulationStep = {
            stack: [0], // Initial state is always 0
            symbolStack: [END_MARKER], // Stack bottom marker? Or just empty. Normally stack has states. Symbol stack sometimes valid.
            input: tokens,
            actionTaken: null,
            stepIndex: 0
        };

        set({
            simulationSteps: [initialStep],
            currentStepIndex: 0,
            isPlaying: false
        });
    },

    stepForward: () => {
        const {
            simulationSteps,
            currentStepIndex,
            parsingTable,
            grammar
        } = get();

        if (!parsingTable || !grammar) return;
        if (currentStepIndex >= simulationSteps.length - 1) {
            // Should calculate next step
        } else {
            // Just move pointer if we already calculated (history)
            set({ currentStepIndex: currentStepIndex + 1 });
            return;
        }

        const currentStep = simulationSteps[simulationSteps.length - 1];

        // Check if finished
        if (currentStep.actionTaken?.type === 'ACCEPT' || currentStep.actionTaken?.type === 'ERROR') {
            return;
        }

        const currentState = currentStep.stack[currentStep.stack.length - 1];
        const currentInput = currentStep.input[0]; // Lookahead

        // Look up action
        const actions = parsingTable.action[currentState]?.[currentInput];

        let action: ParsingAction = { type: 'ERROR' };

        if (!actions || actions.length === 0) {
            action = { type: 'ERROR' };
        } else if (actions.length > 1) {
            // Conflict! Stop simulation.
            action = { type: 'CONFLICT', payload: actions.length };
        } else {
            action = actions[0];
        }

        const nextStep: SimulationStep = {
            stack: [...currentStep.stack],
            symbolStack: [...currentStep.symbolStack],
            input: [...currentStep.input],
            actionTaken: action,
            stepIndex: currentStep.stepIndex + 1
        };

        // If conflict or error, we don't change state/stack, just record the stop
        if (action.type === 'CONFLICT' || action.type === 'ERROR') {
            set({
                simulationSteps: [...simulationSteps, nextStep],
                currentStepIndex: currentStepIndex + 1
            });
            return;
        }

        if (action.type === 'SHIFT') {
            const nextState = action.payload!;
            nextStep.stack.push(nextState);
            nextStep.symbolStack.push(currentInput);
            nextStep.input.shift(); // Consume input
        } else if (action.type === 'REDUCE') {
            const prodId = action.payload!;
            const production = grammar.productions.find(p => p.id === prodId)!;

            // Pop |RHS| items from stack
            const rhsLength = (production.rhs.length === 1 && production.rhs[0] === 'ε') ? 0 : production.rhs.length;

            for (let i = 0; i < rhsLength; i++) {
                nextStep.stack.pop();
                nextStep.symbolStack.pop();
            }

            // Push LHS
            const topState = nextStep.stack[nextStep.stack.length - 1];
            const gotoState = parsingTable.goto[topState]?.[production.lhs];

            if (gotoState === undefined) {
                // Logic error or missing goto
                nextStep.actionTaken = { type: 'ERROR' }; // Should not happen in valid table
            } else {
                nextStep.stack.push(gotoState);
                nextStep.symbolStack.push(production.lhs);
                // Input remains same
            }
        } else if (action.type === 'ACCEPT') {
            // Done
        }

        set({
            simulationSteps: [...simulationSteps, nextStep],
            currentStepIndex: currentStepIndex + 1
        });
    },

    stepBackward: () => {
        const { currentStepIndex } = get();
        if (currentStepIndex > 0) {
            set({ currentStepIndex: currentStepIndex - 1 });
        }
    },

    togglePlay: () => set(state => ({ isPlaying: !state.isPlaying })),
}));
