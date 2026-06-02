import request from '../utils/request';

export interface SalesProject {
    id: number;
    projectId: string;
    projectName: string;
    platformName: string;
    description: string;
    isEnabled: boolean;
}

export interface ProjectCategory {
    id: number;
    projectCategoryId: string;
    parentId: string;
    level: number;
    name: string;
    fullPath: string;
    salesProjectId: string;
    isLeaf: boolean;
    sortOrder: number;
}

export interface CategoryMappingItem {
    id: number;
    systemCategoryId: string;
    systemCategoryName: string;
    systemCategoryFullPath: string;
    systemCategoryLevel: number;
    projectCategoryId: string;
    projectCategoryName: string;
    projectCategoryFullPath: string;
    salesProjectId: string;
    matchScore: string;
    matchMethod: string;
    matchStatus: string;
    createdBy: string;
}

export interface ProductCategoryItem {
    categoryId: string;
    parentId: string;
    level: number;
    name: string;
    fullPath: string;
    code: string;
    isEnabled: boolean;
}

export async function getSalesProjects(): Promise<SalesProject[]> {
    const res: any = await request.get('/sales-projects');
    return res?.data || res || [];
}

export async function getProjectCategories(salesProjectId: string): Promise<ProjectCategory[]> {
    const res: any = await request.get('/project-categories', { params: { salesProjectId } });
    return res?.data || res || [];
}

export async function getLeafProjectCategories(salesProjectId: string): Promise<ProjectCategory[]> {
    const res: any = await request.get('/project-categories/leaves', { params: { salesProjectId } });
    return res?.data || res || [];
}

export async function uploadCategoryTable(file: File): Promise<any[]> {
    const formData = new FormData();
    formData.append('file', file);
    const res: any = await request.post('/project-categories/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    const data: any[] = res?.data || res || [];
    if (data.length > 0 && data[0].rowData) {
        return data.map((item: any) => item.rowData || []);
    }
    return data;
}

export async function saveParsedCategories(salesProjectId: string, parsedData: any[]): Promise<ProjectCategory[]> {
    const res: any = await request.post('/project-categories/parse-with-ai', { salesProjectId, parsedData });
    return res?.data || res || [];
}

export async function deleteProjectCategories(salesProjectId: string): Promise<void> {
    await request.delete('/project-categories', { params: { salesProjectId } });
}

export async function getCategoryMappings(salesProjectId: string): Promise<CategoryMappingItem[]> {
    const res: any = await request.get('/category-mappings', { params: { salesProjectId } });
    return res?.data || res || [];
}

export async function autoMapCategories(salesProjectId: string, useAi: boolean): Promise<CategoryMappingItem[]> {
    const res: any = await request.post('/category-mappings/auto-map', { salesProjectId, useAi }, { timeout: 120000 });
    return res?.data || res || [];
}

export async function createManualMapping(mapping: Partial<CategoryMappingItem>): Promise<CategoryMappingItem> {
    const res: any = await request.post('/category-mappings', mapping);
    return res?.data || res;
}

export async function updateMapping(id: number, mapping: Partial<CategoryMappingItem>): Promise<CategoryMappingItem> {
    const res: any = await request.put(`/category-mappings/${id}`, mapping);
    return res?.data || res;
}

export async function deleteMapping(id: number): Promise<void> {
    await request.delete(`/category-mappings/${id}`);
}

export async function batchSaveMappings(salesProjectId: string, mappings: CategoryMappingItem[]): Promise<void> {
    await request.post('/category-mappings/batch-save', { salesProjectId, mappings }, { timeout: 60000 });
}

export async function reCompareMappings(salesProjectId: string, useAi: boolean): Promise<CategoryMappingItem[]> {
    const res: any = await request.post('/category-mappings/re-compare', { salesProjectId, useAi }, { timeout: 120000 });
    return res?.data || res || [];
}

export async function getProductCategories(params?: Record<string, any>): Promise<ProductCategoryItem[]> {
    const res: any = await request.get('/product-categories', { params });
    return res?.data || res || [];
}

export async function getAllProductCategories(): Promise<ProductCategoryItem[]> {
    const res: any = await request.get('/product-categories/all');
    return res?.data || res || [];
}

export async function createProductCategory(data: {
    name: string; parentId: string; level: number; fullPath: string;
}): Promise<ProductCategoryItem> {
    const res: any = await request.post('/product-categories', data);
    return res?.data || res;
}
