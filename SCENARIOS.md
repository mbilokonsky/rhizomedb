# Scenarios

Twelve imagined deployments of RhizomeDB. Different domains, stakes, threat models, and failure modes. The point is to stress-test the architecture against the full weirdness of the real world.

---

## 1. Mutual Aid Network During Infrastructure Collapse

**Domain**: Disaster relief coordination
**Scale**: ~200 volunteers across a flooded metro area
**Instances**: Phones running local instances, a few laptops at shelters acting as hubs

Volunteers record what they see: who needs insulin, which roads are passable, where the Red Cross set up. Each delta is an assertion from a specific person at a specific time and place. No one has a complete picture. Instances federate opportunistically when two phones are in Bluetooth range or when someone reaches a shelter with wifi.

**What RhizomeDB gives them**: No central server to go down. Conflicting reports coexist (two people report different road conditions at different times) and the view resolver picks the most recent. Full provenance means "who said the bridge was safe?" is always answerable. Time-travel lets coordinators reconstruct the sequence of events for after-action review.

**Threat model**: Infrastructure failure. Cell towers down. Power outages. Phones dying. No adversary -- the enemy is entropy and urgency.

**What breaks first**: Delta accumulation with no compaction on resource-constrained phones. A phone that's been collecting reports all day might choke trying to sync when it finally reaches wifi. The lack of ordering guarantees means two shelters might independently dispatch volunteers to the same address. Timestamp trust is shaky when phones haven't synced clocks in days.

**What the architecture reveals**: The "no single source of truth" property isn't a design luxury here -- it's a survival requirement. But the system needs a graceful degradation story for devices running out of storage. Compaction/snapshotting becomes existential.

---

## 2. Cross-Border Investigative Journalism

**Domain**: A consortium of journalists in five countries investigating the same arms trafficking network
**Scale**: ~15 journalists, ~5 instances across newsrooms, plus personal instances on encrypted laptops
**Federation**: Selective. Each newsroom controls what it shares. Some deltas never leave a single laptop.

Journalists create deltas linking people to shell companies to shipping manifests to satellite imagery. Each assertion carries the journalist's identity as author. Some facts come from sources who insist on compartmentalization -- the journalist in Lagos knows something the journalist in Berlin shouldn't have access to until publication.

**What RhizomeDB gives them**: Selective federation with push/pull filters lets each newsroom control its exposure. Append-only means a seized laptop still proves what was known when -- useful if anyone claims the story was fabricated after the fact. Different trust policies at different newsrooms mean the same data can be interpreted through different editorial standards.

**Threat model**: State-level surveillance. Compromised devices. Legal compulsion (subpoenas, gag orders). Physical threats to sources. An adversary who would benefit from knowing the shape of the investigation even without reading specific deltas.

**What breaks first**: The metadata. Even without reading delta contents, an adversary who captures a device can see the *graph structure* -- who is connected to whom, how many deltas reference a given entity ID, which systems created which deltas. The author and system fields leak operational security. Federation link metadata reveals which newsrooms are collaborating. Encrypted delta contents don't help if the pointer structure itself is the intelligence.

**What the architecture reveals**: RhizomeDB needs an encryption story that goes deeper than encrypting payloads. The structure of the hypergraph is itself sensitive information. Content-addressed IDs would make deltas linkable across seizures. The append-only guarantee is a double-edged sword: great for proving a chain of custody, terrible if you need to actually destroy something before a raid.

---

## 3. Multi-Site Pharmaceutical Clinical Trial

**Domain**: Phase III drug trial across 12 hospitals in 4 countries
**Scale**: ~3000 patients, ~200 clinical staff, one instance per site plus a coordinating instance at the CRO
**Federation**: Hub-and-spoke. Sites push to coordinator. Coordinator never pushes back unblinded data.

Each patient interaction generates deltas: vitals recorded, adverse events noted, dosages administered. The CRO's view resolver applies a blinding schema that strips treatment-arm assignment from all views except the Data Safety Monitoring Board's. Regulatory auditors can time-travel to any point in the trial and see exactly what was known when.

