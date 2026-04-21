#!/usr/bin/env python3
import requests
import json
import time

BASE_URL = "http://localhost:8080"

def login():
    resp = requests.post(f"{BASE_URL}/api/auth/signin", json={
        "username": "admin",
        "password": "123456"
    })
    data = resp.json()
    return data["data"]["token"]

def create_refund_order(token, payload):
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    resp = requests.post(f"{BASE_URL}/api/refund-orders", json=payload, headers=headers)
    result = resp.json()
    if result.get("code") == 200:
        print(f"  OK: {result['data'].get('refundNo')} -> {result['data'].get('relatedOrderNo')} [{result['data'].get('status')}]")
    else:
        print(f"  FAIL: {result}")
    return result

def main():
    token = login()
    print(f"Token: {token[:20]}...")

    refund_orders = [
        # 1. 采购单132: 仅退款+供应商承担 -> 自动完成 (C202603201519001, 测试商品02, 默认规格, qty=3, price=5.00)
        {
            "platformRefundNo": "RF-PLATFORM-001",
            "platformOrderNo": "ORD1773983069334000",
            "bizType": "PURCHASE",
            "relatedOrderNo": "C202603201519001",
            "relatedOrderId": 132,
            "refundType": "REFUND_ONLY",
            "bearer": "SUPPLIER",
            "applicant": "运营平台",
            "productId": 2,
            "productName": "测试商品02",
            "skuId": 5,
            "specName": "默认规格",
            "quantity": 2,
            "unitPrice": 5.00,
            "refundAmount": 10.00,
            "remark": "商品质量问题，仅退款",
            "createdBy": "system"
        },
        # 2. 采购单133: 退货退款+供应商承担 -> RETURNING (C202603201536001, 测试商品02, 默认规格, qty=7, price=4.00)
        {
            "platformRefundNo": "RF-PLATFORM-002",
            "platformOrderNo": "ORD1773983069334001",
            "bizType": "PURCHASE",
            "relatedOrderNo": "C202603201536001",
            "relatedOrderId": 133,
            "refundType": "REFUND_RETURN",
            "bearer": "SUPPLIER",
            "applicant": "运营平台",
            "productId": 2,
            "productName": "测试商品02",
            "skuId": 5,
            "specName": "默认规格",
            "quantity": 3,
            "unitPrice": 4.00,
            "refundAmount": 12.00,
            "logisticsCompany": "顺丰速运",
            "trackingNo": "SF20260417001",
            "returnAddress": "北京市朝阳区建国路88号",
            "returnConsignee": "张三",
            "returnPhone": "13800138001",
            "remark": "商品与描述不符，退货退款",
            "createdBy": "system"
        },
        # 3. 采购单134: 退货退款+平台承担 -> RETURNING (C202603201622001, 测试商品02, 默认规格, qty=18, price=3.00)
        {
            "platformRefundNo": "RF-PLATFORM-003",
            "platformOrderNo": "ORD1773983069334002",
            "bizType": "PURCHASE",
            "relatedOrderNo": "C202603201622001",
            "relatedOrderId": 134,
            "refundType": "REFUND_RETURN",
            "bearer": "PLATFORM",
            "applicant": "运营平台",
            "productId": 2,
            "productName": "测试商品02",
            "skuId": 5,
            "specName": "默认规格",
            "quantity": 18,
            "unitPrice": 3.00,
            "refundAmount": 54.00,
            "logisticsCompany": "中通快递",
            "trackingNo": "ZT20260417002",
            "returnAddress": "上海市浦东新区陆家嘴环路1000号",
            "returnConsignee": "李四",
            "returnPhone": "13800138002",
            "remark": "平台活动价差退款，退货退款",
            "createdBy": "system"
        },
        # 4. 采购单135(补货采购): 仅退款+供应商承担 -> 自动完成 (C202603201649001, 测试商品02, L 蓝色, qty=18, price=2.00)
        {
            "platformRefundNo": "RF-PLATFORM-004",
            "platformOrderNo": "ORD1773983069334002",
            "bizType": "PURCHASE",
            "relatedOrderNo": "C202603201649001",
            "relatedOrderId": 135,
            "refundType": "REFUND_ONLY",
            "bearer": "SUPPLIER",
            "applicant": "运营平台",
            "productId": 2,
            "productName": "测试商品02",
            "skuId": 8,
            "specName": "L 蓝色",
            "quantity": 5,
            "unitPrice": 2.00,
            "refundAmount": 10.00,
            "remark": "补货采购商品瑕疵，仅退款",
            "createdBy": "system"
        },
        # 5. 采购单136(补货采购): 退货退款+供应商承担 -> RETURNING (C202603201653001, 测试商品02, XL 蓝色, qty=35, price=3.00)
        {
            "platformRefundNo": "RF-PLATFORM-005",
            "platformOrderNo": "ORD1773983069334005",
            "bizType": "PURCHASE",
            "relatedOrderNo": "C202603201653001",
            "relatedOrderId": 136,
            "refundType": "REFUND_RETURN",
            "bearer": "SUPPLIER",
            "applicant": "运营平台",
            "productId": 2,
            "productName": "测试商品02",
            "skuId": 10,
            "specName": "XL 蓝色",
            "quantity": 10,
            "unitPrice": 3.00,
            "refundAmount": 30.00,
            "logisticsCompany": "京东物流",
            "trackingNo": "JD0237900291064",
            "returnAddress": "广州市天河区体育西路191号",
            "returnConsignee": "王五",
            "returnPhone": "13800138003",
            "remark": "补货采购商品破损，退货退款",
            "createdBy": "system"
        },
        # 6. 采购单137: 退货退款+平台承担 -> RETURNING (C202603201753001, 测试商品02, XL 红色, qty=30, price=6.00)
        {
            "platformRefundNo": "RF-PLATFORM-006",
            "platformOrderNo": "ORD1773983069334004",
            "bizType": "PURCHASE",
            "relatedOrderNo": "C202603201753001",
            "relatedOrderId": 137,
            "refundType": "REFUND_RETURN",
            "bearer": "PLATFORM",
            "applicant": "运营平台",
            "productId": 2,
            "productName": "测试商品02",
            "skuId": 9,
            "specName": "XL 红色",
            "quantity": 8,
            "unitPrice": 6.00,
            "refundAmount": 48.00,
            "logisticsCompany": "韵达快递",
            "trackingNo": "YD20260417003",
            "returnAddress": "深圳市南山区科技园路1号",
            "returnConsignee": "赵六",
            "returnPhone": "13800138004",
            "remark": "平台承担退货退款",
            "createdBy": "system"
        },
        # 7. 采购单138: 仅退款+供应商承担 -> 自动完成 (C202603230916001, 测试商品01, 128 星月白, qty=36, price=1.00)
        {
            "platformRefundNo": "RF-PLATFORM-007",
            "platformOrderNo": "ORD1773983069334005",
            "bizType": "PURCHASE",
            "relatedOrderNo": "C202603230916001",
            "relatedOrderId": 138,
            "refundType": "REFUND_ONLY",
            "bearer": "SUPPLIER",
            "applicant": "运营平台",
            "productId": 1,
            "productName": "测试商品01",
            "skuId": 1,
            "specName": "128 星月白",
            "quantity": 10,
            "unitPrice": 1.00,
            "refundAmount": 10.00,
            "remark": "商品质量问题仅退款",
            "createdBy": "system"
        },
        # 8. 采购单139: 退货退款+供应商承担 -> RETURNING (C202603230927001, 测试商品01, 256 星月白, qty=26, price=20.00)
        {
            "platformRefundNo": "RF-PLATFORM-008",
            "platformOrderNo": "ORD1773983069334007",
            "bizType": "PURCHASE",
            "relatedOrderNo": "C202603230927001",
            "relatedOrderId": 139,
            "refundType": "REFUND_RETURN",
            "bearer": "SUPPLIER",
            "applicant": "运营平台",
            "productId": 1,
            "productName": "测试商品01",
            "skuId": 3,
            "specName": "256 星月白",
            "quantity": 5,
            "unitPrice": 20.00,
            "refundAmount": 100.00,
            "logisticsCompany": "圆通速递",
            "trackingNo": "YT20260417004",
            "returnAddress": "成都市武侯区人民南路四段1号",
            "returnConsignee": "钱七",
            "returnPhone": "13800138005",
            "remark": "高价值商品退货退款",
            "createdBy": "system"
        },
        # 9. 出库单2: 退货退款+供应商承担 -> RETURNING (O260410-00001, 测试商品02, S 红色, qty=2, unitCost=3)
        {
            "platformRefundNo": "RF-PLATFORM-009",
            "platformOrderNo": "ORD1774589225440000",
            "bizType": "OUTBOUND",
            "relatedOrderNo": "O260410-00001",
            "relatedOrderId": 2,
            "refundType": "REFUND_RETURN",
            "bearer": "SUPPLIER",
            "applicant": "运营平台",
            "productId": 2,
            "productName": "测试商品02",
            "skuId": 5,
            "specName": "S 红色",
            "quantity": 2,
            "unitPrice": 3.00,
            "refundAmount": 6.00,
            "logisticsCompany": "顺丰速运",
            "trackingNo": "SF20260417005",
            "returnAddress": "杭州市西湖区文三路398号",
            "returnConsignee": "孙八",
            "returnPhone": "13800138006",
            "remark": "出库商品退货退款",
            "createdBy": "system"
        },
        # 10. 出库单4: 退货退款+平台承担 -> RETURNING (O260410-00003, 测试商品02, S 红色, qty=1, unitCost=3)
        {
            "platformRefundNo": "RF-PLATFORM-010",
            "platformOrderNo": "ORD1775699381356000",
            "bizType": "OUTBOUND",
            "relatedOrderNo": "O260410-00003",
            "relatedOrderId": 4,
            "refundType": "REFUND_RETURN",
            "bearer": "PLATFORM",
            "applicant": "运营平台",
            "productId": 2,
            "productName": "测试商品02",
            "skuId": 5,
            "specName": "S 红色",
            "quantity": 1,
            "unitPrice": 3.00,
            "refundAmount": 3.00,
            "logisticsCompany": "中通快递",
            "trackingNo": "ZT20260417006",
            "returnAddress": "武汉市江汉区解放大道688号",
            "returnConsignee": "周九",
            "returnPhone": "13800138007",
            "remark": "平台承担出库商品退货退款",
            "createdBy": "system"
        },
        # 11. 出库单6: 退货退款+供应商承担 -> RETURNING (O260413-00176, 测试商品02, L 红色, qty=3, unitCost=3)
        {
            "platformRefundNo": "RF-PLATFORM-011",
            "platformOrderNo": "ORD1744536000005",
            "bizType": "OUTBOUND",
            "relatedOrderNo": "O260413-00176",
            "relatedOrderId": 6,
            "refundType": "REFUND_RETURN",
            "bearer": "SUPPLIER",
            "applicant": "运营平台",
            "productId": 2,
            "productName": "测试商品02",
            "skuId": 7,
            "specName": "L 红色",
            "quantity": 3,
            "unitPrice": 3.00,
            "refundAmount": 9.00,
            "logisticsCompany": "京东物流",
            "trackingNo": "JD20260417007",
            "returnAddress": "南京市鼓楼区中山北路283号",
            "returnConsignee": "吴十",
            "returnPhone": "13800138008",
            "remark": "出库商品退货退款-供应商承担",
            "createdBy": "system"
        },
        # 12. 采购单133: 仅退款+供应商承担 -> 自动完成 (C202603201536001, 测试商品02, 默认规格, qty=1, price=4.00)
        {
            "platformRefundNo": "RF-PLATFORM-012",
            "platformOrderNo": "ORD1773983069334001",
            "bizType": "PURCHASE",
            "relatedOrderNo": "C202603201536001",
            "relatedOrderId": 133,
            "refundType": "REFUND_ONLY",
            "bearer": "SUPPLIER",
            "applicant": "运营平台",
            "productId": 2,
            "productName": "测试商品02",
            "skuId": 5,
            "specName": "默认规格",
            "quantity": 1,
            "unitPrice": 4.00,
            "refundAmount": 4.00,
            "remark": "追加退款-仅退款",
            "createdBy": "system"
        },
    ]

    print(f"\n=== Creating {len(refund_orders)} refund orders ===\n")
    
    success_count = 0
    for i, payload in enumerate(refund_orders, 1):
        print(f"[{i}/{len(refund_orders)}] Creating: {payload['platformRefundNo']} "
              f"({payload['refundType']}/{payload['bearer']}) -> {payload.get('relatedOrderNo', 'N/A')}")
        result = create_refund_order(token, payload)
        if result.get("code") == 200:
            success_count += 1
        time.sleep(0.3)

    print(f"\n=== Done: {success_count}/{len(refund_orders)} created successfully ===")

if __name__ == "__main__":
    main()
