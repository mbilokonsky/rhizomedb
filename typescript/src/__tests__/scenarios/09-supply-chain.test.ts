/**
 * Scenario 9: Supply Chain Provenance for Conflict Minerals
 *
 * Tracking tantalum from mine to consumer electronics manufacturer.
 * Each participant asserts what they received and shipped. End-to-end
 * traceability without a centralized database.
 *
 * Tests: linear provenance chain, nested schema tracing, audit views,
 * provenance attribution, trust boundaries.
 */

import {
  RhizomeDB,
  Delta,
  HyperSchema,
  annotate,
  relate,
  resolveEntity,
  resolveEntityWith,
  allValuesFor,
  relatedIds,
  buildHyperView,
  resolveHyperView,
  mostRecent,
  trustedAuthor,
  selectByTargetContext,
  SchemaRegistry,
  constructHyperView
} from './helpers';

describe('Scenario 9: Supply Chain Provenance', () => {
  let db: RhizomeDB;
  const mineCooperative = 'mine-cooperative-kivu';
  const smelter = 'smelter-singapore';
  const componentMfg = 'component-manufacturer-shenzhen';
  const oem = 'oem-cupertino';
  const auditor = 'auditor-ernst-young';

  beforeEach(() => {
    db = new RhizomeDB({ storage: 'memory', systemId: 'provenance-registry' });
  });

  it('should trace materials from mine to manufacturer', async () => {
    // Mine: ore batch extracted
    await db.persistDelta(annotate(db, 'ore-batch-101', 'material', 'coltan', mineCooperative));
    await db.persistDelta(annotate(db, 'ore-batch-101', 'weight_kg', 500, mineCooperative));
    await db.persistDelta(annotate(db, 'ore-batch-101', 'mine_of_origin', 'Kivu Mine #3', mineCooperative));
    await db.persistDelta(annotate(db, 'ore-batch-101', 'extraction_date', '2024-03-15', mineCooperative));

    // Smelter: received ore, produced tantalum powder
    await db.persistDelta(relate(db,
      'input', 'ore-batch-101', 'processed_into',
      'output', 'tantalum-batch-201', 'source_material',
      smelter
    ));
    await db.persistDelta(annotate(db, 'tantalum-batch-201', 'material', 'tantalum powder', smelter));
    await db.persistDelta(annotate(db, 'tantalum-batch-201', 'weight_kg', 45, smelter));
    await db.persistDelta(annotate(db, 'tantalum-batch-201', 'purity', '99.95%', smelter));

    // Component manufacturer: received tantalum, produced capacitors
    await db.persistDelta(relate(db,
      'input', 'tantalum-batch-201', 'used_in',
      'output', 'capacitor-lot-301', 'source_material',
      componentMfg
    ));
    await db.persistDelta(annotate(db, 'capacitor-lot-301', 'product', 'tantalum capacitor', componentMfg));
    await db.persistDelta(annotate(db, 'capacitor-lot-301', 'quantity', 50000, componentMfg));

    // OEM: received capacitors, used in product
    await db.persistDelta(relate(db,
      'component', 'capacitor-lot-301', 'installed_in',
      'product', 'product-phone-x', 'components',
      oem
    ));
    await db.persistDelta(annotate(db, 'product-phone-x', 'name', 'PhoneX Pro', oem));

    // Trace backward from product to mine
    const components = relatedIds(db, 'product-phone-x', 'components', 'component');
    expect(components).toContain('capacitor-lot-301');

    const capSourceMaterial = relatedIds(db, 'capacitor-lot-301', 'source_material', 'input');
    expect(capSourceMaterial).toContain('tantalum-batch-201');

    const tantalumSource = relatedIds(db, 'tantalum-batch-201', 'source_material', 'input');
    expect(tantalumSource).toContain('ore-batch-101');

    const oreOrigin = resolveEntity(db, 'ore-batch-101');
    expect(oreOrigin.mine_of_origin).toBe('Kivu Mine #3');
  });

  it('should attribute each link in the chain to its creator', async () => {
    // Each organization asserts only its own part of the chain
    await db.persistDelta(annotate(db, 'batch-A', 'extracted_by', 'Kivu Cooperative', mineCooperative));
    await db.persistDelta(annotate(db, 'batch-A', 'received_by', 'Singapore Smelting Co', smelter));
    await db.persistDelta(annotate(db, 'batch-B', 'produced_by', 'Singapore Smelting Co', smelter));
    await db.persistDelta(annotate(db, 'batch-B', 'received_by', 'Shenzhen Components', componentMfg));

    // Auditor can verify: each assertion is from the expected party
    const mineDeltas = db.queryDeltas({ authors: [mineCooperative] });
    const smelterDeltas = db.queryDeltas({ authors: [smelter] });
    const mfgDeltas = db.queryDeltas({ authors: [componentMfg] });

    const mineArray = Array.isArray(mineDeltas) ? mineDeltas : [];
    const smelterArray = Array.isArray(smelterDeltas) ? smelterDeltas : [];
    const mfgArray = Array.isArray(mfgDeltas) ? mfgDeltas : [];

    // Mine only asserts extraction
    expect(mineArray.every(d => d.author === mineCooperative)).toBe(true);
    // Smelter asserts receipt and production
    expect(smelterArray.every(d => d.author === smelter)).toBe(true);
    // Manufacturer asserts receipt
    expect(mfgArray.every(d => d.author === componentMfg)).toBe(true);
  });

  it('should support auditor annotations alongside chain data', async () => {
    // Supply chain data
    await db.persistDelta(annotate(db, 'shipment-X', 'contents', 'tantalum ore', mineCooperative));
    await db.persistDelta(annotate(db, 'shipment-X', 'weight_kg', 200, mineCooperative));
    await db.persistDelta(annotate(db, 'shipment-X', 'origin', 'Kivu Mine #3', mineCooperative));

    // Auditor verifies and annotates
    await db.persistDelta(annotate(db, 'shipment-X', 'audit_status', 'verified', auditor));
    await db.persistDelta(annotate(db, 'shipment-X', 'audit_date', '2024-04-01', auditor));
    await db.persistDelta(annotate(db, 'shipment-X', 'audit_notes',
      'Site visit confirmed. Documentation matches physical inventory.', auditor));

    // Both supply chain and audit data coexist
    const view = resolveEntity(db, 'shipment-X');
    expect(view.contents).toBe('tantalum ore');
    expect(view.origin).toBe('Kivu Mine #3');
    expect(view.audit_status).toBe('verified');
    expect(view.audit_notes).toContain('Site visit confirmed');

    // Auditor's assertions are distinguishable by provenance
    const auditorDeltas = db.queryDeltas({ authors: [auditor] });
    const auditorArray = Array.isArray(auditorDeltas) ? auditorDeltas : [];
    expect(auditorArray.length).toBe(3);
  });

  it('should flag conflicting claims about the same shipment', async () => {
    // Mine says shipment weighs 500kg
    await db.persistDelta(annotate(db, 'shipment-Y', 'weight_kg', 500, mineCooperative, 1000));

    // Smelter says they received 480kg
    await db.persistDelta(annotate(db, 'shipment-Y', 'weight_kg', 480, smelter, 2000));

    // Discrepancy is visible
    const weights = allValuesFor(db, 'shipment-Y', 'weight_kg');
    expect(weights).toHaveLength(2);
    expect(weights).toContain(500);
    expect(weights).toContain(480);

    // Auditor can see the discrepancy and investigate
    await db.persistDelta(annotate(db, 'shipment-Y', 'discrepancy_noted',
      '20kg difference between reported extraction and receipt', auditor, 3000));

    const view = resolveEntity(db, 'shipment-Y');
    expect(view.discrepancy_noted).toContain('20kg difference');
  });

  it('should handle branching and merging of material flows', async () => {
    // One ore batch split into two tantalum batches at smelter
    await db.persistDelta(annotate(db, 'ore-big', 'weight_kg', 1000, mineCooperative));

    await db.persistDelta(relate(db,
      'input', 'ore-big', 'processed_into',
      'output', 'tantalum-A', 'source_material',
      smelter
    ));
    await db.persistDelta(annotate(db, 'tantalum-A', 'weight_kg', 40, smelter));

    await db.persistDelta(relate(db,
      'input', 'ore-big', 'processed_into',
      'output', 'tantalum-B', 'source_material',
      smelter
    ));
    await db.persistDelta(annotate(db, 'tantalum-B', 'weight_kg', 50, smelter));

    // Both tantalum batches trace back to the same ore
    const sourceA = relatedIds(db, 'tantalum-A', 'source_material', 'input');
    const sourceB = relatedIds(db, 'tantalum-B', 'source_material', 'input');
    expect(sourceA).toContain('ore-big');
    expect(sourceB).toContain('ore-big');

    // Ore batch shows both outputs
    const outputs = relatedIds(db, 'ore-big', 'processed_into', 'output');
    expect(outputs).toContain('tantalum-A');
    expect(outputs).toContain('tantalum-B');
    expect(outputs).toHaveLength(2);
  });

  it('should preserve chain integrity even when a participant is distrusted', async () => {
    // Full chain
    await db.persistDelta(annotate(db, 'ore-Z', 'origin', 'Clean Mine', mineCooperative));
    await db.persistDelta(annotate(db, 'ore-Z', 'weight_kg', 300, mineCooperative));
    await db.persistDelta(annotate(db, 'tantalum-Z', 'purity', '99.9%', smelter));
    await db.persistDelta(relate(db,
      'input', 'ore-Z', 'processed_into',
      'output', 'tantalum-Z', 'source_material',
      smelter
    ));

    // Auditor flags smelter as untrustworthy
    await db.persistDelta(annotate(db, smelter, 'trust_status', 'suspended', auditor));

    // With trusted-author resolution, mine data is preferred over smelter data
    const mineOnlyStrategy = trustedAuthor([mineCooperative, auditor]);
    const oreView = resolveEntityWith(db, 'ore-Z', mineOnlyStrategy);
    expect(oreView.origin).toBe('Clean Mine');

    // Smelter's data still exists but can be filtered
    const smelterDeltas = db.queryDeltas({ authors: [smelter] });
    const smelterArray = Array.isArray(smelterDeltas) ? smelterDeltas : [];
    expect(smelterArray.length).toBeGreaterThan(0);
  });
});
