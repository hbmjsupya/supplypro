const STORAGE_KEY = 'supplypro_ai_configs';

interface AiConfig {
    provider: string;
    providerKey: string;
    apiKey: string;
    baseUrl: string;
    model: string;
    isPrimary: boolean;
    scenario: string;
    createdBy: string;
    createdAt: string;
}

export function getAiConfigs(): AiConfig[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        
        let parsed = JSON.parse(raw);
        
        if (Array.isArray(parsed)) {
            parsed = parsed.map((config: any) => {
                if (!config.providerKey) return null;
                if (config.providerKey === 'admin' || config.provider === 'admin') return null;
                return {
                    ...config,
                    isPrimary: config.isPrimary ?? false,
                    scenario: config.scenario ?? '',
                    model: config.model ?? '',
                    createdBy: config.createdBy ?? '',
                };
            }).filter(Boolean);
        }
        
        return parsed;
    } catch {
        return [];
    }
}

export function getActiveAiConfig(): AiConfig | null {
    const configs = getAiConfigs();
    const primary = configs.find(c => c.isPrimary);
    return primary || (configs.length > 0 ? configs[0] : null);
}

export function getAiConfigByProvider(providerKey: string): AiConfig | null {
    const configs = getAiConfigs();
    return configs.find(c => c.providerKey === providerKey) || null;
}

export function getAiConfigByScenario(scenario: string): AiConfig | null {
    const configs = getAiConfigs();
    const scenarioConfig = configs.find(c => c.scenario === scenario && c.isPrimary);
    return scenarioConfig || getActiveAiConfig();
}

interface AiMappingItem {
    index: number;
    oldL1: string;
    oldL2: string;
    oldL3: string;
}

interface AiMappingResult {
    index: number;
    newL3: string;
}

async function callAiProxy(config: AiConfig, messages: { role: string; content: string }[], temperature: number = 0.1, maxTokens: number = 4096, signal?: AbortSignal): Promise<any> {
    
    const response = await fetch('/api/ai/proxy', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            providerKey: config.providerKey,
            apiKey: config.apiKey,
            baseUrl: config.baseUrl,
            model: config.model,
            messages,
            temperature,
            max_tokens: maxTokens,
        }),
        signal,
    });

    const result = await response.json();

    if (result.code !== 200) {
        throw new Error(result.message || `AI API 调用失败: ${response.status}`);
    }

    return result.data;
}

export async function callAiForMapping(
    items: AiMappingItem[],
    newL3List: string[],
    onProgress?: (current: number, total: number) => void,
    providerKey?: string
): Promise<AiMappingResult[]> {
    const config = providerKey ? getAiConfigByProvider(providerKey) : getAiConfigByScenario('category-mapping');
    if (!config) throw new Error('未配置AI Key，请先在「AI Key 配置」页面添加');

    const results: AiMappingResult[] = [];
    const batchSize = 100;

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await callAiBatch(config, batch, newL3List);
        results.push(...batchResults);
        onProgress?.(Math.min(i + batchSize, items.length), items.length);
    }

    return results;
}

async function callAiBatch(
    config: AiConfig,
    items: AiMappingItem[],
    newL3List: string[]
): Promise<AiMappingResult[]> {
    const categoriesStr = newL3List.map((l3, i) => `${i + 1}. ${l3}`).join('\n');
    const itemsStr = items.map((item, i) =>
        `[${item.index}] ${item.oldL1} > ${item.oldL2} > ${item.oldL3}`
    ).join('\n');

    const prompt = `你是电商类目映射专家，精通商品分类逻辑。请根据词义和电商常识，为以下旧类目找到最匹配的新三级类目。
【可选的新三级类目列表】${categoriesStr}

【需要映射的旧类目（三级路径）${itemsStr}

【规则】1. 理解旧类目的真实商品含义，不要被单字误导（如"炭包/净化剂"是除味产品不是菜），洗面奶是护肤品不是食品）2. 从可选类目中选择语义最匹配的一个3. 如实在无法匹配，newL3 设为"无匹配"

请严格返回以下JSON格式，不要加任何解释。\`\`\`json
[
  {"index": ${items[0].index}, "newL3": "选中的新类目"},
  {"index": ${items[1].index}, "newL3": "选中的新类目"}
]
\`\`\``;

    const data = await callAiProxy(config, [
        { role: 'system', content: '你是一个专业的电商类目映射助手，只返回JSON格式结果。' },
        { role: 'user', content: prompt },
    ]);

    const content = data.choices?.[0]?.message?.content
        || data.choices?.[0]?.message?.reasoning_content
        || '';

    let cleaned = content
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/, '')
        .trim();

    let jsonStr = '';
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
        jsonStr = jsonMatch[0];
    } else {
        jsonStr = cleaned;
    }

    try {
        const parsed = JSON.parse(jsonStr) as AiMappingResult[];
        return parsed.map(r => ({ index: r.index, newL3: r.newL3 }));
    } catch {
        const completed = completeJsonForArray(jsonStr);
        if (completed) {
            try {
                const parsed = JSON.parse(completed) as AiMappingResult[];
                return parsed.map(r => ({ index: r.index, newL3: r.newL3 }));
            } catch {}
        }
        const preview = content.substring(0, 300).replace(/\n/g, ' ');
        throw new Error(`AI返回格式解析失败: ${preview || '(空响应)'}`);
    }
}

function completeJsonForArray(truncated: string): string | null {
    let s = truncated.trim();
    if (!s.startsWith('[')) return null;

    let openBrackets = 0;
    let openBraces = 0;
    let inString = false;
    let escape = false;

    for (const ch of s) {
        if (escape) { escape = false; continue; }
        if (ch === '\\') { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === '[') openBrackets++;
        if (ch === ']') openBrackets--;
        if (ch === '{') openBraces++;
        if (ch === '}') openBraces--;
    }

    while (openBraces > 0) { s += '}'; openBraces--; }
    while (openBrackets > 0) { s += ']'; openBrackets--; }

    if (s.endsWith(',')) {
        s = s.slice(0, -1);
    }

    return s !== truncated.trim() ? s : null;
}

interface NormalizedCategoryRow {
    l1: string;
    l2: string;
    l3: string;
}

function isHeaderKeyword(s: string): boolean {
    if (!s) return false;
    const t = s.trim();
    return ['一级类目', '二级分类', '三级细分', '二级类目', '三级类目', '末级分类', '末级类目', '一级分类', '序号'].includes(t);
}

export function normalizeCategoryTableData(rawData: any[][]): NormalizedCategoryRow[] {
    if (rawData.length === 0) return [];

    const maxCols = Math.max(...rawData.map(r => Array.isArray(r) ? r.length : 0));

    console.log('[CategoryParser] normalizeCategoryTableData: rows=' + rawData.length + ' maxCols=' + maxCols);
    for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i] || [];
        const cells: string[] = [];
        for (let j = 0; j < Math.min(row.length, 30); j++) {
            const s = String(row[j] || '').trim();
            if (s) cells.push(`[${j}]=${s.substring(0, 40)}`);
        }
        console.log(`[CategoryParser]   Row ${i}: ${cells.join(', ') || '(empty)'}`);
    }

    if (maxCols <= 5) {
        const result: NormalizedCategoryRow[] = [];
        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i] || [];
            const l3 = String(row[2] || '').trim();
            if (l3 && !isHeaderKeyword(l3)) {
                result.push({
                    l1: String(row[0] || '').trim(),
                    l2: String(row[1] || '').trim(),
                    l3,
                });
            }
        }
        console.log('[CategoryParser] normalizeCategoryTableData: simple layout, result=' + result.length);
        return result;
    }

    const colsPerGroup = maxCols % 3 === 0 ? 3 : (maxCols % 2 === 0 ? 2 : 3);
    const numGroups = Math.floor(maxCols / colsPerGroup);
    console.log('[CategoryParser] colsPerGroup=' + colsPerGroup + ' numGroups=' + numGroups);

    const headerKeywordsL2 = ['二级分类', '二级类目'];
    const headerKeywordsL3 = ['三级细分', '三级类目', '末级分类', '末级类目'];

    let headerRowIdx = -1;
    let l2ColOffset = -1;
    let l3ColOffset = -1;

    for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i] || [];
        let foundL2 = false;
        let foundL3 = false;
        let l2Col = -1;
        let l3Col = -1;
        let headerMatchCount = 0;

        for (let g = 0; g < numGroups; g++) {
            const base = g * colsPerGroup;
            for (let c = 0; c < colsPerGroup; c++) {
                const val = String(row[base + c] || '').trim();
                if (!val) continue;
                if (!foundL2 && headerKeywordsL2.some(kw => val === kw || val.startsWith(kw) && val.length <= kw.length + 2)) {
                    l2Col = c;
                    foundL2 = true;
                    headerMatchCount++;
                }
                if (!foundL3 && headerKeywordsL3.some(kw => val === kw || val.startsWith(kw) && val.length <= kw.length + 2)) {
                    l3Col = c;
                    foundL3 = true;
                    headerMatchCount++;
                }
            }
            if (foundL2 && foundL3) break;
        }

        if ((foundL2 || foundL3) && headerMatchCount >= 2) {
            l2ColOffset = l2Col;
            l3ColOffset = l3Col;
            headerRowIdx = i;
            break;
        }
    }

    if (l2ColOffset < 0) l2ColOffset = colsPerGroup >= 3 ? 1 : 0;
    if (l3ColOffset < 0) l3ColOffset = colsPerGroup >= 3 ? 2 : 1;

    console.log('[CategoryParser] headerRowIdx=' + headerRowIdx + ' l2ColOffset=' + l2ColOffset + ' l3ColOffset=' + l3ColOffset);

    let l1RowIdx = -1;
    let l1ColOffset = 0;

    if (headerRowIdx > 0) {
        for (let i = headerRowIdx - 1; i >= Math.max(0, headerRowIdx - 5); i--) {
            const row = rawData[i] || [];
            let groups = 0;
            let detectedOffset = -1;
            for (let g = 0; g < numGroups; g++) {
                const base = g * colsPerGroup;
                for (let c = 0; c < colsPerGroup; c++) {
                    const name = String(row[base + c] || '').trim();
                    if (name && name.length > 1 && !isHeaderKeyword(name)) {
                        groups++;
                        if (detectedOffset < 0) detectedOffset = c;
                        break;
                    }
                }
            }
            if (groups >= 2) {
                l1RowIdx = i;
                l1ColOffset = detectedOffset;
                break;
            }
        }
    }

    if (l1RowIdx < 0) {
        for (let i = 0; i < rawData.length; i++) {
            if (i === headerRowIdx) continue;
            const row = rawData[i] || [];
            let groups = 0;
            let detectedOffset = -1;
            for (let g = 0; g < numGroups; g++) {
                const base = g * colsPerGroup;
                for (let c = 0; c < colsPerGroup; c++) {
                    const name = String(row[base + c] || '').trim();
                    if (name && name.length > 1 && !isHeaderKeyword(name)) {
                        groups++;
                        if (detectedOffset < 0) detectedOffset = c;
                        break;
                    }
                }
            }
            if (groups >= 2) {
                l1RowIdx = i;
                l1ColOffset = detectedOffset;
                break;
            }
        }
    }

    console.log('[CategoryParser] l1RowIdx=' + l1RowIdx + ' l1ColOffset=' + l1ColOffset);

    if (l1RowIdx < 0) {
        console.log('[CategoryParser] normalizeCategoryTableData: could not find l1 row');
        return [];
    }

    const l1Row = rawData[l1RowIdx] || [];
    const l1Names: string[] = [];
    for (let g = 0; g < numGroups; g++) {
        const base = g * colsPerGroup;
        const name = String(l1Row[base + l1ColOffset] || '').trim();
        if (name && !isHeaderKeyword(name)) {
            l1Names.push(name);
        }
    }

    console.log('[CategoryParser] l1Names: ' + JSON.stringify(l1Names));

    if (l1Names.length === 0) {
        console.log('[CategoryParser] normalizeCategoryTableData: no l1 names found');
        return [];
    }

    const result: NormalizedCategoryRow[] = [];
    const dataStartRow = headerRowIdx >= 0 ? headerRowIdx + 1 : l1RowIdx + 1;
    console.log('[CategoryParser] dataStartRow=' + dataStartRow + ' l2ColOffset=' + l2ColOffset + ' l3ColOffset=' + l3ColOffset);

    for (let rowIdx = dataStartRow; rowIdx < rawData.length; rowIdx++) {
        const row = rawData[rowIdx] || [];
        let rowItems = 0;
        for (let groupIdx = 0; groupIdx < l1Names.length; groupIdx++) {
            const colStart = groupIdx * colsPerGroup;
            const l2 = String(row[colStart + l2ColOffset] || '').trim();
            const l3 = String(row[colStart + l3ColOffset] || '').trim();
            if (l3 && !isHeaderKeyword(l3)) {
                result.push({ l1: l1Names[groupIdx], l2, l3 });
                rowItems++;
            }
        }
        if (rowItems === 0) {
            const nonEmpty = row.filter((c: any) => String(c || '').trim()).length;
            if (nonEmpty > 0) {
                console.log(`[CategoryParser]   Row ${rowIdx}: 0 items extracted but ${nonEmpty} non-empty cells. Sample: ` + row.slice(0, 9).map((c: any, j: number) => `${j}=${String(c || '').trim().substring(0, 20)}`).join(', '));
            }
        } else {
            console.log(`[CategoryParser]   Row ${rowIdx}: ${rowItems} items extracted`);
        }
    }

    console.log('[CategoryParser] normalizeCategoryTableData: multi-column layout, result=' + result.length);
    return result;
}

