/**
 * Startup side effect: copy legacy localStorage keys into the canonical
 * `mk.viralcanvas.*.v1` namespace.
 *
 * This module is intentionally a bare side-effect import and MUST be the
 * first import in main.tsx — persisted zustand stores read localStorage as
 * soon as their modules are evaluated, so the copy has to happen first.
 */
import { migrateLegacyStorage } from './utils/storageMigration';

migrateLegacyStorage();
