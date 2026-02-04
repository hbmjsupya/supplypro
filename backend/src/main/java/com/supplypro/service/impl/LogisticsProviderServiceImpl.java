package com.supplypro.service.impl;

import com.supplypro.dto.LogisticsProviderFileDTO;
import com.supplypro.dto.LogisticsProviderSearchCriteria;
import com.supplypro.entity.LogisticsProvider;
import com.supplypro.entity.User;
import com.supplypro.repository.LogisticsProviderRepository;
import com.supplypro.repository.UserRepository;
import com.supplypro.service.LogisticsProviderFileService;
import com.supplypro.service.LogisticsProviderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import javax.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;

@Service
public class LogisticsProviderServiceImpl implements LogisticsProviderService {

    @Autowired
    private LogisticsProviderRepository logisticsProviderRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private LogisticsProviderFileService logisticsProviderFileService;

    @Override
    @Transactional(readOnly = true)
    public Page<LogisticsProvider> findAll(int page, int size, LogisticsProviderSearchCriteria criteria) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));

        Specification<LogisticsProvider> spec = (root, query, cb) -> {
            if (query.getResultType() != Long.class && query.getResultType() != long.class) {
                root.fetch("purchaser", javax.persistence.criteria.JoinType.LEFT);
            }
            List<Predicate> predicates = new ArrayList<>();

            if (StringUtils.hasText(criteria.getName())) {
                predicates.add(cb.like(root.get("name"), "%" + criteria.getName() + "%"));
            }

            if (criteria.getSettlementType() != null) {
                predicates.add(cb.equal(root.get("settlementType"), criteria.getSettlementType()));
            }

            if (criteria.getSettlementPeriod() != null) {
                predicates.add(cb.equal(root.get("settlementPeriod"), criteria.getSettlementPeriod()));
            }

            if (criteria.getPurchaserId() != null) {
                predicates.add(cb.equal(root.get("purchaser").get("id"), criteria.getPurchaserId()));
            }

            if (StringUtils.hasText(criteria.getContactInfo())) {
                String likePattern = "%" + criteria.getContactInfo() + "%";
                Predicate nameLike = cb.like(root.get("contactPerson"), likePattern);
                Predicate phoneLike = cb.like(root.get("contactPhone"), likePattern);
                predicates.add(cb.or(nameLike, phoneLike));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return logisticsProviderRepository.findAll(spec, pageRequest);
    }

    @Override
    @Transactional(readOnly = true)
    public LogisticsProvider getById(Long id) {
        return logisticsProviderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Logistics Provider not found"));
    }

    @Override
    @Transactional
    public LogisticsProvider create(LogisticsProvider provider, Long purchaserId, List<LogisticsProviderFileDTO> newFiles) {
        if (purchaserId != null) {
            User purchaser = userRepository.findById(purchaserId)
                    .orElseThrow(() -> new RuntimeException("Purchaser not found"));
            provider.setPurchaser(purchaser);
        }

        provider.setStatus("ACTIVE");
        LogisticsProvider saved = logisticsProviderRepository.save(provider);

        // Sync temp files
        if (newFiles != null && !newFiles.isEmpty()) {
            logisticsProviderFileService.syncTempFiles(saved.getId(), newFiles);
        }

        return saved;
    }

    @Override
    @Transactional
    public LogisticsProvider update(Long id, LogisticsProvider provider, Long purchaserId) {
        LogisticsProvider existing = getById(id);
        
        existing.setName(provider.getName());
        existing.setContactPerson(provider.getContactPerson());
        existing.setContactPhone(provider.getContactPhone());
        existing.setStatus(provider.getStatus());
        existing.setSettlementType(provider.getSettlementType());
        existing.setSettlementPeriod(provider.getSettlementPeriod());
        existing.setPrepaymentWarning(provider.getPrepaymentWarning());

        if (purchaserId != null) {
            if (existing.getPurchaser() == null || !existing.getPurchaser().getId().equals(purchaserId)) {
                User purchaser = userRepository.findById(purchaserId)
                        .orElseThrow(() -> new RuntimeException("Purchaser not found"));
                existing.setPurchaser(purchaser);
            }
        } else {
            existing.setPurchaser(null);
        }

        return logisticsProviderRepository.save(existing);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!logisticsProviderRepository.existsById(id)) {
            throw new RuntimeException("Logistics Provider not found");
        }
        logisticsProviderRepository.deleteById(id);
    }
}