function buildPreExtractedItems(rawData: any[][]): { l1: string; l2: string; l3: string; fullPath: string }[] {
    const normalized = normalizeCategoryTableData(rawData);

    if (normalized.length > 0) {
        const items: { l1: string; l2: string; l3: string; fullPath: string }[] = [];
        let lastL2ByGroup: Record<string, string> = {};
        for (const row of normalized) {
            if (!row.l3) continue;
            const groupKey = row.l1;
            if (row.l2) {
                lastL2ByGroup[groupKey] = row.l2;
            }
            const effectiveL2 = row.l2 || lastL2ByGroup[groupKey] || '';
            const l3Display = row.l3.replace(/\r?\n/g, ' | ');
            items.push({
                l1: row.l1,
                l2: effectiveL2,
                l3: row.l3,
                fullPath: `${row.l1}/${effectiveL2}/${l3Display}`,
            });
        }
        console.log('[CategoryParser] buildPreExtractedItems: normalized rows=', normalized.length, 'cell-items=', items.length);
        if (items.length > 0) {
            console.log('[CategoryParser] === 诊断日志：预提取单元格列表===');
            items.forEach((item, i) => {
                const hasMulti = item.l3.includes('\n');
                console.log(`[CategoryParser]   单元格{i + 1}: ${item.l1}/${item.l2}/${hasMulti ? item.l3.replace(/\r?\n/g, ' | ') : item.l3}${hasMulti ? ' (含多行)' : ''}`);
            });
            console.log('[CategoryParser] === 诊断日志结束 ===');
        }
        return items;
    }

    console.log('[CategoryParser] buildPreExtractedItems: normalizeCategoryTableData returned empty, trying raw cell extraction');

    const maxCols = Math.max(...rawData.map(r => Array.isArray(r) ? r.length : 0));
    if (maxCols <= 5) return [];

    const colsPerGroup = maxCols % 3 === 0 ? 3 : (maxCols % 2 === 0 ? 2 : 3);
    const numGroups = Math.floor(maxCols / colsPerGroup);

    let l1RowIdx = -1;
    let l1ColOffset = 0;
    const l1Names: string[] = [];

    for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i] || [];
        let groups = 0;
        const names: string[] = [];
        let detectedOffset = -1;

        for (let g = 0; g < numGroups; g++) {
            const base = g * colsPerGroup;
            let foundName = '';
            for (let c = 0; c < colsPerGroup; c++) {
                const name = String(row[base + c] || '').trim();
                if (name && name.length > 1 && !isHeaderKeyword(name)) {
                    foundName = name;
                    if (detectedOffset < 0) detectedOffset = c;
                    break;
                }
            }
            names.push(foundName);
            if (foundName) groups++;
        }

        if (groups >= 2) {
            l1RowIdx = i;
            l1ColOffset = detectedOffset || 0;
            l1Names.push(...names.filter(n => n));
            break;
        }
    }

    if (l1RowIdx < 0 || l1Names.length === 0) {
        console.warn('[CategoryParser] buildPreExtractedItems: raw cell extraction also failed');
        return [];
    }

    console.log('[CategoryParser] Raw cell extraction: l1RowIdx=', l1RowIdx, 'l1Names=', JSON.stringify(l1Names));

    let l2ColOffset = colsPerGroup >= 3 ? 1 : 0;
    let l3ColOffset = colsPerGroup >= 3 ? 2 : 1;

    if (l1RowIdx + 1 < rawData.length) {
        const nextRow = rawData[l1RowIdx + 1] || [];
        for (let c = 0; c < colsPerGroup; c++) {
            const val = String(nextRow[c] || '').trim();
            if (val.includes('二级') || val.includes('分类')) l2ColOffset = c;
            if (val.includes('三级') || val.includes('细分') || val.includes('末级')) l3ColOffset = c;
        }
    }

    let dataStartRow = l1RowIdx + 1;
    if (dataStartRow < rawData.length) {
        const firstDataRow = rawData[dataStartRow] || [];
        const hasHeaderKeywords = firstDataRow.some((c: any) => isHeaderKeyword(String(c || '')));
        if (hasHeaderKeywords) dataStartRow++;
    }

    const items: { l1: string; l2: string; l3: string; fullPath: string }[] = [];
    let lastL2ByGroup: Record<string, string> = {};

    for (let rowIdx = dataStartRow; rowIdx < rawData.length; rowIdx++) {
        const row = rawData[rowIdx] || [];
        for (let groupIdx = 0; groupIdx < l1Names.length; groupIdx++) {
            const colStart = groupIdx * colsPerGroup;
            const l2 = String(row[colStart + l2ColOffset] || '').trim();
            const l3 = String(row[colStart + l3ColOffset] || '').trim();
            if (l3 && !isHeaderKeyword(l3)) {
                if (l2) lastL2ByGroup[l1Names[groupIdx]] = l2;
                const effectiveL2 = l2 || lastL2ByGroup[l1Names[groupIdx]] || '';
                const l3Display = l3.replace(/\r?\n/g, ' | ');
                items.push({
                    l1: l1Names[groupIdx],
                    l2: effectiveL2,
                    l3,
                    fullPath: `${l1Names[groupIdx]}/${effectiveL2}/${l3Display}`,
                });
            }
        }
    }

    console.log('[CategoryParser] buildPreExtractedItems: raw cell extraction, items=', items.length);
    if (items.length > 0) {
        console.log('[CategoryParser] === 诊断日志：预提取单元格列表（raw fallback）==');
        items.forEach((item, i) => {
            const hasMulti = item.l3.includes('\n');
            console.log(`[CategoryParser]   单元格{i + 1}: ${item.l1}/${item.l2}/${hasMulti ? item.l3.replace(/\r?\n/g, ' | ') : item.l3}${hasMulti ? ' (含多行)' : ''}`);
        });
        console.log('[CategoryParser] === 诊断日志结束 ===');
    }

    return items;
}

