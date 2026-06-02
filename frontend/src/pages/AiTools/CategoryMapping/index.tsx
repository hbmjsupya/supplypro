import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Card, Select, Upload, Button, Space, Table, Tag, Statistic, Row, Col,
  Alert, Tabs, message, Modal, Progress, Result, Descriptions, Checkbox,
  Input, InputNumber, Steps
} from 'antd';
import {
  SwapOutlined, FileExcelOutlined, ThunderboltOutlined, RobotOutlined,
  LoadingOutlined, SaveOutlined, DeleteOutlined, EditOutlined, PlusOutlined,
  ShopOutlined, DownloadOutlined, ImportOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import * as XLSX from 'xlsx';
import {
  getSalesProjects, getProjectCategories, getLeafProjectCategories,
  uploadCategoryTable, saveParsedCategories, deleteProjectCategories,
  getCategoryMappings, autoMapCategories, createManualMapping,
  updateMapping, deleteMapping, batchSaveMappings, reCompareMappings,
  getAllProductCategories, createProductCategory
} from '../../../services/categoryMappingService';
import {
  SalesProject, ProjectCategory, CategoryMappingItem, ProductCategoryItem
} from '../../../services/categoryMappingService';
import {
  callAiForParsingCategoryTable, callAiForMapping,
  callAiForPreParsingChat, callAiForMappingChat, callAiForUnmappedMatching,
  callAiForPromptChat,
  getAiConfigByScenario, DEFAULT_PARSE_PROMPT_RULES, DEFAULT_MAPPING_PROMPT_RULES
} from '../../../services/aiService';
import { useMappingState } from './hooks/useMappingState';
import type { VirtualProduct, ChatSession } from './hooks/useMappingState';
import ChatPanel from './components/ChatPanel';

// =============================================
// Constants
// =============================================
const VIRTUAL_PRODUCTS_STORAGE_PREFIX = 'supplypro_virtual_saleable_products_';

// =============================================
// Helper: export data to Excel
// =============================================
function exportToExcel(data: Record<string, string>[], headers: string[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, filename);
}

function parseImportedExcel(file: File, mapper: (row: Record<string, string>) => any): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);
        resolve(rows.map(mapper).filter(Boolean));
      } catch (err: any) {
        reject(new Error(err.message || '文件格式错误'));
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

// =============================================
// CategoryMappingPage Component
// =============================================
const CategoryMappingPage: React.FC = () => {
  const { state, dispatch, openModal, closeModal } = useMappingState();

  // AI chat side panel toggle
  const [chatPanelVisible, setChatPanelVisible] = useState(false);
  // Manual review of AI corrections — list mode with batch selection
  const [manualReviewList, setManualReviewList] = useState<{
    corrections: { systemCategoryName: string; newProjectCategoryName: string; reason: string }[];
    selectedNames: Set<string>;
  } | null>(null);
  const [manualReviewModalVisible, setManualReviewModalVisible] = useState(false);

  // Auto-open chat when mappings become available via AI
  useEffect(() => {
    if (state.mappings.length > 0 && state.aiConfigured &&
        state.mappings.some(m => m.matchMethod === 'AI推理' || m.matchMethod === 'AI对话修正')) {
      setChatPanelVisible(true);
    }
  }, [state.mappings.length]);

  // Refs
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const realProgressRef = useRef(0);
  const realLabelRef = useRef('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const mappingChatContainerRef = useRef<HTMLDivElement>(null);
  const lastSyncedMappingKey = useRef('');

  // ---- Derived state (useMemo) ----
  // Categorize mappings into clear groups
  const highConfidenceMapped = useMemo(
    () => state.mappings.filter(m => {
      if (m.matchStatus === '匹配失败') return false;
      const score = parseFloat(m.matchScore || '0');
      return score >= 0.65 && m.matchStatus !== '兜底匹配' && m.matchStatus !== '模糊匹配';
    }),
    [state.mappings]
  );
  const lowConfidenceMapped = useMemo(
    () => state.mappings.filter(m => {
      if (m.matchStatus === '匹配失败') return false;
      const score = parseFloat(m.matchScore || '0');
      return score < 0.65 || m.matchStatus === '兜底匹配' || m.matchStatus === '模糊匹配';
    }),
    [state.mappings]
  );
  const failedMapped = useMemo(
    () => state.mappings.filter(m => m.matchStatus === '匹配失败'),
    [state.mappings]
  );
  // System categories with ANY mapping record (including failed ones)
  const allMappedSystemIds = useMemo(
    () => new Set(state.mappings.map(m => m.systemCategoryId)),
    [state.mappings]
  );
  // System categories with successful mapping (high + low confidence)
  const successMappedSystemIds = useMemo(
    () => new Set([...highConfidenceMapped, ...lowConfidenceMapped].map(m => m.systemCategoryId)),
    [highConfidenceMapped, lowConfidenceMapped]
  );
  const successMappedProjectIds = useMemo(
    () => new Set([...highConfidenceMapped, ...lowConfidenceMapped].map(m => m.projectCategoryId).filter(id => id && id !== '0')),
    [highConfidenceMapped, lowConfidenceMapped]
  );
  // System categories with NO mapping at all — must not be in any of the three groups
  const unmappedSystemCats = useMemo(
    () => state.systemLeafCategories.filter(c => !allMappedSystemIds.has(c.categoryId)),
    [state.systemLeafCategories, allMappedSystemIds]
  );
  const unmappedProjectCats = useMemo(
    () => state.projectLeafCategories.filter(c => !successMappedProjectIds.has(c.projectCategoryId)),
    [state.projectLeafCategories, successMappedProjectIds]
  );
  // Pagination factory — eliminates repeated pagination props across 6 tables
  const makePagination = (key: 'mapped' | 'unmappedSystem' | 'unmappedProject' | 'virtualProduct') => {
    const pageSize = key === 'mapped' ? state.mappedPageSize
      : key === 'unmappedSystem' ? state.unmappedSystemPageSize
      : key === 'unmappedProject' ? state.unmappedProjectPageSize
      : state.virtualProductPageSize;
    const options = key === 'virtualProduct' ? ['10', '20', '50', '100'] : ['10', '20', '50', '100', '200'];
    return {
      pageSize, showSizeChanger: true as const, pageSizeOptions: options,
      showTotal: (t: number) => `共 ${t} 条`,
      onShowSizeChange: (_: number, size: number) => dispatch({ type: 'SET_PAGE_SIZE', payload: { key, size } }),
    };
  };

  // All successfully mapped (high + low confidence) — used for virtual products sync
  const allMappedList = useMemo(
    () => [...highConfidenceMapped, ...lowConfidenceMapped],
    [highConfidenceMapped, lowConfidenceMapped]
  );

  // Current workflow step
  const currentStep = !state.selectedProjectId ? 0
    : state.projectLeafCategories.length === 0 ? 1
    : state.mappings.length === 0 ? 2
    : 3;

  // ---- Progress simulation ----
  const startSimulatedProgress = () => {
    realProgressRef.current = 0;
    let simulated = 5;
    dispatch({ type: 'SET_PARSE_PROGRESS', payload: { percent: 5, label: 'AI 正在分析表格结构...' } });
    progressTimerRef.current = setInterval(() => {
      simulated += Math.random() * 8 + 3;
      if (simulated > 88) simulated = 88;
      dispatch({ type: 'SET_PARSE_PROGRESS', payload: { percent: Math.round(Math.max(simulated, realProgressRef.current)), label: realLabelRef.current || state.parseProgressLabel } });
    }, 400);
  };
  const stopSimulatedProgress = () => {
    if (progressTimerRef.current) { clearInterval(progressTimerRef.current); progressTimerRef.current = null; }
    dispatch({ type: 'SET_PARSE_PROGRESS', payload: { percent: 100, label: '解析完成' } });
  };

  // ---- Effects ----
  useEffect(() => { return () => { if (progressTimerRef.current) clearInterval(progressTimerRef.current); }; }, []);

  useEffect(() => {
    if (chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
  }, [state.parseChat.messages, state.parseChat.loading]);

  useEffect(() => {
    loadSalesProjects();
    loadSystemCategories();
    dispatch({ type: 'SET_AI_CONFIGURED', payload: !!getAiConfigByScenario('category-mapping') });
    dispatch({ type: 'SET_CUSTOM_PARSE_PROMPT', payload: DEFAULT_PARSE_PROMPT_RULES });
    dispatch({ type: 'SET_CUSTOM_MAPPING_PROMPT', payload: DEFAULT_MAPPING_PROMPT_RULES });
  }, []);

  useEffect(() => {
    if (state.selectedProjectId) {
      loadProjectCategories();
      loadExistingMappings();
      loadVirtualProducts();
    } else {
      dispatch({ type: 'RESET_PROJECT_DATA' });
    }
  }, [state.selectedProjectId]);

  // Sync virtual products with mappings
  useEffect(() => {
    if (allMappedList.length === 0 || state.virtualProducts.length === 0) return;
    const mappingKey = allMappedList.map(m => `${m.systemCategoryId}:${m.projectCategoryId}`).join(',');
    if (mappingKey === lastSyncedMappingKey.current) return;
    lastSyncedMappingKey.current = mappingKey;
    const successMap = new Map<string, { projectCategoryId: string; projectCategoryName: string }>();
    allMappedList.forEach(m => {
      if (m.systemCategoryId && m.projectCategoryId && m.projectCategoryId !== '0')
        successMap.set(m.systemCategoryId, { projectCategoryId: m.projectCategoryId, projectCategoryName: m.projectCategoryName || '' });
    });
    let changed = false;
    const updated = state.virtualProducts.map(vp => {
      const mapping = successMap.get(vp.systemCategoryId);
      if (!mapping || vp.projectCategoryId === mapping.projectCategoryId) return vp;
      changed = true;
      return { ...vp, projectCategoryId: mapping.projectCategoryId, projectCategoryName: mapping.projectCategoryName };
    });
    if (changed) saveVirtualProducts(updated);
  }, [allMappedList, state.virtualProducts]);

  // ---- Data loading ----
  const loadSalesProjects = async () => {
    try { dispatch({ type: 'SET_SALES_PROJECTS', payload: await getSalesProjects() }); }
    catch (err: any) { message.error('加载销售项目失败：' + (err?.message || '未知错误')); }
  };

  const loadSystemCategories = async () => {
    try {
      const data = await getAllProductCategories();
      dispatch({ type: 'SET_SYSTEM_CATEGORIES', payload: data });
    } catch (err: any) { message.error('加载系统分类失败'); }
  };

  const loadProjectCategories = async () => {
    if (!state.selectedProjectId) return;
    try {
      const [all, leaves] = await Promise.all([
        getProjectCategories(state.selectedProjectId),
        getLeafProjectCategories(state.selectedProjectId),
      ]);
      dispatch({ type: 'SET_PROJECT_CATEGORIES', payload: { all, leaves } });
    } catch (err: any) { message.error('加载项目分类失败'); }
  };

  const loadExistingMappings = async () => {
    if (!state.selectedProjectId) return;
    try { dispatch({ type: 'SET_MAPPINGS', payload: await getCategoryMappings(state.selectedProjectId) }); }
    catch { dispatch({ type: 'SET_MAPPINGS', payload: [] }); }
  };

  // ---- Virtual products (localStorage) ----
  const loadVirtualProducts = () => {
    if (!state.selectedProjectId) return;
    const key = VIRTUAL_PRODUCTS_STORAGE_PREFIX + state.selectedProjectId;
    const stored = localStorage.getItem(key);
    if (stored) {
      try { dispatch({ type: 'SET_VIRTUAL_PRODUCTS', payload: JSON.parse(stored) }); }
      catch { dispatch({ type: 'SET_VIRTUAL_PRODUCTS', payload: [] }); }
    } else {
      const initial: VirtualProduct[] = state.systemLeafCategories.slice(0, 20).map((cat, idx) => ({
        id: `vp_${idx}`, name: `商品${idx + 1}`,
        systemCategoryId: cat.categoryId, systemCategoryName: cat.name,
        projectCategoryId: '', projectCategoryName: '',
      }));
      saveVirtualProducts(initial);
    }
  };

  const saveVirtualProducts = (products: VirtualProduct[]) => {
    if (!state.selectedProjectId) return;
    localStorage.setItem(VIRTUAL_PRODUCTS_STORAGE_PREFIX + state.selectedProjectId, JSON.stringify(products));
    dispatch({ type: 'SET_VIRTUAL_PRODUCTS', payload: products });
  };

  // ---- Upload & Parse ----
  const handleUploadFile = async (file: File) => {
    if (!state.selectedProjectId) { message.warning('请先选择销售项目'); return false; }
    dispatch({ type: 'SET_UPLOADING', payload: true });
    try {
      const rawData = await uploadCategoryTable(file);
      dispatch({ type: 'SET_RAW_EXCEL', payload: rawData });
      dispatch({ type: 'SET_UPLOADING', payload: false });
      if (state.aiConfigured) {
        dispatch({ type: 'SET_PARSED_PREVIEW', payload: { data: [], count: 0 } });
        dispatch({ type: 'PARSE_CHAT_UPDATE', payload: {
          messages: [{ role: 'assistant', content: `我已读取您的分类表，共 ${rawData.length} 行 × ${rawData[0]?.length || 0} 列数据。正在分析表格结构，请稍候...` }],
          input: '',
        }});
        dispatch({ type: 'SET_PARSE_PHASE', payload: 'chat' });
        openModal('preview');
        dispatch({ type: 'PARSE_CHAT_UPDATE', payload: { loading: true } });
        try {
          const aiResponse = await callAiForPreParsingChat(rawData, []);
          dispatch({ type: 'PARSE_CHAT_UPDATE', payload: { messages: [{ role: 'assistant', content: aiResponse }], loading: false } });
        } catch {
          dispatch({ type: 'PARSE_CHAT_UPDATE', payload: { messages: [{ role: 'assistant', content: `我已读取您的分类表，共 ${rawData.length} 行数据。AI分析失败，请直接告诉我您希望如何解析。` }], loading: false } });
        }
      } else {
        openModal('manualColumn');
      }
    } catch (err: any) {
      dispatch({ type: 'SET_UPLOADING', payload: false });
      message.error('上传文件失败：' + (err.message || '未知错误'));
    }
    return false;
  };

  const handleStartParsing = async () => {
    if (state.rawExcelData.length === 0) return;
    dispatch({ type: 'SET_PARSING_AI', payload: true });
    dispatch({ type: 'SET_PARSE_PHASE', payload: 'parsing' });
    startSimulatedProgress();
    try {
      const chatCtx = state.parseChat.messages.length > 0 ? state.parseChat.messages : undefined;
      const rawParsed = await callAiForParsingCategoryTable(state.rawExcelData,
        (current, _total, label) => { realProgressRef.current = current; realLabelRef.current = label; },
        chatCtx, state.customParsePrompt || undefined);
      stopSimulatedProgress();
      dispatch({ type: 'SET_PARSED_PREVIEW', payload: { data: [...rawParsed], count: rawParsed.length } });
      dispatch({ type: 'INC_PREVIEW_TABLE_KEY' });
      dispatch({ type: 'SET_PARSE_PHASE', payload: 'result' });
      const l1Set = new Set<string>(), l2Set = new Set<string>();
      rawParsed.forEach((c: any) => {
        const parts = (c.fullPath || '').split('/');
        if (parts[0]) l1Set.add(parts[0]);
        if (parts[0] && parts[1]) l2Set.add(parts[0] + '/' + parts[1]);
      });
      message.success(`解析完成：${l1Set.size} 个一级 · ${l2Set.size} 个二级 · ${rawParsed.length} 个末级分类`, 5);
    } catch (aiErr: any) {
      stopSimulatedProgress();
      message.error({ content: 'AI解析失败：' + (aiErr?.message || '未知错误'), duration: 15 });
      dispatch({ type: 'SET_PARSE_PHASE', payload: 'chat' });
    } finally {
      dispatch({ type: 'SET_PARSING_AI', payload: false });
    }
  };

  const handleConfirmParsed = async () => {
    if (!state.selectedProjectId || state.parsedPreview.length === 0) return;
    try {
      await saveParsedCategories(state.selectedProjectId, state.parsedPreview);
      message.success(`项目分类保存成功（${state.parsedPreview.length} 个末级分类）`);
      closeModal('preview');
      dispatch({ type: 'SET_PARSED_PREVIEW', payload: { data: [], count: 0 } });
      dispatch({ type: 'SET_PARSE_PHASE', payload: 'chat' });
      loadProjectCategories();
    } catch (err: any) { message.error('保存失败：' + (err.message || '未知错误')); }
  };

  const handleChatSend = async () => {
    const input = state.parseChat.input.trim();
    if (!input || state.parseChat.loading) return;
    const userMsg = { role: 'user', content: input };
    const newHistory = [...state.parseChat.messages, userMsg];
    dispatch({ type: 'PARSE_CHAT_UPDATE', payload: { messages: newHistory, input: '' } });

    if (state.parsePhase === 'chat') {
      dispatch({ type: 'PARSE_CHAT_UPDATE', payload: { loading: true } });
      try {
        const aiResponse = await callAiForPreParsingChat(state.rawExcelData, newHistory);
        dispatch({ type: 'PARSE_CHAT_UPDATE', payload: { messages: [...newHistory, { role: 'assistant', content: aiResponse }], loading: false } });
      } catch (err: any) {
        dispatch({ type: 'PARSE_CHAT_UPDATE', payload: { messages: newHistory, loading: false } });
        message.error('AI对话失败：' + (err?.message || '未知错误'));
      }
    } else {
      dispatch({ type: 'SET_PARSE_PHASE', payload: 'parsing' });
      dispatch({ type: 'PARSE_CHAT_UPDATE', payload: { messages: [...newHistory, { role: 'assistant', content: '正在重新解析...' }], loading: false } });
      dispatch({ type: 'SET_PARSING_AI', payload: true });
      startSimulatedProgress();
      try {
        const rawParsed = await callAiForParsingCategoryTable(state.rawExcelData,
          (c, _t, l) => { realProgressRef.current = c; realLabelRef.current = l; },
          newHistory, state.customParsePrompt || undefined);
        stopSimulatedProgress();
        dispatch({ type: 'SET_PARSE_PHASE', payload: 'result' });
        dispatch({ type: 'SET_PARSED_PREVIEW', payload: { data: [...rawParsed], count: rawParsed.length } });
        dispatch({ type: 'INC_PREVIEW_TABLE_KEY' });
        const l1Set = new Set<string>(), l2Set = new Set<string>();
        rawParsed.forEach((c: any) => { const p = (c.fullPath || '').split('/'); if (p[0]) l1Set.add(p[0]); if (p[0] && p[1]) l2Set.add(p[0] + '/' + p[1]); });
        const summary = `重新解析完成：${l1Set.size} 个一级 · ${l2Set.size} 个二级 · ${rawParsed.length} 个末级分类`;
        dispatch({ type: 'PARSE_CHAT_UPDATE', payload: { messages: [...newHistory, { role: 'assistant', content: summary }] } });
        message.success(summary, 5);
      } catch (reParseErr: any) {
        stopSimulatedProgress();
        dispatch({ type: 'PARSE_CHAT_UPDATE', payload: { messages: [...newHistory, { role: 'assistant', content: '解析失败：' + (reParseErr?.message || '') }] } });
      } finally { dispatch({ type: 'SET_PARSING_AI', payload: false }); }
    }
  };

  // ---- Auto Mapping ----
  const handleAutoMap = async (withAi: boolean) => {
    if (!state.selectedProjectId || state.systemLeafCategories.length === 0 || state.projectLeafCategories.length === 0) {
      message.warning('请先选择项目并上传分类表'); return;
    }
    dispatch({ type: 'SET_AUTO_MAPPING', payload: true });
    dispatch({ type: 'SET_MAPPING_PROGRESS_TEXT', payload: '正在进行算法映射比对...' });
    try {
      let result = await autoMapCategories(state.selectedProjectId, false);
      if (withAi && result.length > 0) {
        const lowConfidence = result.filter(m => {
          const score = parseFloat(m.matchScore || '0');
          return score < 0.65 || m.matchStatus === '兜底匹配' || m.matchStatus === '模糊匹配';
        });
        if (lowConfidence.length > 0) {
          dispatch({ type: 'SET_MAPPING_PROGRESS_TEXT', payload: `AI增强 ${lowConfidence.length} 条低置信度映射...` });
          const projectLeafNames = state.projectLeafCategories.map(c => c.name);
          const aiInput = lowConfidence.map((m, i) => ({
            index: i, oldL1: m.systemCategoryFullPath?.split('/')[0] || '',
            oldL2: m.systemCategoryFullPath?.split('/')[1] || '', oldL3: m.systemCategoryName,
          }));
          try {
            let allAiResults: { index: number; newL3: string }[] = [];
            for (let i = 0; i < aiInput.length; i += 100) {
              const batch = aiInput.slice(i, i + 100);
              dispatch({ type: 'SET_MAPPING_PROGRESS_TEXT', payload: `AI增强... (${Math.min(i + 100, aiInput.length)}/${aiInput.length})` });
              allAiResults = allAiResults.concat(await callAiForMapping(batch, projectLeafNames));
            }
            for (const aiRes of allAiResults) {
              if (aiRes.newL3 === '无匹配') continue;
              const item = lowConfidence[aiRes.index]; if (!item) continue;
              const targetCat = state.projectLeafCategories.find(c => c.name === aiRes.newL3);
              if (targetCat) {
                item.projectCategoryId = targetCat.projectCategoryId;
                item.projectCategoryName = targetCat.name;
                item.projectCategoryFullPath = targetCat.fullPath;
                item.matchScore = '0.800'; item.matchMethod = 'AI推理'; item.matchStatus = 'AI匹配';
              }
            }
            message.success(`AI增强完成，优化 ${lowConfidence.filter(m => m.matchMethod === 'AI推理').length} 条`);
          } catch (aiErr: any) { message.warning('AI增强失败：' + (aiErr?.message || '')); }
        } else { message.info('所有映射置信度较高，无需AI增强'); }
      }
      dispatch({ type: 'SET_MAPPINGS', payload: result });
      dispatch({ type: 'SET_MAPPING_PROGRESS_TEXT', payload: '' });
      message.success(`映射比对完成：共 ${result.length} 条，成功 ${result.filter(m => m.matchStatus !== '匹配失败').length} 条`);
    } catch (err: any) {
      dispatch({ type: 'SET_MAPPING_PROGRESS_TEXT', payload: '' });
      message.error('自动映射失败：' + (err.message || '未知错误'));
    } finally { dispatch({ type: 'SET_AUTO_MAPPING', payload: false }); }
  };

  const handleSaveMappings = async () => {
    if (!state.selectedProjectId || state.mappings.length === 0) { message.warning('没有可保存的映射'); return; }
    dispatch({ type: 'SET_SAVING_MAPPINGS', payload: true });
    try {
      await batchSaveMappings(state.selectedProjectId, state.mappings);
      message.success('映射关系保存成功');
    } catch (err: any) { message.error('保存失败：' + (err.message || '未知错误')); }
    finally { dispatch({ type: 'SET_SAVING_MAPPINGS', payload: false }); }
  };

  // ---- Mapping CRUD ----
  const handleEditMapping = (record: CategoryMappingItem) => {
    dispatch({ type: 'SET_EDITING_MAPPING', payload: { mapping: record, projectCategoryId: record.projectCategoryId } });
    openModal('editMapping');
  };

  const handleSaveEditMapping = async () => {
    if (!state.editingMapping || !state.editProjectCategoryId) return;
    const target = state.projectLeafCategories.find(c => c.projectCategoryId === state.editProjectCategoryId);
    if (!target) return;
    try {
      await updateMapping(state.editingMapping.id, { ...state.editingMapping, projectCategoryId: state.editProjectCategoryId, projectCategoryName: target.name, projectCategoryFullPath: target.fullPath });
      dispatch({ type: 'UPDATE_MAPPING', payload: { id: state.editingMapping.id, changes: { projectCategoryId: state.editProjectCategoryId, projectCategoryName: target.name, projectCategoryFullPath: target.fullPath } } });
      closeModal('editMapping'); message.success('映射修改成功');
    } catch (err: any) { message.error('修改失败：' + (err.message || '未知错误')); }
  };

  const handleDeleteMapping = async (record: CategoryMappingItem) => {
    try {
      await deleteMapping(record.id);
      dispatch({ type: 'DELETE_MAPPING', payload: record.id });
      message.success('映射已删除');
    } catch (err: any) { message.error('删除失败'); }
  };

  const handleUnmappedSystemMap = (record: ProductCategoryItem) => {
    dispatch({ type: 'SET_UNMAPPED_SYSTEM', payload: { category: record, projectCategoryId: '' } });
    openModal('unmappedSystemMapping');
  };

  const handleSaveUnmappedSystemMapping = async () => {
    if (!state.unmappedSystemCategory || !state.unmappedSystemProjectCategoryId || !state.selectedProjectId) return;
    const target = state.projectLeafCategories.find(c => c.projectCategoryId === state.unmappedSystemProjectCategoryId);
    if (!target) return;
    try {
      const newMapping = await createManualMapping({
        systemCategoryId: state.unmappedSystemCategory.categoryId,
        systemCategoryName: state.unmappedSystemCategory.name,
        systemCategoryFullPath: state.unmappedSystemCategory.fullPath,
        systemCategoryLevel: state.unmappedSystemCategory.level,
        projectCategoryId: state.unmappedSystemProjectCategoryId,
        projectCategoryName: target.name, projectCategoryFullPath: target.fullPath,
        salesProjectId: state.selectedProjectId, matchScore: '1.000',
        matchMethod: '手动映射', matchStatus: '手动映射',
      });
      dispatch({ type: 'ADD_MAPPING', payload: newMapping });
      closeModal('unmappedSystemMapping'); message.success('手动映射创建成功');
    } catch (err: any) { message.error('创建映射失败'); }
  };

  const handleManualColumnMapping = async () => {
    if (!state.selectedProjectId || state.rawExcelData.length === 0) return;
    try {
      const parsed = state.rawExcelData.map((row: any[]) => {
        const l1 = String(row[state.manualL1Column] || '').trim();
        const l2 = String(row[state.manualL2Column] || '').trim();
        const l3 = String(row[state.manualL3Column] || '').trim();
        const fullPath = [l1, l2, l3].filter(Boolean).join('/');
        return { name: l3 || l2 || l1, level: l3 ? 3 : (l2 ? 2 : 1), fullPath, isLeaf: true, parentId: l2 || l1 || '' };
      }).filter((item: any) => item.name);
      await saveParsedCategories(state.selectedProjectId, parsed);
      message.success('项目分类保存成功');
      closeModal('manualColumn');
      loadProjectCategories();
    } catch (err: any) { message.error('保存失败'); }
  };

  // ---- Virtual Products ----
  const handleAddVirtualProduct = () => {
    const newP: VirtualProduct = {
      id: `vp_${Date.now()}`, name: `新商品${state.virtualProducts.length + 1}`,
      systemCategoryId: '', systemCategoryName: '',
      projectCategoryId: '', projectCategoryName: '',
    };
    saveVirtualProducts([...state.virtualProducts, newP]);
  };

  const handleVpCategoryChange = (productId: string, projectCategoryId: string) => {
    const target = state.projectLeafCategories.find(c => c.projectCategoryId === projectCategoryId);
    const updated = state.virtualProducts.map(p =>
      p.id !== productId ? p : { ...p, projectCategoryId, projectCategoryName: target?.name || '' }
    );
    saveVirtualProducts(updated);
  };

  const handleBatchCategoryChange = () => {
    if (!state.batchProjectCategoryId || state.selectedVirtualProductKeys.length === 0) return;
    const target = state.projectLeafCategories.find(c => c.projectCategoryId === state.batchProjectCategoryId);
    const updated = state.virtualProducts.map(p => {
      if (!state.selectedVirtualProductKeys.includes(p.id)) return p;
      return { ...p, projectCategoryId: state.batchProjectCategoryId, projectCategoryName: target?.name || '' };
    });
    saveVirtualProducts(updated);
    dispatch({ type: 'SET_SELECTED_VP_KEYS', payload: [] });
    closeModal('batchAdjust');
    message.success(`已批量调整 ${state.selectedVirtualProductKeys.length} 个商品`);
  };

  const handleDeleteVirtualProduct = (productId: string) => {
    saveVirtualProducts(state.virtualProducts.filter(p => p.id !== productId));
  };

  // ---- Chat handlers ----
  const handleMappingChatSend = async () => {
    const input = state.mappingChat.input.trim();
    if (!input || state.mappingChat.loading) return;
    const userMsg = { role: 'user', content: input };
    const newHistory = [...state.mappingChat.messages, userMsg];
    dispatch({ type: 'MAPPING_CHAT_UPDATE', payload: { messages: newHistory, input: '', loading: true } });
    try {
      const projectLeafNames = state.projectLeafCategories.map(c => c.name);
      const aiResult = await callAiForMappingChat(state.mappings, newHistory, projectLeafNames);
      dispatch({ type: 'MAPPING_CHAT_UPDATE', payload: { messages: [...newHistory, { role: 'assistant', content: aiResult.text }], loading: false } });

      // Debug logging for troubleshooting
      console.log('[MappingChat] AI returned corrections:', aiResult.corrections?.length || 0, 'items');
      if (aiResult.corrections?.length) {
        console.log('[MappingChat] Sample correction:', JSON.stringify(aiResult.corrections[0]));
        console.log('[MappingChat] First mapping systemCategoryName:', state.mappings[0]?.systemCategoryName);
        console.log('[MappingChat] Available project names (sample):', projectLeafNames.slice(0, 10));
      }

      if (aiResult.corrections && aiResult.corrections.length > 0) {
        let applied = 0;
        const unmatchedCorrections: { systemCategoryName: string; newProjectCategoryName: string; reason: string }[] = [];
        const projectLeafMap = new Map(state.projectLeafCategories.map(c => [c.name, c]));

        // Build lookup maps for matching (handle AI returning full path vs leaf name)
        const mappingIndexByName = new Map<string, number>();      // exact leaf name
        const mappingIndexByFullPath = new Map<string, number>();  // exact full path
        const mappingIndexByLastSegment = new Map<string, number>(); // last path segment
        state.mappings.forEach((m, i) => {
          if (m.systemCategoryName) mappingIndexByName.set(m.systemCategoryName, i);
          if (m.systemCategoryFullPath) {
            mappingIndexByFullPath.set(m.systemCategoryFullPath, i);
            const lastSlash = m.systemCategoryFullPath.lastIndexOf('/');
            if (lastSlash >= 0) {
              mappingIndexByLastSegment.set(m.systemCategoryFullPath.substring(lastSlash + 1), i);
            }
          }
        });

        const updated = [...state.mappings];

        // Iterate over AI corrections and match against mappings
        for (const correction of aiResult.corrections) {
          // Skip if AI said "无匹配"
          if (correction.newProjectCategoryName === '无匹配') continue;

          // Multi-strategy matching: AI may return full path, leaf name, or last segment
          let mappingIndex = mappingIndexByName.get(correction.systemCategoryName);
          if (mappingIndex === undefined) {
            mappingIndex = mappingIndexByFullPath.get(correction.systemCategoryName);
          }
          if (mappingIndex === undefined) {
            // Try last-segment extraction from AI's response
            const aiLastSlash = correction.systemCategoryName.lastIndexOf('/');
            if (aiLastSlash >= 0) {
              const aiLeafName = correction.systemCategoryName.substring(aiLastSlash + 1);
              mappingIndex = mappingIndexByName.get(aiLeafName)
                || mappingIndexByLastSegment.get(aiLeafName);
            }
          }
          if (mappingIndex === undefined) {
            // Try last-segment match on mapping side
            mappingIndex = mappingIndexByLastSegment.get(correction.systemCategoryName);
          }

          if (mappingIndex === undefined) {
            unmatchedCorrections.push({
              systemCategoryName: correction.systemCategoryName,
              newProjectCategoryName: correction.newProjectCategoryName,
              reason: `系统分类"${correction.systemCategoryName}"在当前映射列表中未找到（已尝试末级名称和全路径匹配）`,
            });
            continue;
          }

          const m = updated[mappingIndex];
          // Skip if same mapping
          if (correction.newProjectCategoryName === m.projectCategoryName) continue;

          const targetCat = projectLeafMap.get(correction.newProjectCategoryName);
          if (!targetCat) {
            unmatchedCorrections.push({
              systemCategoryName: correction.systemCategoryName,
              newProjectCategoryName: correction.newProjectCategoryName,
              reason: `项目分类"${correction.newProjectCategoryName}"不存在于当前项目列表`,
            });
            continue;
          }

          applied++;
          updated[mappingIndex] = {
            ...m,
            projectCategoryId: targetCat.projectCategoryId,
            projectCategoryName: targetCat.name,
            projectCategoryFullPath: targetCat.fullPath,
            matchScore: '0.850',
            matchMethod: 'AI对话修正',
            matchStatus: 'AI匹配',
          };
        }

        // Store pending corrections for manual review
        if (unmatchedCorrections.length > 0) {
          console.warn('[MappingChat] Unmatched corrections:', unmatchedCorrections);
          setManualReviewList({ corrections: unmatchedCorrections, selectedNames: new Set(unmatchedCorrections.map(c => c.systemCategoryName)) });
          setManualReviewModalVisible(true);
        }

        // Show prominent result dialog when corrections were applied
        if (applied > 0) {
          dispatch({ type: 'SET_MAPPINGS', payload: updated });
          const hasPending = unmatchedCorrections.length > 0;
          Modal.success({
            title: 'AI 映射修正完成',
            width: 480,
            content: (
              <div style={{ marginTop: 8, lineHeight: '24px', fontSize: 14 }}>
                <p style={{ fontSize: 16, fontWeight: 600, color: '#3f8600', marginBottom: 12 }}>
                  ✅ 已自动修正 <span style={{ fontSize: 20 }}>{applied}</span> 条映射
                </p>
                {hasPending && (
                  <p style={{ color: '#fa8c16' }}>
                    ⚠️ 还有 {unmatchedCorrections.length} 条建议需要手动处理，
                    请点击操作栏的 <Tag color="red">手动复核修正建议 ({unmatchedCorrections.length})</Tag> 按钮逐条确认。
                  </p>
                )}
                {!hasPending && (
                  <p style={{ color: '#666' }}>所有修正已自动应用，请检查映射列表确认结果。</p>
                )}
              </div>
            ),
          });
        } else if (unmatchedCorrections.length > 0) {
          Modal.warning({
            title: 'AI 映射修正 — 需要手动处理',
            width: 480,
            content: (
              <div style={{ marginTop: 8, lineHeight: '24px', fontSize: 14 }}>
                <p>AI 返回了修正建议，但无法自动匹配项目分类。</p>
                <p style={{ color: '#fa8c16' }}>
                  请点击操作栏的 <Tag color="red">手动复核修正建议 ({unmatchedCorrections.length})</Tag> 按钮逐条确认。
                </p>
              </div>
            ),
          });
        } else {
          Modal.warning({
            title: 'AI 未返回修正数据',
            width: 480,
            content: (
              <div style={{ marginTop: 8, lineHeight: '24px', fontSize: 14 }}>
                <p>AI 已回复，但回复中未包含结构化的映射修正数据。</p>
                <p style={{ color: '#666', marginTop: 8 }}>
                  <b>可能原因：</b>
                </p>
                <ul style={{ paddingLeft: 20, color: '#666' }}>
                  <li>对话内容未被 AI 理解为修正请求</li>
                  <li>AI 认为当前映射无需修正</li>
                </ul>
                <p style={{ marginTop: 8, fontWeight: 500 }}>
                  请尝试输入更明确的指令，如：
                </p>
                <Tag color="blue" style={{ cursor: 'pointer', margin: 2 }}
                  onClick={() => {
                    dispatch({ type: 'MAPPING_CHAT_UPDATE', payload: { input: '帮我修正所有低置信度映射，逐一检查并给出修正建议' } });
                  }}>
                  "帮我修正所有低置信度映射，逐一检查并给出修正建议"
                </Tag>
              </div>
            ),
          });
        }
      } else {
        Modal.warning({
          title: 'AI 未返回修正数据',
          width: 480,
          content: (
            <div style={{ marginTop: 8, lineHeight: '24px', fontSize: 14 }}>
              <p>AI 已回复，但回复中未包含结构化的映射修正数据。</p>
              <p style={{ marginTop: 8, fontWeight: 500 }}>
                请尝试输入更明确的指令，如：
              </p>
              <Tag color="blue" style={{ cursor: 'pointer', margin: 2 }}
                onClick={() => {
                  dispatch({ type: 'MAPPING_CHAT_UPDATE', payload: { input: '帮我修正所有低置信度映射，逐一检查并给出修正建议' } });
                }}>
                "帮我修正所有低置信度映射，逐一检查并给出修正建议"
              </Tag>
            </div>
          ),
        });
      }
    } catch (err: any) {
      dispatch({ type: 'MAPPING_CHAT_UPDATE', payload: { messages: newHistory, loading: false } });
      message.error('AI对话失败：' + (err?.message || '未知错误'));
    }
  };

  // ---- AI Reverse-Match: unmapped project categories → system categories ----
  const [unmappedMatching, setUnmappedMatching] = useState(false);
  const [unmappedMatchingProgress, setUnmappedMatchingProgress] = useState('');

  const handleAiMatchUnmapped = async () => {
    if (unmappedProjectCats.length === 0 || state.systemLeafCategories.length === 0) {
      message.warning('没有未映射的项目分类或系统商品分类为空'); return;
    }
    setUnmappedMatching(true);
    setUnmappedMatchingProgress(`正在反向匹配 ${unmappedProjectCats.length} 条未映射项目分类...`);
    try {
      const results = await callAiForUnmappedMatching(
        unmappedProjectCats.map(c => ({ name: c.name, fullPath: c.fullPath })),
        state.systemLeafCategories.map(c => ({ categoryId: c.categoryId, name: c.name, fullPath: c.fullPath })),
        (current, total) => setUnmappedMatchingProgress(`反向匹配中... (${current}/${total})`)
      );

      if (results.length === 0) {
        Modal.warning({ title: 'AI 未返回匹配结果', content: 'AI 未能为未映射项目分类找到匹配的系统分类。' });
        return;
      }

      // Build new mappings: systemCategory → projectCategory
      // Enforce: one systemCategory → at most one projectCategory (1:1 or N:1)
      let applied = 0;
      const unmatched: { systemCategoryName: string; newProjectCategoryName: string; reason: string }[] = [];
      const sysCatMap = new Map(state.systemLeafCategories.map(c => [c.name, c]));
      const projCatMap = new Map(state.projectLeafCategories.map(c => [c.name, c]));
      const newMappings: any[] = [];
      // Track which systemCategoryIds are already used (existing mappings + new batch)
      const usedSystemIds = new Set(state.mappings.map(m => m.systemCategoryId));

      for (const r of results) {
        const sysCat = sysCatMap.get(r.systemCategoryName);
        const projCat = projCatMap.get(r.projectCategoryName);
        if (!sysCat) {
          unmatched.push({ systemCategoryName: r.systemCategoryName, newProjectCategoryName: r.projectCategoryName, reason: `系统分类"${r.systemCategoryName}"未找到` });
          continue;
        }
        if (!projCat) {
          unmatched.push({ systemCategoryName: r.systemCategoryName, newProjectCategoryName: r.projectCategoryName, reason: `项目分类"${r.projectCategoryName}"不存在` });
          continue;
        }
        // Enforce 1:1 — skip if already mapped (existing or in this batch)
        if (usedSystemIds.has(sysCat.categoryId)) {
          unmatched.push({ systemCategoryName: r.systemCategoryName, newProjectCategoryName: r.projectCategoryName, reason: `系统分类已被映射，跳过重复` });
          continue;
        }
        usedSystemIds.add(sysCat.categoryId);

        applied++;
        newMappings.push({
          id: `ai_rev_${Date.now()}_${applied}`,
          systemCategoryId: sysCat.categoryId,
          systemCategoryName: sysCat.name,
          systemCategoryFullPath: sysCat.fullPath,
          systemCategoryLevel: sysCat.level,
          projectCategoryId: projCat.projectCategoryId,
          projectCategoryName: projCat.name,
          projectCategoryFullPath: projCat.fullPath,
          salesProjectId: state.selectedProjectId,
          matchScore: '0.850',
          matchMethod: 'AI反向匹配',
          matchStatus: 'AI匹配',
        });
      }

      if (applied > 0) {
        dispatch({ type: 'SET_MAPPINGS', payload: [...state.mappings, ...newMappings] });
        Modal.success({
          title: 'AI 反向匹配完成',
          content: (
            <div>
              <p>✅ 从 {unmappedProjectCats.length} 条未映射项目分类中，成功匹配 <b>{applied}</b> 条新映射</p>
              {unmatched.length > 0 && <p style={{ color: '#fa8c16' }}>⚠️ {unmatched.length} 条未能自动匹配</p>}
              <p style={{ color: '#666', marginTop: 8 }}>请检查「全部已映射」标签页确认结果，并记得<b>保存映射</b>。</p>
            </div>
          ),
        });
      } else if (unmatched.length > 0) {
        setManualReviewList({ corrections: unmatched, selectedNames: new Set(unmatched.map(c => c.systemCategoryName)) });
        setManualReviewModalVisible(true);
      }
    } catch (err: any) {
      message.error('AI反向匹配失败：' + (err?.message || '未知错误'));
    } finally {
      setUnmappedMatching(false);
      setUnmappedMatchingProgress('');
    }
  };

  const handlePromptChatSend = async () => {
    const input = state.promptChat.input.trim();
    if (!input || state.promptChat.loading) return;
    const userMsg = { role: 'user', content: input };
    const newHistory = [...state.promptChat.messages, userMsg];
    dispatch({ type: 'PROMPT_CHAT_UPDATE', payload: { messages: newHistory, input: '', loading: true } });
    try {
      const activePrompt = state.customParsePrompt || state.customMappingPrompt;
      const promptType = state.customParsePrompt ? 'parse' : 'mapping';
      const aiResponse = await callAiForPromptChat(activePrompt, promptType, newHistory);
      dispatch({ type: 'PROMPT_CHAT_UPDATE', payload: { messages: [...newHistory, { role: 'assistant', content: aiResponse }], loading: false } });
      const codeBlock = aiResponse.match(/```(?:prompt|text)?\s*\n?([\s\S]*?)```/);
      if (codeBlock?.[1]) {
        if (promptType === 'parse') dispatch({ type: 'SET_CUSTOM_PARSE_PROMPT', payload: codeBlock[1].trim() });
        else dispatch({ type: 'SET_CUSTOM_MAPPING_PROMPT', payload: codeBlock[1].trim() });
        message.success('AI建议的Prompt已更新');
      }
    } catch (err: any) {
      dispatch({ type: 'PROMPT_CHAT_UPDATE', payload: { messages: newHistory, loading: false } });
      message.error('AI对话失败');
    }
  };

  // ---- Export/Import ----
  const handleExportParsedExcel = () => {
    if (state.parsedPreview.length === 0) { message.warning('无数据'); return; }
    const maxLevel = state.parsedPreview.reduce((max: number, c: any) => Math.max(max, c.level || 3), 3);
    const exportData = state.parsedPreview.map((c: any) => {
      const parts = (c.fullPath || '').split('/');
      const row: Record<string, string> = {};
      for (let i = 0; i < maxLevel; i++) row[`第${i + 1}级分类`] = parts[i] || '';
      row['末级分类名称'] = c.name || ''; row['完整路径'] = c.fullPath || '';
      return row;
    });
    const headers = Array.from({ length: maxLevel }, (_, i) => `第${i + 1}级分类`).concat(['末级分类名称', '完整路径']);
    exportToExcel(exportData, headers, `分类解析结果_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`);
    message.success('导出成功');
  };

  const handleImportParsedExcel = async (file: File) => {
    try {
      const imported = await parseImportedExcel(file, (row) => {
        const levelKeys = Object.keys(row).filter(k => k.startsWith('第') && k.includes('级分类'));
        const maxLevel = levelKeys.length || 3;
        const parts: string[] = [];
        for (let i = 0; i < maxLevel; i++) { const v = row[`第${i + 1}级分类`] || ''; if (v) parts.push(v); }
        const name = row['末级分类名称'] || parts[parts.length - 1] || '';
        if (!name) return null;
        return { name, level: parts.length || 3, fullPath: row['完整路径'] || parts.join('/'), isLeaf: true, parentId: parts.length >= 2 ? parts[parts.length - 2] : '' };
      });
      dispatch({ type: 'SET_PARSED_PREVIEW', payload: { data: imported, count: imported.length } });
      dispatch({ type: 'INC_PREVIEW_TABLE_KEY' });
      message.success(`导入成功：${imported.length} 条`);
    } catch (err: any) { message.error('导入失败：' + err.message); }
    return false;
  };

  const handleExportProjectCategoriesExcel = () => {
    if (state.projectCategories.length === 0) { message.warning('无数据'); return; }
    const maxLevel = state.projectCategories.reduce((max, c) => Math.max(max, c.level || 3), 3);
    const exportData = state.projectCategories.map(c => {
      const parts = (c.fullPath || '').split('/');
      const row: Record<string, string> = {};
      for (let i = 0; i < maxLevel; i++) row[`第${i + 1}级分类`] = parts[i] || '';
      row['末级分类名称'] = c.name || ''; row['完整路径'] = c.fullPath || '';
      return row;
    });
    const headers = Array.from({ length: maxLevel }, (_, i) => `第${i + 1}级分类`).concat(['末级分类名称', '完整路径']);
    exportToExcel(exportData, headers, `项目分类_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`);
    message.success('导出成功');
  };

  const handleImportProjectCategoriesExcel = async (file: File) => {
    if (!state.selectedProjectId) { message.warning('请先选择项目'); return false; }
    try {
      const imported = await parseImportedExcel(file, (row) => {
        const levelKeys = Object.keys(row).filter(k => k.startsWith('第') && k.includes('级分类'));
        const maxLevel = levelKeys.length || 3;
        const parts: string[] = [];
        for (let i = 0; i < maxLevel; i++) { const v = row[`第${i + 1}级分类`] || ''; if (v) parts.push(v); }
        const name = row['末级分类名称'] || parts[parts.length - 1] || '';
        if (!name) return null;
        return { name, level: parts.length || 3, fullPath: row['完整路径'] || parts.join('/'), isLeaf: true, parentId: parts.length >= 2 ? parts[parts.length - 2] : '' };
      });
      await saveParsedCategories(state.selectedProjectId, imported);
      message.success(`导入修正成功：${imported.length} 条`);
      loadProjectCategories();
      closeModal('projectDetail');
    } catch (err: any) { message.error('导入修正失败：' + err.message); }
    return false;
  };

  // ---- Unified export: all mappings + unmapped project categories ----
  const handleExportMappingExcel = () => {
    const total = state.mappings.length + unmappedProjectCats.length;
    if (total === 0) { message.warning('无数据可导出'); return; }

    // System categories may have 3 or 4 levels; project categories are always 3 levels
    // System: L1/L2/L3/L4 (L4 = leaf); Project: L1/L2/L3 (L3 = leaf)
    // Find max system level in current data for header count
    const maxSysLevel = state.mappings.reduce((max, m) => {
      const parts = (m.systemCategoryFullPath || '').split('/').filter(Boolean);
      return Math.max(max, parts.length);
    }, 3);

    // Part 1: existing mappings
    const mappedData = state.mappings.map(m => {
      const sP = (m.systemCategoryFullPath || '').split('/').filter(Boolean);
      const projCat = state.projectLeafCategories.find(c => c.projectCategoryId === m.projectCategoryId);
      const projLevel = projCat?.level || 3;
      const pName = m.projectCategoryName || '';  // leaf name, not split from path
      // Reconstruct project path from fullPath: take (level-1) parent segments, leaf = name
      const pFull = (m.projectCategoryFullPath || '').split('/').filter(Boolean);
      const pParents = pFull.slice(0, projLevel - 1);
      const row: Record<string, string> = {};
      for (let i = 0; i < maxSysLevel; i++) row[`系统${i + 1}级分类`] = sP[i] || '';
      for (let i = 0; i < projLevel - 1; i++) row[`项目${i + 1}级分类`] = pParents[i] || '';
      row[`项目${projLevel}级分类`] = pName;
      row['匹配得分'] = m.matchScore || '';
      row['匹配方式'] = m.matchMethod || '';
      row['匹配状态'] = m.matchStatus || '';
      return row;
    });

    // Part 2: unmapped project categories — use level+name, not fullPath split
    const unmappedData = unmappedProjectCats.map(c => {
      const pLevel = c.level || 3;
      const pP = (c.fullPath || '').split('/').filter(Boolean);
      // Truncate to actual level: take first (level-1) segments as parents, last as leaf name
      const parents = pP.slice(0, pLevel - 1);
      const leaf = c.name || pP[pP.length - 1] || '';
      const row: Record<string, string> = {};
      for (let i = 0; i < maxSysLevel; i++) row[`系统${i + 1}级分类`] = '';
      for (let i = 0; i < pLevel - 1; i++) row[`项目${i + 1}级分类`] = parents[i] || '';
      row[`项目${pLevel}级分类`] = leaf;
      row['匹配得分'] = '';
      row['匹配方式'] = '待匹配';
      row['匹配状态'] = '待匹配';
      return row;
    });

    const sysHeaders = Array.from({ length: maxSysLevel }, (_, i) => `系统${i + 1}级分类`);
    const projHeaders = ['项目1级分类', '项目2级分类', '项目3级分类'];
    const exportData = [...mappedData, ...unmappedData];
    exportToExcel(exportData, [...sysHeaders, ...projHeaders, '匹配得分', '匹配方式', '匹配状态'],
      `映射比对_全量_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`);
    message.success(`导出成功：${mappedData.length} 条已有映射 + ${unmappedData.length} 条待匹配`);
  };

  // ---- Unified import: update existing + create new mappings ----
  const handleImportMappingExcel = async (file: File) => {
    if (!state.selectedProjectId) { message.warning('请先选择项目'); return false; }
    message.loading({ content: '正在导入并校验...', key: 'importFull', duration: 0 });
    try {
      const rows = await parseImportedExcel(file, (row) => row);
      const errors: { row: number; projectName: string; reason: string; data: Record<string, string> }[] = [];
      let updated = 0;
      let created = 0;

      const projCatMap = new Map(state.projectLeafCategories.map(c => [c.name, c]));
      const sysLeafMap = new Map(state.systemLeafCategories.map(c => [c.name, c]));
      const existingBySysName = new Map(state.mappings.map(m => [m.systemCategoryName, m]));
      const processedSysNames = new Set<string>();

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const matchStatus = row['匹配状态'] || '';

        // Extract project columns (always 3 levels)
        const projL1 = row['项目1级分类'] || '';
        const projL2 = row['项目2级分类'] || '';
        const projL3 = row['项目3级分类'] || '';
        const projName = projL3 || '';

        // Extract system columns (3 or 4 levels, find the leaf = last non-empty)
        const sysParts: string[] = [];
        for (let lv = 1; lv <= 4; lv++) {
          const v = row[`系统${lv}级分类`] || '';
          if (v) sysParts.push(v); else break;
        }
        const sysName = sysParts[sysParts.length - 1] || '';
        const sysFullPath = sysParts.join('/');

        // Skip: unmapped rows with no system data, or failed-mapping rows
        if (matchStatus === '待匹配' && !sysParts.length) continue;
        if (projName === '未匹配' || matchStatus === '匹配失败') continue;

        if (!projName) {
          errors.push({ row: i + 1, projectName: '(空)', reason: '项目末级分类为空', data: row }); continue;
        }
        if (!sysName) {
          errors.push({ row: i + 1, projectName: projName, reason: '系统末级分类为空', data: row }); continue;
        }

        const projCat = projCatMap.get(projName);
        if (!projCat) {
          errors.push({ row: i + 1, projectName: projName, reason: `项目分类"${projName}"不存在`, data: row }); continue;
        }

        // Find system category — search leaves first, then all categories
        let sysCat = sysLeafMap.get(sysName);
        if (!sysCat && sysFullPath) {
          sysCat = state.systemLeafCategories.find(c => c.fullPath === sysFullPath);
        }
        // Fallback: search ALL system categories (not just leaves) for existing mappings
        if (!sysCat && matchStatus !== '待匹配') {
          sysCat = state.systemCategories.find(c => c.name === sysName || c.fullPath === sysFullPath);
        }
        if (!sysCat && matchStatus === '待匹配') {
          try {
            const created2 = await createProductCategory({
              name: sysName,
              parentId: sysParts.length >= 2 ? sysParts[sysParts.length - 2] : '0',
              level: sysParts.length,
              fullPath: sysFullPath || sysName,
            });
            message.success(`已自动创建商品分类：${sysName}`, 2);
            const refreshed = await getAllProductCategories();
            dispatch({ type: 'SET_SYSTEM_CATEGORIES', payload: refreshed });
            const leaves = refreshed.filter(c => !refreshed.some(p => p.parentId === c.categoryId));
            sysCat = leaves.find(c => c.name === sysName && c.fullPath === (sysFullPath || sysName));
            if (sysCat) sysLeafMap.set(sysCat.name, sysCat);
          } catch (e: any) {
            errors.push({ row: i + 1, projectName: projName, reason: `创建系统分类"${sysName}"失败`, data: row }); continue;
          }
        }
        if (!sysCat) {
          errors.push({ row: i + 1, projectName: projName, reason: `系统分类"${sysName}"未找到${matchStatus !== '待匹配' ? '（已有映射行不支持自动创建）' : ''}`, data: row }); continue;
        }

        // Prevent duplicate system category in this import batch
        if (processedSysNames.has(sysName)) {
          errors.push({ row: i + 1, projectName: projName, reason: `系统分类"${sysName}"在本批次中重复`, data: row }); continue;
        }

        // Check if already mapped (existing mapping with different project)
        const existing = existingBySysName.get(sysName);
        if (existing && existing.projectCategoryName !== projName && existing.matchStatus !== '匹配失败') {
          errors.push({ row: i + 1, projectName: projName, reason: `系统分类"${sysName}"已映射到"${existing.projectCategoryName}"`, data: row }); continue;
        }

        processedSysNames.add(sysName);

        if (existing) {
          // Update existing mapping
          try {
            await updateMapping(existing.id, {
              ...existing,
              projectCategoryId: projCat.projectCategoryId,
              projectCategoryName: projCat.name,
              projectCategoryFullPath: projCat.fullPath,
              matchScore: row['匹配得分'] || existing.matchScore || '1.000',
              matchMethod: row['匹配方式'] || '导入修正',
              matchStatus: row['匹配状态'] || '导入修正',
            });
            updated++;
          } catch (e: any) {
            errors.push({ row: i + 1, projectName: projName, reason: `更新映射失败：${e?.message || ''}`, data: row }); continue;
          }
        } else {
          // Create new mapping
          try {
            const newMapping = await createManualMapping({
              systemCategoryId: sysCat.categoryId,
              systemCategoryName: sysCat.name,
              systemCategoryFullPath: sysCat.fullPath,
              systemCategoryLevel: sysCat.level,
              projectCategoryId: projCat.projectCategoryId,
              projectCategoryName: projCat.name,
              projectCategoryFullPath: projCat.fullPath,
              salesProjectId: state.selectedProjectId,
              matchScore: row['匹配得分'] || '1.000',
              matchMethod: row['匹配方式'] || '导入修正',
              matchStatus: row['匹配状态'] || '导入修正',
            });
            created++;
          } catch (e: any) {
            errors.push({ row: i + 1, projectName: projName, reason: `创建映射失败：${e?.message || ''}`, data: row }); continue;
          }
        }
      }

      message.destroy('importFull');
      // Reload mappings from backend
      const refreshedMappings = await getCategoryMappings(state.selectedProjectId);
      dispatch({ type: 'SET_MAPPINGS', payload: refreshedMappings });
      // Show result
      setImportFullResult({ updated, created, errors });
    } catch (err: any) {
      message.destroy('importFull');
      message.error('导入失败：' + (err?.message || '文件格式错误'));
    }
    return false;
  };

  const [importFullResult, setImportFullResult] = useState<{
    updated: number; created: number; errors: { row: number; projectName: string; reason: string; data: Record<string, string> }[];
  } | null>(null);

  // ---- Preview edit ----
  const handlePreviewEditOpen = (index: number) => {
    dispatch({ type: 'SET_EDIT_PREVIEW', payload: { index, item: { ...state.parsedPreview[index] } } });
    openModal('editPreview');
  };
  const handlePreviewEditSave = () => {
    if (!state.editPreviewItem) return;
    dispatch({ type: 'UPDATE_PARSED_PREVIEW', payload: { index: state.editPreviewIndex, item: state.editPreviewItem } });
    closeModal('editPreview');
    dispatch({ type: 'SET_EDIT_PREVIEW', payload: { index: -1, item: null } });
  };
  const handlePreviewAdd = () => {
    dispatch({ type: 'SET_EDIT_PREVIEW', payload: { index: -1, item: { name: '', level: 3, fullPath: '', parentId: '' } } });
    openModal('editPreview');
  };

  // ---- Column definitions ----
  const projectLeafSelectOptions = state.projectLeafCategories.map(cat => (
    <Select.Option key={cat.projectCategoryId} value={cat.projectCategoryId}>{cat.fullPath || cat.name}</Select.Option>
  ));

  const previewColumns: ColumnsType<any> = [
    { title: '分类名称', dataIndex: 'name', width: 180, ellipsis: true },
    { title: '层级', dataIndex: 'level', width: 60, align: 'center' },
    { title: '完整路径', dataIndex: 'fullPath', width: 350, ellipsis: true },
    { title: '是否末级', dataIndex: 'isLeaf', width: 80, align: 'center', render: (v: boolean) => v ? <Tag color="green">是</Tag> : <Tag>否</Tag> },
    { title: '操作', width: 120, render: (_: any, _r: any, i: number) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handlePreviewEditOpen(i)}>编辑</Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => { dispatch({ type: 'DELETE_PARSED_PREVIEW_ITEM', payload: i }); }}>删除</Button>
        </Space>
      ),
    },
  ];

  const mappedColumns: ColumnsType<CategoryMappingItem> = [
    { title: '系统分类路径', dataIndex: 'systemCategoryFullPath', width: 250, ellipsis: true, sorter: (a, b) => (a.systemCategoryFullPath || '').localeCompare(b.systemCategoryFullPath || '') },
    { title: '项目分类路径', dataIndex: 'projectCategoryFullPath', width: 250, ellipsis: true, sorter: (a, b) => (a.projectCategoryFullPath || '').localeCompare(b.projectCategoryFullPath || '') },
    { title: '匹配得分', dataIndex: 'matchScore', width: 100, align: 'center', sorter: (a, b) => parseFloat(a.matchScore || '0') - parseFloat(b.matchScore || '0'),
      render: (v: string) => { const s = parseFloat(v || '0'); return <Tag color={s >= 0.8 ? 'green' : s >= 0.5 ? 'blue' : 'orange'}>{v}</Tag>; } },
    { title: '匹配方式', dataIndex: 'matchMethod', width: 120,
      filters: ['名称相似度', '关键词规则', '关键词规则(L2)', '二级名称→三级匹配', '兜底分类', '兜底分类(L1)', '其他兜底', 'AI推理', '手动映射', '导入修正'].map(v => ({ text: v, value: v })),
      onFilter: (value: any, record: CategoryMappingItem) => record.matchMethod === value },
    { title: '匹配状态', dataIndex: 'matchStatus', width: 100, align: 'center',
      filters: ['精准匹配', '模糊匹配', '兜底匹配', 'AI匹配', '手动映射', '匹配失败'].map(v => ({ text: v, value: v })),
      onFilter: (value: any, record: CategoryMappingItem) => record.matchStatus === value,
      render: (v: string) => { const cm: Record<string, string> = { '精准匹配': 'green', '模糊匹配': 'blue', '兜底匹配': 'orange', 'AI匹配': 'purple', '手动映射': 'cyan', '匹配失败': 'red' }; return <Tag color={cm[v] || 'default'}>{v}</Tag>; } },
    { title: '操作', width: 120, render: (_: any, r: CategoryMappingItem) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditMapping(r)}>修改</Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => {
            Modal.confirm({ title: '确认删除', content: `确定删除「${r.systemCategoryName}」→「${r.projectCategoryName}」的映射？`, onOk: () => handleDeleteMapping(r) });
          }}>删除</Button>
        </Space>
      ),
    },
  ];

  const unmappedSystemColumns: ColumnsType<ProductCategoryItem> = [
    { title: '分类名称', dataIndex: 'name', width: 200, ellipsis: true },
    { title: '完整路径', dataIndex: 'fullPath', ellipsis: true },
    { title: '层级', dataIndex: 'level', width: 80, align: 'center' },
    { title: '状态', width: 80, align: 'center', render: () => <Tag color="red">未映射</Tag> },
    { title: '操作', width: 100, render: (_: any, r: ProductCategoryItem) => <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => handleUnmappedSystemMap(r)}>建立映射</Button> },
  ];

  // ---- Batch export/import for unmapped project categories ----
  const handleExportUnmappedTemplate = () => {
    if (unmappedProjectCats.length === 0) { message.warning('没有未被映射的项目分类'); return; }
    const exportData = unmappedProjectCats.map(c => {
      const parts = (c.fullPath || '').split('/');
      const row: Record<string, string> = {};
      row['项目一级'] = parts[0] || '';
      row['项目二级'] = parts[1] || '';
      row['项目三级'] = parts[2] || '';
      row['项目末级名称'] = c.name || '';
      row['商品一级（填写）'] = '';
      row['商品二级（填写）'] = '';
      row['商品三级（填写）'] = '';
      row['商品末级名称（填写）'] = '';
      return row;
    });
    const headers = ['项目一级', '项目二级', '项目三级', '项目末级名称', '商品一级（填写）', '商品二级（填写）', '商品三级（填写）', '商品末级名称（填写）'];
    exportToExcel(exportData, headers, `未映射项目分类_导入模板_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`);
    message.success(`导出成功：${exportData.length} 条未映射项目分类，请在Excel中填写对应的系统商品分类`);
  };

  const [importUnmappedResult, setImportUnmappedResult] = useState<{
    success: number; errors: { row: number; projectName: string; reason: string; data: Record<string, string> }[];
  } | null>(null);

  const handleImportUnmappedMappings = async (file: File) => {
    if (!state.selectedProjectId || unmappedProjectCats.length === 0) {
      message.warning('没有未被映射的项目分类可处理'); return false;
    }
    message.loading({ content: '正在导入并校验...', key: 'importUnmapped', duration: 0 });
    try {
      const rows = await parseImportedExcel(file, (row) => row);
      const errors: { row: number; projectName: string; reason: string; data: Record<string, string> }[] = [];
      let success = 0;

      const projCatMap = new Map(state.projectLeafCategories.map(c => [c.name, c]));
      const sysCatMap = new Map(state.systemLeafCategories.map(c => [c.name, c]));
      const allSysCats = new Map(state.systemCategories.map(c => [c.name, c]));
      const existingMappedIds = new Set(
        state.mappings.filter(m => m.matchStatus !== '匹配失败').map(m => m.systemCategoryId)
      );

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const projName = row['项目末级名称'] || '';
        const l1 = (row['商品一级（填写）'] || '').trim();
        const l2 = (row['商品二级（填写）'] || '').trim();
        const l3 = (row['商品三级（填写）'] || '').trim();
        const sysLeafName = (row['商品末级名称（填写）'] || '').trim();

        if (!projName || !sysLeafName) {
          errors.push({ row: i + 1, projectName: projName || '(空)', reason: '项目分类名或商品分类名为空', data: row });
          continue;
        }

        // Check 1: project category exists
        const projCat = projCatMap.get(projName);
        if (!projCat) {
          errors.push({ row: i + 1, projectName: projName, reason: `项目分类"${projName}"在当前项目中不存在`, data: row });
          continue;
        }

        // Check 2: system category must be exactly 4 levels
        const filledLevels = [l1, l2, l3, sysLeafName].filter(Boolean).length;
        if (filledLevels !== 4) {
          errors.push({ row: i + 1, projectName: projName, reason: `商品分类层级为${filledLevels}级，系统要求4级（一级/二级/三级/末级）`, data: row });
          continue;
        }

        // Check 3: find or create system category
        let sysCat = sysCatMap.get(sysLeafName);
        if (!sysCat) {
          // Try to find by full path
          const fullPath = `${l1}/${l2}/${l3}/${sysLeafName}`;
          sysCat = state.systemLeafCategories.find(c => c.fullPath === fullPath);
        }
        if (!sysCat) {
          // Create new system category
          try {
            const created = await createProductCategory({
              name: sysLeafName,
              parentId: l3 || l2 || '0',
              level: 4,
              fullPath: `${l1}/${l2}/${l3}/${sysLeafName}`,
            });
            // Refresh system categories and remap
            const data = await getAllProductCategories();
            dispatch({ type: 'SET_SYSTEM_CATEGORIES', payload: data });
            // Rebuild maps after refresh
            const refreshed = await getAllProductCategories();
            const refreshedLeaves = refreshed.filter(c => !refreshed.some(p => p.parentId === c.categoryId));
            sysCat = refreshedLeaves.find(c => c.name === sysLeafName && c.fullPath === `${l1}/${l2}/${l3}/${sysLeafName}`);
            if (!sysCat) {
              errors.push({ row: i + 1, projectName: projName, reason: `已创建商品分类但未找到：${sysLeafName}`, data: row });
              continue;
            }
          } catch (e: any) {
            errors.push({ row: i + 1, projectName: projName, reason: `创建商品分类失败：${e?.message || '未知错误'}`, data: row });
            continue;
          }
        }

        // Check 4: system category already mapped
        if (existingMappedIds.has(sysCat.categoryId)) {
          const existingMapping = state.mappings.find(m => m.systemCategoryId === sysCat.categoryId && m.matchStatus !== '匹配失败');
          errors.push({
            row: i + 1, projectName: projName,
            reason: `商品分类"${sysLeafName}"已被映射到"${existingMapping?.projectCategoryName || '?'}"`,
            data: row,
          });
          continue;
        }

        // All checks passed — create mapping
        try {
          const newMapping = await createManualMapping({
            systemCategoryId: sysCat.categoryId,
            systemCategoryName: sysCat.name,
            systemCategoryFullPath: sysCat.fullPath,
            systemCategoryLevel: sysCat.level,
            projectCategoryId: projCat.projectCategoryId,
            projectCategoryName: projCat.name,
            projectCategoryFullPath: projCat.fullPath,
            salesProjectId: state.selectedProjectId,
            matchScore: '1.000',
            matchMethod: '导入映射',
            matchStatus: '导入映射',
          });
          dispatch({ type: 'ADD_MAPPING', payload: newMapping });
          existingMappedIds.add(sysCat.categoryId);
          success++;
        } catch (e: any) {
          errors.push({ row: i + 1, projectName: projName, reason: `创建映射失败：${e?.message || '未知错误'}`, data: row });
        }
      }

      message.destroy('importUnmapped');
      setImportUnmappedResult({ success, errors });
    } catch (err: any) {
      message.destroy('importUnmapped');
      message.error('导入失败：' + (err?.message || '文件格式错误'));
    }
    return false;
  };

  const handleDownloadErrorRows = () => {
    if (!importUnmappedResult || importUnmappedResult.errors.length === 0) return;
    const exportData = importUnmappedResult.errors.map(e => ({
      '行号': e.row,
      '项目末级名称': e.projectName,
      '错误原因': e.reason,
      ...e.data,
    }));
    const headers = ['行号', '项目末级名称', '错误原因', ...Object.keys(importUnmappedResult.errors[0]?.data || {})];
    exportToExcel(exportData, headers, `导入失败数据_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`);
    message.success(`已下载 ${importUnmappedResult.errors.length} 条错误数据`);
  };

  // ---- Reverse mapping: unmapped project → system category ----
  const [reverseMappingModalVisible, setReverseMappingModalVisible] = useState(false);
  const [reverseMappingProject, setReverseMappingProject] = useState<ProjectCategory | null>(null);
  const [reverseMappingSystemId, setReverseMappingSystemId] = useState('');
  // Inline new category form
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParentId, setNewCategoryParentId] = useState('');
  const [newCategoryLevel, setNewCategoryLevel] = useState(3);
  const [newCategoryFullPath, setNewCategoryFullPath] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  const handleOpenReverseMapping = (record: ProjectCategory) => {
    setReverseMappingProject(record);
    setReverseMappingSystemId('');
    setShowNewCategoryForm(false);
    setNewCategoryName('');
    setNewCategoryParentId('');
    setNewCategoryLevel(3);
    setNewCategoryFullPath('');
    setReverseMappingModalVisible(true);
  };

  const handleSaveReverseMapping = async () => {
    if (!reverseMappingProject || !reverseMappingSystemId || !state.selectedProjectId) return;
    const sysCat = state.systemLeafCategories.find(c => c.categoryId === reverseMappingSystemId);
    if (!sysCat) { message.warning('请选择一个系统商品分类'); return; }
    if (state.mappings.some(m => m.systemCategoryId === sysCat.categoryId && m.matchStatus !== '匹配失败')) {
      message.warning('该系统分类已有映射，请先修改或删除现有映射'); return;
    }
    try {
      const newMapping = await createManualMapping({
        systemCategoryId: sysCat.categoryId,
        systemCategoryName: sysCat.name,
        systemCategoryFullPath: sysCat.fullPath,
        systemCategoryLevel: sysCat.level,
        projectCategoryId: reverseMappingProject.projectCategoryId,
        projectCategoryName: reverseMappingProject.name,
        projectCategoryFullPath: reverseMappingProject.fullPath,
        salesProjectId: state.selectedProjectId,
        matchScore: '1.000',
        matchMethod: '手动映射',
        matchStatus: '手动映射',
      });
      dispatch({ type: 'ADD_MAPPING', payload: newMapping });
      setReverseMappingModalVisible(false);
      message.success(`已建立映射：${sysCat.name} → ${reverseMappingProject.name}`);
    } catch (err: any) { message.error('创建映射失败：' + (err?.message || '未知错误')); }
  };

  const handleCreateAndSelectCategory = async () => {
    if (!newCategoryName.trim()) { message.warning('请输入分类名称'); return; }
    setCreatingCategory(true);
    try {
      const created = await createProductCategory({
        name: newCategoryName.trim(),
        parentId: newCategoryParentId || '0',
        level: newCategoryLevel,
        fullPath: newCategoryFullPath || newCategoryName.trim(),
      });
      message.success(`商品分类「${created.name}」已创建`);
      // Refresh system categories
      const data = await getAllProductCategories();
      dispatch({ type: 'SET_SYSTEM_CATEGORIES', payload: data });
      // Auto-select the newly created category
      setReverseMappingSystemId(created.categoryId);
      setShowNewCategoryForm(false);
      setNewCategoryName('');
      setNewCategoryParentId('');
      setNewCategoryFullPath('');
    } catch (err: any) { message.error('创建失败：' + (err?.message || '未知错误')); }
    finally { setCreatingCategory(false); }
  };

  const unmappedProjectColumns: ColumnsType<ProjectCategory> = [
    { title: '分类名称', dataIndex: 'name', width: 180, ellipsis: true },
    { title: '完整路径', dataIndex: 'fullPath', ellipsis: true },
    { title: '层级', dataIndex: 'level', width: 60, align: 'center' },
    { title: '状态', width: 80, align: 'center', render: () => <Tag color="orange">未被映射</Tag> },
    { title: '操作', width: 100, render: (_: any, record: ProjectCategory) => (
        <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => handleOpenReverseMapping(record)}>
          建立映射
        </Button>
      ),
    },
  ];

  const virtualProductColumns: ColumnsType<VirtualProduct> = [
    { title: '选择', width: 50, render: (_: any, r: VirtualProduct) => (
        <Checkbox checked={state.selectedVirtualProductKeys.includes(r.id)} onChange={e => {
          dispatch({ type: 'SET_SELECTED_VP_KEYS', payload: e.target.checked ? [...state.selectedVirtualProductKeys, r.id] : state.selectedVirtualProductKeys.filter(k => k !== r.id) });
        }} />
      ),
    },
    { title: '商品名称', dataIndex: 'name', width: 150, ellipsis: true },
    { title: '系统分类', dataIndex: 'systemCategoryName', width: 180, ellipsis: true },
    { title: '项目分类', dataIndex: 'projectCategoryName', width: 180, ellipsis: true,
      render: (v: string, r: VirtualProduct) => (
        <Select style={{ width: '100%' }} placeholder="选择项目分类" value={r.projectCategoryId || undefined}
          onChange={(val) => handleVpCategoryChange(r.id, val)} showSearch optionFilterProp="children">
          {projectLeafSelectOptions}
        </Select>
      ),
    },
    { title: '映射状态', width: 100, align: 'center', render: (_: any, r: VirtualProduct) => {
        if (!r.projectCategoryId) return <Tag>未设置</Tag>;
        return state.mappings.some(m => m.projectCategoryId === r.projectCategoryId) ? <Tag color="green">已映射</Tag> : <Tag color="red">无映射</Tag>;
      },
    },
    { title: '操作', width: 80, render: (_: any, r: VirtualProduct) => <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteVirtualProduct(r.id)}>删除</Button> },
  ];

  // ---- Render ----
  const projectName = state.salesProjects.find(p => p.projectId === state.selectedProjectId)?.projectName || '';

  return (
    <div>
      {/* ===== Workflow Steps ===== */}
      <Steps current={currentStep} size="small" style={{ marginBottom: 16 }} items={[
        { title: '选择项目', content: '选择销售项目并上传分类表' },
        { title: 'AI解析', content: '上传Excel并智能解析分类结构' },
        { title: '比对映射', content: '算法+AI增强完成分类映射' },
        { title: '审查保存', content: '检查修正并保存最终映射结果' },
      ]} />

      {/* ===== Top Bar ===== */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col flex="220px">
            <Select style={{ width: '100%' }} placeholder="请选择销售项目"
              value={state.selectedProjectId || undefined}
              onChange={val => dispatch({ type: 'SET_SELECTED_PROJECT', payload: String(val) })}
              showSearch optionFilterProp="children">
              {state.salesProjects.map(p => <Select.Option key={p.projectId} value={p.projectId}>{p.projectName}</Select.Option>)}
            </Select>
          </Col>
          <Col flex="auto">
            <Space>
              <Upload accept=".xlsx,.xls" maxCount={1} showUploadList={false}
                beforeUpload={(file) => { handleUploadFile(file); return false; }}
                disabled={!state.selectedProjectId || state.uploadingFile}>
                <Button icon={state.uploadingFile ? <LoadingOutlined /> : <FileExcelOutlined />} disabled={!state.selectedProjectId || state.uploadingFile}>
                  {state.uploadingFile ? '上传中...' : '上传项目分类表'}
                </Button>
              </Upload>
              {!state.aiConfigured && <Tag color="default">未配置AI Key</Tag>}
              {state.aiConfigured && <Button icon={<EditOutlined />} onClick={() => openModal('promptEditor')}>编辑Prompt</Button>}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* ===== Empty State ===== */}
      {!state.selectedProjectId && (
        <Card><Result icon={<SwapOutlined style={{ fontSize: 48 }} />} title="请先选择销售项目" subTitle="选择销售项目后，可上传项目分类表并进行映射比对" /></Card>
      )}

      {state.selectedProjectId && (
        <>
          {/* ===== Stats ===== */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <Card size="small">
                <Statistic title="系统商品分类" value={state.systemLeafCategories.length} suffix={`/ ${state.systemCategories.length}`} styles={{ content: { fontSize: 24 } }} />
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small">
                <Statistic title="项目分类" value={state.projectLeafCategories.length} suffix={`/ ${state.projectCategories.length}`} styles={{ content: { fontSize: 24 } }} />
                {state.projectCategories.length > 0 && (
                  <Space size="small" style={{ marginTop: 8 }} wrap>
                    <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openModal('projectDetail')}>查看详情</Button>
                    <Button size="small" type="link" icon={<DownloadOutlined />} onClick={handleExportProjectCategoriesExcel}>导出</Button>
                    <Upload accept=".xlsx,.xls" showUploadList={false} beforeUpload={handleImportProjectCategoriesExcel}>
                      <Button size="small" type="link" icon={<ImportOutlined />}>导入修正</Button>
                    </Upload>
                    <Button size="small" danger onClick={() => {
                      Modal.confirm({ title: '确认删除', content: '确定清空当前项目的所有分类数据？此操作不可恢复。', onOk: async () => { try { await deleteProjectCategories(state.selectedProjectId); message.success('已清空'); loadProjectCategories(); } catch { message.error('删除失败'); } } });
                    }}>清空</Button>
                  </Space>
                )}
              </Card>
            </Col>
          </Row>

          {/* ===== Mapping Section ===== */}
          <Card title="映射比对" size="small" style={{ marginBottom: 16 }}>
            <Row gutter={[16, 8]} align="middle" style={{ marginBottom: 12 }}>
              <Col flex="auto">
                <Space wrap>
                  <Button type="primary" icon={state.autoMapping ? <LoadingOutlined /> : <ThunderboltOutlined />}
                    onClick={() => handleAutoMap(false)} loading={state.autoMapping}
                    disabled={state.projectLeafCategories.length === 0}>开始比对（纯算法）</Button>
                  <Button icon={state.autoMapping ? <LoadingOutlined /> : <RobotOutlined />}
                    onClick={() => handleAutoMap(true)} loading={state.autoMapping}
                    disabled={state.projectLeafCategories.length === 0 || !state.aiConfigured}>开始比对（AI增强）</Button>
                  <Button icon={<SaveOutlined />} onClick={handleSaveMappings} loading={state.savingMappings}
                    disabled={state.mappings.length === 0}>保存映射</Button>
                  <Button icon={<DownloadOutlined />} onClick={handleExportMappingExcel}
                    disabled={state.mappings.length === 0}>导出Excel</Button>
                  <Upload accept=".xlsx,.xls" maxCount={1} showUploadList={false} beforeUpload={handleImportMappingExcel}>
                    <Button icon={<ImportOutlined />}>导入修正</Button>
                  </Upload>
                  {/* AI Chat toggle button */}
                  {state.mappings.length > 0 && state.aiConfigured && (
                    <Button
                      type={chatPanelVisible ? "primary" : "default"}
                      icon={<RobotOutlined />}
                      onClick={() => setChatPanelVisible(!chatPanelVisible)}
                      style={chatPanelVisible ? { background: '#1677ff', color: '#fff' } : {}}
                    >
                      💬 AI助手{state.mappingChat.messages.length > 0 ? ` (${state.mappingChat.messages.length})` : ''}
                    </Button>
                  )}
                  {/* Manual review button for pending corrections */}
                  {manualReviewList && manualReviewList.corrections.length > 0 && (
                    <Button
                      type="primary"
                      danger
                      icon={<EditOutlined />}
                      onClick={() => setManualReviewModalVisible(true)}
                    >
                      手动复核修正建议 ({manualReviewList.corrections.length})
                    </Button>
                  )}
                </Space>
              </Col>
            </Row>

            {(state.mappingProgressText || unmappedMatchingProgress) && (
              <Alert message={<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><LoadingOutlined style={{ fontSize: 18, color: '#1677ff' }} /><span>{state.mappingProgressText || unmappedMatchingProgress}</span></div>}
                type="info" showIcon={false} style={{ marginBottom: 12, background: 'linear-gradient(135deg, #e6f4ff 0%, #f0f5ff 100%)', border: '1px solid #91caff', borderRadius: 8 }} />
            )}

            {/* Statistics breakdown: clear relationship between numbers */}
            <Row gutter={12} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card size="small" style={{ background: '#f6ffed', border: '1px solid #b7eb8f', textAlign: 'center' }}>
                  <Statistic title="高置信度精准匹配" value={new Set(highConfidenceMapped.map(m => m.systemCategoryId)).size}
                    suffix={<span style={{ fontSize: 13, color: '#999' }}>/ {state.systemLeafCategories.length}</span>}
                    styles={{ content: { fontSize: 22, color: '#3f8600' } }} />
                  <Tag color="green" style={{ marginTop: 4 }}>得分 ≥ 0.65</Tag>
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" style={{ background: '#fffbe6', border: '1px solid #ffe58f', textAlign: 'center' }}>
                  <Statistic title="低置信度需复核" value={new Set(lowConfidenceMapped.map(m => m.systemCategoryId)).size}
                    suffix={<span style={{ fontSize: 13, color: '#999' }}>/ {state.systemLeafCategories.length}</span>}
                    styles={{ content: { fontSize: 22, color: '#fa8c16' } }} />
                  <Tag color="orange" style={{ marginTop: 4 }}>得分 &lt; 0.65</Tag>
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" style={{ background: '#fff2f0', border: '1px solid #ffccc7', textAlign: 'center' }}>
                  <Statistic title="匹配失败" value={new Set(failedMapped.map(m => m.systemCategoryId)).size}
                    suffix={<span style={{ fontSize: 13, color: '#999' }}>/ {state.systemLeafCategories.length}</span>}
                    styles={{ content: { fontSize: 22, color: '#cf1322' } }} />
                  <Tag color="red" style={{ marginTop: 4 }}>无法匹配</Tag>
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" style={{ background: '#f0f0f0', border: '1px solid #d9d9d9', textAlign: 'center' }}>
                  <Statistic title="未映射系统" value={unmappedSystemCats.length}
                    suffix={<span style={{ fontSize: 13, color: '#999' }}>/ {state.systemLeafCategories.length}</span>}
                    styles={{ content: { fontSize: 22, color: '#595959' } }} />
                  <Tag style={{ marginTop: 4 }}>尚无映射记录</Tag>
                </Card>
              </Col>
            </Row>
            {/* Validation row: sum check */}
            {(() => {
              // Count unique systemCategoryIds per group to avoid overlap from duplicate mapping records
              const hc = new Set(highConfidenceMapped.map(m => m.systemCategoryId)).size;
              const lc = new Set(lowConfidenceMapped.map(m => m.systemCategoryId)).size;
              const fc = new Set(failedMapped.map(m => m.systemCategoryId)).size;
              const uc = unmappedSystemCats.length;
              const total = hc + lc + fc + uc;
              const balanced = total === state.systemLeafCategories.length;
              return (
                <Alert
                  type={balanced ? 'success' : 'error'}
                  message={
                    <span style={{ fontSize: 12 }}>
                      高置信度({highConfidenceMapped.length}) + 低置信度({lowConfidenceMapped.length}) + 匹配失败({failedMapped.length}) + 未映射系统({unmappedSystemCats.length}) = <b>{total}</b>
                      {balanced
                        ? <Tag color="success" style={{ marginLeft: 8 }}>✓ = 系统分类总数 {state.systemLeafCategories.length}</Tag>
                        : <Tag color="error" style={{ marginLeft: 8 }}>≠ 系统分类总数 {state.systemLeafCategories.length}（存在数据不一致）</Tag>
                      }
                    </span>
                  }
                  showIcon={false}
                  style={{ marginBottom: 16, padding: '4px 12px' }}
                />
              );
            })()}

            {/* Split layout: Tabs (left) | AI Chat Panel (right, collapsible) */}
            <Row gutter={16}>
              <Col flex="auto" style={{ minWidth: 0 }}>
                <Tabs defaultActiveKey="mapped" items={[
                  { key: 'mapped', label: `全部已映射 (${highConfidenceMapped.length + lowConfidenceMapped.length})`, children: (
                      <Table<CategoryMappingItem> rowKey="id" columns={mappedColumns} dataSource={[...highConfidenceMapped, ...lowConfidenceMapped]} scroll={{ x: 1000 }} size="small"
                        pagination={makePagination('mapped')} />
                    )},
                  { key: 'lowConf', label: <span style={{ color: '#fa8c16' }}>低置信需复核 ({lowConfidenceMapped.length})</span>, children: (
                      <Table<CategoryMappingItem> rowKey="id" columns={mappedColumns} dataSource={lowConfidenceMapped} scroll={{ x: 1000 }} size="small"
                        pagination={makePagination('mapped')} />
                    )},
                  { key: 'failed', label: <span style={{ color: '#cf1322' }}>匹配失败 ({failedMapped.length})</span>, children: (
                      <Table<CategoryMappingItem> rowKey="id" columns={mappedColumns} dataSource={failedMapped} scroll={{ x: 1000 }} size="small"
                        pagination={makePagination('mapped')} />
                    )},
                  { key: 'unmappedSystem', label: `未映射系统分类 (${unmappedSystemCats.length})`, children: (
                      <Table<ProductCategoryItem> rowKey="categoryId" columns={unmappedSystemColumns} dataSource={unmappedSystemCats} scroll={{ x: 800 }} size="small"
                        pagination={makePagination('unmappedSystem')} />
                    )},
                  { key: 'unmappedProject', label: `未被映射项目分类 (${unmappedProjectCats.length})`, children: (
                      <>
                        <Button icon={<RobotOutlined />} size="small" type="primary" style={{ marginBottom: 12 }}
                          onClick={handleAiMatchUnmapped} loading={unmappedMatching}
                          disabled={unmappedProjectCats.length === 0 || state.systemLeafCategories.length === 0 || !state.aiConfigured}>
                          AI 反向匹配
                        </Button>
                        <Table<ProjectCategory> rowKey="projectCategoryId" columns={unmappedProjectColumns} dataSource={unmappedProjectCats} scroll={{ x: 800 }} size="small"
                          pagination={makePagination('unmappedProject')} />
                      </>
                    )},
                ]} />
              </Col>

              {/* AI Chat Side Panel */}
              {chatPanelVisible && state.mappings.length > 0 && state.aiConfigured && (
                <Col style={{ width: 380, transition: 'width 0.3s' }} ref={mappingChatContainerRef}>
                  <div style={{
                    border: '1px solid #e8e8e8', borderRadius: 10, background: '#fafbff',
                    height: '100%', display: 'flex', flexDirection: 'column', minHeight: 420,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  }}>
                    {/* Panel header */}
                    <div style={{
                      padding: '10px 14px', borderBottom: '1px solid #e8e8e8',
                      background: 'linear-gradient(135deg, #f0f5ff 0%, #e6f0ff 100%)',
                      borderRadius: '10px 10px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: 14, color: '#1677ff' }}>
                          <RobotOutlined style={{ marginRight: 6 }} />AI 映射助手
                        </span>
                        <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                          输入修正需求，AI 分析并修正映射
                        </div>
                      </div>
                      <Button type="text" size="small" icon={<span style={{ fontSize: 14 }}>✕</span>}
                        onClick={() => setChatPanelVisible(false)} />
                    </div>

                    {/* Messages area */}
                    <div style={{
                      flex: 1, overflowY: 'auto', padding: '10px 14px',
                      minHeight: 250, maxHeight: 400,
                    }}>
                      {state.mappingChat.messages.length === 0 ? (
                        <div style={{
                          color: '#bbb', fontSize: 13, textAlign: 'center',
                          paddingTop: 80, lineHeight: '22px',
                        }}>
                          <RobotOutlined style={{ fontSize: 32, color: '#d9d9d9', display: 'block', marginBottom: 12 }} />
                          输入修正需求开始对话<br />
                          <span style={{ fontSize: 11, color: '#ccc' }}>如：「检查低置信度映射」</span>
                        </div>
                      ) : (
                        state.mappingChat.messages.map((m, i) => (
                          <div key={i} style={{
                            marginBottom: 10,
                            display: 'flex', flexDirection: 'column',
                            alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
                          }}>
                            <div style={{
                              fontSize: 11, color: '#999', marginBottom: 2,
                              paddingLeft: m.role === 'assistant' ? 4 : 0,
                            }}>
                              {m.role === 'user' ? '你' : 'AI 助手'}
                            </div>
                            <div style={{
                              maxWidth: '90%', padding: '8px 12px', borderRadius: 12,
                              fontSize: 13, lineHeight: '20px', wordBreak: 'break-all',
                              background: m.role === 'user' ? '#1677ff' : '#f0f0f0',
                              color: m.role === 'user' ? '#fff' : '#333',
                              borderBottomRightRadius: m.role === 'user' ? 4 : 12,
                              borderBottomLeftRadius: m.role === 'assistant' ? 4 : 12,
                            }}>
                              {m.content}
                            </div>
                          </div>
                        ))
                      )}
                      {state.mappingChat.loading && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                          <Tag color="green" style={{ fontSize: 11 }}>AI 助手</Tag>
                          <LoadingOutlined style={{ fontSize: 13 }} />
                          <span style={{ fontSize: 12, color: '#999' }}>正在分析...</span>
                        </div>
                      )}
                    </div>

                    {/* Input area */}
                    <div style={{
                      padding: '10px 14px', borderTop: '1px solid #e8e8e8',
                      background: '#fff', borderRadius: '0 0 10px 10px',
                    }}>
                      <Space.Compact style={{ width: '100%' }}>
                        <Input
                          size="small"
                          value={state.mappingChat.input}
                          onChange={e => dispatch({ type: 'MAPPING_CHAT_UPDATE', payload: { input: e.target.value } })}
                          onPressEnter={handleMappingChatSend}
                          placeholder='输入修正需求...'
                          disabled={state.mappingChat.loading}
                          style={{ borderRadius: '6px 0 0 6px' }}
                        />
                        <Button
                          size="small" type="primary"
                          icon={state.mappingChat.loading ? <LoadingOutlined /> : <RobotOutlined />}
                          onClick={handleMappingChatSend}
                          loading={state.mappingChat.loading}
                          style={{ borderRadius: '0 6px 6px 0' }}
                        >
                          发送
                        </Button>
                      </Space.Compact>
                      {state.mappingChat.messages.length > 0 && (
                        <Button size="small" type="link" danger
                          onClick={() => dispatch({ type: 'MAPPING_CHAT_UPDATE', payload: { messages: [], input: '' } })}
                          style={{ marginTop: 4, padding: 0, fontSize: 12 }}>
                          清空对话
                        </Button>
                      )}
                    </div>
                  </div>
                </Col>
              )}
            </Row>
          </Card>

          {/* ===== Virtual Products ===== */}
          <Card size="small" title="项目可售商品设置（虚拟）" style={{ marginBottom: 16 }}
            extra={
              <Space>
                <Button size="small" icon={<PlusOutlined />} onClick={handleAddVirtualProduct}>添加商品</Button>
                <Button size="small" icon={<EditOutlined />} disabled={state.selectedVirtualProductKeys.length === 0}
                  onClick={() => { dispatch({ type: 'SET_BATCH_PROJECT_CATEGORY_ID', payload: '' }); openModal('batchAdjust'); }}>
                  批量调整分类 ({state.selectedVirtualProductKeys.length})
                </Button>
              </Space>
            }>
            {state.virtualProducts.length === 0 ? (
              <Result icon={<ShopOutlined style={{ fontSize: 48 }} />} title="暂无虚拟商品" subTitle="点击「添加商品」按钮创建虚拟商品" />
            ) : (
              <Table<VirtualProduct> rowKey="id" columns={virtualProductColumns} dataSource={state.virtualProducts} scroll={{ x: 900 }} size="small"
                pagination={makePagination('virtualProduct')} />
            )}
          </Card>
        </>
      )}

      {/* ===== Modals ===== */}

      {/* Parse Preview Modal */}
      <Modal title={state.parsePhase === 'result' ? 'AI解析结果预览 - 请核对修正' : 'AI 分类解析 - 请描述解析需求'}
        open={state.modals.preview} width={1100} maskClosable={false}
        onCancel={() => closeModal('preview')}
        footer={state.parsePhase === 'result' ? [
          <Button key="add" icon={<PlusOutlined />} onClick={handlePreviewAdd}>手动添加分类</Button>,
          <Button key="export" icon={<DownloadOutlined />} onClick={handleExportParsedExcel} disabled={state.parsedPreview.length === 0}>导出Excel</Button>,
          <Upload key="import" accept=".xlsx,.xls" maxCount={1} showUploadList={false} beforeUpload={handleImportParsedExcel}><Button icon={<ImportOutlined />}>导入修正</Button></Upload>,
          <Button key="cancel" onClick={() => closeModal('preview')}>取消</Button>,
          <Button key="ok" type="primary" onClick={handleConfirmParsed}>确认保存 ({state.parsedCount} 条)</Button>,
        ] : [
          <Button key="cancel" onClick={() => closeModal('preview')}>取消</Button>,
          <Button key="ok" type="primary" icon={<ThunderboltOutlined />} onClick={handleStartParsing} loading={state.parsingAi} disabled={state.parsingAi || state.parseChat.loading}>开始AI解析</Button>,
        ]}>
        {state.rawExcelData.length > 0 && state.parsePhase !== 'result' && (
          <Alert message={`已上传分类表：${state.rawExcelData.length} 行 × ${state.rawExcelData[0]?.length || 0} 列`} type="info" showIcon style={{ marginBottom: 16 }} />
        )}
        {state.parsePhase === 'parsing' && (
          <div style={{ marginBottom: 16 }}><Progress percent={state.parseProgress} status={state.parseProgress >= 100 ? 'success' : 'active'} format={() => state.parseProgressLabel || `${state.parseProgress}%`} /></div>
        )}
        {state.parsePhase === 'result' && (
          <>
            <Alert message={(() => { const l1Set = new Set<string>(), l2Set = new Set<string>(); state.parsedPreview.forEach((c: any) => { const p = (c.fullPath || '').split('/'); if (p[0]) l1Set.add(p[0]); if (p[0] && p[1]) l2Set.add(p[0] + '/' + p[1]); }); return `AI 解析：${l1Set.size} 个一级分类 · ${l2Set.size} 个二级分类 · ${state.parsedCount} 个末级分类`; })()} type="info" showIcon style={{ marginBottom: 16 }} />
            <Table key={state.previewTableKey} rowKey={(_, i) => String(i)} columns={previewColumns} dataSource={state.parsedPreview} scroll={{ x: 850 }} size="small"
              pagination={{ pageSize: 15, showSizeChanger: true, pageSizeOptions: ['10', '15', '20', '50', '100'], showTotal: t => `共 ${t} 条` }} />
          </>
        )}
        <ChatPanel
          messages={state.parseChat.messages}
          loading={state.parseChat.loading}
          inputValue={state.parseChat.input}
          onInputChange={v => dispatch({ type: 'PARSE_CHAT_UPDATE', payload: { input: v } })}
          onSend={handleChatSend}
          onClear={() => dispatch({ type: 'PARSE_CHAT_UPDATE', payload: { messages: [], input: '' } })}
          title={state.parsePhase === 'chat' ? '💬 与AI对话描述解析需求' : '💬 与AI对话修正解析结果'}
          placeholder={state.parsePhase === 'chat' ? '输入解析需求，如：提取所有末级分类' : '输入修正需求，如：合并第3和第5项'}
          emptyHint={state.parsePhase === 'chat' ? '输入解析需求，如：「提取所有3级末级分类」「只提取食品类分类」' : '输入修正需求，如：「把第3和第5项合并为一类」「检查有没有遗漏的末级分类」'}
          maxHeight={200}
        />
      </Modal>

      {/* Manual Column Modal */}
      <Modal title="手动指定列映射" open={state.modals.manualColumn} width={500}
        onOk={handleManualColumnMapping} onCancel={() => closeModal('manualColumn')} okText="确认解析">
        <Alert message="请手动指定Excel中各层级分类所在的列序号（从0开始）" type="warning" showIcon style={{ marginBottom: 16 }} />
        <Descriptions column={1} size="small">
          {[{ label: '一级分类列序号', val: state.manualL1Column, set: (v: number) => dispatch({ type: 'SET_MANUAL_COLUMNS', payload: { l1: v, l2: state.manualL2Column, l3: state.manualL3Column } }) },
            { label: '二级分类列序号', val: state.manualL2Column, set: (v: number) => dispatch({ type: 'SET_MANUAL_COLUMNS', payload: { l1: state.manualL1Column, l2: v, l3: state.manualL3Column } }) },
            { label: '三级分类列序号', val: state.manualL3Column, set: (v: number) => dispatch({ type: 'SET_MANUAL_COLUMNS', payload: { l1: state.manualL1Column, l2: state.manualL2Column, l3: v } }) },
          ].map(({ label, val, set }) => (
            <Descriptions.Item key={label} label={label}>
              <Select style={{ width: 120 }} value={val} onChange={set}>
                {[0, 1, 2, 3, 4, 5].map(i => <Select.Option key={i} value={i}>第 {i} 列</Select.Option>)}
              </Select>
            </Descriptions.Item>
          ))}
        </Descriptions>
      </Modal>

      {/* Edit Mapping Modal */}
      <Modal title="修改映射" open={state.modals.editMapping} width={500}
        onOk={handleSaveEditMapping} onCancel={() => closeModal('editMapping')} okText="保存">
        {state.editingMapping && (
          <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="系统分类">{state.editingMapping.systemCategoryFullPath}</Descriptions.Item>
            <Descriptions.Item label="当前项目分类">{state.editingMapping.projectCategoryFullPath}</Descriptions.Item>
          </Descriptions>
        )}
        <div style={{ marginBottom: 8, fontWeight: 500 }}>选择新的项目末级分类：</div>
        <Select style={{ width: '100%' }} placeholder="请选择项目末级分类" value={state.editProjectCategoryId || undefined}
          onChange={v => dispatch({ type: 'SET_EDITING_MAPPING', payload: { mapping: state.editingMapping, projectCategoryId: v } })}
          showSearch optionFilterProp="children">{projectLeafSelectOptions}</Select>
      </Modal>

      {/* Edit Category Modal */}
      <Modal title={state.editPreviewIndex >= 0 ? '编辑分类' : '添加分类'} open={state.modals.editPreview} width={500}
        onOk={handlePreviewEditSave} onCancel={() => closeModal('editPreview')} okText="确定">
        {state.editPreviewItem && (
          <Descriptions column={1} size="small" style={{ marginBottom: 16 }} bordered>
            <Descriptions.Item label="分类名称">
              <Input value={state.editPreviewItem.name || ''} onChange={e => dispatch({ type: 'SET_EDIT_PREVIEW', payload: { index: state.editPreviewIndex, item: { ...state.editPreviewItem, name: e.target.value } } })} placeholder="末级分类名称" />
            </Descriptions.Item>
            <Descriptions.Item label="层级">
              <InputNumber min={1} max={10} value={state.editPreviewItem.level || 3} onChange={v => dispatch({ type: 'SET_EDIT_PREVIEW', payload: { index: state.editPreviewIndex, item: { ...state.editPreviewItem, level: v || 3 } } })} style={{ width: '100%' }} />
            </Descriptions.Item>
            <Descriptions.Item label="完整路径">
              <Input value={state.editPreviewItem.fullPath || ''} onChange={e => dispatch({ type: 'SET_EDIT_PREVIEW', payload: { index: state.editPreviewIndex, item: { ...state.editPreviewItem, fullPath: e.target.value } } })} placeholder="一级/二级/末级" />
            </Descriptions.Item>
            <Descriptions.Item label="父分类">
              <Input value={state.editPreviewItem.parentId || ''} onChange={e => dispatch({ type: 'SET_EDIT_PREVIEW', payload: { index: state.editPreviewIndex, item: { ...state.editPreviewItem, parentId: e.target.value } } })} placeholder="上级分类名称" />
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Create Manual Mapping Modal */}
      <Modal title="手动建立映射" open={state.modals.unmappedSystemMapping} width={500}
        onOk={handleSaveUnmappedSystemMapping} onCancel={() => closeModal('unmappedSystemMapping')} okText="创建映射">
        {state.unmappedSystemCategory && (
          <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="系统分类名称">{state.unmappedSystemCategory.name}</Descriptions.Item>
            <Descriptions.Item label="系统分类路径">{state.unmappedSystemCategory.fullPath}</Descriptions.Item>
          </Descriptions>
        )}
        <div style={{ marginBottom: 8, fontWeight: 500 }}>选择项目末级分类：</div>
        <Select style={{ width: '100%' }} placeholder="请选择项目末级分类" value={state.unmappedSystemProjectCategoryId || undefined}
          onChange={v => dispatch({ type: 'SET_UNMAPPED_SYSTEM', payload: { category: state.unmappedSystemCategory, projectCategoryId: v } })}
          showSearch optionFilterProp="children">{projectLeafSelectOptions}</Select>
      </Modal>

      {/* Unified Import Results Modal */}
      {importFullResult && (
        <Modal
          title="导入映射结果"
          open={true}
          width={520}
          onCancel={() => setImportFullResult(null)}
          footer={[
            importFullResult.errors.length > 0 && (
              <Button key="download" icon={<DownloadOutlined />} onClick={() => {
                if (importFullResult.errors.length === 0) return;
                const errData = importFullResult.errors.map(e => ({
                  '行号': e.row, '项目末级名称': e.projectName, '错误原因': e.reason, ...e.data,
                }));
                const headers = ['行号', '项目末级名称', '错误原因', ...Object.keys(importFullResult.errors[0]?.data || {})];
                exportToExcel(errData, headers, `导入失败数据_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`);
                message.success(`已下载 ${importFullResult.errors.length} 条错误数据`);
              }}>
                下载错误数据 ({importFullResult.errors.length} 条)
              </Button>
            ),
            <Button key="close" type="primary" onClick={() => setImportFullResult(null)}>关闭</Button>,
          ].filter(Boolean)}
        >
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Statistic title="更新映射" value={importFullResult.updated}
                valueStyle={{ color: '#1677ff', fontSize: 24 }} />
            </Col>
            <Col span={8}>
              <Statistic title="新建映射" value={importFullResult.created}
                valueStyle={{ color: '#3f8600', fontSize: 24 }} />
            </Col>
            <Col span={8}>
              <Statistic title="失败" value={importFullResult.errors.length}
                valueStyle={{ color: importFullResult.errors.length > 0 ? '#cf1322' : '#3f8600', fontSize: 24 }} />
            </Col>
          </Row>
          {importFullResult.errors.length > 0 && (
            <Alert type="error" showIcon
              message={`${importFullResult.errors.length} 条导入失败，点击「下载错误数据」查看详情`} />
          )}
          {importFullResult.updated + importFullResult.created > 0 && (
            <Alert type="success" showIcon
              message={`成功处理 ${importFullResult.updated + importFullResult.created} 条（更新 ${importFullResult.updated} + 新建 ${importFullResult.created}），已自动保存到数据库`} />
          )}
        </Modal>
      )}

      {/* Reverse Mapping Modal: unmapped project category → select system category */}
      <Modal title="反向建立映射（项目分类 → 系统分类）" open={reverseMappingModalVisible} width={550}
        onOk={handleSaveReverseMapping} onCancel={() => setReverseMappingModalVisible(false)} okText="创建映射">
        {reverseMappingProject && (
          <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="项目分类名称">{reverseMappingProject.name}</Descriptions.Item>
            <Descriptions.Item label="项目分类路径">{reverseMappingProject.fullPath}</Descriptions.Item>
          </Descriptions>
        )}
        <Row justify="space-between" align="middle" style={{ marginBottom: 8 }}>
          <span style={{ fontWeight: 500, color: '#1677ff' }}>选择系统商品分类：</span>
          <Button size="small" type="dashed" icon={<PlusOutlined />}
            onClick={() => setShowNewCategoryForm(!showNewCategoryForm)}>
            {showNewCategoryForm ? '收起' : '新增商品分类'}
          </Button>
        </Row>
        <Select style={{ width: '100%' }} placeholder="搜索并选择系统商品分类"
          value={reverseMappingSystemId || undefined}
          onChange={setReverseMappingSystemId}
          showSearch optionFilterProp="label"
          options={state.systemLeafCategories
            .filter(c => !state.mappings.some(m => m.systemCategoryId === c.categoryId && m.matchStatus !== '匹配失败'))
            .map(c => ({ label: c.fullPath || c.name, value: c.categoryId }))} />

        {/* Inline new category form */}
        {showNewCategoryForm && (
          <Card size="small" style={{ marginTop: 12, background: '#fafafa', border: '1px dashed #d9d9d9' }}>
            <Row gutter={[8, 8]}>
              <Col span={12}>
                <div style={{ fontSize: 12, marginBottom: 2 }}>分类名称 *</div>
                <Input size="small" placeholder="末级分类名" value={newCategoryName}
                  onChange={e => { setNewCategoryName(e.target.value); if (!newCategoryFullPath) setNewCategoryFullPath(e.target.value); }} />
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 12, marginBottom: 2 }}>层级</div>
                <InputNumber size="small" min={1} max={5} value={newCategoryLevel}
                  onChange={v => setNewCategoryLevel(v || 3)} style={{ width: '100%' }} />
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 12, marginBottom: 2 }}>父级ID</div>
                <Input size="small" placeholder="上级分类ID（可选）" value={newCategoryParentId}
                  onChange={e => setNewCategoryParentId(e.target.value)} />
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 12, marginBottom: 2 }}>完整路径</div>
                <Input size="small" placeholder="如：一级/二级/末级" value={newCategoryFullPath}
                  onChange={e => setNewCategoryFullPath(e.target.value)} />
              </Col>
            </Row>
            <Button type="primary" size="small" icon={<PlusOutlined />} loading={creatingCategory}
              onClick={handleCreateAndSelectCategory} style={{ marginTop: 10 }}>
              创建并选中此分类
            </Button>
          </Card>
        )}
        <Alert style={{ marginTop: 12 }} type="info" showIcon
          message="只显示尚未建立有效映射的系统分类。如找不到匹配的分类，可点击「新增商品分类」直接创建。" />
      </Modal>

      {/* Batch Adjust Modal */}
      <Modal title="批量调整项目分类" open={state.modals.batchAdjust} width={500}
        onOk={handleBatchCategoryChange} onCancel={() => closeModal('batchAdjust')} okText={`调整 ${state.selectedVirtualProductKeys.length} 个商品`}>
        <Alert message={`已选择 ${state.selectedVirtualProductKeys.length} 个商品`} type="info" showIcon style={{ marginBottom: 16 }} />
        <div style={{ marginBottom: 8, fontWeight: 500 }}>选择目标项目分类：</div>
        <Select style={{ width: '100%' }} placeholder="请选择项目末级分类" value={state.batchProjectCategoryId || undefined}
          onChange={v => dispatch({ type: 'SET_BATCH_PROJECT_CATEGORY_ID', payload: v })} showSearch optionFilterProp="children">{projectLeafSelectOptions}</Select>
      </Modal>

      {/* Prompt Editor Modal */}
      <Modal title="编辑 Prompt - AI解析规则" open={state.modals.promptEditor} width={900}
        onCancel={() => { closeModal('promptEditor'); dispatch({ type: 'PROMPT_CHAT_UPDATE', payload: { messages: [], input: '' } }); }}
        footer={[
          <Button key="reset-parse" onClick={() => { dispatch({ type: 'SET_CUSTOM_PARSE_PROMPT', payload: DEFAULT_PARSE_PROMPT_RULES }); message.info('已恢复默认'); }}>恢复分类解析默认</Button>,
          <Button key="reset-mapping" onClick={() => { dispatch({ type: 'SET_CUSTOM_MAPPING_PROMPT', payload: DEFAULT_MAPPING_PROMPT_RULES }); message.info('已恢复默认'); }}>恢复映射比对默认</Button>,
          <Button key="cancel" onClick={() => { closeModal('promptEditor'); dispatch({ type: 'PROMPT_CHAT_UPDATE', payload: { messages: [], input: '' } }); }}>关闭</Button>,
          <Button key="save" type="primary" onClick={() => { closeModal('promptEditor'); dispatch({ type: 'PROMPT_CHAT_UPDATE', payload: { messages: [], input: '' } }); message.success('Prompt已保存'); }}>保存并关闭</Button>,
        ]}>
        <Alert message="直接编辑AI使用的Prompt规则内容。修改后将替换默认规则，留空则使用默认规则。" type="info" showIcon style={{ marginBottom: 16 }} />
        <Tabs items={[
          { key: 'parse', label: '分类解析 Prompt', children: (
              <div>
                <Input.TextArea value={state.customParsePrompt} onChange={e => dispatch({ type: 'SET_CUSTOM_PARSE_PROMPT', payload: e.target.value })} rows={10} style={{ marginBottom: 12, fontFamily: 'monospace' }} />
                <div style={{ fontSize: 12, color: '#999' }}>{state.customParsePrompt === DEFAULT_PARSE_PROMPT_RULES ? '当前使用默认规则' : `已修改规则：${state.customParsePrompt.length} 字`}</div>
              </div>
            )},
          { key: 'mapping', label: '映射比对 Prompt', children: (
              <div>
                <Input.TextArea value={state.customMappingPrompt} onChange={e => dispatch({ type: 'SET_CUSTOM_MAPPING_PROMPT', payload: e.target.value })} rows={10} style={{ marginBottom: 12, fontFamily: 'monospace' }} />
                <div style={{ fontSize: 12, color: '#999' }}>{state.customMappingPrompt === DEFAULT_MAPPING_PROMPT_RULES ? '当前使用默认规则' : `已修改规则：${state.customMappingPrompt.length} 字`}</div>
              </div>
            )},
        ]} />
        <ChatPanel
          messages={state.promptChat.messages}
          loading={state.promptChat.loading}
          inputValue={state.promptChat.input}
          onInputChange={v => dispatch({ type: 'PROMPT_CHAT_UPDATE', payload: { input: v } })}
          onSend={handlePromptChatSend}
          onClear={() => dispatch({ type: 'PROMPT_CHAT_UPDATE', payload: { messages: [], input: '' } })}
          title="💬 与AI小助手对话优化Prompt"
          placeholder="描述需求，如：帮我优化这个Prompt"
          emptyHint="描述你的需求，AI小助手帮你优化Prompt"
          maxHeight={180}
        />
      </Modal>

      {/* Manual Review Modal — table list with batch selection */}
      {manualReviewList && (
        <Modal
          title={`手动复核 AI 修正建议（共 ${manualReviewList.corrections.length} 条）`}
          open={manualReviewModalVisible}
          width={900}
          maskClosable={false}
          onCancel={() => { setManualReviewModalVisible(false); setManualReviewList(null); }}
          footer={[
            <Button key="selectAll" onClick={() => {
              setManualReviewList(prev => prev ? {
                ...prev,
                selectedNames: new Set(prev.corrections.map(c => c.systemCategoryName)),
              } : null);
            }}>全选</Button>,
            <Button key="deselectAll" onClick={() => {
              setManualReviewList(prev => prev ? { ...prev, selectedNames: new Set() } : null);
            }}>取消全选</Button>,
            <Button key="skip" onClick={() => { setManualReviewModalVisible(false); setManualReviewList(null); }}>
              全部跳过
            </Button>,
            <Button key="apply" type="primary" onClick={() => {
              if (!manualReviewList || manualReviewList.selectedNames.size === 0) {
                message.warning('请至少选择一条修正建议'); return;
              }
              const projectLeafMap = new Map(state.projectLeafCategories.map(c => [c.name, c]));
              let count = 0;
              const updated = state.mappings.map(m => {
                if (!manualReviewList.selectedNames.has(m.systemCategoryName)) return m;
                const item = manualReviewList.corrections.find(c => c.systemCategoryName === m.systemCategoryName);
                if (!item) return m;
                const targetCat = projectLeafMap.get(item.newProjectCategoryName)
                  || state.projectLeafCategories.find(c => c.name.includes(item.newProjectCategoryName) || item.newProjectCategoryName.includes(c.name));
                if (!targetCat) return m;
                count++;
                return { ...m, projectCategoryId: targetCat.projectCategoryId, projectCategoryName: targetCat.name, projectCategoryFullPath: targetCat.fullPath, matchScore: '0.850', matchMethod: 'AI对话修正', matchStatus: 'AI匹配' };
              });
              if (count > 0) {
                dispatch({ type: 'SET_MAPPINGS', payload: updated });
                message.success(`已批量应用 ${count} 条修正`);
              }
              setManualReviewModalVisible(false);
              setManualReviewList(null);
            }}>
              批量应用选中 ({manualReviewList.selectedNames.size} 条)
            </Button>,
          ]}
        >
          <Alert message={`共 ${manualReviewList.corrections.length} 条修正建议，勾选需要应用的项后点击「批量应用选中」`} type="info" showIcon style={{ marginBottom: 12 }} />
          <Table
            rowKey="systemCategoryName"
            size="small"
            dataSource={manualReviewList.corrections}
            scroll={{ y: 450 }}
            pagination={false}
            rowSelection={{
              selectedRowKeys: Array.from(manualReviewList.selectedNames),
              onChange: (keys) => {
                setManualReviewList(prev => prev ? { ...prev, selectedNames: new Set(keys as string[]) } : null);
              },
            }}
            columns={[
              { title: '系统分类', dataIndex: 'systemCategoryName', width: 200, ellipsis: true },
              {
                title: 'AI 建议映射到', dataIndex: 'newProjectCategoryName', width: 200,
                render: (v: string) => <Tag color="blue">{v}</Tag>,
              },
              { title: '原因', dataIndex: 'reason', ellipsis: true,
                render: (v: string) => <span style={{ color: '#999', fontSize: 12 }}>{v}</span>,
              },
            ]}
          />
        </Modal>
      )}

      {/* Project Detail Modal */}
      <Modal title={`项目分类详情 - ${projectName}`} open={state.modals.projectDetail} width={900}
        onCancel={() => closeModal('projectDetail')}
        footer={[
          <Button key="export" icon={<DownloadOutlined />} onClick={handleExportProjectCategoriesExcel}>导出Excel</Button>,
          <Upload key="import" accept=".xlsx,.xls" showUploadList={false} beforeUpload={handleImportProjectCategoriesExcel}><Button icon={<ImportOutlined />}>导入修正</Button></Upload>,
          <Button key="close" onClick={() => closeModal('projectDetail')}>关闭</Button>,
        ]}>
        {state.projectCategories.length > 0 && (() => {
          const l1Set = new Set<string>(), l2Set = new Set<string>();
          state.projectCategories.forEach(c => { const p = (c.fullPath || '').split('/'); if (p[0]) l1Set.add(p[0]); if (p[0] && p[1]) l2Set.add(p[0] + '/' + p[1]); });
          return <Alert message={`共 ${l1Set.size} 个一级类目 · ${l2Set.size} 个二级分类 · ${state.projectLeafCategories.length} 个末级分类（总计 ${state.projectCategories.length} 条）`} type="info" showIcon style={{ marginBottom: 12 }} />;
        })()}
        <Table dataSource={state.projectCategories} rowKey="projectCategoryId" size="small"
          pagination={{ pageSize: 15, showSizeChanger: true, showTotal: t => `共 ${t} 条` }} scroll={{ y: 500 }}
          columns={[
            { title: '分类名称', dataIndex: 'name', width: 180, ellipsis: true },
            { title: '层级', dataIndex: 'level', width: 60, align: 'center' as const },
            { title: '完整路径', dataIndex: 'fullPath', ellipsis: true },
            { title: '是否末级', dataIndex: 'isLeaf', width: 80, align: 'center' as const, render: (v: boolean) => v ? <Tag color="green">是</Tag> : <Tag>否</Tag> },
          ]} />
      </Modal>
    </div>
  );
};

export default CategoryMappingPage;
