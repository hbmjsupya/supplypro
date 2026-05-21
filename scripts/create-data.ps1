param(
    [string]$action = "create"
)

$ErrorActionPreference = "Stop"

$brands = @(
    @{name = "华为"; trademarkNo = "TM123456"; firstLetter = "H"; status = "ENABLED"}
    @{name = "小米"; trademarkNo = "TM789012"; firstLetter = "X"; status = "ENABLED"}
    @{name = "苹果"; trademarkNo = "TM345678"; firstLetter = "P"; status = "ENABLED"}
    @{name = "三星"; trademarkNo = "TM901234"; firstLetter = "S"; status = "ENABLED"}
    @{name = "联想"; trademarkNo = "TM567890"; firstLetter = "L"; status = "ENABLED"}
    @{name = "戴尔"; trademarkNo = "TM112233"; firstLetter = "D"; status = "ENABLED"}
    @{name = "惠普"; trademarkNo = "TM445566"; firstLetter = "H"; status = "ENABLED"}
    @{name = "华硕"; trademarkNo = "TM778899"; firstLetter = "H"; status = "ENABLED"}
)

$suppliers = @(
    @{supplierNo = "SP001"; name = "深圳华为技术有限公司"; contactPerson = "张三"; contactPhone = "13800138001"; email = "contact@huawei.cn"; address = "广东省深圳市龙岗区坂田华为基地"; settlementType = "PERIOD"; settlementPeriod = 30; status = "ACTIVE"}
    @{supplierNo = "SP002"; name = "北京小米科技有限责任公司"; contactPerson = "李四"; contactPhone = "13800138002"; email = "contact@xiaomi.com"; address = "北京市海淀区清河中街68号"; settlementType = "PREPAYMENT"; prepaymentBalance = 100000.00; status = "ACTIVE"}
    @{supplierNo = "SP003"; name = "苹果贸易(上海)有限公司"; contactPerson = "王五"; contactPhone = "13800138003"; email = "contact@apple.com"; address = "上海市浦东新区世纪大道100号"; settlementType = "CASH"; status = "ACTIVE"}
    @{supplierNo = "SP004"; name = "三星电子(中国)投资有限公司"; contactPerson = "赵六"; contactPhone = "13800138004"; email = "contact@samsung.com"; address = "北京市朝阳区建国路88号"; settlementType = "PERIOD"; settlementPeriod = 45; status = "ACTIVE"}
    @{supplierNo = "SP005"; name = "联想(北京)有限公司"; contactPerson = "钱七"; contactPhone = "13800138005"; email = "contact@lenovo.com"; address = "北京市海淀区上地信息产业基地"; settlementType = "PERIOD"; settlementPeriod = 60; status = "ACTIVE"}
    @{supplierNo = "SP006"; name = "戴尔(中国)有限公司"; contactPerson = "孙八"; contactPhone = "13800138006"; email = "contact@dell.com"; address = "上海市浦东新区张江高科技园区"; settlementType = "PREPAYMENT"; prepaymentBalance = 50000.00; status = "ACTIVE"}
    @{supplierNo = "SP007"; name = "惠普(中国)有限公司"; contactPerson = "周九"; contactPhone = "13800138007"; email = "contact@hp.com"; address = "北京市朝阳区望京街10号"; settlementType = "FISHERMAN"; status = "ACTIVE"}
    @{supplierNo = "SP008"; name = "华硕电脑(上海)有限公司"; contactPerson = "吴十"; contactPhone = "13800138008"; email = "contact@asus.com"; address = "上海市闵行区紫星路999号"; settlementType = "PERIOD"; settlementPeriod = 15; status = "ACTIVE"}
)

function Create-Brands {
    Write-Host "Creating brands..."
    foreach ($brand in $brands) {
        try {
            $json = $brand | ConvertTo-Json -Compress
            $response = Invoke-RestMethod -Uri "http://localhost:8080/api/brands" -Method Post -Body $json -ContentType "application/json; charset=utf-8"
            Write-Host "Created brand: $($brand.name) (ID: $($response.data.id))"
        } catch {
            Write-Host "Failed to create brand $($brand.name): $_"
        }
    }
}

function Create-Suppliers {
    Write-Host "Creating suppliers..."
    foreach ($supplier in $suppliers) {
        try {
            $json = $supplier | ConvertTo-Json -Compress
            $response = Invoke-RestMethod -Uri "http://localhost:8080/api/suppliers" -Method Post -Body $json -ContentType "application/json; charset=utf-8"
            Write-Host "Created supplier: $($supplier.name) (ID: $($response.data.id))"
        } catch {
            Write-Host "Failed to create supplier $($supplier.name): $_"
        }
    }
}

function List-Brands {
    Write-Host "Listing brands..."
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8080/api/brands?page=0&size=100" -Method Get
        $response.data.records | ForEach-Object {
            Write-Host "$($_.id): $($_.name) - $($_.trademarkNo)"
        }
    } catch {
        Write-Host "Failed to list brands: $_"
    }
}

function List-Suppliers {
    Write-Host "Listing suppliers..."
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8080/api/suppliers?page=0&size=100" -Method Get
        $response.data.content | ForEach-Object {
            Write-Host "$($_.id): $($_.name) - $($_.settlementType) - $($_.settlementPeriod)天"
        }
    } catch {
        Write-Host "Failed to list suppliers: $_"
    }
}

switch ($action) {
    "create" {
        Create-Brands
        Create-Suppliers
    }
    "brands" {
        Create-Brands
    }
    "suppliers" {
        Create-Suppliers
    }
    "list-brands" {
        List-Brands
    }
    "list-suppliers" {
        List-Suppliers
    }
    "list-all" {
        List-Brands
        Write-Host ""
        List-Suppliers
    }
    default {
        Write-Host "Usage: .\create-data.ps1 [action]"
        Write-Host "Actions: create, brands, suppliers, list-brands, list-suppliers, list-all"
    }
}