export async function callAiForRefiningCategoryTable(
    currentCategories: any[],
    conversationHistory: { role: string; content: string }[]
): Promise<{ categories: any[]; explanation: string }> {
    const config = getAiConfigByScenario('category-mapping');
    if (!config) throw new Error('未配置AI Key');

    const historyStr = conversationHistory
        .map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`)
        .join('\n');

    const compactCategories = currentCategories.map((c: any) => ({
        name: c.name || c,
        fullPath: c.fullPath || '',
        level: c.level || 3,
        parentId: c.parentId || '',
    }));

    const prompt = `以下是Excel分类表解析结果的修正对话。根据用户指令修改分类列表，并解释你做了哪些修改。
【当前分类列表】（共{currentCategories.length}条）
${JSON.stringify(compactCategories)}

【对话记录】${historyStr}

请根据用户指令修改分类列表（合并、拆分、重命名、删除、新增、调整层级路径），并说明修改原因。
【重要规则】1. categories数组的长度必须与你声称的末级分类数量完全一致2. 不要包含重复的分类名称3. 每个分类的fullPath必须完整，格式为"一级/二级/末级"
4. 如果用户要求去除括号及括号内内容，请按要求处理
【输出】只返回JSON，含\`\`\`json】\`\`\`json
{
  "explanation": "简要说明做了哪些修改以及为什么（1-2句话）",
  "categories": [
    { "name": "末级分类名", "level": 3, "fullPath": "一级/二级/末级", "isLeaf": true, "parentId": "父级名称" }
  ]
}
\`\`\``;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);
    try {
        const data = await callAiProxy(config, [
            { role: 'system', content: '你是一个专业的Excel分类表解析专家，根据用户反馈修正解析结果。只返回JSON。' },
            { role: 'user', content: prompt },
        ], 0.1, 32768, controller.signal);
        clearTimeout(timeoutId);

        const content = data.choices?.[0]?.message?.content
            || data.choices?.[0]?.message?.reasoning_content
            || '';

        let cleaned = content
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```\s*$/, '')
            .trim();

        let jsonStr = '';
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonStr = jsonMatch[0];
        } else {
            jsonStr = cleaned;
        }

        const tryParse = (str: string): any | null => {
            try { return JSON.parse(str); } catch { return null; }
        };

        let parsed = tryParse(jsonStr);
        if (!parsed) {
            const completed = completeJson(jsonStr);
            if (completed) {
                parsed = tryParse(completed);
            }
        }

        if (parsed && parsed.categories) {
            return {
                categories: parsed.categories,
                explanation: parsed.explanation || '',
            };
        }

        const preview = content.substring(0, 300).replace(/\n/g, ' ');
        throw new Error(`AI修正格式解析失败: ${preview || '(空响应)'}`);
    } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            throw new Error('AI修正超时（120秒）');
        }
        throw err;
    }
}

export async function callAiForPreParsingChat(
    rawData: any[][],
    conversationHistory: { role: string; content: string }[]
): Promise<string> {
    const config = getAiConfigByScenario('category-mapping');
    if (!config) throw new Error('未配置AI Key');

    const isFirstCall = conversationHistory.length === 0;

    // Build data context (common to both first and follow-up calls)
    const sampleRows = Math.min(20, rawData.length);
    const sampleData = rawData.slice(0, sampleRows);

    let structureSummary = '';
    let sameAsParentItems: string[] = [];
    try {
        const preExtracted = buildPreExtractedItems(rawData);
        if (preExtracted.length > 0) {
            const l1Set = new Set<string>();
            const l2ByL1: Record<string, Set<string>> = {};
            let totalSubItems = 0;
            for (const item of preExtracted) {
                l1Set.add(item.l1);
                if (!l2ByL1[item.l1]) l2ByL1[item.l1] = new Set();
                if (item.l2) l2ByL1[item.l1].add(item.l2);
                totalSubItems += item.l3.split(/\r?\n/).filter(s => s.trim()).length;
            }
            const l1Names = Array.from(l1Set);
            structureSummary = `\n\n【程序化预提取结果】\n- 检测到 ${l1Names.length} 个一级类目：${l1Names.join('、')}`;
            for (const l1 of l1Names) {
                const l2Names = l2ByL1[l1] ? Array.from(l2ByL1[l1]) : [];
                structureSummary += `\n- "${l1}" 下有 ${l2Names.length} 个二级分类：${l2Names.join('、')}`;
            }
            structureSummary += `\n- 共${preExtracted.length} 个单元格，预估${totalSubItems} 个子项`;

            sameAsParentItems = [];
            for (const item of preExtracted) {
                const lines = item.l3.split(/\r?\n/).filter(s => s.trim());
                for (const line of lines) {
                    const clean = line.replace(/^\d+[.．]\s*/, '').trim();
                    if (clean && clean === item.l2) {
                        sameAsParentItems.push(`${item.l1}/${item.l2} → "${clean}"`);
                    }
                }
            }
        }
    } catch { /* use raw data as fallback */ }

    const dataContext = `用户上传了一个Excel分类表（共${rawData.length}行${rawData[0]?.length || 0}列）。

【数据样本】（前${sampleRows}行）
${JSON.stringify(sampleData)}
${structureSummary}
${sameAsParentItems.length > 0 ? `\n【同名提醒】${sameAsParentItems.length}个末级分类与父级同名：\n${sameAsParentItems.map(i => '  - ' + i).join('\n')}` : ''}`;

    const systemPrompt = `你是Excel分类表解析顾问AI小助手，帮助用户明确解析需求并指导如何解析分类表。用中文简洁回答。

${isFirstCall ? `这是用户第一次与你对话。你必须以选择题方式逐条确认以下问题（每个问题一行A/B/C选项）：
1. 表格结构：程序化预提取的结构是否正确？
2. 括号内容处理：保留/去除/拆分为独立分类？
3. 分隔符处理（默认不拆分）：整体名称(A)/拆分为多个分类(B)？
4. 末级分类判定：固定3级/叶子节点不固定层级？
5. 同名分类处理：保留为独立末级/合并到父级？` : '用户正在进行多轮对话，请根据对话上下文回答，不要再重复首次提问。'}`;

    // Build true multi-turn messages
    const messages: { role: string; content: string }[] = [
        { role: 'system', content: systemPrompt },
    ];

    if (isFirstCall) {
        messages.push({ role: 'user', content: dataContext });
    } else {
        // Send data context as a reminder, then the conversation history
        messages.push({ role: 'assistant', content: `（上下文提醒：用户上传了${rawData.length}行×${rawData[0]?.length || 0}列的Excel分类表${structureSummary ? '，' + structureSummary.replace(/\n\n/g, '').replace(/\n/g, ' ') : ''}）` });
        for (const msg of conversationHistory) {
            messages.push({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.content });
        }
    }

    const data = await callAiProxy(config, messages, 0.4, 4096);

    return data.choices?.[0]?.message?.content || '抱歉，我无法理解您的问题，请重新描述。';
}

// Cache the initial mapping context so we don't rebuild it on every chat turn
let _mappingContextCache: { contextPrompt: string; mappingsHash: string } | null = null;

function buildMappingContext(
    mappings: { systemCategoryFullPath: string; projectCategoryFullPath: string; matchScore: string; matchMethod: string; matchStatus: string }[],
    availableProjectL3Names?: string[]
): string {
    const hash = `${mappings.length}_${mappings[0]?.systemCategoryFullPath || ''}`;
    if (_mappingContextCache && _mappingContextCache.mappingsHash === hash) {
        return _mappingContextCache.contextPrompt;
    }

    const lowConfidence = mappings.filter(m => {
        const score = parseFloat(m.matchScore || '0');
        return score < 0.65 || m.matchStatus === '兜底匹配' || m.matchStatus === '模糊匹配' || m.matchStatus === '匹配失败';
    });
    const highConfidence = mappings.filter(m => !lowConfidence.includes(m));

    const projectCatList = availableProjectL3Names && availableProjectL3Names.length > 0
        ? availableProjectL3Names.map((n, i) => `${i + 1}. ${n}`).join('\n')
        : '';

    const ctx = `【可用项目末级分类】（共${availableProjectL3Names?.length || 0}个，你只能从这些中选择）
${projectCatList?.substring(0, 4000) || '(未提供)'}

【低置信度映射需重点关注】（共${lowConfidence.length}条）
${lowConfidence.slice(0, 60).map((m, i) =>
    `${i + 1}. 系统:"${m.systemCategoryFullPath}" → 当前:"${m.projectCategoryFullPath || '未匹配'}" | 得分:${m.matchScore} | ${m.matchMethod}`
).join('\n')}
${lowConfidence.length > 60 ? `\n... 还有${lowConfidence.length - 60}条未列出` : ''}

【高置信度参考】（前15条）
${highConfidence.slice(0, 15).map((m, i) =>
    `${i + 1}. 系统:"${m.systemCategoryFullPath}" → 项目:"${m.projectCategoryFullPath}"`
).join('\n')}

【映射规则 — 必须遵守】
1. 全路径语义优先：结合完整路径(L1/L2/L3)理解分类上下文
   正确："母婴宠物/服饰/婴儿袜"→"婴儿服饰及用品"（非"鞋袜"，因处于母婴路径）
   正确："食品饮料/休闲零食/饼干"→"饼干糕点"（非"其他零食"）
   正确："家用电器/厨房电器/电饭煲"→"电饭煲/电压力锅"（非"其他电器"）
2. 常见品类常识匹配：
   - 母婴相关（奶粉/纸尿裤/婴童服饰/玩具）→ 找"婴儿""母婴""奶粉""纸尿裤""玩具"相关项目分类
   - 食品饮料（零食/饮料/生鲜/粮油）→ 找"食品""饮料""水果""肉类""零食"相关项目分类
   - 家用电器（冰箱/洗衣机/电饭煲/风扇）→ 找"电器""家电"相关项目分类
   - 美妆个护（洗面奶/面霜/口红）→ 找"护肤""彩妆""护理"相关项目分类
3. JSON中只包含需要修改的映射（排除已正确的和"无匹配"的）
4. systemCategoryName只能是末级名（全路径最后一个"/"后的部分）`;

    _mappingContextCache = { contextPrompt: ctx, mappingsHash: hash };
    return ctx;
}

export async function callAiForMappingChat(
    mappings: { systemCategoryId: string; systemCategoryFullPath: string; systemCategoryName: string; projectCategoryId: string; projectCategoryFullPath: string; projectCategoryName: string; matchScore: string; matchMethod: string; matchStatus: string }[],
    conversationHistory: { role: string; content: string }[],
    availableProjectL3Names?: string[]
): Promise<{ text: string; corrections?: { systemCategoryName: string; newProjectCategoryName: string }[] }> {
    const config = getAiConfigByScenario('category-mapping');
    if (!config) throw new Error('未配置AI Key');

    const mappingContext = buildMappingContext(mappings, availableProjectL3Names);
    const isFirstMessage = conversationHistory.length <= 1;

    // Short, focused system prompt — mapping data goes in the user message, not here
    const systemPrompt = `你是电商类目映射专家。你必须分析每条低置信度映射并给出修正。
【核心规则】每次回复必须包含两部分：
1. 简短文字说明（1-3句话）
2. 修正JSON（用\`\`\`json代码块包裹），格式：{"corrections":[{"systemCategoryName":"系统末级分类名","newProjectCategoryName":"项目末级分类名"}]}
无论用户说什么，你都必须输出JSON修正数据。如果无需修正，JSON中corrections数组为空。`;

    const messages: { role: string; content: string }[] = [
        { role: 'system', content: systemPrompt },
    ];

    if (isFirstMessage) {
        // First message: mapping context + user input together
        const userInput = conversationHistory.length > 0 && conversationHistory[0].role === 'user'
            ? conversationHistory[0].content
            : '请分析这些分类映射，帮我修正所有低置信度映射和不合理的匹配';
        messages.push({
            role: 'user',
            content: `${mappingContext}\n\n【用户指令】${userInput}\n\n请根据上述规则，分析映射数据并输出JSON修正建议。`,
        });
    } else {
        // Multi-turn: brief context reminder + conversation history
        messages.push({
            role: 'user',
            content: `（上下文：你正在分析以下分类映射数据，请继续根据对话历史回答。每次回复必须包含JSON修正建议。）

${mappingContext.substring(0, 2000)}

【对话历史】`,
        });
        for (const msg of conversationHistory) {
            messages.push({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.content });
        }
        // Add a final reminder
        messages.push({
            role: 'user',
            content: '请根据以上对话，输出你的分析和JSON修正建议。必须包含JSON。',
        });
    }

    console.log('[MappingChat] Messages count:', messages.length, 'isFirst:', isFirstMessage);

    const data = await callAiProxy(config, messages, 0.3, 16384);

    const rawContent = data.choices?.[0]?.message?.content
        || data.choices?.[0]?.message?.reasoning_content
        || '';
    console.log('[MappingChat] === AI RAW RESPONSE ===');
    console.log('[MappingChat] Length:', rawContent.length);
    console.log('[MappingChat] First 500 chars:', rawContent.substring(0, 500));
    console.log('[MappingChat] Last 500 chars:', rawContent.substring(Math.max(0, rawContent.length - 500)));
    console.log('[MappingChat] === END RAW RESPONSE ===');

    const content = rawContent || '抱歉，我无法理解您的问题，请重新描述。';

    // Parse corrections from JSON block
    let corrections: { systemCategoryName: string; newProjectCategoryName: string }[] | undefined;

    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
        console.log('[MappingChat] Found JSON block, length:', jsonMatch[1].length);
        try {
            const parsed = JSON.parse(jsonMatch[1]);
            if (parsed.corrections && Array.isArray(parsed.corrections)) {
                corrections = parsed.corrections.filter(
                    (c: any) => c.systemCategoryName && c.newProjectCategoryName
                );
                console.log('[MappingChat] Parsed', corrections.length, 'corrections');
            }
        } catch (e) {
            console.warn('[MappingChat] JSON parse error:', e);
        }
    }

    // Fallback: raw JSON without code fences
    if (!corrections || corrections.length === 0) {
        const altMatch = content.match(/\{"corrections"\s*:\s*\[[\s\S]*?\]\s*\}/);
        if (altMatch) {
            try {
                const parsed = JSON.parse(altMatch[0]);
                if (parsed.corrections && Array.isArray(parsed.corrections)) {
                    corrections = parsed.corrections.filter(
                        (c: any) => c.systemCategoryName && c.newProjectCategoryName
                    );
                }
            } catch {}
        }
    }

    const text = content.replace(/```json[\s\S]*?```/g, '').replace(/\{"corrections"\s*:\s*\[[\s\S]*?\]\s*\}/g, '').trim();

    // If no corrections found and this was a multi-turn conversation, try one more time with a forceful prompt
    if ((!corrections || corrections.length === 0) && !isFirstMessage) {
        console.log('[MappingChat] No corrections found, retrying with forceful prompt...');
        try {
            const retryMessages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `${mappingContext}\n\n你的上一次回复没有包含JSON修正数据。请现在就分析这些低置信度映射，输出需要修正的映射列表。只输出JSON，不要加其他文字：\n\`\`\`json\n{"corrections":[{"systemCategoryName":"系统末级名","newProjectCategoryName":"项目末级名"}]}\n\`\`\`` },
            ];
            const retryData = await callAiProxy(config, retryMessages, 0.1, 8192);
            const retryContent = retryData.choices?.[0]?.message?.content || '';
            const retryJsonMatch = retryContent.match(/```json\s*([\s\S]*?)\s*```/);
            if (retryJsonMatch) {
                try {
                    const parsed = JSON.parse(retryJsonMatch[1]);
                    if (parsed.corrections && Array.isArray(parsed.corrections)) {
                        corrections = parsed.corrections.filter(
                            (c: any) => c.systemCategoryName && c.newProjectCategoryName
                        );
                        console.log('[MappingChat] Retry parsed', corrections.length, 'corrections');
                    }
                } catch {}
            }
            // Also try raw JSON in retry
            if (!corrections || corrections.length === 0) {
                const retryAlt = retryContent.match(/\{"corrections"\s*:\s*\[[\s\S]*?\]\s*\}/);
                if (retryAlt) {
                    try {
                        const parsed = JSON.parse(retryAlt[0]);
                        if (parsed.corrections && Array.isArray(parsed.corrections)) {
                            corrections = parsed.corrections.filter(
                                (c: any) => c.systemCategoryName && c.newProjectCategoryName
                            );
                        }
                    } catch {}
                }
            }
        } catch (e) {
            console.warn('[MappingChat] Retry failed:', e);
        }
    }

    return { text, corrections };
}

