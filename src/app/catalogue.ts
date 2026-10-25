/**
 * Catalogue access — how the app reads the static catalogue data.
 *
 * WHAT IT DOES
 *   Typed lookups the sidebar, guide and complexity panel use: list structures,
 *   get one `CatalogueEntry`, find an `OperationMeta` by id, resolve the
 *   pseudocode listing for a `pseudocodeId`.
 *
 * WHY THIS FILE EXISTS
 *   A2 Listing 18 splits content from access: `data/catalogue.ts` holds the static
 *   records, and this module is the only thing the application layer imports. One
 *   source for "what operations exist", and one place to keep the `pseudocodeId`
 *   link between a bound and its listing (Listing 16, FR11).
 *
 * RULES
 *   Read-only. No fetching, ever — the catalogue is versioned static data because
 *   there is no backend (NFR-Se1). No React, D3 or DOM.
 */

import {
  CATALOGUE,
  OPERATION_META,
  PSEUDOCODE_LISTINGS,
  type CatalogueEntry,
  type OperationMeta,
  type PseudocodeListing,
} from '../data/catalogue'

export function listStructures(): readonly CatalogueEntry[] {
  return CATALOGUE
}

export function getStructure(id: string): CatalogueEntry | undefined {
  return CATALOGUE.find((entry) => entry.id === id)
}

export function getOperationMeta(id: string): OperationMeta | undefined {
  return OPERATION_META[id]
}

export function getPseudocode(
  pseudocodeId: string,
): PseudocodeListing | undefined {
  return PSEUDOCODE_LISTINGS[pseudocodeId]
}
