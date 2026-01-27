
export interface Region {
  code: string;
  name: string;
  children?: Region[];
}

export const REGION_DATA: Region[] = [
  {
    code: '330000',
    name: '浙江省',
    children: [
      {
        code: '330100',
        name: '杭州市',
        children: [
          { code: '330106', name: '西湖区' },
          { code: '330108', name: '滨江区' }
        ]
      }
    ]
  },
  {
    code: '310000',
    name: '上海市',
    children: [
      {
        code: '310100',
        name: '上海市',
        children: [
          { code: '310115', name: '浦东新区' },
          { code: '310104', name: '徐汇区' }
        ]
      }
    ]
  },
  {
    code: '110000',
    name: '北京市',
    children: [
      {
        code: '110100',
        name: '北京市',
        children: [
          { code: '110105', name: '朝阳区' },
          { code: '110108', name: '海淀区' }
        ]
      }
    ]
  },
  {
    code: '440000',
    name: '广东省',
    children: [
      {
        code: '440300',
        name: '深圳市',
        children: [
          { code: '440305', name: '南山区' },
          { code: '440304', name: '福田区' }
        ]
      },
      {
        code: '440100',
        name: '广州市',
        children: [
          { code: '440106', name: '天河区' },
          { code: '440104', name: '越秀区' }
        ]
      }
    ]
  },
  {
    code: '420000',
    name: '湖北省',
    children: [
      {
        code: '420100',
        name: '武汉市',
        children: [
          { code: '420111', name: '洪山区' },
          { code: '420106', name: '武昌区' }
        ]
      }
    ]
  },
  {
    code: '510000',
    name: '四川省',
    children: [
      {
        code: '510100',
        name: '成都市',
        children: [
          { code: '510107', name: '武侯区' },
          { code: '510104', name: '锦江区' }
        ]
      }
    ]
  },
  {
    code: '610000',
    name: '陕西省',
    children: [
      {
        code: '610100',
        name: '西安市',
        children: [
          { code: '610113', name: '雁塔区' },
          { code: '610104', name: '莲湖区' }
        ]
      }
    ]
  },
  {
    code: '210000',
    name: '辽宁省',
    children: [
      {
        code: '210100',
        name: '沈阳市',
        children: [
          { code: '210112', name: '浑南区' },
          { code: '210102', name: '和平区' }
        ]
      }
    ]
  },
  {
    code: '320000',
    name: '江苏省',
    children: [
      {
        code: '320100',
        name: '南京市',
        children: [
          { code: '320115', name: '江宁区' },
          { code: '320106', name: '鼓楼区' }
        ]
      }
    ]
  }
];

// Helper to get name by code
export const getRegionName = (code: string): string => {
  if (!code) return '';
  // Simple search
  for (const p of REGION_DATA) {
    if (p.code === code) return p.name;
    if (p.children) {
      for (const c of p.children) {
        if (c.code === code) return c.name;
        if (c.children) {
          for (const d of c.children) {
            if (d.code === code) return d.name;
          }
        }
      }
    }
  }
  return code; // Fallback to code if not found
};

// Helper to get full region path string "Province/City/District"
export const getRegionPath = (pCode: string, cCode: string, dCode: string): string => {
    return `${getRegionName(pCode)}/${getRegionName(cCode)}/${getRegionName(dCode)}`;
};
