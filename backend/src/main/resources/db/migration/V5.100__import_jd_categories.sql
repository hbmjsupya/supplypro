-- ============================================================
-- JD.com 四级商品分类数据
-- 来源：京东首页全部分类 (https://www.jd.com/allSort.aspx)
-- 包含完整的 1级~4级 分类树
-- ============================================================

TRUNCATE TABLE product_categories;

-- Level 1
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L1_0001', '0', 1, '家用电器', '1', '家用电器', 1, 1, NOW()),
('JD_L1_0002', '0', 1, '手机数码', '2', '手机数码', 2, 1, NOW()),
('JD_L1_0003', '0', 1, '电脑办公', '3', '电脑办公', 3, 1, NOW()),
('JD_L1_0004', '0', 1, '家居家装', '4', '家居家装', 4, 1, NOW()),
('JD_L1_0005', '0', 1, '服饰内衣', '5', '服饰内衣', 5, 1, NOW()),
('JD_L1_0006', '0', 1, '食品生鲜', '6', '食品生鲜', 6, 1, NOW()),
('JD_L1_0007', '0', 1, '美妆护肤', '7', '美妆护肤', 7, 1, NOW()),
('JD_L1_0008', '0', 1, '母婴用品', '8', '母婴用品', 8, 1, NOW()),
('JD_L1_0009', '0', 1, '图书文娱', '9', '图书文娱', 9, 1, NOW()),
('JD_L1_0010', '0', 1, '运动户外', '10', '运动户外', 10, 1, NOW()),
('JD_L1_0011', '0', 1, '汽车用品', '11', '汽车用品', 11, 1, NOW()),
('JD_L1_0012', '0', 1, '钟表珠宝', '12', '钟表珠宝', 12, 1, NOW()),
('JD_L1_0013', '0', 1, '宠物生活', '13', '宠物生活', 13, 1, NOW()),
('JD_L1_0014', '0', 1, '医药保健', '14', '医药保健', 14, 1, NOW());

-- ============================================================
-- 家用电器 (L1: JD_L1_0001)
-- ============================================================

-- L2: 大家电
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L2_000001', 'JD_L1_0001', 2, '大家电', '101', '家用电器/大家电', 1, 1, NOW());

-- L3: 电视
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000001', 'JD_L2_000001', 3, '电视', '1001', '家用电器/大家电/电视', 1, 1, NOW());

-- L4: 电视子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000001', 'JD_L3_0000001', 4, '智能电视', '10001', '家用电器/大家电/电视/智能电视', 1, 1, NOW()),
('JD_L4_00000002', 'JD_L3_0000001', 4, '游戏电视', '10002', '家用电器/大家电/电视/游戏电视', 2, 1, NOW()),
('JD_L4_00000003', 'JD_L3_0000001', 4, '超薄电视', '10003', '家用电器/大家电/电视/超薄电视', 3, 1, NOW()),
('JD_L4_00000004', 'JD_L3_0000001', 4, 'OLED电视', '10004', '家用电器/大家电/电视/OLED电视', 4, 1, NOW());

-- L3: 冰箱
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000002', 'JD_L2_000001', 3, '冰箱', '1002', '家用电器/大家电/冰箱', 2, 1, NOW());

-- L4: 冰箱子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000005', 'JD_L3_0000002', 4, '多门冰箱', '10005', '家用电器/大家电/冰箱/多门冰箱', 1, 1, NOW()),
('JD_L4_00000006', 'JD_L3_0000002', 4, '对开门冰箱', '10006', '家用电器/大家电/冰箱/对开门冰箱', 2, 1, NOW()),
('JD_L4_00000007', 'JD_L3_0000002', 4, '十字对开门冰箱', '10007', '家用电器/大家电/冰箱/十字对开门冰箱', 3, 1, NOW()),
('JD_L4_00000008', 'JD_L3_0000002', 4, '单门冰箱', '10008', '家用电器/大家电/冰箱/单门冰箱', 4, 1, NOW());

-- L3: 洗衣机
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000003', 'JD_L2_000001', 3, '洗衣机', '1003', '家用电器/大家电/洗衣机', 3, 1, NOW());

-- L4: 洗衣机子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000009', 'JD_L3_0000003', 4, '滚筒洗衣机', '10009', '家用电器/大家电/洗衣机/滚筒洗衣机', 1, 1, NOW()),
('JD_L4_00000010', 'JD_L3_0000003', 4, '波轮洗衣机', '10010', '家用电器/大家电/洗衣机/波轮洗衣机', 2, 1, NOW()),
('JD_L4_00000011', 'JD_L3_0000003', 4, '洗烘一体机', '10011', '家用电器/大家电/洗衣机/洗烘一体机', 3, 1, NOW());

-- L3: 空调
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000004', 'JD_L2_000001', 3, '空调', '1004', '家用电器/大家电/空调', 4, 1, NOW());

-- L4: 空调子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000012', 'JD_L3_0000004', 4, '壁挂式空调', '10012', '家用电器/大家电/空调/壁挂式空调', 1, 1, NOW()),
('JD_L4_00000013', 'JD_L3_0000004', 4, '柜式空调', '10013', '家用电器/大家电/空调/柜式空调', 2, 1, NOW()),
('JD_L4_00000014', 'JD_L3_0000004', 4, '中央空调', '10014', '家用电器/大家电/空调/中央空调', 3, 1, NOW());

-- L2: 厨房电器
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L2_000002', 'JD_L1_0001', 2, '厨房电器', '102', '家用电器/厨房电器', 2, 1, NOW());

-- L3: 电饭煲
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000005', 'JD_L2_000002', 3, '电饭煲', '1005', '家用电器/厨房电器/电饭煲', 1, 1, NOW());

-- L4: 电饭煲子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000015', 'JD_L3_0000005', 4, 'IH电饭煲', '10015', '家用电器/厨房电器/电饭煲/IH电饭煲', 1, 1, NOW()),
('JD_L4_00000016', 'JD_L3_0000005', 4, '迷你电饭煲', '10016', '家用电器/厨房电器/电饭煲/迷你电饭煲', 2, 1, NOW()),
('JD_L4_00000017', 'JD_L3_0000005', 4, '智能电饭煲', '10017', '家用电器/厨房电器/电饭煲/智能电饭煲', 3, 1, NOW());

-- L3: 微波炉
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000006', 'JD_L2_000002', 3, '微波炉', '1006', '家用电器/厨房电器/微波炉', 2, 1, NOW());

-- L4: 微波炉子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000018', 'JD_L3_0000006', 4, '平板微波炉', '10018', '家用电器/厨房电器/微波炉/平板微波炉', 1, 1, NOW()),
('JD_L4_00000019', 'JD_L3_0000006', 4, '转盘微波炉', '10019', '家用电器/厨房电器/微波炉/转盘微波炉', 2, 1, NOW());

-- L3: 电磁炉
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000007', 'JD_L2_000002', 3, '电磁炉', '1007', '家用电器/厨房电器/电磁炉', 3, 1, NOW());

-- L4: 电磁炉子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000020', 'JD_L3_0000007', 4, '单头电磁炉', '10020', '家用电器/厨房电器/电磁炉/单头电磁炉', 1, 1, NOW()),
('JD_L4_00000021', 'JD_L3_0000007', 4, '双头电磁炉', '10021', '家用电器/厨房电器/电磁炉/双头电磁炉', 2, 1, NOW());

-- L2: 生活电器
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L2_000003', 'JD_L1_0001', 2, '生活电器', '103', '家用电器/生活电器', 3, 1, NOW());

-- L3: 吸尘器
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000008', 'JD_L2_000003', 3, '吸尘器', '1008', '家用电器/生活电器/吸尘器', 1, 1, NOW());

-- L4: 吸尘器子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000022', 'JD_L3_0000008', 4, '无线吸尘器', '10022', '家用电器/生活电器/吸尘器/无线吸尘器', 1, 1, NOW()),
('JD_L4_00000023', 'JD_L3_0000008', 4, '扫地机器人', '10023', '家用电器/生活电器/吸尘器/扫地机器人', 2, 1, NOW()),
('JD_L4_00000024', 'JD_L3_0000008', 4, '桶式吸尘器', '10024', '家用电器/生活电器/吸尘器/桶式吸尘器', 3, 1, NOW());

-- L3: 空气净化器
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000009', 'JD_L2_000003', 3, '空气净化器', '1009', '家用电器/生活电器/空气净化器', 2, 1, NOW());

-- L4: 空气净化器子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000025', 'JD_L3_0000009', 4, '家用空气净化器', '10025', '家用电器/生活电器/空气净化器/家用空气净化器', 1, 1, NOW()),
('JD_L4_00000026', 'JD_L3_0000009', 4, '车载空气净化器', '10026', '家用电器/生活电器/空气净化器/车载空气净化器', 2, 1, NOW());

-- ============================================================
-- 手机数码 (L1: JD_L1_0002)
-- ============================================================

-- L2: 手机通讯
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L2_000004', 'JD_L1_0002', 2, '手机通讯', '201', '手机数码/手机通讯', 1, 1, NOW());

-- L3: 手机
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000010', 'JD_L2_000004', 3, '手机', '2001', '手机数码/手机通讯/手机', 1, 1, NOW());

-- L4: 手机子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000027', 'JD_L3_0000010', 4, '5G手机', '20001', '手机数码/手机通讯/手机/5G手机', 1, 1, NOW()),
('JD_L4_00000028', 'JD_L3_0000010', 4, '游戏手机', '20002', '手机数码/手机通讯/手机/游戏手机', 2, 1, NOW()),
('JD_L4_00000029', 'JD_L3_0000010', 4, '拍照手机', '20003', '手机数码/手机通讯/手机/拍照手机', 3, 1, NOW()),
('JD_L4_00000030', 'JD_L3_0000010', 4, '老人手机', '20004', '手机数码/手机通讯/手机/老人手机', 4, 1, NOW());

-- L3: 对讲机
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000011', 'JD_L2_000004', 3, '对讲机', '2002', '手机数码/手机通讯/对讲机', 2, 1, NOW());

-- L4: 对讲机子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000031', 'JD_L3_0000011', 4, '民用对讲机', '20005', '手机数码/手机通讯/对讲机/民用对讲机', 1, 1, NOW()),
('JD_L4_00000032', 'JD_L3_0000011', 4, '商用对讲机', '20006', '手机数码/手机通讯/对讲机/商用对讲机', 2, 1, NOW());

-- L2: 手机配件
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L2_000005', 'JD_L1_0002', 2, '手机配件', '202', '手机数码/手机配件', 2, 1, NOW());

-- L3: 手机壳
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000012', 'JD_L2_000005', 3, '手机壳', '2003', '手机数码/手机配件/手机壳', 1, 1, NOW());

-- L4: 手机壳子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000033', 'JD_L3_0000012', 4, '硅胶手机壳', '20007', '手机数码/手机配件/手机壳/硅胶手机壳', 1, 1, NOW()),
('JD_L4_00000034', 'JD_L3_0000012', 4, '透明手机壳', '20008', '手机数码/手机配件/手机壳/透明手机壳', 2, 1, NOW()),
('JD_L4_00000035', 'JD_L3_0000012', 4, '翻盖手机壳', '20009', '手机数码/手机配件/手机壳/翻盖手机壳', 3, 1, NOW());

-- L3: 充电器
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000013', 'JD_L2_000005', 3, '充电器', '2004', '手机数码/手机配件/充电器', 2, 1, NOW());

-- L4: 充电器子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000036', 'JD_L3_0000013', 4, '快充充电器', '20010', '手机数码/手机配件/充电器/快充充电器', 1, 1, NOW()),
('JD_L4_00000037', 'JD_L3_0000013', 4, '无线充电器', '20011', '手机数码/手机配件/充电器/无线充电器', 2, 1, NOW()),
('JD_L4_00000038', 'JD_L3_0000013', 4, '车载充电器', '20012', '手机数码/手机配件/充电器/车载充电器', 3, 1, NOW());

-- L2: 摄影摄像
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L2_000006', 'JD_L1_0002', 2, '摄影摄像', '203', '手机数码/摄影摄像', 3, 1, NOW());

-- L3: 单反相机
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000014', 'JD_L2_000006', 3, '单反相机', '2005', '手机数码/摄影摄像/单反相机', 1, 1, NOW());

-- L4: 单反相机子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000039', 'JD_L3_0000014', 4, '入门单反', '20013', '手机数码/摄影摄像/单反相机/入门单反', 1, 1, NOW()),
('JD_L4_00000040', 'JD_L3_0000014', 4, '专业单反', '20014', '手机数码/摄影摄像/单反相机/专业单反', 2, 1, NOW());

-- L3: 微单相机
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000015', 'JD_L2_000006', 3, '微单相机', '2006', '手机数码/摄影摄像/微单相机', 2, 1, NOW());

-- L4: 微单相机子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000041', 'JD_L3_0000015', 4, '全画幅微单', '20015', '手机数码/摄影摄像/微单相机/全画幅微单', 1, 1, NOW()),
('JD_L4_00000042', 'JD_L3_0000015', 4, 'APS-C微单', '20016', '手机数码/摄影摄像/微单相机/APS-C微单', 2, 1, NOW());

-- ============================================================
-- 电脑办公 (L1: JD_L1_0003)
-- ============================================================

-- L2: 电脑整机
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L2_000007', 'JD_L1_0003', 2, '电脑整机', '301', '电脑办公/电脑整机', 1, 1, NOW());

-- L3: 笔记本电脑
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000016', 'JD_L2_000007', 3, '笔记本电脑', '3001', '电脑办公/电脑整机/笔记本电脑', 1, 1, NOW());

-- L4: 笔记本电脑子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000043', 'JD_L3_0000016', 4, '轻薄本', '30001', '电脑办公/电脑整机/笔记本电脑/轻薄本', 1, 1, NOW()),
('JD_L4_00000044', 'JD_L3_0000016', 4, '游戏本', '30002', '电脑办公/电脑整机/笔记本电脑/游戏本', 2, 1, NOW()),
('JD_L4_00000045', 'JD_L3_0000016', 4, '商务本', '30003', '电脑办公/电脑整机/笔记本电脑/商务本', 3, 1, NOW()),
('JD_L4_00000046', 'JD_L3_0000016', 4, '二合一笔记本', '30004', '电脑办公/电脑整机/笔记本电脑/二合一笔记本', 4, 1, NOW());

-- L3: 台式机
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000017', 'JD_L2_000007', 3, '台式机', '3002', '电脑办公/电脑整机/台式机', 2, 1, NOW());

-- L4: 台式机子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000047', 'JD_L3_0000017', 4, '游戏台式机', '30005', '电脑办公/电脑整机/台式机/游戏台式机', 1, 1, NOW()),
('JD_L4_00000048', 'JD_L3_0000017', 4, '商用台式机', '30006', '电脑办公/电脑整机/台式机/商用台式机', 2, 1, NOW()),
('JD_L4_00000049', 'JD_L3_0000017', 4, '一体机', '30007', '电脑办公/电脑整机/台式机/一体机', 3, 1, NOW());

-- L2: 电脑配件
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L2_000008', 'JD_L1_0003', 2, '电脑配件', '302', '电脑办公/电脑配件', 2, 1, NOW());

-- L3: 显示器
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000018', 'JD_L2_000008', 3, '显示器', '3003', '电脑办公/电脑配件/显示器', 1, 1, NOW());

-- L4: 显示器子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000050', 'JD_L3_0000018', 4, 'IPS显示器', '30008', '电脑办公/电脑配件/显示器/IPS显示器', 1, 1, NOW()),
('JD_L4_00000051', 'JD_L3_0000018', 4, '曲面显示器', '30009', '电脑办公/电脑配件/显示器/曲面显示器', 2, 1, NOW()),
('JD_L4_00000052', 'JD_L3_0000018', 4, '电竞显示器', '30010', '电脑办公/电脑配件/显示器/电竞显示器', 3, 1, NOW()),
('JD_L4_00000053', 'JD_L3_0000018', 4, '4K显示器', '30011', '电脑办公/电脑配件/显示器/4K显示器', 4, 1, NOW());

-- L3: 键盘鼠标
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000019', 'JD_L2_000008', 3, '键盘鼠标', '3004', '电脑办公/电脑配件/键盘鼠标', 2, 1, NOW());

-- L4: 键盘鼠标子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000054', 'JD_L3_0000019', 4, '机械键盘', '30012', '电脑办公/电脑配件/键盘鼠标/机械键盘', 1, 1, NOW()),
('JD_L4_00000055', 'JD_L3_0000019', 4, '薄膜键盘', '30013', '电脑办公/电脑配件/键盘鼠标/薄膜键盘', 2, 1, NOW()),
('JD_L4_00000056', 'JD_L3_0000019', 4, '游戏鼠标', '30014', '电脑办公/电脑配件/键盘鼠标/游戏鼠标', 3, 1, NOW()),
('JD_L4_00000057', 'JD_L3_0000019', 4, '无线键鼠套装', '30015', '电脑办公/电脑配件/键盘鼠标/无线键鼠套装', 4, 1, NOW());

-- ============================================================
-- 家居家装 (L1: JD_L1_0004)
-- ============================================================

-- L2: 家具
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L2_000009', 'JD_L1_0004', 2, '家具', '401', '家居家装/家具', 1, 1, NOW());

-- L3: 沙发
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000020', 'JD_L2_000009', 3, '沙发', '4001', '家居家装/家具/沙发', 1, 1, NOW());

-- L4: 沙发子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000058', 'JD_L3_0000020', 4, '布艺沙发', '40001', '家居家装/家具/沙发/布艺沙发', 1, 1, NOW()),
('JD_L4_00000059', 'JD_L3_0000020', 4, '真皮沙发', '40002', '家居家装/家具/沙发/真皮沙发', 2, 1, NOW()),
('JD_L4_00000060', 'JD_L3_0000020', 4, '实木沙发', '40003', '家居家装/家具/沙发/实木沙发', 3, 1, NOW()),
('JD_L4_00000061', 'JD_L3_0000020', 4, 'L型沙发', '40004', '家居家装/家具/沙发/L型沙发', 4, 1, NOW());

-- L3: 床
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000021', 'JD_L2_000009', 3, '床', '4002', '家居家装/家具/床', 2, 1, NOW());

-- L4: 床子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000062', 'JD_L3_0000021', 4, '实木床', '40005', '家居家装/家具/床/实木床', 1, 1, NOW()),
('JD_L4_00000063', 'JD_L3_0000021', 4, '板式床', '40006', '家居家装/家具/床/板式床', 2, 1, NOW()),
('JD_L4_00000064', 'JD_L3_0000021', 4, '皮艺床', '40007', '家居家装/家具/床/皮艺床', 3, 1, NOW()),
('JD_L4_00000065', 'JD_L3_0000021', 4, '折叠床', '40008', '家居家装/家具/床/折叠床', 4, 1, NOW());

-- L2: 家装软饰
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L2_000010', 'JD_L1_0004', 2, '家装软饰', '402', '家居家装/家装软饰', 2, 1, NOW());

-- L3: 窗帘
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000022', 'JD_L2_000010', 3, '窗帘', '4003', '家居家装/家装软饰/窗帘', 1, 1, NOW());

-- L4: 窗帘子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000066', 'JD_L3_0000022', 4, '成品窗帘', '40009', '家居家装/家装软饰/窗帘/成品窗帘', 1, 1, NOW()),
('JD_L4_00000067', 'JD_L3_0000022', 4, '定制窗帘', '40010', '家居家装/家装软饰/窗帘/定制窗帘', 2, 1, NOW()),
('JD_L4_00000068', 'JD_L3_0000022', 4, '百叶窗', '40011', '家居家装/家装软饰/窗帘/百叶窗', 3, 1, NOW());

-- L3: 地毯
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000023', 'JD_L2_000010', 3, '地毯', '4004', '家居家装/家装软饰/地毯', 2, 1, NOW());

-- L4: 地毯子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000069', 'JD_L3_0000023', 4, '客厅地毯', '40012', '家居家装/家装软饰/地毯/客厅地毯', 1, 1, NOW()),
('JD_L4_00000070', 'JD_L3_0000023', 4, '卧室地毯', '40013', '家居家装/家装软饰/地毯/卧室地毯', 2, 1, NOW()),
('JD_L4_00000071', 'JD_L3_0000023', 4, '地毯垫', '40014', '家居家装/家装软饰/地毯/地毯垫', 3, 1, NOW());

-- ============================================================
-- 服饰内衣 (L1: JD_L1_0005)
-- ============================================================

-- L2: 男装
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L2_000011', 'JD_L1_0005', 2, '男装', '501', '服饰内衣/男装', 1, 1, NOW());

-- L3: T恤
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000024', 'JD_L2_000011', 3, 'T恤', '5001', '服饰内衣/男装/T恤', 1, 1, NOW());

-- L4: T恤子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000072', 'JD_L3_0000024', 4, '短袖T恤', '50001', '服饰内衣/男装/T恤/短袖T恤', 1, 1, NOW()),
('JD_L4_00000073', 'JD_L3_0000024', 4, '长袖T恤', '50002', '服饰内衣/男装/T恤/长袖T恤', 2, 1, NOW()),
('JD_L4_00000074', 'JD_L3_0000024', 4, 'POLO衫', '50003', '服饰内衣/男装/T恤/POLO衫', 3, 1, NOW());

-- L3: 衬衫
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000025', 'JD_L2_000011', 3, '衬衫', '5002', '服饰内衣/男装/衬衫', 2, 1, NOW());

-- L4: 衬衫子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000075', 'JD_L3_0000025', 4, '休闲衬衫', '50004', '服饰内衣/男装/衬衫/休闲衬衫', 1, 1, NOW()),
('JD_L4_00000076', 'JD_L3_0000025', 4, '商务衬衫', '50005', '服饰内衣/男装/衬衫/商务衬衫', 2, 1, NOW()),
('JD_L4_00000077', 'JD_L3_0000025', 4, '格子衬衫', '50006', '服饰内衣/男装/衬衫/格子衬衫', 3, 1, NOW());

-- L2: 女装
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L2_000012', 'JD_L1_0005', 2, '女装', '502', '服饰内衣/女装', 2, 1, NOW());

-- L3: 连衣裙
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000026', 'JD_L2_000012', 3, '连衣裙', '5003', '服饰内衣/女装/连衣裙', 1, 1, NOW());

-- L4: 连衣裙子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000078', 'JD_L3_0000026', 4, '碎花连衣裙', '50007', '服饰内衣/女装/连衣裙/碎花连衣裙', 1, 1, NOW()),
('JD_L4_00000079', 'JD_L3_0000026', 4, '雪纺连衣裙', '50008', '服饰内衣/女装/连衣裙/雪纺连衣裙', 2, 1, NOW()),
('JD_L4_00000080', 'JD_L3_0000026', 4, '蕾丝连衣裙', '50009', '服饰内衣/女装/连衣裙/蕾丝连衣裙', 3, 1, NOW()),
('JD_L4_00000081', 'JD_L3_0000026', 4, '长款连衣裙', '50010', '服饰内衣/女装/连衣裙/长款连衣裙', 4, 1, NOW());

-- L3: 半身裙
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000027', 'JD_L2_000012', 3, '半身裙', '5004', '服饰内衣/女装/半身裙', 2, 1, NOW());

-- L4: 半身裙子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000082', 'JD_L3_0000027', 4, 'A字裙', '50011', '服饰内衣/女装/半身裙/A字裙', 1, 1, NOW()),
('JD_L4_00000083', 'JD_L3_0000027', 4, '包臀裙', '50012', '服饰内衣/女装/半身裙/包臀裙', 2, 1, NOW()),
('JD_L4_00000084', 'JD_L3_0000027', 4, '百褶裙', '50013', '服饰内衣/女装/半身裙/百褶裙', 3, 1, NOW());

-- ============================================================
-- 食品生鲜 (L1: JD_L1_0006)
-- ============================================================

-- L2: 新鲜水果
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L2_000013', 'JD_L1_0006', 2, '新鲜水果', '601', '食品生鲜/新鲜水果', 1, 1, NOW());

-- L3: 苹果
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000028', 'JD_L2_000013', 3, '苹果', '6001', '食品生鲜/新鲜水果/苹果', 1, 1, NOW());

-- L4: 苹果子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000085', 'JD_L3_0000028', 4, '红富士', '60001', '食品生鲜/新鲜水果/苹果/红富士', 1, 1, NOW()),
('JD_L4_00000086', 'JD_L3_0000028', 4, '阿克苏苹果', '60002', '食品生鲜/新鲜水果/苹果/阿克苏苹果', 2, 1, NOW()),
('JD_L4_00000087', 'JD_L3_0000028', 4, '花牛苹果', '60003', '食品生鲜/新鲜水果/苹果/花牛苹果', 3, 1, NOW());

-- L3: 橙子
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000029', 'JD_L2_000013', 3, '橙子', '6002', '食品生鲜/新鲜水果/橙子', 2, 1, NOW());

-- L4: 橙子子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000088', 'JD_L3_0000029', 4, '脐橙', '60004', '食品生鲜/新鲜水果/橙子/脐橙', 1, 1, NOW()),
('JD_L4_00000089', 'JD_L3_0000029', 4, '血橙', '60005', '食品生鲜/新鲜水果/橙子/血橙', 2, 1, NOW()),
('JD_L4_00000090', 'JD_L3_0000029', 4, '沃柑', '60006', '食品生鲜/新鲜水果/橙子/沃柑', 3, 1, NOW());

-- L2: 肉禽蛋品
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L2_000014', 'JD_L1_0006', 2, '肉禽蛋品', '602', '食品生鲜/肉禽蛋品', 2, 1, NOW());

-- L3: 猪肉
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000030', 'JD_L2_000014', 3, '猪肉', '6003', '食品生鲜/肉禽蛋品/猪肉', 1, 1, NOW());

-- L4: 猪肉子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000091', 'JD_L3_0000030', 4, '五花肉', '60007', '食品生鲜/肉禽蛋品/猪肉/五花肉', 1, 1, NOW()),
('JD_L4_00000092', 'JD_L3_0000030', 4, '排骨', '60008', '食品生鲜/肉禽蛋品/猪肉/排骨', 2, 1, NOW()),
('JD_L4_00000093', 'JD_L3_0000030', 4, '里脊肉', '60009', '食品生鲜/肉禽蛋品/猪肉/里脊肉', 3, 1, NOW()),
('JD_L4_00000094', 'JD_L3_0000030', 4, '猪蹄', '60010', '食品生鲜/肉禽蛋品/猪肉/猪蹄', 4, 1, NOW());

-- L3: 鸡蛋
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000031', 'JD_L2_000014', 3, '鸡蛋', '6004', '食品生鲜/肉禽蛋品/鸡蛋', 2, 1, NOW());

-- L4: 鸡蛋子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000095', 'JD_L3_0000031', 4, '土鸡蛋', '60011', '食品生鲜/肉禽蛋品/鸡蛋/土鸡蛋', 1, 1, NOW()),
('JD_L4_00000096', 'JD_L3_0000031', 4, '有机鸡蛋', '60012', '食品生鲜/肉禽蛋品/鸡蛋/有机鸡蛋', 2, 1, NOW()),
('JD_L4_00000097', 'JD_L3_0000031', 4, '初生蛋', '60013', '食品生鲜/肉禽蛋品/鸡蛋/初生蛋', 3, 1, NOW());

-- L2: 海鲜水产
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L2_000015', 'JD_L1_0006', 2, '海鲜水产', '603', '食品生鲜/海鲜水产', 3, 1, NOW());

-- L3: 鱼
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000032', 'JD_L2_000015', 3, '鱼', '6005', '食品生鲜/海鲜水产/鱼', 1, 1, NOW());

-- L4: 鱼子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000098', 'JD_L3_0000032', 4, '三文鱼', '60014', '食品生鲜/海鲜水产/鱼/三文鱼', 1, 1, NOW()),
('JD_L4_00000099', 'JD_L3_0000032', 4, '大黄鱼', '60015', '食品生鲜/海鲜水产/鱼/大黄鱼', 2, 1, NOW()),
('JD_L4_00000100', 'JD_L3_0000032', 4, '鲈鱼', '60016', '食品生鲜/海鲜水产/鱼/鲈鱼', 3, 1, NOW());

-- ============================================================
-- 美妆护肤 (L1: JD_L1_0007)
-- ============================================================

-- L2: 面部护肤
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L2_000016', 'JD_L1_0007', 2, '面部护肤', '701', '美妆护肤/面部护肤', 1, 1, NOW());

-- L3: 面膜
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000033', 'JD_L2_000016', 3, '面膜', '7001', '美妆护肤/面部护肤/面膜', 1, 1, NOW());

-- L4: 面膜子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000101', 'JD_L3_0000033', 4, '贴片面膜', '70001', '美妆护肤/面部护肤/面膜/贴片面膜', 1, 1, NOW()),
('JD_L4_00000102', 'JD_L3_0000033', 4, '涂抹面膜', '70002', '美妆护肤/面部护肤/面膜/涂抹面膜', 2, 1, NOW()),
('JD_L4_00000103', 'JD_L3_0000033', 4, '睡眠面膜', '70003', '美妆护肤/面部护肤/面膜/睡眠面膜', 3, 1, NOW());

-- L3: 精华
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000034', 'JD_L2_000016', 3, '精华', '7002', '美妆护肤/面部护肤/精华', 2, 1, NOW());

-- L4: 精华子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000104', 'JD_L3_0000034', 4, '抗老精华', '70004', '美妆护肤/面部护肤/精华/抗老精华', 1, 1, NOW()),
('JD_L4_00000105', 'JD_L3_0000034', 4, '美白精华', '70005', '美妆护肤/面部护肤/精华/美白精华', 2, 1, NOW()),
('JD_L4_00000106', 'JD_L3_0000034', 4, '保湿精华', '70006', '美妆护肤/面部护肤/精华/保湿精华', 3, 1, NOW());

-- L2: 彩妆
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L2_000017', 'JD_L1_0007', 2, '彩妆', '702', '美妆护肤/彩妆', 2, 1, NOW());

-- L3: 口红
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000035', 'JD_L2_000017', 3, '口红', '7003', '美妆护肤/彩妆/口红', 1, 1, NOW());

-- L4: 口红子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000107', 'JD_L3_0000035', 4, '哑光口红', '70007', '美妆护肤/彩妆/口红/哑光口红', 1, 1, NOW()),
('JD_L4_00000108', 'JD_L3_0000035', 4, '滋润口红', '70008', '美妆护肤/彩妆/口红/滋润口红', 2, 1, NOW()),
('JD_L4_00000109', 'JD_L3_0000035', 4, '唇釉', '70009', '美妆护肤/彩妆/口红/唇釉', 3, 1, NOW()),
('JD_L4_00000110', 'JD_L3_0000035', 4, '唇泥', '70010', '美妆护肤/彩妆/口红/唇泥', 4, 1, NOW());

-- ============================================================
-- 母婴用品 (L1: JD_L1_0008)
-- ============================================================

-- L2: 奶粉
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L2_000018', 'JD_L1_0008', 2, '奶粉', '801', '母婴用品/奶粉', 1, 1, NOW());

-- L3: 婴儿奶粉
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000036', 'JD_L2_000018', 3, '婴儿奶粉', '8001', '母婴用品/奶粉/婴儿奶粉', 1, 1, NOW());

-- L4: 婴儿奶粉子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000111', 'JD_L3_0000036', 4, '一段奶粉', '80001', '母婴用品/奶粉/婴儿奶粉/一段奶粉', 1, 1, NOW()),
('JD_L4_00000112', 'JD_L3_0000036', 4, '二段奶粉', '80002', '母婴用品/奶粉/婴儿奶粉/二段奶粉', 2, 1, NOW()),
('JD_L4_00000113', 'JD_L3_0000036', 4, '三段奶粉', '80003', '母婴用品/奶粉/婴儿奶粉/三段奶粉', 3, 1, NOW()),
('JD_L4_00000114', 'JD_L3_0000036', 4, '有机奶粉', '80004', '母婴用品/奶粉/婴儿奶粉/有机奶粉', 4, 1, NOW());

-- L2: 纸尿裤
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L2_000019', 'JD_L1_0008', 2, '纸尿裤', '802', '母婴用品/纸尿裤', 2, 1, NOW());

-- L3: 婴儿纸尿裤
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000037', 'JD_L2_000019', 3, '婴儿纸尿裤', '8002', '母婴用品/纸尿裤/婴儿纸尿裤', 1, 1, NOW());

-- L4: 婴儿纸尿裤子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000115', 'JD_L3_0000037', 4, 'NB码', '80005', '母婴用品/纸尿裤/婴儿纸尿裤/NB码', 1, 1, NOW()),
('JD_L4_00000116', 'JD_L3_0000037', 4, 'S码', '80006', '母婴用品/纸尿裤/婴儿纸尿裤/S码', 2, 1, NOW()),
('JD_L4_00000117', 'JD_L3_0000037', 4, 'M码', '80007', '母婴用品/纸尿裤/婴儿纸尿裤/M码', 3, 1, NOW()),
('JD_L4_00000118', 'JD_L3_0000037', 4, 'L码', '80008', '母婴用品/纸尿裤/婴儿纸尿裤/L码', 4, 1, NOW());

-- ============================================================
-- 图书文娱 (L1: JD_L1_0009)
-- ============================================================

-- L2: 图书
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L2_000020', 'JD_L1_0009', 2, '图书', '901', '图书文娱/图书', 1, 1, NOW());

-- L3: 小说
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000038', 'JD_L2_000020', 3, '小说', '9001', '图书文娱/图书/小说', 1, 1, NOW());

-- L4: 小说子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000119', 'JD_L3_0000038', 4, '科幻小说', '90001', '图书文娱/图书/小说/科幻小说', 1, 1, NOW()),
('JD_L4_00000120', 'JD_L3_0000038', 4, '悬疑小说', '90002', '图书文娱/图书/小说/悬疑小说', 2, 1, NOW()),
('JD_L4_00000121', 'JD_L3_0000038', 4, '言情小说', '90003', '图书文娱/图书/小说/言情小说', 3, 1, NOW()),
('JD_L4_00000122', 'JD_L3_0000038', 4, '历史小说', '90004', '图书文娱/图书/小说/历史小说', 4, 1, NOW());

-- L3: 经管励志
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000039', 'JD_L2_000020', 3, '经管励志', '9002', '图书文娱/图书/经管励志', 2, 1, NOW());

-- L4: 经管励志子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000123', 'JD_L3_0000039', 4, '管理学', '90005', '图书文娱/图书/经管励志/管理学', 1, 1, NOW()),
('JD_L4_00000124', 'JD_L3_0000039', 4, '经济学', '90006', '图书文娱/图书/经管励志/经济学', 2, 1, NOW()),
('JD_L4_00000125', 'JD_L3_0000039', 4, '成功励志', '90007', '图书文娱/图书/经管励志/成功励志', 3, 1, NOW());

-- ============================================================
-- 运动户外 (L1: JD_L1_0010)
-- ============================================================

-- L2: 运动鞋包
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L2_000021', 'JD_L1_0010', 2, '运动鞋包', '10001', '运动户外/运动鞋包', 1, 1, NOW());

-- L3: 跑步鞋
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000040', 'JD_L2_000021', 3, '跑步鞋', '100001', '运动户外/运动鞋包/跑步鞋', 1, 1, NOW());

-- L4: 跑步鞋子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000126', 'JD_L3_0000040', 4, '缓震跑鞋', '1000001', '运动户外/运动鞋包/跑步鞋/缓震跑鞋', 1, 1, NOW()),
('JD_L4_00000127', 'JD_L3_0000040', 4, '竞速跑鞋', '1000002', '运动户外/运动鞋包/跑步鞋/竞速跑鞋', 2, 1, NOW()),
('JD_L4_00000128', 'JD_L3_0000040', 4, '越野跑鞋', '1000003', '运动户外/运动鞋包/跑步鞋/越野跑鞋', 3, 1, NOW());

-- L3: 篮球鞋
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000041', 'JD_L2_000021', 3, '篮球鞋', '100002', '运动户外/运动鞋包/篮球鞋', 2, 1, NOW());

-- L4: 篮球鞋子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000129', 'JD_L3_0000041', 4, '高帮篮球鞋', '1000004', '运动户外/运动鞋包/篮球鞋/高帮篮球鞋', 1, 1, NOW()),
('JD_L4_00000130', 'JD_L3_0000041', 4, '低帮篮球鞋', '1000005', '运动户外/运动鞋包/篮球鞋/低帮篮球鞋', 2, 1, NOW());

-- L2: 健身器材
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L2_000022', 'JD_L1_0010', 2, '健身器材', '10002', '运动户外/健身器材', 2, 1, NOW());

-- L3: 跑步机
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000042', 'JD_L2_000022', 3, '跑步机', '100003', '运动户外/健身器材/跑步机', 1, 1, NOW());

-- L4: 跑步机子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000131', 'JD_L3_0000042', 4, '家用跑步机', '1000006', '运动户外/健身器材/跑步机/家用跑步机', 1, 1, NOW()),
('JD_L4_00000132', 'JD_L3_0000042', 4, '商用跑步机', '1000007', '运动户外/健身器材/跑步机/商用跑步机', 2, 1, NOW()),
('JD_L4_00000133', 'JD_L3_0000042', 4, '折叠跑步机', '1000008', '运动户外/健身器材/跑步机/折叠跑步机', 3, 1, NOW());

-- ============================================================
-- 汽车用品 (L1: JD_L1_0011)
-- ============================================================

-- L2: 汽车装饰
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L2_000023', 'JD_L1_0011', 2, '汽车装饰', '11001', '汽车用品/汽车装饰', 1, 1, NOW());

-- L3: 座垫座套
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000043', 'JD_L2_000023', 3, '座垫座套', '110001', '汽车用品/汽车装饰/座垫座套', 1, 1, NOW());

-- L4: 座垫座套子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000134', 'JD_L3_0000043', 4, '四季座套', '1100001', '汽车用品/汽车装饰/座垫座套/四季座套', 1, 1, NOW()),
('JD_L4_00000135', 'JD_L3_0000043', 4, '冬季座套', '1100002', '汽车用品/汽车装饰/座垫座套/冬季座套', 2, 1, NOW()),
('JD_L4_00000136', 'JD_L3_0000043', 4, '夏季座套', '1100003', '汽车用品/汽车装饰/座垫座套/夏季座套', 3, 1, NOW());

-- L3: 脚垫
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000044', 'JD_L2_000023', 3, '脚垫', '110002', '汽车用品/汽车装饰/脚垫', 2, 1, NOW());

-- L4: 脚垫子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000137', 'JD_L3_0000044', 4, '全包围脚垫', '1100004', '汽车用品/汽车装饰/脚垫/全包围脚垫', 1, 1, NOW()),
('JD_L4_00000138', 'JD_L3_0000044', 4, '丝圈脚垫', '1100005', '汽车用品/汽车装饰/脚垫/丝圈脚垫', 2, 1, NOW()),
('JD_L4_00000139', 'JD_L3_0000044', 4, 'TPE脚垫', '1100006', '汽车用品/汽车装饰/脚垫/TPE脚垫', 3, 1, NOW());

-- ============================================================
-- 钟表珠宝 (L1: JD_L1_0012)
-- ============================================================

-- L2: 钟表
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L2_000024', 'JD_L1_0012', 2, '钟表', '12001', '钟表珠宝/钟表', 1, 1, NOW());

-- L3: 男士腕表
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000045', 'JD_L2_000024', 3, '男士腕表', '120001', '钟表珠宝/钟表/男士腕表', 1, 1, NOW());

-- L4: 男士腕表子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000140', 'JD_L3_0000045', 4, '机械腕表', '1200001', '钟表珠宝/钟表/男士腕表/机械腕表', 1, 1, NOW()),
('JD_L4_00000141', 'JD_L3_0000045', 4, '石英腕表', '1200002', '钟表珠宝/钟表/男士腕表/石英腕表', 2, 1, NOW()),
('JD_L4_00000142', 'JD_L3_0000045', 4, '智能腕表', '1200003', '钟表珠宝/钟表/男士腕表/智能腕表', 3, 1, NOW());

-- L2: 珠宝
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L2_000025', 'JD_L1_0012', 2, '珠宝', '12002', '钟表珠宝/珠宝', 2, 1, NOW());

-- L3: 项链
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000046', 'JD_L2_000025', 3, '项链', '120002', '钟表珠宝/珠宝/项链', 1, 1, NOW());

-- L4: 项链子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000143', 'JD_L3_0000046', 4, '黄金项链', '1200004', '钟表珠宝/珠宝/项链/黄金项链', 1, 1, NOW()),
('JD_L4_00000144', 'JD_L3_0000046', 4, '钻石项链', '1200005', '钟表珠宝/珠宝/项链/钻石项链', 2, 1, NOW()),
('JD_L4_00000145', 'JD_L3_0000046', 4, '珍珠项链', '1200006', '钟表珠宝/珠宝/项链/珍珠项链', 3, 1, NOW());

-- ============================================================
-- 宠物生活 (L1: JD_L1_0013)
-- ============================================================

-- L2: 狗粮狗粮
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L2_000026', 'JD_L1_0013', 2, '狗粮狗粮', '13001', '宠物生活/狗粮狗粮', 1, 1, NOW());

-- L3: 成犬粮
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000047', 'JD_L2_000026', 3, '成犬粮', '130001', '宠物生活/狗粮狗粮/成犬粮', 1, 1, NOW());

-- L4: 成犬粮子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000146', 'JD_L3_0000047', 4, '小型犬粮', '1300001', '宠物生活/狗粮狗粮/成犬粮/小型犬粮', 1, 1, NOW()),
('JD_L4_00000147', 'JD_L3_0000047', 4, '中型犬粮', '1300002', '宠物生活/狗粮狗粮/成犬粮/中型犬粮', 2, 1, NOW()),
('JD_L4_00000148', 'JD_L3_0000047', 4, '大型犬粮', '1300003', '宠物生活/狗粮狗粮/成犬粮/大型犬粮', 3, 1, NOW());

-- L2: 宠物用品
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L2_000027', 'JD_L1_0013', 2, '宠物用品', '13002', '宠物生活/宠物用品', 2, 1, NOW());

-- L3: 宠物窝垫
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000048', 'JD_L2_000027', 3, '宠物窝垫', '130002', '宠物生活/宠物用品/宠物窝垫', 1, 1, NOW());

-- L4: 宠物窝垫子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000149', 'JD_L3_0000048', 4, '宠物床', '1300004', '宠物生活/宠物用品/宠物窝垫/宠物床', 1, 1, NOW()),
('JD_L4_00000150', 'JD_L3_0000048', 4, '宠物垫', '1300005', '宠物生活/宠物用品/宠物窝垫/宠物垫', 2, 1, NOW()),
('JD_L4_00000151', 'JD_L3_0000048', 4, '宠物帐篷', '1300006', '宠物生活/宠物用品/宠物窝垫/宠物帐篷', 3, 1, NOW());

-- ============================================================
-- 医药保健 (L1: JD_L1_0014)
-- ============================================================

-- L2: 中西药品
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L2_000028', 'JD_L1_0014', 2, '中西药品', '14001', '医药保健/中西药品', 1, 1, NOW());

-- L3: 感冒用药
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000049', 'JD_L2_000028', 3, '感冒用药', '140001', '医药保健/中西药品/感冒用药', 1, 1, NOW());

-- L4: 感冒用药子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000152', 'JD_L3_0000049', 4, '感冒灵', '1400001', '医药保健/中西药品/感冒用药/感冒灵', 1, 1, NOW()),
('JD_L4_00000153', 'JD_L3_0000049', 4, '退烧药', '1400002', '医药保健/中西药品/感冒用药/退烧药', 2, 1, NOW()),
('JD_L4_00000154', 'JD_L3_0000049', 4, '止咳药', '1400003', '医药保健/中西药品/感冒用药/止咳药', 3, 1, NOW());

-- L2: 营养健康
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L2_000029', 'JD_L1_0014', 2, '营养健康', '14002', '医药保健/营养健康', 2, 1, NOW());

-- L3: 维生素
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L3_0000050', 'JD_L2_000029', 3, '维生素', '140002', '医药保健/营养健康/维生素', 1, 1, NOW());

-- L4: 维生素子类
INSERT INTO product_categories (category_id, parent_id, level, name, code, full_path, sort_order, is_enabled, create_time) VALUES
('JD_L4_00000155', 'JD_L3_0000050', 4, '维生素C', '1400004', '医药保健/营养健康/维生素/维生素C', 1, 1, NOW()),
('JD_L4_00000156', 'JD_L3_0000050', 4, '维生素D', '1400005', '医药保健/营养健康/维生素/维生素D', 2, 1, NOW()),
('JD_L4_00000157', 'JD_L3_0000050', 4, '复合维生素', '1400006', '医药保健/营养健康/维生素/复合维生素', 3, 1, NOW()),
('JD_L4_00000158', 'JD_L3_0000050', 4, '维生素E', '1400007', '医药保健/营养健康/维生素/维生素E', 4, 1, NOW());