/**
 * AI reverse-match: for each unmapped PROJECT category, find the best matching system category.
 * This enables "反向匹配" — project → system, instead of the usual system → project.
 */
export async function callAiForUnmappedMatching(
    unmappedProjectCats: { name: string; fullPath: string }[],
    systemLeafCats: { categoryId: string; name: string; fullPath: string }[],
    onProgress?: (current: number, total: number) => void
): Promise<{ projectCategoryName: string; systemCategoryName: string }[]> {
    const config = getAiConfigByScenario('category-mapping');
    if (!config) throw new Error('未配置AI Key');

    if (unmappedProjectCats.length === 0) return [];
    if (systemLeafCats.length === 0) throw new Error('系统商品分类为空');

    const batchSize = 60;
    const allResults: { projectCategoryName: string; systemCategoryName: string }[] = [];

    for (let i = 0; i < unmappedProjectCats.length; i += batchSize) {
        const batch = unmappedProjectCats.slice(i, i + batchSize);
        onProgress?.(i, unmappedProjectCats.length);

        const projectList = batch.map((c, j) =>
            `${i + j + 1}. 项目分类: "${c.fullPath}"`
        ).join('\n');

        const systemList = systemLeafCats.map((c, j) =>
            `${j + 1}. ${c.fullPath}`
        ).join('\n');

        const prompt = `你是电商类目映射专家。请为每个【项目分类】从【系统商品分类】中找到最匹配的分类。

【系统商品分类列表】（共${systemLeafCats.length}个，只能从这些中选择）
${systemList.substring(0, 6000)}

【需要匹配的项目分类】（共${batch.length}条，这些项目分类目前没有任何系统分类映射到它们）
${projectList}

【规则 — 必须遵守】
1. 结合完整路径(L1/L2/L3)理解分类语义，用生活常识判断
2. 常见匹配示例：
   - 项目"婴儿服饰及用品"→系统"母婴宠物/服饰/婴儿袜" 或 "母婴宠物/..."
   - 项目"饼干糕点"→系统"食品饮料/休闲零食/饼干" 或 "食品饮料/..."
   - 项目"电饭煲/电压力锅"→系统"家用电器/厨房电器/电饭煲"
   - 项目"洗发护发"→系统"个人护理/洗发护发/洗发水" 或 "美妆个护/..."
   - 项目"奶粉/婴幼儿辅食"→系统"母婴宠物/婴童食品/奶粉"
   - 项目"面部彩妆"→系统"美妆个护/彩妆/..." 或 "个人护理/..."
3. 优先匹配L1大类相同的（如母婴→母婴、食品→食品、电器→电器）
4. 其次看L2/L3的语义相似度
5. 实在找不到的，systemCategoryName 设为 "无匹配"
6. 一个系统分类可以匹配多个项目分类

请只返回JSON数组（不要加\`\`\`json标记，不要加任何解释）：
[
  {"projectCategoryName": "项目末级分类名", "systemCategoryName": "系统末级分类名或'无匹配'"}
]`;

        const data = await callAiProxy(config, [
            { role: 'system', content: '你是电商类目映射专家。只返回JSON数组。projectCategoryName是项目分类末级名，systemCategoryName是系统分类末级名（只用末级名，不用全路径）。' },
            { role: 'user', content: prompt },
        ], 0.1, 16384);

        const content = data.choices?.[0]?.message?.content || '[]';
        const cleaned = content.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();
        const match = cleaned.match(/\[[\s\S]*\]/);
        const jsonStr = match ? match[0] : cleaned;

        try {
            const parsed = JSON.parse(jsonStr);
            if (Array.isArray(parsed)) {
                const valid = parsed.filter((c: any) =>
                    c.projectCategoryName && c.systemCategoryName && c.systemCategoryName !== '无匹配'
                );
                allResults.push(...valid);
            }
        } catch (e) {
            console.warn('[UnmappedMatch] Failed to parse batch result:', e);
        }
    }

    onProgress?.(unmappedProjectCats.length, unmappedProjectCats.length);
    return allResults;
}

export async function callAiForPromptChat(
    currentPrompt: string,
    promptType: 'parse' | 'mapping',
    conversationHistory: { role: string; content: string }[]
): Promise<string> {
    const config = getAiConfigByScenario('category-mapping');
    if (!config) throw new Error('未配置AI Key');

    const historyStr = conversationHistory
        .map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`)
        .join('\n');

    const typeLabel = promptType === 'parse' ? '分类解析' : '映射比对';

    const prompt = `用户正在编辑一个${typeLabel}的AI Prompt，希望优化它以获得更好的解析/比对效果。
【当前Prompt内容】${currentPrompt}

【对话记录】${historyStr}

请帮助用户优化这个Prompt。您可以：
- 分析当前Prompt的优缺点
- 建议改进方向
- 直接给出修改后的Prompt内容
- 解释为什么这样修改会更好

用中文回答。如果给出修改后的Prompt，请用\`\`\`标记包裹。`;

    const data = await callAiProxy(config, [
        { role: 'system', content: `你是一个AI Prompt优化专家，帮助用户优化${typeLabel}相关的Prompt。用中文回答。` },
        { role: 'user', content: prompt },
    ], 0.3, 2048);

    return data.choices?.[0]?.message?.content || '抱歉，我无法理解您的问题，请重新描述。';
}

export const DEFAULT_PARSE_PROMPT_RULES = `1. 以上列表是按表格结构自动提取的原始单元格数据，每个条目代表一个单元格。单元格内的文本应被视为一个完整的分类名称。仅当以下情况才拆分：
   - 单元格内换行（\\n）分隔的多行内容——每行视为独立分类
   - 带明确编号前缀的内容（如"1.xxx 2.xxx"）——按编号拆分
   - 用户在对话中明确要求拆分
   其他情况（顿号、斜杠、逗号、空格分隔的内容）默认不拆分，视为一个整体名称
2. 根据用户在对话中的明确指示处理特殊内容：
   - 括号内容：保留、去除、或作为独立分类——严格按用户指示；未指示则保持原样
   - 分隔符（顿号、斜杠等）：默认不拆分视为整体名称；仅当用户明确要求拆分时才拆分
3. 末级分类 = 叶子节点，即没有其他分类将其作为父级的最底层分类
4. 不同项目的分类层级可能不同，请根据实际数据结构判断
5. 不要包含重复的分类（fullPath相同只保留一条）。不同层级可以有同名分类，只要fullPath不同就不算重复
6. categories数组的长度必须与实际末级分类数量完全一致`;

