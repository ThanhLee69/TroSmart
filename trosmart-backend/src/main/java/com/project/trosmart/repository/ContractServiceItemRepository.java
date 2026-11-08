package com.project.trosmart.repository;

import com.project.trosmart.entity.ContractServiceItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ContractServiceItemRepository
        extends JpaRepository<ContractServiceItem, Long> {

    List<ContractServiceItem> findByContractId(Long contractId);

    // Dùng cho addService / removeService
    Optional<ContractServiceItem> findByContract_IdAndServiceItem_Id(Long contractId, Long serviceItemId);

}