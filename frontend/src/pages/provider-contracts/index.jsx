/**
 * Provider Contracts Module - Index/Entry Point
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This file serves as the default export for the provider-contracts route.
 * It re-exports the ProviderContractsList component.
 *
 * Module Structure:
 * - index.jsx (this file) - Route entry point
 * - ProviderContractsList.jsx - List view with table
 * - ProviderContractView.jsx - Detail view with pricing table
 * - data/providerContracts.mock.js - Mock data for development
 *
 * Backend Status: NOT IMPLEMENTED
 * This module uses mock data derived from Excel contract structures.
 * When backend is ready, replace mock imports with API service calls.
 *
 * Route Configuration (in MainRoutes.jsx):
 * - /provider-contracts → ProviderContractsList (this export)
 * - /provider-contracts/:id → ProviderContractView
 *
 * @version 1.0.0
 * @lastUpdated 2024-12-24
 */

// Re-export the list component as default
export { default } from './ProviderContractsList';

// Named exports for explicit imports
export { default as ProviderContractsList } from './ProviderContractsList';
export { default as ProviderContractView } from './ProviderContractView';
