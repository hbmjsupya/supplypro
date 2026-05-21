UPDATE purchase_orders 
SET logistics_company = CASE logistics_company
    WHEN '顺丰速运' THEN 'SF'
    WHEN '京东快递' THEN 'JD'
    WHEN '圆通速递' THEN 'YTO'
    WHEN '申通快递' THEN 'STO'
    WHEN '中通快递' THEN 'ZTO'
    WHEN '韵达速递' THEN 'YD'
    WHEN '韵达快递' THEN 'YD'
    WHEN '邮政快递包裹' THEN 'YZPY'
    WHEN 'EMS' THEN 'EMS'
    WHEN '百世快递' THEN 'HTKY'
    WHEN '极兔速递' THEN 'JTEXPRESS'
    WHEN '德邦快递' THEN 'DBL'
    WHEN '优速快递' THEN 'UC'
    WHEN '天天快递' THEN 'HHTT'
    WHEN '宅急送' THEN 'ZJS'
    ELSE logistics_company
END
WHERE logistics_company IN (
    '顺丰速运', '京东快递', '圆通速递', '申通快递', '中通快递',
    '韵达速递', '韵达快递', '邮政快递包裹', '百世快递', '极兔速递',
    '德邦快递', '优速快递', '天天快递', '宅急送'
);

UPDATE outbound_orders 
SET logistics_company = CASE logistics_company
    WHEN '顺丰速运' THEN 'SF'
    WHEN '京东快递' THEN 'JD'
    WHEN '圆通速递' THEN 'YTO'
    WHEN '申通快递' THEN 'STO'
    WHEN '中通快递' THEN 'ZTO'
    WHEN '韵达速递' THEN 'YD'
    WHEN '韵达快递' THEN 'YD'
    WHEN '邮政快递包裹' THEN 'YZPY'
    WHEN 'EMS' THEN 'EMS'
    WHEN '百世快递' THEN 'HTKY'
    WHEN '极兔速递' THEN 'JTEXPRESS'
    WHEN '德邦快递' THEN 'DBL'
    WHEN '优速快递' THEN 'UC'
    WHEN '天天快递' THEN 'HHTT'
    WHEN '宅急送' THEN 'ZJS'
    ELSE logistics_company
END
WHERE logistics_company IN (
    '顺丰速运', '京东快递', '圆通速递', '申通快递', '中通快递',
    '韵达速运', '韵达快递', '邮政快递包裹', '百世快递', '极兔速递',
    '德邦快递', '优速快递', '天天快递', '宅急送'
);

UPDATE refund_orders 
SET logistics_company = CASE logistics_company
    WHEN '顺丰速运' THEN 'SF'
    WHEN '京东快递' THEN 'JD'
    WHEN '圆通速递' THEN 'YTO'
    WHEN '申通快递' THEN 'STO'
    WHEN '中通快递' THEN 'ZTO'
    WHEN '韵达速递' THEN 'YD'
    WHEN '韵达快递' THEN 'YD'
    WHEN '邮政快递包裹' THEN 'YZPY'
    WHEN 'EMS' THEN 'EMS'
    WHEN '百世快递' THEN 'HTKY'
    WHEN '极兔速递' THEN 'JTEXPRESS'
    WHEN '德邦快递' THEN 'DBL'
    WHEN '优速快递' THEN 'UC'
    WHEN '天天快递' THEN 'HHTT'
    WHEN '宅急送' THEN 'ZJS'
    ELSE logistics_company
END
WHERE logistics_company IN (
    '顺丰速运', '京东快递', '圆通速递', '申通快递', '中通快递',
    '韵达速运', '韵达快递', '邮政快递包裹', '百世快递', '极兔速递',
    '德邦快递', '优速快递', '天天快递', '宅急送'
);
