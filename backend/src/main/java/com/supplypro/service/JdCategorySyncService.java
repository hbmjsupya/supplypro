package com.supplypro.service;

import com.supplypro.entity.ProductCategory;
import com.supplypro.repository.ProductCategoryRepository;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
public class JdCategorySyncService {

    @Autowired
    private ProductCategoryRepository productCategoryRepository;

    /**
     * 从京东首页同步四级分类数据
     */
    @Transactional
    public Map<String, Object> syncFromJd() {
        String url = "https://www.jd.com/allSort.aspx";
        List<ProductCategory> categories = new ArrayList<>();
        int[] counters = {0, 0, 0, 0};

        try {
            log.info("开始从京东抓取分类数据: {}", url);
            Document doc = Jsoup.connect(url)
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                    .timeout(60000)
                    .get();

            Element root = doc.getElementsByClass("category-items clearfix").first();
            if (root == null) {
                throw new RuntimeException("未找到分类容器，页面结构可能已变更");
            }

            Elements levelOneElements = root.getElementsByClass("category-item m");

            for (Element l1 : levelOneElements) {
                String l1Name = l1.select(".category-name > a").text().trim();
                if (l1Name.isEmpty()) continue;
                counters[0]++;

                String l1Id = String.format("JD_L1_%04d", counters[0]);
                ProductCategory l1Cat = new ProductCategory();
                l1Cat.setCategoryId(l1Id);
                l1Cat.setParentId("0");
                l1Cat.setLevel(1);
                l1Cat.setName(l1Name);
                l1Cat.setCode(String.valueOf(counters[0]));
                l1Cat.setFullPath(l1Name);
                l1Cat.setSortOrder(counters[0]);
                l1Cat.setIsEnabled(true);
                categories.add(l1Cat);

                Elements l2Elements = l1.select(".items .item");
                for (Element l2 : l2Elements) {
                    String l2Name = l2.select(".name > a").text().trim();
                    if (l2Name.isEmpty()) continue;
                    counters[1]++;

                    String l2Id = String.format("JD_L2_%06d", counters[1]);
                    ProductCategory l2Cat = new ProductCategory();
                    l2Cat.setCategoryId(l2Id);
                    l2Cat.setParentId(l1Id);
                    l2Cat.setLevel(2);
                    l2Cat.setName(l2Name);
                    l2Cat.setCode(String.valueOf(counters[1]));
                    l2Cat.setFullPath(l1Name + "/" + l2Name);
                    l2Cat.setSortOrder(counters[1]);
                    l2Cat.setIsEnabled(true);
                    categories.add(l2Cat);

                    Elements l3Elements = l2.select(".items .item");
                    if (l3Elements.isEmpty()) {
                        // 尝试另一种结构
                        l3Elements = l2.select(".sub-items a");
                    }

                    for (Element l3 : l3Elements) {
                        String l3Name = l3.text().trim();
                        if (l3Name.isEmpty() || l3Name.equals("查看更多")) continue;
                        counters[2]++;

                        String l3Id = String.format("JD_L3_%08d", counters[2]);
                        ProductCategory l3Cat = new ProductCategory();
                        l3Cat.setCategoryId(l3Id);
                        l3Cat.setParentId(l2Id);
                        l3Cat.setLevel(3);
                        l3Cat.setName(l3Name);
                        l3Cat.setCode(String.valueOf(counters[2]));
                        l3Cat.setFullPath(l1Name + "/" + l2Name + "/" + l3Name);
                        l3Cat.setSortOrder(counters[2]);
                        l3Cat.setIsEnabled(true);
                        categories.add(l3Cat);

                        // 抓取四级分类
                        Elements l4Elements = l3.select(".sub-items a");
                        for (Element l4 : l4Elements) {
                            String l4Name = l4.text().trim();
                            if (l4Name.isEmpty() || l4Name.equals("查看更多")) continue;
                            counters[3]++;

                            String l4Id = String.format("JD_L4_%010d", counters[3]);
                            ProductCategory l4Cat = new ProductCategory();
                            l4Cat.setCategoryId(l4Id);
                            l4Cat.setParentId(l3Id);
                            l4Cat.setLevel(4);
                            l4Cat.setName(l4Name);
                            l4Cat.setCode(String.valueOf(counters[3]));
                            l4Cat.setFullPath(l1Name + "/" + l2Name + "/" + l3Name + "/" + l4Name);
                            l4Cat.setSortOrder(counters[3]);
                            l4Cat.setIsEnabled(true);
                            categories.add(l4Cat);
                        }
                    }
                }
            }

            log.info("抓取完成，共获取 {} 条分类数据 (L1:{} L2:{} L3:{} L4:{})", 
                    categories.size(), counters[0], counters[1], counters[2], counters[3]);

            // 保存前清除现有数据
            productCategoryRepository.deleteAll();

            // 批量保存
            productCategoryRepository.saveAll(categories);

            return Map.of(
                "success", true,
                "total", categories.size(),
                "level1", counters[0],
                "level2", counters[1],
                "level3", counters[2],
                "level4", counters[3],
                "message", String.format("同步成功，共获取 %d 条分类数据", categories.size())
            );

        } catch (Exception e) {
            log.error("同步京东分类数据失败", e);
            return Map.of(
                "success", false,
                "message", "同步失败: " + e.getMessage()
            );
        }
    }
}