export const DEFAULT_MAPPING_PROMPT_RULES = `1. 理解旧类目的真实商品含义，不要被单字误导
2. 从可选类目中选择语义最匹配的一个3. 如实在无法匹配，标记为"无匹配"`;

export async function testAiConnection(providerKey?: string): Promise<{ success: boolean; message: string }> {
    const config = providerKey ? getAiConfigByProvider(providerKey) : getActiveAiConfig();
    if (!config) return { success: false, message: '未配置AI Key' };

    try {
        const data = await callAiProxy(config, [
            { role: 'user', content: '回复"连接成功"' },
        ], 0.1, 10);

        const content = data.choices?.[0]?.message?.content || '';
        return {
            success: true,
            message: `连接成功 (${config.provider} / ${config.model})，AI回复: "${content.trim()}"`,
        };
    } catch (err: any) {
        return { success: false, message: `连接失败: ${err.message}` };
    }
}

interface ParsedCategory {
    name: string;
    level: number;
    fullPath: string;
    isLeaf: boolean;
    parentId: string;
}

function tryProgrammaticParse(rawData: any[][]): ParsedCategory[] | null {
    if (rawData.length < 3) return null;

    const hasLevelColumn = rawData.slice(0, 10).some(row => {
        const lastVal = parseInt(String(row[row.length - 1] || ''));
        return lastVal >= 1 && lastVal <= 5;
    });
    if (!hasLevelColumn) return null;

    const lastCol = rawData[0].length - 1;
    const levelSet = new Set<number>();

    interface CategoryEntry {
        id: string;
        name: string;
        parentId: string;
        parentName: string;
        level: number;
    }

    const entries: CategoryEntry[] = [];
    let nameCol = -1;
    let idCol = -1;
    let parentIdCol = -1;
    let parentNameCol = -1;

    for (let col = 0; col < lastCol; col++) {
        const header = String(rawData[0][col] || '').trim();
        if (header.includes('分类名称') || (header.includes('名称') && !header.includes('父级'))) nameCol = col;
        if ((header.includes('Id') || header.includes('ID')) && !header.includes('父级')) idCol = col;
        if (header === '父级分类' || header.includes('父级分类') && !header.includes('名称') && !header.includes('层级')) parentIdCol = col;
        if (header.includes('父级分类名称') || (header.includes('父级') && header.includes('名称'))) parentNameCol = col;
    }
    if (nameCol < 0) nameCol = lastCol - 2;
    if (idCol < 0) idCol = lastCol - 3;
    if (parentIdCol < 0) parentIdCol = 1;
    if (parentNameCol < 0) parentNameCol = 2;

    for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i] || [];
        const level = parseInt(String(row[lastCol] || ''));
        if (isNaN(level) || level < 1 || level > 5) continue;
        const name = String(row[nameCol] || '').trim();
        if (!name || name === '分类名称') continue;
        levelSet.add(level);
        entries.push({
            id: String(row[idCol] || name),
            name,
            parentId: parentIdCol >= 0 ? String(row[parentIdCol] || '') : '',
            parentName: parentNameCol >= 0 ? String(row[parentNameCol] || '') : '',
            level,
        });
    }

    if (entries.length < 5 || levelSet.size < 2) return null;

    const maxLevel = Math.max(...levelSet);
    const idToEntry = new Map<string, CategoryEntry>();
    for (const e of entries) idToEntry.set(e.id, e);

    const getFullPath = (entry: CategoryEntry): string => {
        const parts: string[] = [entry.name];
        let current = entry;
        for (let safety = 0; safety < 10; safety++) {
            const parentName = current.parentName?.trim();
            const parentId = current.parentId?.trim();
            if (parentName) {
                const parentEntry = idToEntry.get(parentName);
                if (parentEntry) {
                    parts.unshift(parentEntry.name);
                    current = parentEntry;
                    continue;
                }
            }
            if (parentId) {
                const parentEntry = idToEntry.get(parentId);
                if (parentEntry) {
                    parts.unshift(parentEntry.name);
                    current = parentEntry;
                    continue;
                }
            }
            break;
        }
        return parts.join('/');
    };

    const childIds = new Set<string>();
    for (const e of entries) {
        if (e.parentId) childIds.add(e.parentId);
        if (e.parentName) childIds.add(e.parentName);
    }

    const result: ParsedCategory[] = [];
    for (const e of entries) {
        const isChild = childIds.has(e.id) || childIds.has(e.name);
        if (!isChild) {
            result.push({
                name: e.name,
                level: e.level,
                fullPath: getFullPath(e),
                isLeaf: true,
                parentId: e.parentName || e.parentId || String(e.level - 1),
            });
        }
    }

    console.log('[CategoryParser] Programmatic parse: levels=' + [...levelSet] + ' maxLevel=' + maxLevel + ' leaves=' + result.length);
    return result.length > 0 ? result : null;
}

export async function callAiForParsingCategoryTable(rawData: any[][], onProgress?: (current: number, total: number, label: string) => void, chatContext?: { role: string; content: string }[], customPrompt?: string): Promise<any[]> {
    const config = getAiConfigByScenario('category-mapping');
    if (!config) throw new Error('未配置AI Key，请先在「AI Key 配置」页面添加');

    console.log('[CategoryParser] rawData rows:', rawData.length, 'cols:', rawData[0]?.length);

    const hasUserChat = chatContext && chatContext.some(m => m.role === 'user');
    const expectedCount = chatContext ? extractExpectedCount(chatContext) : null;

    console.log('[callAiForParsingCategoryTable] === 开始解析 ===');
    console.log('[callAiForParsingCategoryTable] rawData: ' + rawData.length + ' rows x ' + (rawData[0]?.length || 0) + ' cols');
    console.log('[callAiForParsingCategoryTable] hasUserChat: ' + hasUserChat + ' expectedCount: ' + expectedCount);
    if (chatContext && chatContext.length > 0) {
        console.log('[callAiForParsingCategoryTable] 对话记录:');
        chatContext.forEach((m, i) => console.log(`[callAiForParsingCategoryTable]   ${i + 1}. ${m.role}: ${m.content.substring(0, 100)}`));
    }

    if (hasUserChat) {
        onProgress?.(10, 100, '程序化预提取中...');
        const preExtracted = buildPreExtractedItems(rawData);
        console.log('[CategoryParser] Pre-extracted', preExtracted.length, 'items from raw data');

        if (preExtracted.length > 0) {
            onProgress?.(30, 100, 'AI 正在根据对话需求精炼分类...');
            let aiResult = await parseWithAiRefined(preExtracted, config, chatContext!, customPrompt);
            console.log('[CategoryParser] parseWithAiRefined returned', aiResult.length, 'categories (expected:', expectedCount, ')');

            aiResult = applyChatRulesPostProcess(aiResult, chatContext!);
            console.log('[callAiForParsingCategoryTable] 后处理后分类数 ' + aiResult.length);

            if (expectedCount && aiResult.length !== expectedCount) {
                const diff = aiResult.length - expectedCount;
                console.warn(`[CategoryParser] Count mismatch after refinement: expected ${expectedCount}, got ${aiResult.length} (diff: ${diff > 0 ? '+' : ''}${diff}). Retrying correction...`);
                onProgress?.(70, 100, `数量校验：预估{expectedCount}个，实际${aiResult.length}个，AI正在修正...`);
                const corrected = await parseWithAiCorrectionRefined(preExtracted, config, chatContext!, expectedCount, aiResult);
                if (corrected) {
                    const correctedAfterPost = applyChatRulesPostProcess(corrected, chatContext!);
                    if (correctedAfterPost.length === expectedCount) {
                        console.log('[CategoryParser] Correction+postProcess successful: got', correctedAfterPost.length);
                        aiResult = correctedAfterPost;
                    } else if (Math.abs(correctedAfterPost.length - expectedCount) < Math.abs(aiResult.length - expectedCount)) {
                        console.log('[CategoryParser] Correction+postProcess improved: from', aiResult.length, 'to', correctedAfterPost.length);
                        aiResult = correctedAfterPost;
                    } else if (corrected.length === expectedCount) {
                        console.log('[CategoryParser] Correction successful (raw): got', corrected.length);
                        aiResult = corrected;
                    } else if (Math.abs(corrected.length - expectedCount) < Math.abs(aiResult.length - expectedCount)) {
                        console.log('[CategoryParser] Correction improved (raw): from', aiResult.length, 'to', corrected.length);
                        aiResult = corrected;
                    } else {
                        console.warn('[CategoryParser] Correction did not improve, keeping original result');
                    }
                }
            }

            onProgress?.(100, 100, 'AI 解析完成');
            console.log('[CategoryParser] === 诊断日志：最终结果 ===');
            console.log('[CategoryParser] 预提取单元格数 ' + preExtracted.length + ' ，AI返回分类数 ' + aiResult.length + ' ，预期数 ' + expectedCount);
            if (expectedCount && aiResult.length !== expectedCount) {
                console.log('[CategoryParser] ⚠️ 数量不匹配！差值 ' + (aiResult.length - expectedCount));
            }
            console.log('[CategoryParser] === 诊断日志结束 ===');
                        return aiResult;
        }

        console.log('[CategoryParser] Pre-extraction empty, falling back to raw AI parsing');
        onProgress?.(10, 100, 'AI 正在根据对话需求解析...');
        let aiResult = await parseWithAi(rawData, config, chatContext);

        if (expectedCount && aiResult.length !== expectedCount) {
            const diff = aiResult.length - expectedCount;
            console.warn(`[CategoryParser] Count mismatch (fallback): expected ${expectedCount}, got ${aiResult.length} (diff: ${diff > 0 ? '+' : ''}${diff}). Retrying with correction...`);
            onProgress?.(60, 100, `数量校验：预估{expectedCount}个，实际${aiResult.length}个，AI正在修正...`);

            const corrected = await parseWithAiCorrection(rawData, config, chatContext, expectedCount, aiResult);
            if (corrected) {
                if (corrected.length === expectedCount) {
                    console.log('[CategoryParser] Correction successful: got', corrected.length, 'categories');
                    aiResult = corrected;
                } else if (Math.abs(corrected.length - expectedCount) < Math.abs(aiResult.length - expectedCount)) {
                    console.log('[CategoryParser] Correction improved: from', aiResult.length, 'to', corrected.length, '(target:', expectedCount, ')');
                    aiResult = corrected;
                } else {
                    console.warn('[CategoryParser] Correction did not improve, keeping original result');
                }
            }
        }

        onProgress?.(100, 100, 'AI 解析完成');
                return aiResult;
    }

    onProgress?.(10, 100, 'AI 正在识别表格结构类型...');
    const structure = await detectStructure(rawData.slice(0, 20), config);
    console.log('[CategoryParser] Detected structure:', structure);

    onProgress?.(30, 100, `结构类型: ${structure.type}，程序化提取中...`);

    let result: any[] | null = null;
    if (structure.type === 'A') {
        result = tryProgrammaticParse(rawData);
    } else if (structure.type === 'B') {
        result = tryMultiColumnParse(rawData);
    } else if (structure.type === 'C') {
        result = trySimpleColumnParse(rawData);
    }

    if (result && result.length > 0) {
        onProgress?.(100, 100, `解析完成（{structure.type}型，${result.length}个末级）`);
        return result;
    }

    onProgress?.(40, 100, '程序化提取未命中，AI 全量解析中...');
    const aiResult = await parseWithAi(rawData, config);
    onProgress?.(100, 100, 'AI 解析完成');
        return aiResult;
}

