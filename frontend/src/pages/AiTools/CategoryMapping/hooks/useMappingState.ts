import { useReducer, useCallback } from 'react';
import { SalesProject, ProjectCategory, CategoryMappingItem, ProductCategoryItem } from '../../../../services/categoryMappingService';

// =============================================
// Virtual Product type
// =============================================
export interface VirtualProduct {
  id: string;
  name: string;
  systemCategoryId: string;
  systemCategoryName: string;
  projectCategoryId: string;
  projectCategoryName: string;
}

// =============================================
// Chat session state (reusable for parse/mapping/prompt chats)
// =============================================
export interface ChatSession {
  messages: { role: string; content: string }[];
  input: string;
  loading: boolean;
}

const emptyChat = (): ChatSession => ({ messages: [], input: '', loading: false });

// =============================================
// Modal visibility state
// =============================================
export interface ModalState {
  preview: boolean;
  editMapping: boolean;
  manualColumn: boolean;
  unmappedSystemMapping: boolean;
  editPreview: boolean;
  batchAdjust: boolean;
  promptEditor: boolean;
  projectDetail: boolean;
}

const defaultModals = (): ModalState => ({
  preview: false,
  editMapping: false,
  manualColumn: false,
  unmappedSystemMapping: false,
  editPreview: false,
  batchAdjust: false,
  promptEditor: false,
  projectDetail: false,
});

// =============================================
// Main state interface
// =============================================
export interface MappingState {
  // Data
  salesProjects: SalesProject[];
  selectedProjectId: string;
  systemCategories: ProductCategoryItem[];
  systemLeafCategories: ProductCategoryItem[];
  projectCategories: ProjectCategory[];
  projectLeafCategories: ProjectCategory[];
  mappings: CategoryMappingItem[];

  // AI
  aiConfigured: boolean;

  // Upload & Parse
  uploadingFile: boolean;
  parsingAi: boolean;
  rawExcelData: any[];
  parsedPreview: any[];
  parsedCount: number;
  parsePhase: 'chat' | 'parsing' | 'result';
  parseProgress: number;
  parseProgressLabel: string;
  previewTableKey: number;

  // Parse chat
  parseChat: ChatSession;

  // Mapping operations
  autoMapping: boolean;
  mappingProgressText: string;
  savingMappings: boolean;

  // Mapping chat
  mappingChat: ChatSession;

  // Prompt editor
  promptChat: ChatSession;
  customParsePrompt: string;
  customMappingPrompt: string;

  // Editing
  editingMapping: CategoryMappingItem | null;
  editProjectCategoryId: string;
  unmappedSystemCategory: ProductCategoryItem | null;
  unmappedSystemProjectCategoryId: string;
  manualL1Column: number;
  manualL2Column: number;
  manualL3Column: number;
  editPreviewIndex: number;
  editPreviewItem: any;

  // Virtual products
  virtualProducts: VirtualProduct[];
  selectedVirtualProductKeys: string[];
  batchProjectCategoryId: string;

  // Modals
  modals: ModalState;

  // Pagination
  mappedPageSize: number;
  unmappedSystemPageSize: number;
  unmappedProjectPageSize: number;
  virtualProductPageSize: number;
}