**What RhizomeDB gives them**: Immutable audit trail satisfying 21 CFR Part 11. Full provenance on every data point. The ability to reconstruct any past state for regulatory inspection. Negation (not deletion) of erroneous entries preserves the error and the correction. Different sites can have different schemas for local workflows while the CRO's HyperSchema normalizes everything for analysis.

**Threat model**: Data manipulation by a site trying to hit enrollment targets. Clock manipulation to backdate entries. Regulatory inspection finding inconsistencies. A CRO employee attempting to unblind early to trade on results.

**What breaks first**: Timestamp authority. A site could set local clocks back to fabricate entries that appear to have been recorded at the time of a patient visit. The author/system fields are spoofable without cryptographic signing. The "schemas as data" principle means a compromised coordinator could silently alter the HyperSchema used for regulatory views. The "no single source of truth" principle is exactly what regulators don't want -- they want *a* single source of truth that's been properly validated.

**What the architecture reveals**: The gap between the current implementation (unverified author/system) and production requirements (cryptographic signing, trusted timestamping) is a chasm, not a gap. Regulated industries need the append-only guarantee to be *provable*, not just a property of the current implementation. The system needs an external timestamping authority or attestation chain.

---

## 4. Indigenous Oral History and Land Rights Documentation

**Domain**: A First Nations community documenting traditional land use, oral histories, and ecological knowledge
**Scale**: Elders, community researchers, and a land rights legal team. ~30 people. Local instances on community hardware, one instance with the legal team.
**Federation**: Community controls what gets shared with the legal team. Some knowledge is ceremonial and never leaves the community instance.

Elders' testimonies are recorded as deltas. Each story might reference landmarks, seasonal patterns, family lineages, and spiritual practices. The legal team's HyperSchema extracts only what's relevant and admissible for court -- land use patterns, dates, place names. The community's HyperSchema preserves the full cultural context.

**What RhizomeDB gives them**: Two legitimate views of the same underlying data. The legal view is a subset of the community view, not a separate database. When new elders share stories, the legal case automatically has access to any newly relevant evidence without re-interviewing. Negation handles corrections when an elder revises a story -- the original and the revision both exist with full provenance.

**Threat model**: Colonial erasure. Government agencies claiming the documentation is fabricated or unreliable. Mining companies challenging the authenticity of oral histories. Internal community disagreements about what should be shared outside. The legal team accidentally exposing sacred knowledge in court filings.

**What breaks first**: The assumption that "different observers holding different views" is purely beneficial. The community might discover that the legal team's HyperSchema is extracting information in ways that strip sacred context, making ceremonial knowledge appear to be merely practical land-use data. The federation filters might not be granular enough -- a delta about a fishing spot might also reference a creation story, and filtering at the delta level (atomic, remember) forces an all-or-nothing choice.

