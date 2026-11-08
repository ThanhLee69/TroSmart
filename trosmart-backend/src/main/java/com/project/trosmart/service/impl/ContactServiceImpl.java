package com.project.trosmart.service.impl;


import com.project.trosmart.constants.ErrorCode;
import com.project.trosmart.dto.request.ContactUpdateRequest;
import com.project.trosmart.dto.response.ContactResponse;
import com.project.trosmart.dto.response.ContactSummaryResponse;
import com.project.trosmart.dto.response.PageResponse;
import com.project.trosmart.entity.ContactMessage;
import com.project.trosmart.enums.ContactStatus;
import com.project.trosmart.enums.ContactTopic;
import com.project.trosmart.exception.AppException;
import com.project.trosmart.mapper.ContactMapper;
import com.project.trosmart.repository.ContactRepository;
import com.project.trosmart.service.ContactService;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;


@Slf4j
@Service
@RequiredArgsConstructor
public class ContactServiceImpl implements ContactService {



    private final ContactRepository contactRepository;

    private final ContactMapper contactMapper;



    @Override
    @Transactional(readOnly = true)
    public PageResponse<ContactResponse> getContacts(String keyword,
                                                     ContactStatus status,
                                                     ContactTopic topic,
                                                     int page,
                                                     int size) {
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<ContactMessage> result = contactRepository.findAll(buildSpec(keyword, status, topic), pageable);

        return PageResponse.<ContactResponse>builder()
                .items(result.getContent().stream().map(contactMapper::toResponse).toList())
                .currentPage(result.getNumber() + 1)
                .pageSize(result.getSize())
                .totalItems(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build();
    }

    @Override
    @Transactional
    public ContactResponse getContactDetail(Long id) {
        ContactMessage contact = findOrThrow(id);

        // Mở ra xem lần đầu thì đánh dấu đã xem (dirty checking tự lưu)
        if (contact.getStatus() == ContactStatus.NEW) {
            contact.setStatus(ContactStatus.READ);
        }

        return contactMapper.toResponse(contact);
    }

    @Override
    @Transactional
    public ContactResponse updateContact(Long id, ContactUpdateRequest request) {
        ContactMessage contact = findOrThrow(id);

        contact.setStatus(request.getStatus());

        if (request.getAdminNote() != null) {
            contact.setAdminNote(blankToNull(request.getAdminNote()));
        }

        return contactMapper.toResponse(contactRepository.save(contact));
    }

    @Override
    @Transactional
    public void deleteContact(Long id) {
        contactRepository.delete(findOrThrow(id));
    }

    @Override
    @Transactional(readOnly = true)
    public ContactSummaryResponse getSummary() {
        long newCount = contactRepository.countByStatus(ContactStatus.NEW);
        long readCount = contactRepository.countByStatus(ContactStatus.READ);
        long repliedCount = contactRepository.countByStatus(ContactStatus.REPLIED);

        return ContactSummaryResponse.builder()
                .total(newCount + readCount + repliedCount)
                .newCount(newCount)
                .readCount(readCount)
                .repliedCount(repliedCount)
                .build();
    }

    // =====================================================
    // HELPER
    // =====================================================

    private ContactMessage findOrThrow(Long id) {
        return contactRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.CONTACT_NOT_FOUND));
    }

    private Specification<ContactMessage> buildSpec(String keyword, ContactStatus status, ContactTopic topic) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (topic != null) {
                predicates.add(cb.equal(root.get("topic"), topic));
            }

            if (keyword != null && !keyword.isBlank()) {
                String like = "%" + keyword.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("fullName")), like),
                        cb.like(root.get("phone"), like),
                        cb.like(cb.lower(root.get("email")), like)
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }



    private String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }


}