// =============================================
// Actions
// =============================================
export type MappingAction =
  | { type: 'SET_SALES_PROJECTS'; payload: SalesProject[] }
  | { type: 'SET_SELECTED_PROJECT'; payload: string }
  | { type: 'SET_SYSTEM_CATEGORIES'; payload: ProductCategoryItem[] }
  | { type: 'SET_PROJECT_CATEGORIES'; payload: { all: ProjectCategory[]; leaves: ProjectCategory[] } }
  | { type: 'SET_MAPPINGS'; payload: CategoryMappingItem[] }
  | { type: 'UPDATE_MAPPING'; payload: { id: number | string; changes: Partial<CategoryMappingItem> } }
  | { type: 'ADD_MAPPING'; payload: CategoryMappingItem }
  | { type: 'DELETE_MAPPING'; payload: number | string }
  | { type: 'SET_AI_CONFIGURED'; payload: boolean }
  | { type: 'SET_UPLOADING'; payload: boolean }
  | { type: 'SET_RAW_EXCEL'; payload: any[] }
  | { type: 'SET_PARSE_PHASE'; payload: 'chat' | 'parsing' | 'result' }
  | { type: 'SET_PARSED_PREVIEW'; payload: { data: any[]; count: number } }
  | { type: 'UPDATE_PARSED_PREVIEW'; payload: { index: number; item: any } }
  | { type: 'DELETE_PARSED_PREVIEW_ITEM'; payload: number }
  | { type: 'ADD_PARSED_PREVIEW_ITEM'; payload: any }
  | { type: 'SET_PARSING_AI'; payload: boolean }
  | { type: 'SET_PARSE_PROGRESS'; payload: { percent: number; label: string } }
  | { type: 'INC_PREVIEW_TABLE_KEY' }
  | { type: 'SET_AUTO_MAPPING'; payload: boolean }
  | { type: 'SET_MAPPING_PROGRESS_TEXT'; payload: string }
  | { type: 'SET_SAVING_MAPPINGS'; payload: boolean }
  | { type: 'SET_EDITING_MAPPING'; payload: { mapping: CategoryMappingItem | null; projectCategoryId: string } }
  | { type: 'SET_UNMAPPED_SYSTEM'; payload: { category: ProductCategoryItem | null; projectCategoryId: string } }
  | { type: 'SET_MANUAL_COLUMNS'; payload: { l1: number; l2: number; l3: number } }
  | { type: 'SET_EDIT_PREVIEW'; payload: { index: number; item: any } }
  | { type: 'SET_VIRTUAL_PRODUCTS'; payload: VirtualProduct[] }
  | { type: 'SET_SELECTED_VP_KEYS'; payload: string[] }
  | { type: 'SET_BATCH_PROJECT_CATEGORY_ID'; payload: string }
  // Chat actions
  | { type: 'PARSE_CHAT_UPDATE'; payload: Partial<ChatSession> }
  | { type: 'MAPPING_CHAT_UPDATE'; payload: Partial<ChatSession> }
  | { type: 'PROMPT_CHAT_UPDATE'; payload: Partial<ChatSession> }
  // Prompt
  | { type: 'SET_CUSTOM_PARSE_PROMPT'; payload: string }
  | { type: 'SET_CUSTOM_MAPPING_PROMPT'; payload: string }
  // Modal actions
  | { type: 'OPEN_MODAL'; payload: keyof ModalState }
  | { type: 'CLOSE_MODAL'; payload: keyof ModalState }
  | { type: 'CLOSE_ALL_MODALS' }
  // Pagination
  | { type: 'SET_PAGE_SIZE'; payload: { key: 'mapped' | 'unmappedSystem' | 'unmappedProject' | 'virtualProduct'; size: number } }
  // Reset
  | { type: 'RESET_PROJECT_DATA' };

// =============================================
// Initial state
// =============================================
export const initialMappingState: MappingState = {
  salesProjects: [],
  selectedProjectId: '',
  systemCategories: [],
  systemLeafCategories: [],
  projectCategories: [],
  projectLeafCategories: [],
  mappings: [],

  aiConfigured: false,

  uploadingFile: false,
  parsingAi: false,
  rawExcelData: [],
  parsedPreview: [],
  parsedCount: 0,
  parsePhase: 'chat',
  parseProgress: 0,
  parseProgressLabel: '',
  previewTableKey: 0,

  parseChat: emptyChat(),

  autoMapping: false,
  mappingProgressText: '',
  savingMappings: false,

  mappingChat: emptyChat(),

  promptChat: emptyChat(),
  customParsePrompt: '',
  customMappingPrompt: '',

  editingMapping: null,
  editProjectCategoryId: '',
  unmappedSystemCategory: null,
  unmappedSystemProjectCategoryId: '',
  manualL1Column: 0,
  manualL2Column: 1,
  manualL3Column: 2,
  editPreviewIndex: -1,
  editPreviewItem: null,

  virtualProducts: [],
  selectedVirtualProductKeys: [],
  batchProjectCategoryId: '',

  modals: defaultModals(),

  mappedPageSize: 20,
  unmappedSystemPageSize: 20,
  unmappedProjectPageSize: 20,
  virtualProductPageSize: 10,
};

