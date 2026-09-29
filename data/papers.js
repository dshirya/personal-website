// Papers data, newest first. Add an entry to publish a paper on the Papers page.
//
// `title` and `summary` may contain inline HTML (e.g. Gd<sub>10</sub>); every
// other field is plain text.
// `authors`: your name is bolded automatically; append † or * yourself if needed.
// `tags`: ids from data/concepts.js, rendered as filter chips.
// Compounds and their elements for the periodic table page live in data/research.js.
// `figure` (optional; the card is text-only without it)
//   `figure.file`: <paper-id> from images/papers/<paper-id>-800.webp / -1600.webp,
//   made by scripts/optimize_images.py from images/_src/papers/<paper-id>.png.
// `links.free`: for ACS papers, your "ACS Articles on Request" author link.
//
// TODO(figures): the current figures are the journal issue covers, kept as
// placeholders. Put your key figure (TOC graphic or Figure 1) in
// images/_src/papers/<id>.png, re-run the script, and update alt/caption/credit:
//   ACS (JPA §II.2):  "Reprinted with permission from {citation}. Copyright {year} American Chemical Society."
//                     ("Adapted from ..." if you crop or restyle it)
//   RSC / Elsevier OA: "From {citation}, licensed under CC BY-NC."
const PAPERS = [
  {
    id: "dd-2026-scalable-workflow",
    title: "Achieving a Scalable Machine Learning Workflow for Crystal Structure Discovery with Experimental Validation",
    authors: ["Danila Shiryaev", "Emil I. Jaffal", "Sangjoon Lee", "Balaranjan Selvaratnam", "Anton O. Oliynyk"],
    journal: "Digital Discovery",
    year: 2026, volume: "5", issue: "6", pages: "2414–2437",
    doi: "10.1039/D6DD00132G",
    openAccess: true,
    license: "CC BY-NC 3.0",
    links: { preprint: "https://doi.org/10.26434/chemrxiv.15001280/v2" },
    tags: ["ml", "screening", "crystal-structures", "intermetallics"],
    summary:
      "Machine-learning predictions only matter once they become compounds you can actually make. " +
      "This paper builds an end-to-end, scalable workflow for crystal structure discovery around " +
      "interpretable, explainable models, so the physical knowledge they extract guides which " +
      "candidates go to the lab, and closes the loop with experimental validation.",
    figure: {
      file: "dd-2026-scalable-workflow",
      alt: "Cover of Digital Discovery volume 5, issue 6",
      caption: "",
      credit: "Issue cover © The Royal Society of Chemistry 2026",
    },
  },
  {
    id: "jce-2026-pca-plsda",
    title: "Exploring Feature Engineering for Crystal Structure Classification: Interactive Applications of PCA and PLS-DA Clustering",
    authors: ["Danila Shiryaev", "Balaranjan Selvaratnam", "Yujing Sun", "Emil I. Jaffal", "Anton O. Oliynyk"],
    journal: "Journal of Chemical Education",
    year: 2026, volume: "103", issue: "1", pages: "662–670",
    doi: "10.1021/acs.jchemed.5c00723",
    openAccess: false,
    links: { preprint: "https://doi.org/10.26434/chemrxiv-2025-235nn" },
    tags: ["ml", "featurization", "crystal-structures"],
    summary:
      "An interactive classroom activity that teaches PCA and PLS-DA, two workhorse machine-learning " +
      "methods, on real solid-state data. Students choose chemical and physical features of binary AB " +
      "compounds and watch in real time how their choices reshape unsupervised clustering (PCA) and " +
      "supervised crystal-structure prediction (PLS-DA), with no programming experience required.",
    figure: {
      file: "jce-2026-pca-plsda",
      alt: "Cover of Journal of Chemical Education volume 103, issue 1",
      caption: "",
      credit: "Issue cover © 2026 American Chemical Society and Division of Chemical Education, Inc.",
    },
  },
  {
    id: "dib-2025-ab-prototypes",
    title: "Dataset of Prototype Structures Adopted by Intermetallic Compounds with AB Stacking",
    authors: ["Balaranjan Selvaratnam", "Emil I. Jaffal", "Danila Shiryaev", "Anton O. Oliynyk"],
    journal: "Data in Brief",
    year: 2025, volume: "63", pages: "112138",
    doi: "10.1016/j.dib.2025.112138",
    openAccess: true,
    license: "CC BY-NC 4.0",
    links: {
      preprint: "https://doi.org/10.26434/chemrxiv-2025-smpsh",
      data: "https://figshare.com/articles/dataset/_i_Dataset_of_Prototype_Structures_Adopted_by_Intermetallic_Compounds_with_AB_Stacking_i_/29105273",
    },
    tags: ["crystal-structures", "intermetallics", "data-processing"],
    summary:
      "A visual dataset of 645 unique prototype structures of intermetallic compounds with AB stacking, " +
      "mined from Pearson's Crystal Data. Each structure is described through n-capped n-gonal prisms " +
      "(n = 3–7), detected automatically by an in-house Python program and plotted on the plane " +
      "perpendicular to the stacking axis.",
    figure: {
      file: "dib-2025-ab-prototypes",
      alt: "Cover of Data in Brief",
      caption: "",
      credit: "Journal cover © Elsevier",
    },
  },
  {
    id: "jacs-2025-gd10rucd3",
    title: "Explainable Recommendation Engines to Predict Complex Intermetallics: Synthesis and Characterization of Gd<sub>10</sub>RuCd<sub>3</sub>, a Neutron Absorption Material",
    authors: [
      "Brook Xhabrahimi", "Emil I. Jaffal", "Danila Shiryaev", "Nikhil K. Barua", "Madison Donohoe",
      "Natalia Pozdnyakova", "Mariam Ismail", "Balaranjan Selvaratnam", "Ehsan Niknam", "Holger Kleinke",
      "Anton O. Oliynyk",
    ],
    journal: "Journal of the American Chemical Society",
    year: 2025, volume: "147", issue: "40", pages: "36589–36603",
    doi: "10.1021/jacs.5c11646",
    openAccess: false,
    links: {},
    tags: ["recommender", "ml", "intermetallics", "crystal-structures", "xrd"],
    summary:
      "Explainable recommendation engines (PLS-DA site classification plus PCA projections) singled out " +
      "Gd<sub>10</sub>RuCd<sub>3</sub>, a new member of the RE<sub>10</sub>MCd<sub>3</sub> family, as a " +
      "neutron absorber candidate. We synthesized it and confirmed the structure by single-crystal and " +
      "powder XRD. It combines unusually low thermal conductivity, negative thermal expansion and a " +
      "0D-electride character, and its elements put it in the top 0.4% of neutron absorbers.",
    figure: {
      file: "jacs-2025-gd10rucd3",
      alt: "Cover of Journal of the American Chemical Society volume 147, issue 40",
      caption: "",
      credit: "Issue cover © 2025 American Chemical Society",
    },
  },
  {
    id: "jacs-2025-tbir3",
    title: "Unsupervised Machine Learning Prediction of a Novel 1:3 Intermetallic Phase with the Synthesis of TbIr<sub>3</sub> (PuNi<sub>3</sub>-type) as Experimental Validation",
    authors: [
      "Siddha Sankalpa Sethi", "Arnab Dutta", "Emil I. Jaffal", "Nishant Yadav", "Danila Shiryaev",
      "Brian Hoang", "Anirudh Machathi", "Sangjoon Lee", "Karabi Das", "Partha Pratim Jana",
      "Anton O. Oliynyk",
    ],
    journal: "Journal of the American Chemical Society",
    year: 2025, volume: "147", issue: "17", pages: "14739–14755",
    doi: "10.1021/jacs.5c03510",
    openAccess: false,
    links: { preprint: "https://doi.org/10.26434/chemrxiv-2025-cc0dq" },
    tags: ["ml", "recommender", "intermetallics", "crystal-structures", "xrd"],
    summary:
      "PCA and K-means clustering of 2366 known 1:3 binary intermetallics (six structure types, 97 " +
      "compositional and structural features) showed the PuNi<sub>3</sub>-type standing apart, and a " +
      "recommendation engine proposed TbIr<sub>3</sub> as a new member. Supervised models agreed with " +
      "96.6–99.9% accuracy; two independent syntheses confirmed the structure, and theory traced its " +
      "stability to Ir–Ir contacts.",
    figure: {
      file: "jacs-2025-tbir3",
      alt: "Cover of Journal of the American Chemical Society volume 147, issue 17",
      caption: "",
      credit: "Issue cover © 2025 American Chemical Society",
    },
  },
  {
    id: "dd-2025-caf-saf",
    title: "Composition and Structure Analyzer/Featurizer for Explainable Machine-Learning Models to Predict Solid State Structures",
    authors: [
      "Emil I. Jaffal", "Sangjoon Lee", "Danila Shiryaev", "Alex Vtorov", "Nikhil Kumar Barua",
      "Holger Kleinke", "Anton O. Oliynyk",
    ],
    journal: "Digital Discovery",
    year: 2025, volume: "4", issue: "2", pages: "548–560",
    doi: "10.1039/D4DD00332B",
    openAccess: true,
    license: "CC BY-NC 3.0",
    links: { preprint: "https://doi.org/10.26434/chemrxiv-2024-rrbhc" },
    tags: ["featurization", "ml", "crystal-structures"],
    summary:
      "Most machine-learning models for solid-state structure prediction describe a compound only through " +
      "its composition. Our composition and structure analyzer/featurizers turn chemical formulas and CIF " +
      "files into compositional and structural features in a high-throughput, user-friendly way, making " +
      "it easy to build simple, explainable models.",
    figure: {
      file: "dd-2025-caf-saf",
      alt: "Cover of Digital Discovery volume 4, issue 2",
      caption: "",
      credit: "Issue cover © The Royal Society of Chemistry 2025",
    },
  },
];