async function detectStructure(sampleData: any[][], config: any, chatContext?: { role: string; content: string }[]): Promise<{ type: string }> {
    let contextHint = '';
    if (chatContext && chatContext.length > 0) {
        const userMsgs = chatContext.filter(m => m.role === 'user').map(m => m.content).join('、');
        if (userMsgs) contextHint = `\n\n【用户需求摘要】{userMsgs}`;
    }

    const prompt = `分析以下Excel数据样本，判断属于哪种结构类型。只回复一个字母：
A = 行式数据库格式（每行一条记录，末列含数字层级1/2/3/4）B = 多栏横向布局（标题行含多个分类名横向排列，如"肉蛋果蔬""零食饮料"等）
C = 简单三列（L1列、L2列、L3列纵向排列）
D = 其他格式

【数据样本】${JSON.stringify(sampleData)}${contextHint}

回复格式：{"type":"A"}`;

    try {
        const data = await callAiProxy(config, [
            { role: 'system', content: '只回复JSON，如{"type":"A"}' },
            { role: 'user', content: prompt },
        ], 0.0, 200, undefined);
        const content = data.choices?.[0]?.message?.content || '';
        const match = content.match(/[ABCD]/);
        return { type: match ? match[0] : 'D' };
    } catch {
        return { type: 'D' };
    }
}

function tryMultiColumnParse(rawData: any[][]): ParsedCategory[] | null {
    const normalized = normalizeCategoryTableData(rawData);
    if (normalized.length === 0) return null;

    const result: ParsedCategory[] = [];
    for (const row of normalized) {
        if (!row.l3) continue;
        const subItems = row.l3.split(/\\n|\n|\r\n/).filter((s: string) => s.trim());
        for (const item of subItems) {
            let name = item.replace(/^\d+[\.\、\s]+/, '').trim();
            if (!name || name.length < 2) continue;
            if (/^["]/.test(name) && /["]$/.test(name)) continue;
            result.push({
                name,
                level: 3,
                fullPath: `${row.l1}/${row.l2}/${name}`,
                isLeaf: true,
                parentId: row.l2,
            });
        }
    }
    return result.length > 0 ? result : null;
}

function trySimpleColumnParse(rawData: any[][]): ParsedCategory[] | null {
    if (rawData.length < 2) return null;
    const result: ParsedCategory[] = [];
    for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i] || [];
        const l3 = String(row[2] || '').trim();
        if (!l3 || isHeaderKeyword(l3)) continue;
        result.push({
            name: l3,
            level: 3,
            fullPath: [String(row[0] || '').trim(), String(row[1] || '').trim(), l3].join('/'),
            isLeaf: true,
            parentId: String(row[1] || '').trim(),
        });
    }
    return result.length > 0 ? result : null;
}

function applyChatRulesPostProcess(
    categories: any[],
    chatContext: { role: string; content: string }[]
): any[] {
    const userMessages = chatContext.filter(m => m.role === 'user').map(m => m.content).join(' ');
    const allMessages = chatContext.map(m => m.content).join(' ');

    const shouldRemoveBrackets = /括号.*(?:去除|不展示|不体现|备注|不包含|删除|去掉|不保留|移除|不要|处理|不需要|不用|忽略|省略|不带)/.test(userMessages) ||
        /(?:去除|不展示|不体现|备注|不包含|删除|去掉|不保留|移除|不要|不需要|不用|忽略|省略|不带).*括号/.test(userMessages) ||
        /括号.*(?:去除|不展示|不体现|备注|不包含|删除|去掉|不保留|移除|不需要|不用|忽略|省略|不带)/.test(allMessages) ||
        /(?:去除|不展示|不体现|备注|不包含|删除|去掉|不保留|移除|不需要|不用|忽略|省略|不带).*括号/.test(allMessages) ||
        /parenthes.*(?:remove|strip|exclude|ignore|omit|without)/i.test(userMessages) ||
        /(?:remove|strip|exclude|ignore|omit).*parenthes/i.test(userMessages);
    const shouldKeepSlash = /斜杠.*(?:整体|不拆|保留|作为一个整体)/.test(userMessages) ||
        /(?:整体|不拆|保留|作为一个整体).*斜杠/.test(userMessages) ||
        /斜杠.*整体/.test(allMessages) ||
        /顿号.*(?:整体|不拆|保留|作为一个整体)/.test(userMessages) ||
        /(?:整体|不拆|保留|作为一个整体).*顿号/.test(userMessages);

    console.log('[applyChatRulesPostProcess] shouldRemoveBrackets=' + shouldRemoveBrackets + ' shouldKeepSlash=' + shouldKeepSlash);
    console.log('[applyChatRulesPostProcess] userMessages前200字 ' + userMessages.substring(0, 200));
    console.log('[applyChatRulesPostProcess] 输入分类数 ' + categories.length);

    let result = categories.map(c => {
        let name = (c.name || '').trim();
        let fullPath = (c.fullPath || '').trim();
        let parentId = (c.parentId || '').trim();

        if (shouldRemoveBrackets) {
            const newName = name.replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '').trim();
            if (newName !== name) {
                console.log('[applyChatRulesPostProcess] 去除括号: "' + name + '" → "' + newName + '"');
                name = newName;
                const pathParts = fullPath.split('/');
                if (pathParts.length > 0) {
                    pathParts[pathParts.length - 1] = name;
                    fullPath = pathParts.join('/');
                }
            }
        }

        return { ...c, name, fullPath, parentId };
    });

    const beforeDedup = result.length;
    const seen = new Set<string>();
    result = result.filter(c => {
        const key = (c.fullPath || '').trim();
        if (!key || seen.has(key)) {
            console.log('[applyChatRulesPostProcess] 去重移除: "' + key + '" (与已有路径重复)');
            return false;
        }
        seen.add(key);
        return true;
    });
    console.log('[applyChatRulesPostProcess] fullPath去重: ' + beforeDedup + ' → ' + result.length);

    const beforeParentCheck = result.length;
    const sameAsParentItems: string[] = [];
    result.forEach(c => {
        const name = (c.name || '').trim();
        const parentId = (c.parentId || '').trim();
        if (!name || !parentId) return;
        if (name === parentId) {
            sameAsParentItems.push('完全同名: "' + name + '" fullPath="' + (c.fullPath || '') + '"');
        } else if (shouldRemoveBrackets) {
            const nameNoBracket = name.replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '').trim();
            if (nameNoBracket && nameNoBracket !== name && nameNoBracket === parentId) {
                sameAsParentItems.push('去括号后同名: "' + name + '" → "' + nameNoBracket + '" fullPath="' + (c.fullPath || '') + '"');
            }
        }
    });
    if (sameAsParentItems.length > 0) {
        console.log('[applyChatRulesPostProcess] ⚠️ 发现' + sameAsParentItems.length + '个与父级同名的末级分类（未自动删除，需用户确认）');
        sameAsParentItems.forEach(item => console.log('[applyChatRulesPostProcess]   ' + item));
    }
    console.log('[applyChatRulesPostProcess] 父级同名检查 ' + beforeParentCheck + ' (未自动删除)');

    const pathSet = new Set(result.map(c => (c.fullPath || '').trim()).filter(Boolean));
    const beforeLeafFilter = result.length;
    result = result.filter(c => {
        const path = (c.fullPath || '').trim();
        if (!path) return true;
        for (const otherPath of pathSet) {
            if (otherPath !== path && otherPath.startsWith(path + '/')) {
                console.log('[applyChatRulesPostProcess] 叶子过滤移除非叶子节点 "' + path + '" (存在子路径"' + otherPath + '")');
                return false;
            }
        }
        return true;
    });
    if (beforeLeafFilter !== result.length) {
        console.log('[applyChatRulesPostProcess] 叶子重过滤 ' + beforeLeafFilter + ' → ' + result.length);
    }

    const l1Set = new Set<string>(), l2Set = new Set<string>();
    result.forEach(c => {
        const parts = (c.fullPath || '').split('/');
        if (parts[0]) l1Set.add(parts[0]);
        if (parts[0] && parts[1]) l2Set.add(parts[0] + '/' + parts[1]);
    });
    console.log('[applyChatRulesPostProcess] 最终统计 ' + l1Set.size + '个一级 · ' + l2Set.size + '个二级 · ' + result.length + '个末级');
    console.log('[applyChatRulesPostProcess] 一级类目 ' + Array.from(l1Set).join(', '));
    console.log('[applyChatRulesPostProcess] 二级分类路径: ' + Array.from(l2Set).join(', '));
    console.log('[applyChatRulesPostProcess] 最终分类数: ' + result.length);

    return result;
}

function extractExpectedCount(chatContext: { role: string; content: string }[]): number | null {
    for (let i = chatContext.length - 1; i >= 0; i--) {
        const msg = chatContext[i];
        if (msg.role !== 'user') continue;
        const patterns = [
            /(\d+)\s*个\s*(?:末级|三级|3级|细分|叶子|分类|组合)/,
            /(?:末级|三级|3级|细分|叶子|分类|组合)[^\d]{0,10}(\d+)/,
            /共\s*(\d+)\s*个/,
            /只有\s*(\d+)\s*个/,
        ];
        for (const pattern of patterns) {
            const matches = [...msg.content.matchAll(new RegExp(pattern.source, 'g'))];
            for (let j = matches.length - 1; j >= 0; j--) {
                const n = parseInt(matches[j][1]);
                if (n > 0 && n < 10000) return n;
            }
        }
    }
    return null;
}