**What the architecture reveals**: Delta atomicity design decisions (what's one delta vs. separate deltas) encode cultural assumptions about what facts are separable. The Western assumption that a fishing location and a spiritual practice are "independent facts that should be separate deltas" may itself be a form of violence against holistic knowledge systems. The tool's modeling decisions aren't culturally neutral.

---

## 5. Autonomous Agent Swarm Coordination

**Domain**: A fleet of 50 AI coding agents working on a shared codebase
**Scale**: Each agent is an instance. A coordination layer federates relevant state.
**Federation**: Peer-to-peer with topic-based filters. Agents working on related files federate more aggressively.

Each agent emits deltas about its observations (file states, test results, dependency graphs), intentions (plans, task claims), and actions (edits, commits). The coordination layer's HyperSchema resolves conflicting task claims (two agents both claiming the same bug) and detects semantic conflicts (two agents editing the same function with different intentions).

**What RhizomeDB gives them**: The stated target use case. No central task scheduler to bottleneck. Agents can work offline and sync when ready. The hypergraph structure naturally represents the web of relationships between code, tests, dependencies, and agent intentions. Time-travel lets an agent understand how a function evolved when diagnosing a regression.

**Threat model**: Rogue agent. An agent that's been jailbroken or is operating on stale context makes confidently wrong assertions that propagate through federation before anyone notices. A compromised agent could emit negation deltas targeting legitimate work. No malice needed -- a simple bug in one agent's delta-emission logic could corrupt the shared graph.

**What breaks first**: View resolution under high concurrency. Fifty agents each emitting deltas per second means the federation graph is churning constantly. Materialized HyperViews are stale the moment they're computed. Two agents independently solving the same problem create divergent branches of deltas that are both internally consistent but mutually incompatible -- the CRDT convergence guarantee means both solutions end up in the graph, but the view resolver has to pick one (or surface the conflict), and neither "most recent" nor "trusted author" makes sense when both authors are equally-trusted agents who finished at roughly the same time.

**What the architecture reveals**: The "anti-imperial" design principle (no forced consensus) creates a coordination problem for agents that actually need to converge on a single implementation. Autonomous agents need something the architecture explicitly rejects: a mechanism for one agent's assertions to *override* another's. The system may need a concept of "scoped authority" where certain agents are authoritative for certain domains.

---

## 6. Personal Knowledge Graph

**Domain**: A single person organizing their reading notes, project ideas, and daily observations
**Scale**: One person. One instance on their laptop. Maybe a second on their phone.
**Federation**: Just syncing between their own devices.

They create deltas linking books to concepts to projects to people. Over months, patterns emerge: topics they keep returning to, connections between disparate reading. Time-travel shows how their thinking evolved. The HyperSchema for "what am I interested in?" produces different results at different timestamps.

**What RhizomeDB gives them**: A genuinely personal knowledge graph with full history. No company holding their data. The ability to query their own past thinking. The rhizomatic structure mirrors how knowledge actually connects -- not in folders and hierarchies, but in webs of association.

**Threat model**: None, really. Maybe bit rot. Maybe losing the laptop. The threat is more existential: the tool is so flexible that without external pressure to impose structure, the graph becomes an incomprehensible tangle. No schemas evolve because there's no second person to disagree with.

**What breaks first**: The user's willingness to emit deltas. Unlike a notes app where you type and save, creating deltas with pointers and roles and contexts requires understanding the data model. The overhead of "which role? which context? one delta or two?" means they'll either build a UI that hides the complexity (at which point they've built a notes app with extra steps) or they'll lose interest. The system's power is proportional to the effort of modeling, and a single person has no economies of scale.

**What the architecture reveals**: Developer experience is the bottleneck, not the architecture. The system desperately needs ergonomic mutation helpers, default schemas, and conventions that let someone start creating value before they understand HyperSchemas. The fact that "schemas are data" is philosophically beautiful but practically means a new user faces a blank canvas with no guidance.

---

## 7. Conflict-Zone Medical Records

**Domain**: A humanitarian medical organization operating clinics in an active conflict zone
**Scale**: 8 clinics, each with a local instance. Sporadic connectivity between them. One instance at HQ in Geneva.
**Federation**: Opportunistic. Clinics sync when satellite uplinks are available. Patient data never leaves the federation.

Patients move between clinics as the front lines shift. Each clinic records treatments, medications, allergies, diagnoses. When a patient arrives at a new clinic, whatever deltas have propagated give the doctor a partial view. A patient's allergy recorded at Clinic A might not have reached Clinic B yet.

**What RhizomeDB gives them**: Eventual consistency means every clinic eventually gets the full picture. Federation handles intermittent connectivity gracefully. Different clinics can use different HyperSchemas reflecting different specializations (the surgical clinic cares about different properties than the pediatric clinic). Provenance means "Dr. X at Clinic A on Tuesday" is always traceable.

**Threat model**: Armed groups seizing a clinic and its hardware. A government demanding patient data to identify opposition supporters. Network interception during satellite uplink. The physical safety of patients and staff depends on data not being weaponized.

**What breaks first**: The gap between eventual consistency and medical necessity. A doctor needs to know about a drug allergy *now*, not eventually. The system can tell you "here's what we know" but can't tell you "here's what we *don't* know that exists somewhere in the federation." There's no way to query "are there deltas about this patient that I haven't received yet?" -- absence of deltas is indistinguishable from absence of information. In a medical context, that distinction can be lethal.

**What the architecture reveals**: "No single source of truth" is dangerous in domains where incomplete information has asymmetric consequences. The system needs a concept of *known unknowns* -- metadata about what *might* exist in the federation that hasn't arrived yet. Also: the append-only property means patient data can never truly be deleted, which conflicts with data protection requirements in some jurisdictions and with the physical safety requirement of being able to destroy records before a clinic is overrun.

---

## 8. Collaborative Worldbuilding for a Tabletop RPG

**Domain**: A group of 6 friends building a shared fictional universe for their D&D campaign
**Scale**: 6 players, 1 DM. Each has a local instance. The DM's instance is the hub.
**Federation**: Players push to DM. DM selectively pushes back (some lore is secret).

Players create characters, locations, factions, and history. The DM creates the canonical world. A player might assert "my character's hometown is a fishing village called Brightwater" and the DM might later add deltas enriching Brightwater with history and NPCs, or might negate the delta if Brightwater conflicts with established geography.

**What RhizomeDB gives them**: Collaborative creation where the DM retains narrative authority. Players' contributions are first-class data, not second-class suggestions. The full history of how the world evolved is preserved. Time-travel lets them recall what was established in session 12 when they're on session 40. The DM's HyperSchema can construct different views for different players (a player doesn't see the dragon's true name until the reveal).

**Threat model**: Retconning. A player claims "I established this three sessions ago" and the DM disagrees. The append-only log settles it. Mild social threat: a player feels their contributions are being negated too freely. The "conflict" is interpersonal, not technical.

**What breaks first**: Nothing, really. This is a low-stakes, high-trust environment where the architecture's properties (provenance, time-travel, selective federation, negation) all map cleanly to actual needs. The biggest issue is the same as Scenario 6: the overhead of creating structured deltas for what should be a casual creative activity.

**What the architecture reveals**: This might be the sweet spot. Small group, high trust, genuine need for provenance and selective views, low-enough stakes that eventual consistency is fine. The system shines when the social dynamics are healthy. The tool amplifies whatever dynamics already exist -- it doesn't create trust, it makes trust legible.

---

## 9. Supply Chain Provenance for Conflict Minerals

**Domain**: Tracking tantalum from mine to consumer electronics manufacturer
**Scale**: Mining cooperatives, smelters, component manufacturers, OEMs. ~40 organizations across 6 countries.
**Federation**: Linear chain with auditor overlay. Each org pushes downstream. Auditors pull from all.

Each participant asserts what they received, from whom, and what they shipped. A smelter creates deltas linking incoming ore batches (with mine-of-origin claims) to outgoing tantalum powder batches. The OEM's HyperSchema traces any component back through the full chain to the mine. Auditors can time-travel to check whether due diligence was performed before a shipment was accepted.

**What RhizomeDB gives them**: End-to-end traceability without requiring a centralized database that no competitor would share data with. Each organization keeps its own instance and controls what it shares. The hypergraph naturally represents the branching/merging of material flows (ore from multiple mines combined at a smelter). Immutability means a smelter can't retroactively alter which mines it claimed to source from.

**Threat model**: Economic incentive to lie. A middleman re-labeling conflict minerals as clean. A smelter creating deltas with false mine-of-origin pointers. Sophisticated laundering where a legitimate mine's ID is attached to ore from an illegitimate source. The adversary is a rational economic actor, not a nation-state.

**What breaks first**: Trust at the edges. The system can guarantee that deltas are immutable once created, but it cannot guarantee that the *assertions within deltas are true*. A mining cooperative that claims ore came from Mine A when it came from Mine B creates a perfectly valid, well-formed delta that's simply a lie. The append-only property means the lie is preserved forever, which is useful for auditing after the fact but does nothing to prevent it. Trusted author policies are only as good as the trust, which in a corrupt supply chain is essentially zero at the nodes where corruption occurs.

**What the architecture reveals**: The system provides *provenance of assertions*, not *provenance of truth*. The delta says "Organization X claimed Y at time T" -- whether Y is true requires verification outside the system. RhizomeDB can be the backbone of a provenance system but isn't itself a provenance system. The architecture needs to compose with physical verification (assays, site inspections, satellite imagery) to close the trust gap.

---

## 10. Whistleblower Evidence Preservation

**Domain**: An employee at a defense contractor documenting procurement fraud
**Scale**: One person. One instance on an encrypted drive. Eventually, a second instance at a journalist's or lawyer's office.
**Federation**: None initially. A single catastrophic sync when the whistleblower decides to go public.

The whistleblower creates deltas over months, linking contracts to communications to financial records to personnel. Each delta is timestamped. The append-only property means the whistleblower cannot be accused of fabricating evidence after the fact -- the delta stream has internal consistency that would be very difficult to forge retroactively.

**What RhizomeDB gives them**: A tamper-evident evidence chain. Time-travel shows the sequence of discovery. Provenance proves the whistleblower (and only the whistleblower) created the deltas on a specific device. If content-addressed IDs are used, any tampering is detectable. The HyperSchema at the lawyer's office can organize evidence by legal relevance rather than chronological discovery.

**Threat model**: The employer. Discovery of the evidence before publication. Subpoena of the device. Forensic analysis attempting to prove the evidence was fabricated. The employer's legal team challenging the integrity of the delta stream. Physical coercion.

**What breaks first**: The single-device problem. If the encrypted drive is seized before federation, everything is lost. If the whistleblower makes a copy, the copy's timestamp metadata might reveal when it was made. The author/system fields, if unverified, make it easier for the employer to claim the evidence was planted by someone else. The lack of cryptographic signing means the delta stream is suggestive but not *probative* of authenticity. A skilled forensic analyst could potentially construct a fake delta stream with internally consistent timestamps.

**What the architecture reveals**: The append-only, immutable properties are necessary but not sufficient for evidence preservation. The system needs cryptographic signing, external timestamping (e.g., blockchain anchoring or trusted timestamping service), and a clear chain-of-custody protocol. The architecture has the right *shape* for this use case but lacks the hardening. Also: the system needs a "dead man's switch" federation option -- automatically push to a pre-configured remote if certain conditions are met.

---

## 11. Decentralized Scientific Replication Registry

**Domain**: A network of biology labs sharing raw experimental data and replication attempts
**Scale**: ~60 labs across 20 universities. Each lab runs an instance. A nonprofit runs a coordinating instance.
**Federation**: Labs push results to the coordinator. Labs can pull each other's raw data.

A lab publishes a finding by creating deltas with methodology, raw measurements, and conclusions. Other labs attempting replication create their own deltas linking to the original study's entity ID. The coordinator's HyperSchema aggregates all replication attempts for a given finding. The view resolver can show "this finding has been replicated 3 times and failed replication twice."

**What RhizomeDB gives them**: A replication record that's append-only (you can't quietly delete a failed replication). Full provenance on every measurement. The ability to query "show me all studies from Lab X that used Method Y" across the entire federation. Time-travel shows when a finding was first challenged. Negation lets a lab formally retract a finding while preserving the record that it was once claimed.

**Threat model**: P-hacking and HARKing (hypothesizing after results are known). A lab that runs 20 experiments, publishes the one that worked, and quietly drops the other 19. A prestigious lab whose negation of a junior researcher's finding carries disproportionate weight in view resolution. Gaming the system by flooding it with low-quality replication attempts to make a finding look contested.

**What breaks first**: The social layer. The system can record everything but can't force labs to record their failures. The append-only guarantee only applies to deltas that are actually created -- it can't compel delta creation. A lab that runs an experiment and gets negative results simply doesn't create deltas, and the absence is invisible. The "most recent" and "trusted author" resolution strategies encode exactly the prestige hierarchies that replication crises stem from.

**What the architecture reveals**: The system is vulnerable to *omission* in a way it isn't vulnerable to *commission*. You can't forge a delta easily, but you can simply not create one. The architecture captures what people choose to assert but has no mechanism for ensuring completeness. For scientific integrity, the system might need "pre-registration deltas" -- assertions of intent to measure something, created before the experiment, that make the *absence* of results visible.

---

## 12. Contentious Estate Dispute

**Domain**: Three siblings disputing the estate of a deceased parent, including division of a family business, real estate, and personal property
**Scale**: Three parties, three lawyers, one mediator. Each party has an instance; the mediator has a federating instance.
**Federation**: All parties push to mediator. Mediator pushes a unified view back. Parties cannot directly see each other's raw deltas.

Each sibling creates deltas asserting claims: "Dad told me the lake house was mine." "I managed the business for 10 years, which increased its value by $2M." "Mom's jewelry was promised to me." The mediator's HyperSchema organizes claims by asset. The view resolver surfaces conflicts explicitly -- this is a case where you *want* to see all competing claims, not resolve them into a single value.

**What RhizomeDB gives them**: A structured representation of a dispute. Every claim has provenance and timestamp. Supporting evidence (documents, communications) can be linked via deltas. The mediator can time-travel to see the sequence of escalation. The "conflict preservation" property is exactly right -- forcing resolution would be premature and adversarial.

**Threat model**: Each sibling is the adversary. Fabricated claims. Strategically timed assertions designed to overwhelm the other parties. Negation as harassment (negating the other party's claims without basis). A lawyer advising their client to flood the system with marginal claims to create confusion.

**What breaks first**: The assumption that all assertions deserve equal standing. In a legal context, a claim supported by a signed document has different weight than an unsupported verbal assertion, but the delta structure treats them identically. The system needs a way to attach *evidence quality* metadata that the view resolver can use. Also: negation semantics are unclear in an adversarial context. Can Sibling A negate Sibling B's claim? Should that be allowed? The system has no concept of *authorization to negate* -- anyone can negate anything.

**What the architecture reveals**: "Anti-imperial by design" and "no forced consensus" are features in collaborative contexts but create vulnerabilities in adversarial ones. The system needs configurable authorization policies: who can create deltas targeting which entities, who can negate whose deltas, who can define schemas. In the current architecture, every participant has equal power, which in a dispute context means the most aggressive participant dominates the shared space.

---

## Cross-Cutting Observations

Several themes recur across these scenarios:

**The metadata is the message.** In scenarios 2, 7, and 10, the *structure* of the hypergraph leaks information even when contents are protected. Graph topology, delta frequency, and federation patterns are all observable signals.

**Absence is invisible.** In scenarios 7, 9, and 11, the system cannot distinguish between "no information exists" and "information exists but hasn't arrived." For medical records, supply chains, and scientific integrity, this gap ranges from inconvenient to lethal.

**Atomicity encodes worldview.** In scenario 4 (indigenous knowledge) and scenario 12 (estate dispute), the decision of what constitutes "one delta" vs. "separate deltas" encodes cultural and legal assumptions that aren't neutral.

**Authority is needed sometimes.** Scenarios 3, 5, and 12 reveal that "no forced consensus" breaks down when convergence is actually required -- for regulatory compliance, agent coordination, or dispute resolution.

**Trust can't be bootstrapped from structure.** Scenarios 3, 9, and 10 show that immutable, append-only, provenance-rich deltas prove *who said what when*, not *whether what they said is true*. The gap between provenance-of-assertion and provenance-of-truth requires mechanisms outside the system.

**The easy case is the small trusted group.** Scenario 8 (worldbuilding) works beautifully. The architecture's strengths -- flexible schemas, selective federation, provenance, time-travel -- shine when trust is high and stakes are moderate. As trust decreases and stakes increase, the system needs hardening it doesn't yet have.
