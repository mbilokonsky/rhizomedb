# Gut Microbiome & Mental Health: 10 Papers for Knowledge Graph Batch 3

*Generated: 2026-02-06*
*Original question: Find 10 real, published academic papers on gut microbiome and mental health not already in the graph, with emphasis on contradictory findings, underrepresented regions, landmark papers, and novel 2023-2025 work.*
*Underlying questions identified: Where does the current graph have blind spots? Which findings CHALLENGE the existing narrative? What foundational papers anchor the field but are missing? Where is geographic/methodological diversity lacking?*

## Executive Summary

This batch of 10 papers was curated to stress-test and enrich the existing 16-paper knowledge graph. The selection strategy prioritized three things: (1) **foundational papers** the graph cannot credibly exist without (Sudo 2004, Bravo 2011, Zheng 2016), (2) **direct contradictions** to existing claims -- most notably the Bravo 2011 vs. Kelly 2017 pair where the SAME probiotic strain (L. rhamnosus JB-1) produces dramatic anxiolytic effects in mice but completely fails in a human RCT, and the Chahwan 2019 trial where a multi-strain probiotic shows no depression benefit despite containing strains similar to those showing effects in your existing Steenbergen 2015 and Akkasheh 2016 papers, and (3) **geographic diversity** with papers from China (Zheng, Tian, Zhu), Japan (Sudo), Poland (Rudzki), Australia (Chahwan), South Africa/Spain (O'Hare/saNeuroGut), and multi-country collaborations (Nikolova, Zhu).

The most striking finding across this batch: **the translational gap between animal and human studies is the dominant pattern**, not the exception. L. rhamnosus JB-1 is the poster child, but the same pattern shows up with FMT studies (dramatic in mice, no human depression RCTs yet), HPA axis findings (clear in germ-free mice, inconsistent in human cohorts), and GABA pathway modulation (robust in animal vagotomy experiments, unmeasurable in humans).

## The Question Beneath the Question

Your existing graph is heavily weighted toward papers that show positive effects -- probiotics that help, bacteria that correlate, mechanisms that explain. This creates an implicit narrative that the gut-brain axis is a reliable therapeutic target. The papers in this batch deliberately include negative and null results (Kelly 2017, Chahwan 2019) and mechanistic studies that reveal HOW COMPLICATED the picture actually is (Sudo showing critical developmental windows, Zhu showing the same microbiota-behavior transfer works for schizophrenia not just depression, Nikolova showing transdiagnostic patterns that blur disease boundaries).

The real question is: **does the graph currently represent the field accurately, or does it represent the hopeful version of the field?** This batch forces that reckoning.

---

## Paper 1: Sudo et al. 2004 -- The Germ-Free Foundation

### Bibliographic Data

- **Title:** Postnatal microbial colonization programs the hypothalamic-pituitary-adrenal system for stress response in mice
- **Authors:** Nobuyuki Sudo, Yoichi Chida, Yuji Aiba, Junko Sonoda, Naomi Oyama, Xiao-Nian Yu, Chiharu Kubo, Yasuhiro Koga
- **Journal:** The Journal of Physiology, 2004; 558(Pt 1): 263-275
- **DOI:** 10.1113/jphysiol.2004.063388
- **PMID:** 15133062
- **Affiliations:** Department of Psychosomatic Medicine, Graduate School of Medical Sciences, Kyushu University, Fukuoka, Japan
- **Countries:** Japan
- **Study type:** animal_study

### Key Findings

| Finding | Entity | Direction | Context |
|---------|--------|-----------|---------|
| Germ-free mice show exaggerated HPA axis response to restraint stress | corticosterone | increased_in_germ_free | Plasma ACTH and corticosterone markedly elevated vs. SPF mice |
| Germ-free mice have reduced BDNF expression | BDNF | decreased_in_germ_free | In cortex and hippocampus relative to SPF mice |
| Monocolonization with B. infantis normalizes HPA axis | Bifidobacterium infantis | protective_effect | Complete normalization when administered in neonatal period |
| Monocolonization with enteropathogenic E. coli worsens stress response | Escherichia coli (enteropathogenic) | increased_stress_response | Even higher corticosterone than germ-free alone |
| Critical window: colonization at 6 weeks normalizes HPA, at 8 weeks does not | gut_microbiota | developmental_window | Demonstrates irreversible developmental programming |

### Specific Entities
- **Bacteria:** Bifidobacterium infantis, Escherichia coli (enteropathogenic)
- **Metabolites/Biomarkers:** corticosterone, ACTH, BDNF
- **Mechanisms:** HPA axis programming, developmental critical window, vagal signaling
- **Conditions:** stress response, anxiety (germ-free model)

### Contradictions with Existing Graph
- Your graph has Messaoudi 2011 and Steenbergen 2015 showing probiotic effects in ADULTS. Sudo 2004 suggests a critical developmental window after which microbial interventions may not fully normalize the stress axis. This complicates the "probiotics for adult depression" narrative.

### Source
- [PubMed](https://pubmed.ncbi.nlm.nih.gov/15133062/)
- [Wiley Online Library](https://physoc.onlinelibrary.wiley.com/doi/10.1113/jphysiol.2004.063388)

---

## Paper 2: Bravo et al. 2011 -- The Vagus Nerve Discovery (Part 1 of Contradiction Pair)

### Bibliographic Data

- **Title:** Ingestion of Lactobacillus strain regulates emotional behavior and central GABA receptor expression in a mouse via the vagus nerve
- **Authors:** Javier A. Bravo, Paul Forsythe, Marianne V. Chew, Emily Escaravage, Helene M. Savignac, Timothy G. Dinan, John Bienenstock, John F. Cryan
- **Journal:** Proceedings of the National Academy of Sciences (PNAS), 2011; 108(38): 16050-16055
- **DOI:** 10.1073/pnas.1102999108
- **PMID:** 21876150
- **Affiliations:**
  - Laboratory of NeuroGastroenterology, Alimentary Pharmabiotic Centre, University College Cork, Cork, Ireland
  - The McMaster Brain-Body Institute, St. Joseph's Healthcare, Hamilton, ON, Canada
  - Departments of Pathology and Molecular Medicine, McMaster University, Hamilton, ON, Canada
- **Countries:** Ireland, Canada
- **Study type:** animal_study

### Key Findings

| Finding | Entity | Direction | Context |
|---------|--------|-----------|---------|
| L. rhamnosus JB-1 reduces anxiety-like behavior in mice | Lactobacillus rhamnosus JB-1 | decreased_anxiety | Elevated plus maze, open field |
| L. rhamnosus JB-1 reduces depression-like behavior in mice | Lactobacillus rhamnosus JB-1 | decreased_depression | Forced swim test |
| L. rhamnosus JB-1 reduces stress-induced corticosterone | corticosterone | decreased_in_treatment | Compared to broth-fed controls |
| L. rhamnosus JB-1 alters GABA receptor expression in brain | GABA_B1b | increased_in_treatment | In cingulate and prelimbic cortex |
| L. rhamnosus JB-1 alters GABA receptor expression in brain | GABA_B1b | decreased_in_treatment | In hippocampus, amygdala, locus coeruleus |
| All effects abolished by vagotomy | vagus_nerve | required_for_effect | Vagotomized mice showed NO behavioral or neurochemical changes |

### Specific Entities
- **Bacteria:** Lactobacillus rhamnosus JB-1
- **Metabolites/Biomarkers:** corticosterone, GABA (B1b receptor subunit), GABA (Aalpha2 receptor subunit)
- **Mechanisms:** vagus nerve signaling, central GABA receptor modulation, HPA axis modulation
- **Conditions:** anxiety, depression (mouse models)

### Contradictions with Existing Graph
- DIRECTLY CONTRADICTED by Paper 3 below (Kelly 2017). This is the most important contradiction pair in this batch. The same research group (Cryan, Dinan, Bienenstock) showed L. rhamnosus JB-1 works beautifully in mice and then showed it fails completely in humans.
- Your existing Dinan & Cryan 2013 paper coins the term "psychobiotics" partly based on THIS result. The failure to translate undermines the optimism of that review.

### Source
- [PNAS](https://www.pnas.org/doi/10.1073/pnas.1102999108)
- [PubMed](https://pubmed.ncbi.nlm.nih.gov/21876150/)

---

## Paper 3: Kelly et al. 2017 -- The Failed Translation (Part 2 of Contradiction Pair)

### Bibliographic Data

- **Title:** Lost in translation? The potential psychobiotic Lactobacillus rhamnosus (JB-1) fails to modulate stress or cognitive performance in healthy male subjects
- **Authors:** John R. Kelly, Andrew P. Allen, Andriy Temko, William Hutch, Paul J. Kennedy, Niloufar Farid, Eileen Murphy, Geraldine Boylan, John Bienenstock, John F. Cryan, Gerard Clarke, Timothy G. Dinan
- **Journal:** Brain, Behavior, and Immunity, 2017; 61: 50-59
- **DOI:** 10.1016/j.bbi.2016.11.018
- **PMID:** 27865949
- **Affiliations:**
  - APC Microbiome Institute, University College Cork, Ireland
  - Department of Psychiatry and Neurobehavioural Science, University College Cork, Ireland
  - Department of Electrical and Electronic Engineering, University College Cork, Ireland
  - INFANT Research Centre, University College Cork, Ireland
  - Department of Pathology and Molecular Medicine, McMaster University, Hamilton, Canada
- **Countries:** Ireland, Canada
- **Study type:** clinical_trial (RCT, double-blind, placebo-controlled)

### Key Findings

| Finding | Entity | Direction | Context |
|---------|--------|-----------|---------|
| L. rhamnosus JB-1 does NOT reduce stress measures in humans | Lactobacillus rhamnosus JB-1 | no_effect | Healthy male subjects, 8-week intervention |
| L. rhamnosus JB-1 does NOT modulate HPA response in humans | cortisol | no_effect | Socially evaluated cold pressor test |
| L. rhamnosus JB-1 does NOT improve cognitive performance in humans | cognitive_function | no_effect | Visuospatial memory, attention switching, RVIP |
| L. rhamnosus JB-1 does NOT reduce anxiety in humans | anxiety | no_effect | Self-report measures |
| L. rhamnosus JB-1 does NOT alter inflammation markers in humans | inflammation | no_effect | Cytokine levels unchanged |

### Specific Entities
- **Bacteria:** Lactobacillus rhamnosus JB-1
- **Metabolites/Biomarkers:** cortisol, cytokines (unspecified)
- **Mechanisms:** NONE demonstrated (complete null result)
- **Conditions:** stress, anxiety, cognitive performance (healthy humans)

### Contradictions with Existing Graph
- **CRITICAL CONTRADICTION with Bravo 2011 (Paper 2 above):** Same strain, same senior authors, completely opposite result. The authors themselves titled the paper "Lost in translation?" -- acknowledging the failure.
- Contradicts the implicit promise of Dinan & Cryan 2013 (your existing Paper 16) which proposes psychobiotics as psychiatric interventions.
- IMPORTANT NUANCE: Bravo 2011 used BALB/c mice (an innately anxious strain). Kelly 2017 used HEALTHY humans. Both the species difference AND the baseline anxiety level may explain the discrepancy. This is not simply "it doesn't work in humans" -- it may be "it doesn't work in NON-ANXIOUS subjects."
- Your existing Slykerman 2017 paper shows L. rhamnosus HN001 (a DIFFERENT strain) DID show effects on postnatal depression. This suggests strain specificity matters enormously.

### Source
- [PubMed](https://pubmed.ncbi.nlm.nih.gov/27865949/)
- [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0889159116305207)

---

## Paper 4: Zheng et al. 2016 -- Transferring Depression via Microbiota (China)

### Bibliographic Data

- **Title:** Gut microbiome remodeling induces depressive-like behaviors through a pathway mediated by the host's metabolism
- **Authors:** Peng Zheng, Bangmin Zeng, Chanjuan Zhou, Meiling Liu, Zheng Fang, Xiaopin Xu, Liang Zeng, Jianbo Chen, Shaohua Fan, Xue Du, Xingxing Zhang, Deyu Yang, Ying Yang, Haiping Meng, Wenxin Li, N.D. Melgiri, Julio Licinio, Hong Wei, Peng Xie
- **Journal:** Molecular Psychiatry, 2016; 21(6): 786-796
- **DOI:** 10.1038/mp.2016.44
- **PMID:** 27067014
- **Affiliations:**
  - Department of Neurology, First Affiliated Hospital of Chongqing Medical University, Chongqing, China
  - Chongqing Key Laboratory of Neurobiology, Chongqing, China
  - Institute of Neuroscience, Chongqing Medical University, Chongqing, China
  - Department of Laboratory Animal Science, Third Military Medical University, Chongqing, China
  - Department of Psychiatry, First Affiliated Hospital of Chongqing Medical University, Chongqing, China
  - South Australian Health and Medical Research Institute / Flinders University, Adelaide, SA, Australia
- **Countries:** China, Australia
- **Study type:** animal_study (FMT from human MDD patients to germ-free mice)

### Key Findings

| Finding | Entity | Direction | Context |
|---------|--------|-----------|---------|
| FMT from MDD patients induces depression-like behavior in germ-free mice | gut_microbiota (MDD-derived) | causal_for_depression | Compared to healthy-donor FMT |
| Depression microbiota causes disturbances in carbohydrate metabolism | carbohydrate_metabolism | disrupted_in_depression | Host metabolomic changes in colonized mice |
| Depression microbiota causes disturbances in amino acid metabolism | amino_acid_metabolism | disrupted_in_depression | Particularly tryptophan pathways |
| Gut microbiome composition differs between MDD patients and controls | gut_microbiota | altered_in_disease | Sequencing of MDD vs. healthy donor samples |

### Specific Entities
- **Bacteria:** Not specified at species level in the key findings (focused on community-level transfer)
- **Metabolites/Biomarkers:** amino acids (tryptophan pathway), carbohydrates
- **Mechanisms:** host metabolic pathway disruption, microbiome-metabolism-behavior axis
- **Conditions:** major depressive disorder

### Contradictions with Existing Graph
- Complements but complicates Valles-Colomer 2019 (your Paper 10). Valles-Colomer identifies SPECIFIC taxa (Coprococcus, Dialister). Zheng shows the COMMUNITY-LEVEL transfer matters, suggesting individual taxa associations may be misleading -- it is the ecosystem, not the species, that drives behavior.

### Source
- [PubMed](https://pubmed.ncbi.nlm.nih.gov/27067014/)
- [Nature/Molecular Psychiatry](https://www.nature.com/articles/mp201644)

---

## Paper 5: Kelly et al. 2016 -- Transferring the Blues (Ireland)

### Bibliographic Data

- **Title:** Transferring the blues: Depression-associated gut microbiota induces neurobehavioural changes in the rat
- **Authors:** John R. Kelly, Yuliya Borre, Ciaran O'Brien, Elaine Patterson, Sahar El Aidy, Jennifer Deane, Paul J. Kennedy, Sasja Beers, Karen Scott, Gerard Moloney, Alan E. Hoban, Lucinda Scott, Patrick Fitzgerald, Paul Ross, Catherine Stanton, Gerard Clarke, John F. Cryan, Timothy G. Dinan
- **Journal:** Journal of Psychiatric Research, 2016; 82: 109-118
- **DOI:** 10.1016/j.jpsychires.2016.07.019
- **PMID:** 27491067
- **Affiliations:**
  - APC Microbiome Institute, University College Cork, Cork, Ireland
  - Department of Psychiatry and Neurobehavioural Science, University College Cork, Ireland
  - Teagasc Food Research Centre, Moorepark, Fermoy, Cork, Ireland
  - Groningen Biomolecular Sciences and Biotechnology Institute, University of Groningen, Netherlands
  - Department of Anatomy and Neuroscience, University College Cork, Ireland
- **Countries:** Ireland, Netherlands
- **Study type:** animal_study (FMT from human MDD patients to microbiota-depleted rats)

### Key Findings

| Finding | Entity | Direction | Context |
|---------|--------|-----------|---------|
| FMT from MDD patients induces anhedonia in rats | anhedonia | increased_in_depression_FMT | Sucrose preference test |
| FMT from MDD patients induces anxiety-like behavior in rats | anxiety | increased_in_depression_FMT | Behavioral testing |
| FMT from MDD patients alters tryptophan metabolism in rats | tryptophan_metabolism | disrupted_in_depression_FMT | Altered kynurenine/tryptophan ratio |
| Depression is associated with decreased gut microbiota richness and diversity | alpha_diversity | decreased_in_disease | In the human donor samples |

### Specific Entities
- **Bacteria:** Community-level, not species-specific (focused on diversity metrics)
- **Metabolites/Biomarkers:** tryptophan, kynurenine
- **Mechanisms:** tryptophan-kynurenine pathway disruption, microbiota-behavior transfer
- **Conditions:** major depressive disorder, anhedonia, anxiety

### Contradictions with Existing Graph
- Works in rats (microbiota-depleted, not germ-free) paralleling Zheng 2016 in mice. But note: BOTH are animal studies. No human FMT-for-depression RCT has been published. The graph should represent this as "demonstrated in animal models only."
- The tryptophan/kynurenine finding connects to Rudzki 2019 (Paper 8 below) which shows L. plantarum 299v DECREASES kynurenine in depressed humans -- suggesting a potential mechanistic target that actually translates.

### Source
- [PubMed](https://pubmed.ncbi.nlm.nih.gov/27491067/)
- [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0022395616301571)

---

## Paper 6: Nikolova et al. 2021 -- Transdiagnostic Meta-Analysis (UK/Germany)

### Bibliographic Data

- **Title:** Perturbations in Gut Microbiota Composition in Psychiatric Disorders: A Review and Meta-analysis
- **Authors:** Viktoriya L. Nikolova, Megan R.B. Smith, Lindsay J. Hall, Anthony J. Cleare, James M. Stone, Allan H. Young
- **Journal:** JAMA Psychiatry, 2021; 78(12): 1343-1354
- **DOI:** 10.1001/jamapsychiatry.2021.2573
- **PMID:** 34524405
- **Affiliations:**
  - Centre for Affective Disorders, Institute of Psychiatry, Psychology & Neuroscience, King's College London, UK
  - Department of Psychosis Studies, King's College London, UK
  - Quadram Institute Bioscience, Norwich Research Park, UK
  - Norwich Medical School, University of East Anglia, UK
  - Chair of Intestinal Microbiome, Technical University of Munich, Germany
  - NIHR Biomedical Research Centre, South London and Maudsley NHS, UK
  - Brighton and Sussex Medical School, UK
- **Countries:** United Kingdom, Germany
- **Study type:** review (systematic review and meta-analysis, 59 case-control studies)

### Key Findings

| Finding | Entity | Direction | Context |
|---------|--------|-----------|---------|
| Faecalibacterium consistently depleted across MDD, BD, schizophrenia, anxiety | Faecalibacterium | decreased_in_disease | Transdiagnostic pattern across 4 disorder categories |
| Coprococcus consistently depleted across psychiatric disorders | Coprococcus | decreased_in_disease | Transdiagnostic pattern |
| Eggerthella consistently enriched across MDD, BD, schizophrenia, anxiety | Eggerthella | increased_in_disease | Transdiagnostic pattern -- pro-inflammatory |
| Butyrate-producing bacteria depleted as a class | butyrate_producers | decreased_in_disease | Anti-inflammatory taxa consistently low |
| Pro-inflammatory bacteria enriched as a class | pro-inflammatory_bacteria | increased_in_disease | Consistent across disorder categories |

### Specific Entities
- **Bacteria:** Faecalibacterium, Coprococcus, Eggerthella (the "transdiagnostic triad")
- **Metabolites/Biomarkers:** butyrate (implied via producer taxa), inflammatory markers
- **Mechanisms:** inflammation-mediated gut-brain axis, butyrate depletion
- **Conditions:** MDD, bipolar disorder, schizophrenia, anxiety (transdiagnostic)

### Contradictions with Existing Graph
- Your existing Valles-Colomer 2019 specifically flags Coprococcus and Dialister as depleted in depression. Nikolova 2021 CONFIRMS Coprococcus but across ALL psychiatric disorders, not just depression. This suggests your graph's depression-specific claims may actually be transdiagnostic -- which changes their meaning.
- The Eggerthella enrichment is notable because it is NOT mentioned in most of your existing papers. This is a gap in the current graph.
- IMPORTANT NUANCE: Nikolova notes that Faecalibacterium is sometimes reported as INCREASED in certain individual studies, even though the meta-analytic consensus is depletion. This heterogeneity is real and may reflect dietary confounders, medication effects, or geographic variation in baseline microbiome composition.

### Source
- [JAMA Psychiatry](https://jamanetwork.com/journals/jamapsychiatry/fullarticle/2784328)
- [PubMed](https://pubmed.ncbi.nlm.nih.gov/34524405/)
- [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC8444066/)

---

## Paper 7: Tian et al. 2022 -- B. breve CCFM1025 Clinical Trial (China)

### Bibliographic Data

- **Title:** Bifidobacterium breve CCFM1025 attenuates major depression disorder via regulating gut microbiome and tryptophan metabolism: A randomized clinical trial
- **Authors:** Peijun Tian, Ying Chen, Huiyue Zhu, Luyao Wang, Xin Qian, Renying Zou, Jianxin Zhao, Hao Zhang, Long Qian, Qun Wang, Gang Wang, Wei Chen
- **Journal:** Brain, Behavior, and Immunity, 2022; 100: 233-241
- **DOI:** 10.1016/j.bbi.2021.11.023
- **PMID:** 34875345
- **Affiliations:**
  - State Key Laboratory of Food Science and Technology, Jiangnan University, Wuxi, Jiangsu, China
  - School of Food Science and Technology, Jiangnan University, China
  - National Engineering Research Center for Functional Food, Jiangnan University, China
  - (Yangzhou) Institute of Food Biotechnology, Jiangnan University, China
  - Wuxi Translational Medicine Research Center, Jiangsu Translational Medicine Research Institute, China
  - The Tinghu People's Hospital, Yancheng, Jiangsu, China
- **Countries:** China
- **Study type:** clinical_trial (RCT, double-blind, placebo-controlled)

### Key Findings

| Finding | Entity | Direction | Context |
|---------|--------|-----------|---------|
| B. breve CCFM1025 improves depression scores vs. placebo | Bifidobacterium breve CCFM1025 | decreased_depression | HDRS-24 and MADRS scores, 4-week intervention, n=45 |
| B. breve CCFM1025 increases fecal tryptophan derivatives | tryptophan_derivatives | increased_in_treatment | Fecal metabolomics |
| Tryptophan derivative changes correlate with symptom improvement | tryptophan_metabolism | mechanism_of_effect | Significant correlation between metabolite and HDRS changes |
| B. breve CCFM1025 alters gut microbiome composition | gut_microbiota | altered_in_treatment | Shifts in community structure |

### Specific Entities
- **Bacteria:** Bifidobacterium breve CCFM1025
- **Metabolites/Biomarkers:** tryptophan derivatives (fecal), HDRS-24, MADRS
- **Mechanisms:** tryptophan metabolism modulation, gut microbiome remodeling
- **Conditions:** major depressive disorder

### Contradictions with Existing Graph
- SUPPORTS your existing Akkasheh 2016 (probiotic helps MDD) but with a DIFFERENT genus (Bifidobacterium, not Lactobacillus).
- The tryptophan mechanism connects to Rudzki 2019 (Paper 8) but via a DIFFERENT pathway: Tian shows increased tryptophan derivatives (serotonin precursor pathway), while Rudzki shows decreased kynurenine (inflammatory pathway diversion). These are complementary, not contradictory, but the graph should represent both branches of tryptophan metabolism.
- CAUTION: Small sample size (n=45, with only 20 in probiotic group). The effect is real but the evidence is preliminary.

### Source
- [PubMed](https://pubmed.ncbi.nlm.nih.gov/34875345/)
- [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0889159121006267)

---

## Paper 8: Rudzki et al. 2019 -- L. plantarum 299v and Kynurenine (Poland)

### Bibliographic Data

- **Title:** Probiotic Lactobacillus Plantarum 299v decreases kynurenine concentration and improves cognitive functions in patients with major depression: A double-blind, randomized, placebo controlled study
- **Authors:** Leszek Rudzki, Lucyna Ostrowska, Dariusz Pawlak, Aleksandra Malus, Krystyna Pawlak, Napoleon Waszkiewicz, Agata Szulc
- **Journal:** Psychoneuroendocrinology, 2019; 100: 213-222
- **DOI:** 10.1016/j.psyneuen.2018.10.010
- **PMID:** 30388595
- **Affiliations:**
  - Department of Psychiatry, Medical University of Bialystok, Poland
  - Department of Dietetics and Clinical Nutrition, Medical University of Bialystok, Poland
  - Department of Pharmacodynamics, Medical University of Bialystok, Poland
  - Department of Monitored Pharmacotherapy, Medical University of Bialystok, Poland
  - Department of Psychiatry, Medical University of Warsaw, Poland
- **Countries:** Poland
- **Study type:** clinical_trial (RCT, double-blind, placebo-controlled, SSRI augmentation)

### Key Findings

| Finding | Entity | Direction | Context |
|---------|--------|-----------|---------|
| L. plantarum 299v decreases kynurenine concentration in MDD patients | kynurenine | decreased_in_treatment | Plasma levels, 8-week SSRI augmentation, n=79 |
| L. plantarum 299v improves cognitive functions in MDD patients | cognitive_function | increased_in_treatment | Attention and psychomotor speed |
| Kynurenine decrease correlates with cognitive improvement | kynurenine_pathway | mechanism_of_effect | Statistical correlation |
| L. plantarum 299v does NOT significantly improve depression scores vs. placebo | depression_scores | no_significant_effect | HDRS scores -- trend but not significant |
| No significant changes in inflammatory cytokines | TNF-alpha, IL-6, IL-1beta | no_effect | Plasma cytokine levels unchanged |
| No significant change in cortisol | cortisol | no_effect | Plasma cortisol unchanged |

### Specific Entities
- **Bacteria:** Lactobacillus plantarum 299v
- **Metabolites/Biomarkers:** kynurenine (KYN), tryptophan (TRP), kynurenic acid (KYNA), 3-hydroxykynurenine (3HKYN), anthranilic acid, 3-hydroxyanthranilic acid, TNF-alpha, IL-6, IL-1beta, cortisol
- **Mechanisms:** tryptophan-kynurenine pathway modulation, cognitive enhancement independent of mood
- **Conditions:** major depressive disorder (as SSRI augmentation)

### Contradictions with Existing Graph
- **PARTIALLY CONTRADICTS** the optimism of Akkasheh 2016 and your existing positive-result papers. L. plantarum 299v improves COGNITION but NOT DEPRESSION SCORES. This is a critical distinction -- the probiotic works on a different outcome than expected.
- The null result on inflammatory cytokines contradicts the assumed "inflammation mediation" mechanism present in much of the field's theorizing and in your graph's implicit pathway model.
- The kynurenine pathway finding is NOVEL relative to your graph and represents a mechanism distinct from the serotonin-centric model. Kynurenine is a neurotoxic metabolite of tryptophan; by reducing it, the probiotic may be neuroprotective rather than mood-elevating.

### Source
- [PubMed](https://pubmed.ncbi.nlm.nih.gov/30388595/)
- [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0306453018302695)

---

## Paper 9: Chahwan et al. 2019 -- Multi-Strain Probiotic Null Result (Australia)

### Bibliographic Data

- **Title:** Gut feelings: A randomised, triple-blind, placebo-controlled trial of probiotics for depressive symptoms
- **Authors:** Bahia Chahwan, Sophia Kwan, Ashling Isik, Saskia van Hemert, Catherine Burke, Lynette Roberts
- **Journal:** Journal of Affective Disorders, 2019; 253: 317-326
- **DOI:** 10.1016/j.jad.2019.04.097
- **PMID:** 31078831
- **Affiliations:**
  - School of Life Sciences, University of Technology Sydney, Australia
  - Discipline of Clinical Psychology, University of Technology Sydney, Australia
  - Winclove Probiotics, Amsterdam, Netherlands
- **Countries:** Australia, Netherlands
- **Study type:** clinical_trial (RCT, triple-blind, placebo-controlled)

### Key Findings

| Finding | Entity | Direction | Context |
|---------|--------|-----------|---------|
| Multi-strain probiotic (Ecologic Barrier) does NOT reduce depressive symptoms vs. placebo | Ecologic_Barrier (8-strain probiotic) | no_effect | BDI, DASS, BAI scores, 8-week intervention, n=71 |
| Both probiotic and placebo groups show similar improvement | placebo_effect | confounding | Equal improvement in both arms |
| Probiotics improve cognitive reactivity to sad mood | cognitive_reactivity | decreased_in_treatment | Significant in mild/moderate subgroup |
| No significant microbiota changes from probiotic | gut_microbiota | no_change | 16S sequencing showed no major shifts |
| Ruminococcus gnavus correlates with one depression metric | Ruminococcus gnavus | correlated_with_depression | Significant correlation in observational analysis |

### Probiotic Composition (Ecologic Barrier)
- Bifidobacterium bifidum W23
- Bifidobacterium lactis W52
- Lactobacillus acidophilus W37
- Lactobacillus brevis W63
- Lactobacillus casei W56
- Lactobacillus salivarius W24
- Lactococcus lactis W19
- Lactococcus lactis W58
- Total dose: 2.5 x 10^9 CFU/gram

### Specific Entities
- **Bacteria:** 8 strains listed above, plus Ruminococcus gnavus (correlational finding)
- **Metabolites/Biomarkers:** BDI, DASS, BAI scores
- **Mechanisms:** cognitive reactivity reduction (without mood improvement)
- **Conditions:** depression

### Contradictions with Existing Graph
- **DIRECTLY CONTRADICTS Steenbergen 2015** (your Paper 13). Steenbergen used the SAME probiotic formulation (Ecologic Barrier / marketed as "Ecologic 825" in some sources) and found reduced cognitive reactivity to sad mood in HEALTHY volunteers. Chahwan 2019 finds the same cognitive reactivity reduction BUT in DEPRESSED patients, the depression scores themselves do NOT improve. The probiotic may change HOW people think about sadness without actually reducing their sadness.
- Also challenges Akkasheh 2016 (your Paper 14) which showed probiotic benefit for MDD. Different strains though (Akkasheh used L. acidophilus, L. casei, B. bifidum only).
- The null microbiota finding is striking: the probiotic did not measurably change the gut microbiome composition, raising the question of whether the cognitive reactivity effect is mediated through the gut at all.

### Source
- [PubMed](https://pubmed.ncbi.nlm.nih.gov/31078831/)
- [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S0165032719302873)

---

## Paper 10: Zhu et al. 2020 -- Schizophrenia Microbiota Transfer (China, Multi-Country)

### Bibliographic Data

- **Title:** Transplantation of microbiota from drug-free patients with schizophrenia causes schizophrenia-like abnormal behaviors and dysregulated kynurenine metabolism in mice
- **Authors:** Feng Zhu, Ruijin Guo, Wei Wang, Yanmei Ju, Qi Wang, Qingyan Ma, Qiang Sun, Yajuan Fan, Yuying Xie, Zai Yang, Zhuye Jie, Binbin Zhao, Liang Xiao, Lin Yang, Tao Zhang, Bing Liu, Liyang Guo, Xiaoyan He, Yunchun Chen, Ce Chen, Chengge Gao, Xun Xu, Huanming Yang, Jian Wang, Yonghui Dang, Lise Madsen, Susanne Brix, Karsten Kristiansen, Huijue Jia, Xiancang Ma
- **Journal:** Molecular Psychiatry, 2020; 25(11): 2905-2918
- **DOI:** 10.1038/s41380-019-0475-4
- **PMID:** 31391545
- **Affiliations:**
  - Center for Translational Medicine, First Affiliated Hospital of Xi'an Jiaotong University, Xi'an, China
  - BGI-Shenzhen, Shenzhen, China
  - China National Genebank, Shenzhen, China
  - Macau University of Science and Technology, Macau
  - University of Toronto, Canada
  - Michigan State University, USA
  - Imperial College London, UK
  - Institute of Marine Research, Bergen, Norway
  - University of Copenhagen, Denmark
  - Technical University of Denmark, Denmark
- **Countries:** China, Macau, Canada, USA, UK, Norway, Denmark
- **Study type:** animal_study (FMT from human schizophrenia patients to antibiotic-treated mice)

### Key Findings

| Finding | Entity | Direction | Context |
|---------|--------|-----------|---------|
| FMT from schizophrenia patients induces psychomotor hyperactivity in mice | psychomotor_activity | increased_in_schizophrenia_FMT | Behavioral testing |
| FMT from schizophrenia patients impairs learning and memory | learning_and_memory | decreased_in_schizophrenia_FMT | Behavioral testing |
| Schizophrenia microbiota dysregulates kynurenine metabolism in mice | kynurenine_metabolism | disrupted_in_schizophrenia_FMT | Tryptophan-kynurenine pathway |
| 60 species differ between schizophrenia-colonized and control-colonized mice | gut_microbiota | altered_in_disease | Metagenomic analysis |
| Tryptophan biosynthesis function enriched in schizophrenia microbiota | tryptophan_biosynthesis | increased_in_disease | Functional module analysis |
| Glutamate-glutamine-GABA cycle disrupted | GABA, glutamate, glutamine | disrupted_in_schizophrenia_FMT | Metabolomic and transcriptomic analysis |

### Specific Entities
- **Bacteria:** 60 differentially abundant species (community-level, not single-taxon)
- **Metabolites/Biomarkers:** kynurenine, tryptophan, GABA, glutamate, glutamine
- **Mechanisms:** tryptophan-kynurenine pathway disruption, glutamate-GABA cycle disruption, microbiota-behavior transfer
- **Conditions:** schizophrenia

### Contradictions with Existing Graph
- Your graph currently focuses on depression and anxiety. This paper extends the microbiota-behavior causal link to SCHIZOPHRENIA -- a condition with very different neurobiology. The fact that the SAME kynurenine pathway is implicated in both depression (Zheng 2016, Kelly 2016, Rudzki 2019) AND schizophrenia (Zhu 2020) challenges disease-specific microbiome narratives.
- Combined with Nikolova 2021 (Paper 6), this suggests the gut microbiome's psychiatric effects are TRANSDIAGNOSTIC rather than disease-specific. Your graph's condition-specific edges may need transdiagnostic cross-links.
- The GABA finding connects to Bravo 2011 (Paper 2) which showed L. rhamnosus JB-1 modulates GABA receptors. But here the disruption is ENDOGENOUS (from schizophrenia microbiota) rather than THERAPEUTIC (from probiotic). Same pathway, opposite direction.

### Source
- [PubMed](https://pubmed.ncbi.nlm.nih.gov/31391545/)
- [Nature/Molecular Psychiatry](https://www.nature.com/articles/s41380-019-0475-4)

---

## BONUS: O'Hare et al. 2024/2025 -- saNeuroGut (South Africa)

*Including as an 11th reference because it is the ONLY paper from sub-Saharan Africa in this entire field and is critical for geographic representation. Use at your discretion.*

### Bibliographic Data

- **Title:** The saNeuroGut Initiative: Investigating the Gut Microbiome and Symptoms of Anxiety, Depression, and Posttraumatic Stress
- **Authors:** Michaela A. O'Hare, Patricia C. Swart, Stefanie Malan-Muller, Leigh L. van den Heuvel, Erine Brocker, Soraya Seedat, Sian M.J. Hemmings
- **Journal:** Neuroimmunomodulation, 2025; 32(1): 1-15
- **DOI:** 10.1159/000542696
- **PMID:** 39561720
- **Affiliations:**
  - Department of Psychiatry, Stellenbosch University, Cape Town, South Africa
  - SA MRC/Stellenbosch University Genomics of Brain Disorders Research Unit, South Africa
  - Department of Biomedical Sciences, Stellenbosch University, South Africa
  - Department of Pharmacology and Toxicology, University Complutense of Madrid, Spain
  - Research Institute of Hospital 12 de Octubre (Imas12), Madrid, Spain
  - CIBERSAM (Biomedical Research Network Centre in Mental Health), ISCIII, Madrid, Spain
- **Countries:** South Africa, Spain
- **Study type:** cohort (cross-sectional, n=86)

### Key Findings

| Finding | Entity | Direction | Context |
|---------|--------|-----------|---------|
| Catenibacterium abundance positively associated with PTS symptom severity | Catenibacterium | increased_in_disease | South African adults, 16S rRNA V4 |
| Collinsella abundance positively associated with PTS symptom severity | Collinsella | increased_in_disease | Novel association for PTSD |
| Holdemanella abundance positively associated with PTS symptom severity | Holdemanella | increased_in_disease | Novel association for PTSD |

### Specific Entities
- **Bacteria:** Catenibacterium, Collinsella, Holdemanella
- **Conditions:** PTSD, anxiety, depression

### Contradictions with Existing Graph
- Introduces ENTIRELY NEW taxa not present in any of your 16 papers. Collinsella has been associated with other inflammatory conditions but is novel for PTSD. This suggests the existing Western-population-centric graph may be missing geographically-specific patterns.

### Source
- [Karger/Neuroimmunomodulation](https://karger.com/nim/article/32/1/1/916281/The-saNeuroGut-Initiative-Investigating-the-Gut)
- [PubMed](https://pubmed.ncbi.nlm.nih.gov/39561720/)

---

## Invariant Findings (True Across All 10+ Papers)

1. **The gut microbiome influences brain/behavior.** Every paper in this batch, including the null-result ones, accepts this premise. Even Kelly 2017 (the failed translation) does not dispute the animal evidence.

2. **The tryptophan-kynurenine pathway is consistently implicated.** Zheng 2016, Kelly 2016, Rudzki 2019, Tian 2022, and Zhu 2020 all converge on tryptophan metabolism as a key mechanistic pathway, though they disagree on which branch matters most.

3. **Butyrate-producing bacteria are depleted in psychiatric conditions.** Nikolova 2021's meta-analysis confirms this across 59 studies. No paper in this batch contradicts it.

4. **FMT from psychiatrically ill humans to germ-free/antibiotic-treated animals transfers behavioral phenotypes.** Demonstrated for depression (Zheng 2016, Kelly 2016) and schizophrenia (Zhu 2020). No failed replications found.

## Points of Divergence

1. **Single-strain probiotic efficacy in humans:** B. breve CCFM1025 works (Tian 2022), L. plantarum 299v partially works on cognition but not mood (Rudzki 2019), L. rhamnosus JB-1 completely fails (Kelly 2017), multi-strain Ecologic Barrier fails on mood but helps cognition (Chahwan 2019). Strain specificity and outcome measure specificity are enormous.

2. **The inflammation hypothesis:** Nikolova 2021 and the FMT studies support inflammation as a mediator. But Rudzki 2019 found NO change in inflammatory cytokines despite cognitive improvement, and Chahwan 2019 found no microbiota changes despite cognitive reactivity improvement. The inflammation pathway may not be the only one, or may not even be the primary one.

3. **Disease specificity vs. transdiagnostic patterns:** Your existing graph treats depression, anxiety, IBS, and autism as separate conditions with separate microbiome signatures. Nikolova 2021 and Zhu 2020 together suggest the microbiome alterations are largely SHARED across psychiatric conditions, with the same taxa (Faecalibacterium down, Eggerthella up) and the same pathway (kynurenine) appearing in depression, bipolar, schizophrenia, and anxiety.

4. **Geographic and population effects:** O'Hare 2025 finds completely different taxa (Catenibacterium, Collinsella, Holdemanella) associated with PTSD in South Africa compared to Western studies. This may reflect genuine population-level microbiome differences or it may reflect methodological differences in sequencing and analysis.

## Rabbit Holes Explored

1. **The Bravo-Kelly contradiction is even deeper than it looks.** Bravo 2011 used BALB/c mice (an inbred strain selected for innate anxiety). A subsequent paper (not in this batch: Bharwani et al. 2018, Frontiers in Neuroscience) showed that L. rhamnosus JB-1 ALSO failed in Swiss Webster mice -- a different mouse strain. The original result may be strain-specific even within MICE, not just across species.

2. **Ecologic Barrier and Steenbergen 2015.** Your existing Paper 13 (Steenbergen) used the same Ecologic Barrier formulation as Chahwan 2019. But Steenbergen studied HEALTHY volunteers and measured cognitive reactivity. Chahwan studied DEPRESSED patients and measured depression scores. The probiotic appears to modify cognitive processing (how you respond to sad thoughts) without modifying mood state itself. This is a meaningful distinction that the graph should capture.

3. **Kynurenine as the convergence point.** Four of these 10 papers implicate the tryptophan-kynurenine pathway (Zheng, Kelly 2016, Rudzki, Zhu). This pathway sits at the intersection of immune activation and neurotransmitter availability. When the immune system is activated, tryptophan gets shunted toward kynurenine (neurotoxic) instead of serotonin (mood-regulating). The gut microbiome appears to influence this shunting. This may be the most robust mechanistic claim in the entire field.

## Edge Cases and Gotchas

1. **Dose-response ambiguity:** Tian 2022 used 10^10 CFU daily. Chahwan 2019 used 2.5 x 10^9 CFU/gram. Akkasheh 2016 (your Paper 14) used 2 x 10^9 CFU. Dose comparisons across studies are nearly impossible because formulations, strain viability, and delivery methods differ.

2. **SSRI confounding:** Rudzki 2019 gave probiotics AS AUGMENTATION to SSRIs. Akkasheh 2016 also used probiotic alongside antidepressants. Kelly 2017 studied healthy (unmedicated) subjects. The interaction between probiotics and concurrent medication is almost never controlled for.

3. **Placebo response in depression trials:** Chahwan 2019 saw significant improvement in BOTH groups. Depression trials routinely show 30-40% placebo response rates. The probiotic may need to exceed an already high bar.

4. **"Germ-free" vs. "antibiotic-depleted":** Sudo 2004 and Zheng 2016 used germ-free mice (born sterile). Kelly 2016 and Zhu 2020 used antibiotic-depleted animals. These are different models with different implications. Germ-free animals have abnormal immune development, gut morphology, and blood-brain barrier integrity. Results from germ-free models may exaggerate the microbiome's influence.

## Practical Implications for Knowledge Graph

1. **Add "null_effect" as a valid direction annotation.** Kelly 2017, Chahwan 2019, and Rudzki 2019 (for mood scores) all have important null findings that the graph must represent.

2. **Add edges for contradiction relationships.** Bravo 2011 <--> Kelly 2017 is the canonical example. The graph should capture that these findings DISAGREE and why (species, baseline anxiety level, outcome measures).

3. **Consider transdiagnostic nodes.** Rather than linking bacteria only to specific conditions, Nikolova 2021 suggests a "psychiatric_disorder" supernode that MDD, BD, schizophrenia, and anxiety all connect to via shared microbiome signatures.

4. **Add kynurenine pathway as a first-class mechanism node.** It appears in 4 of these 10 papers and connects depression, schizophrenia, and cognitive function.

5. **Flag animal vs. human evidence separately.** The graph currently mixes these. FMT-transfers-behavior is robust in animals (3 papers) but untested in human RCTs for depression.

## Sources and Citations

1. Sudo N, Chida Y, Aiba Y, et al. (2004) J Physiol. 558(Pt 1):263-75. [PMID: 15133062](https://pubmed.ncbi.nlm.nih.gov/15133062/) DOI: 10.1113/jphysiol.2004.063388
2. Bravo JA, Forsythe P, Chew MV, et al. (2011) PNAS. 108(38):16050-5. [PMID: 21876150](https://pubmed.ncbi.nlm.nih.gov/21876150/) DOI: 10.1073/pnas.1102999108
3. Kelly JR, Allen AP, Temko A, et al. (2017) Brain Behav Immun. 61:50-59. [PMID: 27865949](https://pubmed.ncbi.nlm.nih.gov/27865949/) DOI: 10.1016/j.bbi.2016.11.018
4. Zheng P, Zeng B, Zhou C, et al. (2016) Mol Psychiatry. 21(6):786-96. [PMID: 27067014](https://pubmed.ncbi.nlm.nih.gov/27067014/) DOI: 10.1038/mp.2016.44
5. Kelly JR, Borre Y, O'Brien C, et al. (2016) J Psychiatr Res. 82:109-18. [PMID: 27491067](https://pubmed.ncbi.nlm.nih.gov/27491067/) DOI: 10.1016/j.jpsychires.2016.07.019
6. Nikolova VL, Smith MRB, Hall LJ, et al. (2021) JAMA Psychiatry. 78(12):1343-1354. [PMID: 34524405](https://pubmed.ncbi.nlm.nih.gov/34524405/) DOI: 10.1001/jamapsychiatry.2021.2573
7. Tian P, Chen Y, Zhu H, et al. (2022) Brain Behav Immun. 100:233-241. [PMID: 34875345](https://pubmed.ncbi.nlm.nih.gov/34875345/) DOI: 10.1016/j.bbi.2021.11.023
8. Rudzki L, Ostrowska L, Pawlak D, et al. (2019) Psychoneuroendocrinology. 100:213-222. [PMID: 30388595](https://pubmed.ncbi.nlm.nih.gov/30388595/) DOI: 10.1016/j.psyneuen.2018.10.010
9. Chahwan B, Kwan S, Isik A, et al. (2019) J Affect Disord. 253:317-326. [PMID: 31078831](https://pubmed.ncbi.nlm.nih.gov/31078831/) DOI: 10.1016/j.jad.2019.04.097
10. Zhu F, Guo R, Wang W, et al. (2020) Mol Psychiatry. 25(11):2905-2918. [PMID: 31391545](https://pubmed.ncbi.nlm.nih.gov/31391545/) DOI: 10.1038/s41380-019-0475-4
11. (Bonus) O'Hare MA, Swart PC, Malan-Muller S, et al. (2025) Neuroimmunomodulation. 32(1):1-15. [PMID: 39561720](https://pubmed.ncbi.nlm.nih.gov/39561720/) DOI: 10.1159/000542696

## Open Questions

1. **Why does L. rhamnosus JB-1 fail in humans but work in mice?** Is it species-specific colonization failure, dose inadequacy, baseline anxiety level, or something about the human gut environment that prevents the same vagal signaling cascade?

2. **Is the kynurenine pathway causal or correlational?** Four papers implicate it, but none definitively establish that modulating kynurenine is sufficient to change psychiatric symptoms in humans.

3. **What explains the transdiagnostic pattern?** If Faecalibacterium depletion and Eggerthella enrichment are shared across MDD, BD, schizophrenia, and anxiety, what determines which condition develops? The microbiome may be a vulnerability factor rather than a specific cause.

4. **Does the saNeuroGut finding (Catenibacterium/Collinsella/Holdemanella in PTSD) replicate in other African or non-Western cohorts?** This could be a genuine population-specific finding or an artifact of small sample size (n=86).

5. **Can we disentangle probiotic effects on cognition from effects on mood?** Rudzki 2019 and Chahwan 2019 both show cognitive improvement without mood improvement. This suggests the gut-brain axis may have more reliable effects on cognitive processing than on affective state.