async function parseWithAi(rawData: any[][], config: any, chatContext?: { role: string; content: string }[]): Promise<any[]> {
    let contextSection = '';
    let countConstraint = '';
    if (chatContext && chatContext.length > 0) {
        contextSection = '\n\n【用户解析需求】\n' + chatContext
            .map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`)
            .join('\n');

        const expectedCount = extractExpectedCount(chatContext);
        if (expectedCount) {
            countConstraint = `\n7. 【关键约束】根据对话确认，末级分类数量应为 ${expectedCount} 个，你的categories数组长度必须严格等于 ${expectedCount}。如果多了说明你误将非末级分类计入了，如果少了说明你有遗漏，请仔细核对后再输出`;
        }
    }

    const compactData = rawData.map(row =>
        (row as any[]).map((cell: any) => {
            const s = String(cell || '').trim();
            return s || '';
        })
    );

    const preProcessed = normalizeCategoryTableData(rawData);
    let referenceSection = '';
    if (preProcessed.length > 0) {
        const refItems = preProcessed.map((r, i) => `${i + 1}. ${r.l1} / ${r.l2} / ${r.l3}`);
        referenceSection = `

【程序化预提取参考】（共${preProcessed.length}条原始记录，这是按表格结构自动提取的原始数据，供你核对参考）
${refItems.join('\n')}`;
    }

    const fullPrompt = `你是Excel分类表解析专家。请分析以下数据并提取所有末级（叶子节点）分类。
【原始数据】（${rawData.length}行）
${JSON.stringify(compactData)}${referenceSection}${contextSection}

【规则】1. 判断数据结构类型：行式DB格式(末列含层级1、多栏横向布局、简单三列、或其他
2. 末级分类的定义与识别规则：   - 末级分类 = 叶子节点，即没有其他分类将其作为父级的最底层分类
   - 不同项目的分类层级可能不同（可能2级、3级或更深层级），请根据实际数据结构判断   - 不要将非叶子节点的分类计入末级分类   - 分类名称中特殊内容的处理方式以用户在对话中的明确指示为准：     * 括号内容：保留、去除、或作为独立分类——按用户指示；未指示则保持原样     * 分隔符（顿号、斜杠等）：作为整体名称还是拆分为多个分类——按用户指示；未指示则保持原样不拆分
3. 构建完整 fullPath，格式为 各级分类用/连接
4. 如果用户有特定解析需求（如去除括号内容、只提取某类分类等），请按照用户需求进行解析5. 不要包含重复的分类名称（name或fullPath重复的只保留一条）
6. categories数组的长度必须与实际末级分类数量完全一致，不要多也不要少。${countConstraint}

【输出】只返回JSON，含完整\`\`\`json】\`\`\`json
{
  "categories": [
    { "name": "末级分类名", "level": 3, "fullPath": "一级/二级/末级", "isLeaf": true, "parentId": "父级名称" }
  ]
}
\`\`\``;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);
    try {
        const data = await callAiProxy(config, [
            { role: 'system', content: '你是一个专业的Excel分类表解析助手，只返回JSON格式结果。' },
            { role: 'user', content: fullPrompt },
        ], 0.1, 32768, controller.signal);
        clearTimeout(timeoutId);

        const content = data.choices?.[0]?.message?.content
            || data.choices?.[0]?.message?.reasoning_content
            || '';

        let cleaned = content
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```\s*$/, '')
            .trim();

        let jsonStr = '';
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonStr = jsonMatch[0];
        } else {
            jsonStr = cleaned;
        }

        const tryParse = (str: string): any | null => {
            try { return JSON.parse(str); } catch { return null; }
        };

        let parsed = tryParse(jsonStr);
        if (!parsed) {
            const completed = completeJson(jsonStr);
            if (completed) {
                parsed = tryParse(completed);
            }
        }

        if (parsed && parsed.categories) {
            let categories = parsed.categories as any[];
            const beforeDedup = categories.length;
            const seen = new Set<string>();
            categories = categories.filter((c: any) => {
                const fp = (c.fullPath || '').trim();
                const key = fp || `${(c.parentId || '').trim()}/${(c.name || '').trim()}/${c.level || 3}`;
                if (!key || seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            const pathSet = new Set(categories.map((c: any) => (c.fullPath || '').trim()).filter(Boolean));
            categories = categories.filter((c: any) => {
                const path = (c.fullPath || '').trim();
                if (!path) return true;
                for (const otherPath of pathSet) {
                    if (otherPath !== path && otherPath.startsWith(path + '/')) {
                        return false;
                    }
                }
                return true;
            });
            console.log('[CategoryParser] AI returned', beforeDedup, 'categories, after dedup+leaf-filter:', categories.length);
            return categories;
        }

        const preview = content.substring(0, 300).replace(/\n/g, ' ');
        throw new Error(`AI返回格式解析失败: ${preview || '(空响应)'}`);
    } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            throw new Error('AI解析超时（300秒），请尝试减少上传数据量或检查AI服务状态');
        }
        throw err;
    }
}

async function parseWithAiRefined(
    preExtractedItems: { l1: string; l2: string; l3: string; fullPath: string }[],
    config: any,
    chatContext: { role: string; content: string }[],
    customPrompt?: string
): Promise<any[]> {
    const contextSection = chatContext
        .map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`)
        .join('\n');

    const expectedCount = extractExpectedCount(chatContext);
    let countConstraint = '';
    if (expectedCount) {
        countConstraint = `\n\n【关键约束】根据对话确认，末级分类数量应为 ${expectedCount} 个，你的categories数组长度必须严格等于 ${expectedCount}。如果多了说明你误将非末级分类计入或错误拆分了某些项，如果少了说明你有遗漏。`;
    }

    const itemsList = preExtractedItems.map((item, i) => {
        const rawContent = item.l3.replace(/\r?\n/g, '\\n');
        const lines = item.l3.split(/\r?\n/).filter(s => s.trim());
        const subCount = lines.length;
        return `[C${i + 1}] 路径="${item.l1} > ${item.l2}" 内容="${rawContent}" (含${subCount}行)`;
    }).join('\n');

    const totalSubItems = preExtractedItems.reduce((sum, item) => sum + item.l3.split(/\r?\n/).filter(s => s.trim()).length, 0);

    const rulesSection = customPrompt || DEFAULT_PARSE_PROMPT_RULES;

    const prompt = `你是Excel分类表解析专家。以下是程序化从Excel中预提取的分类单元格列表（共${preExtractedItems.length}个单元格，约${totalSubItems}个子项），请根据用户的解析需求提取所有末级分类名
【格式说明】每个单元格条目格式为：[C序号] 路径="一级类目 > 二级分类" 内容="单元格原始文本" (含N行)
- 路径：该单元格所属的一级类目和二级分类
- 内容：单元格的原始文本，其中"\\n"表示单元格内换行（即多个分类项）
- 你需要将每个单元格内的多行内容拆分为独立的末级分类- 去除编号前缀（如"1."、"2."、"1、"等）
- 根据用户指示处理括号内容（保留、去除、或拆分为独立分类）
- 分隔符（顿号、斜杠等）：默认不拆分视为整体名称；仅当用户明确要求拆分时才拆分
- 为每个分类构建完整的fullPath（格式：一级/二级/末级）
【必须遵守】你必须处理全部${preExtractedItems.length}个单元格（C1到C${preExtractedItems.length}），不能遗漏任何一个单元格。每个单元格的每一行内容都必须产生一个末级分类名
【关键规则】
- fullPath中的"一级类目"和"二级分类"必须严格使用路径中给出的名称，不要修改、缩写或替换
- 例如路径="母婴宠物 > 服饰"，则fullPath必须以"母婴宠物/服饰/"开头，不能写成"母婴宠物/婴儿服饰/"或其他变体
- 不同一级类目下可能存在同名的二级分类如"日用百货/服饰"和"母婴宠物/服饰"），这是正常的，必须分别保留
- parentId必须与路径中的二级分类名称完全一致
【预提取分类单元格列表】${itemsList}

【用户解析需求】${contextSection}
${countConstraint}

【精炼规则】${rulesSection}

【输出】只返回JSON，不要有任何其他文字。\`\`\`json
{
  "categories": [
    { "name": "末级分类名", "level": 3, "fullPath": "一级/二级/末级", "isLeaf": true, "parentId": "父级名称" }
  ]
}
\`\`\``;

    console.log('[parseWithAiRefined] === 开始AI精炼 ===');
    console.log('[parseWithAiRefined] 预提取单元格数 ' + preExtractedItems.length + ', 预估子项数 ' + totalSubItems);
    console.log('[parseWithAiRefined] 预期末级分类数 ' + (expectedCount || '未指定'));
    console.log('[parseWithAiRefined] prompt长度: ' + prompt.length + ' 字符');
    console.log('[parseWithAiRefined] prompt前500字 ' + prompt.substring(0, 500));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);
    try {
        const data = await callAiProxy(config, [
            { role: 'system', content: '你是一个专业的Excel分类表解析助手，只返回JSON格式结果。你的任务是根据用户需求从预提取的单元格列表中提取末级分类，正确拆分单元格内的多个分类项，不要自行添加不存在的分类。必须返回所有末级分类，不能遗漏。' },
            { role: 'user', content: prompt },
        ], 0.1, 32768, controller.signal);
        clearTimeout(timeoutId);

        const content = data.choices?.[0]?.message?.content
            || data.choices?.[0]?.message?.reasoning_content
            || '';

        console.log('[parseWithAiRefined] AI原始返回长度: ' + content.length + ' 字符');
        console.log('[parseWithAiRefined] AI原始返回前1000字 ' + content.substring(0, 1000));
        console.log('[parseWithAiRefined] AI原始返回后500字 ' + content.substring(Math.max(0, content.length - 500)));

        let cleaned = content
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```\s*$/, '')
            .trim();

        let jsonStr = '';
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonStr = jsonMatch[0];
        } else {
            jsonStr = cleaned;
        }

        const tryParse = (str: string): any | null => {
            try { return JSON.parse(str); } catch { return null; }
        };

        let parsed = tryParse(jsonStr);
        if (!parsed) {
            console.log('[parseWithAiRefined] JSON解析失败，尝试completeJson修复...');
            const completed = completeJson(jsonStr);
            if (completed) {
                parsed = tryParse(completed);
                if (parsed) {
                    console.log('[parseWithAiRefined] completeJson修复成功');
                }
            }
        }

        if (parsed && parsed.categories) {
            let categories = parsed.categories as any[];
            const beforeDedup = categories.length;
            console.log('[parseWithAiRefined] AI返回分类数 ' + beforeDedup);
            const seen = new Set<string>();
            categories = categories.filter((c: any) => {
                const fp = (c.fullPath || '').trim();
                const key = fp || `${(c.parentId || '').trim()}/${(c.name || '').trim()}/${c.level || 3}`;
                if (!key || seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            const afterDedup = categories.length;
            const pathSet = new Set(categories.map((c: any) => (c.fullPath || '').trim()).filter(Boolean));
            categories = categories.filter((c: any) => {
                const path = (c.fullPath || '').trim();
                if (!path) return true;
                for (const otherPath of pathSet) {
                    if (otherPath !== path && otherPath.startsWith(path + '/')) {
                        return false;
                    }
                }
                return true;
            });
            console.log('[parseWithAiRefined] 去重: ' + beforeDedup + ' → ' + afterDedup + ', 叶子过滤: ' + afterDedup + ' → ' + categories.length);
            console.log('[parseWithAiRefined] === AI精炼结束 ===');
                        return categories;
        }

        console.log('[parseWithAiRefined] JSON解析完全失败，content前300字 ' + content.substring(0, 300));
        console.log('[parseWithAiRefined] === AI精炼失败 ===');
                const preview = content.substring(0, 300).replace(/\n/g, ' ');
        throw new Error(`AI精炼格式解析失败: ${preview || '(空响应)'}`);
    } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            console.log('[parseWithAiRefined] AI解析超时');
                        throw new Error('AI解析超时（300秒），请尝试减少上传数据量或检查AI服务状态');
        }
        throw err;
    }
}

async function parseWithAiCorrectionRefined(
    preExtractedItems: { l1: string; l2: string; l3: string; fullPath: string }[],
    config: any,
    chatContext: { role: string; content: string }[],
    expectedCount: number,
    currentResult: any[]
): Promise<any[] | null> {
    const itemsList = preExtractedItems.map((item, i) => {
        const rawContent = item.l3.replace(/\r?\n/g, '\\n');
        const lines = item.l3.split(/\r?\n/).filter(s => s.trim());
        const subCount = lines.length;
        return `[C${i + 1}] 路径="${item.l1} > ${item.l2}" 内容="${rawContent}" (含${subCount}行)`;
    }).join('\n');
    const currentList = currentResult.map((c: any, i: number) => `${i + 1}. ${c.fullPath || c.name}`).join('\n');
    const diff = currentResult.length - expectedCount;
    const direction = diff > 0 ? `多出${diff}个` : `少了${Math.abs(diff)}个`;

    const prompt = `你之前精炼了一个分类列表，返回了${currentResult.length}个末级分类，但根据对话确认，正确的末级分类数量应为${expectedCount}个（${direction}）。
【格式说明】每个单元格条目格式为：[C序号] 路径="一级类目 > 二级分类" 内容="单元格原始文本" (含N行)
- 路径：该单元格所属的一级类目和二级分类
- 内容：单元格的原始文本，其中"\\n"表示单元格内换行（即多个分类项）
- 你需要将每个单元格内的多行内容拆分为独立的末级分类
【预提取分类单元格列表】（共${preExtractedItems.length}个单元格）${itemsList}

【对话记录】${chatContext.map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`).join('\n')}

【你之前的精炼结果】（${currentResult.length}个）
${currentList}

请重新审视预提取列表和对话记录，找出${direction}的分类并修正。常见错误包括：
- 将括号中的示例内容拆分为独立分类（但用户未要求拆分）
- 将顿号、斜杠分隔的并列项拆分为独立分类（但用户未要求拆分）
- 将非叶子节点误计为末级分类- 遗漏了某些末级分类- 单元格内的编号项被错误地作为分类名的一部分

【关键规则】
- fullPath中的"一级类目"和"二级分类"必须严格使用路径中给出的名称，不要修改、缩写或替换
- 不同一级类目下可能存在同名的二级分类，这是正常的，必须分别保留

返回正确的${expectedCount}个末级分类。
【输出】只返回JSON，不要有任何其他文字。\`\`\`json
{
  "categories": [
    { "name": "末级分类名", "level": 3, "fullPath": "一级/二级/末级", "isLeaf": true, "parentId": "父级名称" }
  ]
}
\`\`\``;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);
    try {
        const data = await callAiProxy(config, [
            { role: 'system', content: '你是一个专业的Excel分类表解析助手，只返回JSON格式结果。请严格按照预期数量返回分类。' },
            { role: 'user', content: prompt },
        ], 0.1, 32768, controller.signal);
        clearTimeout(timeoutId);

        const content = data.choices?.[0]?.message?.content
            || data.choices?.[0]?.message?.reasoning_content
            || '';

        let cleaned = content
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```\s*$/, '')
            .trim();

        let jsonStr = '';
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonStr = jsonMatch[0];
        } else {
            jsonStr = cleaned;
        }

        const tryParse = (str: string): any | null => {
            try { return JSON.parse(str); } catch { return null; }
        };

        let parsed = tryParse(jsonStr);
        if (!parsed) {
            const completed = completeJson(jsonStr);
            if (completed) {
                parsed = tryParse(completed);
            }
        }

        if (parsed && parsed.categories) {
            let categories = parsed.categories as any[];
            const seen = new Set<string>();
            categories = categories.filter((c: any) => {
                const fp = (c.fullPath || '').trim();
                const key = fp || `${(c.parentId || '').trim()}/${(c.name || '').trim()}/${c.level || 3}`;
                if (!key || seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            const pathSet = new Set(categories.map((c: any) => (c.fullPath || '').trim()).filter(Boolean));
            categories = categories.filter((c: any) => {
                const path = (c.fullPath || '').trim();
                if (!path) return true;
                for (const otherPath of pathSet) {
                    if (otherPath !== path && otherPath.startsWith(path + '/')) {
                        return false;
                    }
                }
                return true;
            });
            console.log('[CategoryParser] Correction refined returned', categories.length, 'categories (target:', expectedCount, ')');
            return categories;
        }

        return null;
    } catch (err: any) {
        clearTimeout(timeoutId);
        console.warn('[CategoryParser] Correction refined failed:', err.message);
        return null;
    }
}

async function parseWithAiCorrection(rawData: any[][], config: any, chatContext: { role: string; content: string }[], expectedCount: number, currentResult: any[]): Promise<any[] | null> {
    const compactData = rawData.map(row =>
        (row as any[]).map((cell: any) => {
            const s = String(cell || '').trim();
            return s || '';
        })
    );

    const preProcessed = normalizeCategoryTableData(rawData);
    let referenceSection = '';
    if (preProcessed.length > 0) {
        const refItems = preProcessed.map((r, i) => `${i + 1}. ${r.l1} / ${r.l2} / ${r.l3}`);
        referenceSection = `\n\n【程序化预提取参考】（共${preProcessed.length}条原始记录）\n${refItems.join('\n')}`;
    }

    const currentList = currentResult.map((c: any, i: number) => `${i + 1}. ${c.fullPath || c.name}`).join('\n');
    const diff = currentResult.length - expectedCount;
    const direction = diff > 0 ? `多出${diff}个` : `少了${Math.abs(diff)}个`;

    const prompt = `你之前解析了一个Excel分类表，返回了${currentResult.length}个末级分类，但根据对话确认，正确的末级分类数量应为${expectedCount}个（${direction}）。
【原始数据】（${rawData.length}行）
${JSON.stringify(compactData)}${referenceSection}

【对话记录】${chatContext.map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`).join('\n')}

【你之前的解析结果】（${currentResult.length}个）
${currentList}

请重新审视原始数据和对话记录，找出${direction}的分类并修正。常见错误包括：
- 将非叶子节点（有子分类的分类）误计为末级分类
- 将括号中的示例内容拆分为独立分类
- 将顿号、斜杠分隔的并列项拆分为独立分类（但用户未要求拆分）
- 遗漏了某些末级分类
返回正确的${expectedCount}个末级分类。
【输出】只返回JSON。\`\`\`json
{
  "categories": [
    { "name": "末级分类名", "level": 3, "fullPath": "一级/二级/末级", "isLeaf": true, "parentId": "父级名称" }
  ]
}
\`\`\``;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);
    try {
        const data = await callAiProxy(config, [
            { role: 'system', content: '你是一个专业的Excel分类表解析助手，只返回JSON格式结果。请严格按照预期数量返回分类。' },
            { role: 'user', content: prompt },
        ], 0.1, 32768, controller.signal);
        clearTimeout(timeoutId);

        const content = data.choices?.[0]?.message?.content
            || data.choices?.[0]?.message?.reasoning_content
            || '';

        let cleaned = content
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```\s*$/, '')
            .trim();

        let jsonStr = '';
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonStr = jsonMatch[0];
        } else {
            jsonStr = cleaned;
        }

        const tryParse = (str: string): any | null => {
            try { return JSON.parse(str); } catch { return null; }
        };

        let parsed = tryParse(jsonStr);
        if (!parsed) {
            const completed = completeJson(jsonStr);
            if (completed) {
                parsed = tryParse(completed);
            }
        }

        if (parsed && parsed.categories) {
            let categories = parsed.categories as any[];
            const seen = new Set<string>();
            categories = categories.filter((c: any) => {
                const fp = (c.fullPath || '').trim();
                const key = fp || `${(c.parentId || '').trim()}/${(c.name || '').trim()}/${c.level || 3}`;
                if (!key || seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            const pathSet = new Set(categories.map((c: any) => (c.fullPath || '').trim()).filter(Boolean));
            categories = categories.filter((c: any) => {
                const path = (c.fullPath || '').trim();
                if (!path) return true;
                for (const otherPath of pathSet) {
                    if (otherPath !== path && otherPath.startsWith(path + '/')) {
                        return false;
                    }
                }
                return true;
            });
            console.log('[CategoryParser] Correction returned', categories.length, 'categories (target:', expectedCount, ')');
            return categories;
        }

        return null;
    } catch (err: any) {
        clearTimeout(timeoutId);
        console.warn('[CategoryParser] Correction failed:', err.message);
        return null;
    }
}

function completeJson(truncated: string): string | null {
    let s = truncated.trim();
    if (!s.startsWith('{')) return null;

    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    let escape = false;

    for (const ch of s) {
        if (escape) { escape = false; continue; }
        if (ch === '\\') { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === '{') openBraces++;
        if (ch === '}') openBraces--;
        if (ch === '[') openBrackets++;
        if (ch === ']') openBrackets--;
    }

    while (openBrackets > 0) { s += ']'; openBrackets--; }
    while (openBraces > 0) { s += '}'; openBraces--; }

    return s !== truncated.trim() ? s : null;
}
