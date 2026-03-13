package com.waad.tba.modules.providercontract.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalService;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalCategoryRepository;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalServiceCategoryRepository;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalServiceRepository;
import com.waad.tba.modules.providercontract.dto.ProviderContractPricingItemCreateDto;
import com.waad.tba.modules.providercontract.dto.ProviderContractPricingItemResponseDto;
import com.waad.tba.modules.providercontract.entity.ProviderContract;
import com.waad.tba.modules.providercontract.entity.ProviderContract.ContractStatus;
import com.waad.tba.modules.providercontract.entity.ProviderContractPricingItem;
import com.waad.tba.modules.providercontract.repository.ProviderContractPricingItemRepository;
import com.waad.tba.modules.providercontract.repository.ProviderContractRepository;

@ExtendWith(MockitoExtension.class)
class ProviderContractPricingItemServiceTest {

    @Mock
    private ProviderContractPricingItemRepository pricingRepository;
    @Mock
    private ProviderContractRepository contractRepository;
    @Mock
    private MedicalServiceRepository medicalServiceRepository;
    @Mock
    private MedicalCategoryRepository medicalCategoryRepository;
    @Mock
    private MedicalServiceCategoryRepository medicalServiceCategoryRepository;

    @InjectMocks
    private ProviderContractPricingItemService pricingItemService;

    private ProviderContract contract;
    private MedicalService medicalService;
    private ProviderContractPricingItem pricingItem;

    @BeforeEach
    void setUp() {
        contract = ProviderContract.builder()
                .id(1L)
                .contractCode("CON-001")
                .status(ContractStatus.DRAFT)
                .active(true)
                .build();

        medicalService = MedicalService.builder()
                .id(10L)
                .code("SRV-10")
                .name("Consultation")
                .cost(new BigDecimal("100"))
                .active(true)
                .build();

        pricingItem = ProviderContractPricingItem.builder()
                .id(100L)
                .contract(contract)
                .medicalService(medicalService)
                .basePrice(new BigDecimal("100"))
                .contractPrice(new BigDecimal("80"))
                .active(true)
                .build();
    }

    @Test
    void create_validDraftContract_shouldSaveAndReturnDto() {
        // Arrange
        ProviderContractPricingItemCreateDto dto = ProviderContractPricingItemCreateDto.builder()
                .medicalServiceId(10L)
                .basePrice(new BigDecimal("100"))
                .contractPrice(new BigDecimal("85"))
                .build();

        when(contractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(medicalServiceRepository.findById(10L)).thenReturn(Optional.of(medicalService));
        when(pricingRepository.existsByContractIdAndMedicalServiceIdAndActiveTrue(1L, 10L)).thenReturn(false);
        when(pricingRepository.save(any(ProviderContractPricingItem.class))).thenAnswer(i -> {
            ProviderContractPricingItem saved = i.getArgument(0);
            saved.setId(101L);
            return saved;
        });

        // Act
        ProviderContractPricingItemResponseDto result = pricingItemService.create(1L, dto);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getContractPrice()).isEqualTo(new BigDecimal("85"));
        verify(pricingRepository, times(1)).save(any(ProviderContractPricingItem.class));
    }

    @Test
    void create_expiredContract_shouldThrowException() {
        // Arrange
        contract.setStatus(ContractStatus.EXPIRED);
        ProviderContractPricingItemCreateDto dto = ProviderContractPricingItemCreateDto.builder()
                .medicalServiceId(10L)
                .build();

        when(contractRepository.findById(1L)).thenReturn(Optional.of(contract));

        // Act & Assert
        assertThatThrownBy(() -> pricingItemService.create(1L, dto))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("Cannot modify pricing for contract with status: EXPIRED");
    }

    @Test
    void create_duplicateService_shouldThrowException() {
        // Arrange
        ProviderContractPricingItemCreateDto dto = ProviderContractPricingItemCreateDto.builder()
                .medicalServiceId(10L)
                .build();

        when(contractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(medicalServiceRepository.findById(10L)).thenReturn(Optional.of(medicalService));
        when(pricingRepository.existsByContractIdAndMedicalServiceIdAndActiveTrue(1L, 10L)).thenReturn(true);

        // Act & Assert
        assertThatThrownBy(() -> pricingItemService.create(1L, dto))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("Pricing already exists for this service");
    }

    @Test
    void delete_validDraftContract_shouldSoftDelete() {
        // Arrange
        when(pricingRepository.findById(100L)).thenReturn(Optional.of(pricingItem));

        // Act
        pricingItemService.delete(100L);

        // Assert
        assertThat(pricingItem.getActive()).isFalse();
        verify(pricingRepository).save(pricingItem);
    }
}