// =============================================
// Reducer
// =============================================
export function mappingReducer(state: MappingState, action: MappingAction): MappingState {
  switch (action.type) {
    case 'SET_SALES_PROJECTS':
      return { ...state, salesProjects: action.payload };
    case 'SET_SELECTED_PROJECT':
      return { ...state, selectedProjectId: action.payload };
    case 'SET_SYSTEM_CATEGORIES':
      return { ...state, systemCategories: action.payload, systemLeafCategories: action.payload.filter(c => !action.payload.some(p => p.parentId === c.categoryId)) };
    case 'SET_PROJECT_CATEGORIES':
      return { ...state, projectCategories: action.payload.all, projectLeafCategories: action.payload.leaves };
    case 'SET_MAPPINGS':
      return { ...state, mappings: action.payload };
    case 'UPDATE_MAPPING':
      return { ...state, mappings: state.mappings.map(m => m.id === action.payload.id ? { ...m, ...action.payload.changes } as CategoryMappingItem : m) };
    case 'ADD_MAPPING':
      return { ...state, mappings: [...state.mappings, action.payload] };
    case 'DELETE_MAPPING':
      return { ...state, mappings: state.mappings.filter(m => m.id !== action.payload) };
    case 'SET_AI_CONFIGURED':
      return { ...state, aiConfigured: action.payload };
    case 'SET_UPLOADING':
      return { ...state, uploadingFile: action.payload };
    case 'SET_RAW_EXCEL':
      return { ...state, rawExcelData: action.payload };
    case 'SET_PARSE_PHASE':
      return { ...state, parsePhase: action.payload };
    case 'SET_PARSED_PREVIEW':
      return { ...state, parsedPreview: action.payload.data, parsedCount: action.payload.count };
    case 'UPDATE_PARSED_PREVIEW': {
      const updated = [...state.parsedPreview];
      if (action.payload.index >= 0 && action.payload.index < updated.length) {
        updated[action.payload.index] = { ...action.payload.item, isLeaf: true };
      } else {
        updated.push({ ...action.payload.item, isLeaf: true, id: `manual_${Date.now()}` });
      }
      return { ...state, parsedPreview: updated, parsedCount: updated.length, previewTableKey: state.previewTableKey + 1 };
    }
    case 'DELETE_PARSED_PREVIEW_ITEM': {
      const filtered = state.parsedPreview.filter((_, i) => i !== action.payload);
      return { ...state, parsedPreview: filtered, parsedCount: filtered.length, previewTableKey: state.previewTableKey + 1 };
    }
    case 'ADD_PARSED_PREVIEW_ITEM':
      return { ...state, parsedPreview: [...state.parsedPreview, action.payload], parsedCount: state.parsedCount + 1 };
    case 'SET_PARSING_AI':
      return { ...state, parsingAi: action.payload };
    case 'SET_PARSE_PROGRESS':
      return { ...state, parseProgress: action.payload.percent, parseProgressLabel: action.payload.label };
    case 'INC_PREVIEW_TABLE_KEY':
      return { ...state, previewTableKey: state.previewTableKey + 1 };
    case 'SET_AUTO_MAPPING':
      return { ...state, autoMapping: action.payload };
    case 'SET_MAPPING_PROGRESS_TEXT':
      return { ...state, mappingProgressText: action.payload };
    case 'SET_SAVING_MAPPINGS':
      return { ...state, savingMappings: action.payload };
    case 'SET_EDITING_MAPPING':
      return { ...state, editingMapping: action.payload.mapping, editProjectCategoryId: action.payload.projectCategoryId };
    case 'SET_UNMAPPED_SYSTEM':
      return { ...state, unmappedSystemCategory: action.payload.category, unmappedSystemProjectCategoryId: action.payload.projectCategoryId };
    case 'SET_MANUAL_COLUMNS':
      return { ...state, manualL1Column: action.payload.l1, manualL2Column: action.payload.l2, manualL3Column: action.payload.l3 };
    case 'SET_EDIT_PREVIEW':
      return { ...state, editPreviewIndex: action.payload.index, editPreviewItem: action.payload.item };
    case 'SET_VIRTUAL_PRODUCTS':
      return { ...state, virtualProducts: action.payload };
    case 'SET_SELECTED_VP_KEYS':
      return { ...state, selectedVirtualProductKeys: action.payload };
    case 'SET_BATCH_PROJECT_CATEGORY_ID':
      return { ...state, batchProjectCategoryId: action.payload };
    case 'PARSE_CHAT_UPDATE':
      return { ...state, parseChat: { ...state.parseChat, ...action.payload } };
    case 'MAPPING_CHAT_UPDATE':
      return { ...state, mappingChat: { ...state.mappingChat, ...action.payload } };
    case 'PROMPT_CHAT_UPDATE':
      return { ...state, promptChat: { ...state.promptChat, ...action.payload } };
    case 'SET_CUSTOM_PARSE_PROMPT':
      return { ...state, customParsePrompt: action.payload };
    case 'SET_CUSTOM_MAPPING_PROMPT':
      return { ...state, customMappingPrompt: action.payload };
    case 'OPEN_MODAL':
      return { ...state, modals: { ...state.modals, [action.payload]: true } };
    case 'CLOSE_MODAL':
      return { ...state, modals: { ...state.modals, [action.payload]: false } };
    case 'CLOSE_ALL_MODALS':
      return { ...state, modals: defaultModals() };
    case 'SET_PAGE_SIZE': {
      const pageKey = action.payload.key === 'mapped' ? 'mappedPageSize'
        : action.payload.key === 'unmappedSystem' ? 'unmappedSystemPageSize'
        : action.payload.key === 'unmappedProject' ? 'unmappedProjectPageSize'
        : 'virtualProductPageSize';
      return { ...state, [pageKey]: action.payload.size };
    }
    case 'RESET_PROJECT_DATA':
      return {
        ...state,
        projectCategories: [], projectLeafCategories: [], mappings: [],
        virtualProducts: [], rawExcelData: [], parsedPreview: [], parsedCount: 0,
        parsePhase: 'chat', parseProgress: 0, parseProgressLabel: '',
        parseChat: emptyChat(), mappingChat: emptyChat(),
        modals: defaultModals(),
      };
    default:
      return state;
  }
}

// =============================================
// Custom hook
// =============================================
export function useMappingState() {
  const [state, dispatch] = useReducer(mappingReducer, initialMappingState);

  // Convenience dispatchers
  const openModal = useCallback((name: keyof ModalState) => dispatch({ type: 'OPEN_MODAL', payload: name }), []);
  const closeModal = useCallback((name: keyof ModalState) => dispatch({ type: 'CLOSE_MODAL', payload: name }), []);

  return { state, dispatch, openModal, closeModal };
}
