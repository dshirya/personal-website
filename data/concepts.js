// Research concept graph data.
// Nodes are approaches/topics from the Research section; links connect related ones.
// Groups: "computational", "experimental", "materials".
// Add a node here and reference its `id` from a chip's data-concept to wire it in.
const CONCEPT_NODES = [
  // Computational
  { id: "ml", label: "machine learning", group: "computational" },
  { id: "featurization", label: "featurization", group: "computational" },
  { id: "screening", label: "high-throughput screening", group: "computational" },
  { id: "recommender", label: "recommendation engine", group: "computational" },
  { id: "data-processing", label: "data processing", group: "computational" },

  // Experimental
  { id: "sintering", label: "sintering", group: "experimental" },
  { id: "arc-melting", label: "arc-melting", group: "experimental" },
  { id: "laser-treatment", label: "laser treatment", group: "experimental" },
  { id: "xrd", label: "XRD", group: "experimental" },
  { id: "sem-eds", label: "SEM-EDS", group: "experimental" },
  { id: "luminescence", label: "luminescence spectroscopy", group: "experimental" },
  { id: "mechanical-testing", label: "mechanical testing", group: "experimental" },

  // Materials / outcomes
  { id: "intermetallics", label: "intermetallics", group: "materials" },
  { id: "crystal-structures", label: "crystal structures", group: "materials" },
  { id: "re-p-o", label: "RE-phosphates", group: "materials" },
];

const CONCEPT_LINKS = [
  // Computational pipeline
  { source: "featurization", target: "ml" },
  { source: "featurization", target: "crystal-structures" },
  { source: "featurization", target: "intermetallics" },
  { source: "ml", target: "crystal-structures" },
  { source: "screening", target: "recommender" },
  { source: "recommender", target: "intermetallics" },
  { source: "recommender", target: "crystal-structures" },
  { source: "screening", target: "intermetallics" },
  { source: "screening", target: "crystal-structures" },
  { source: "screening", target: "xrd" },
  { source: "data-processing", target: "luminescence" },
  { source: "data-processing", target: "xrd" },

  // Experimental -> materials
  { source: "sintering", target: "intermetallics" },
  { source: "sintering", target: "re-p-o" },
  { source: "arc-melting", target: "intermetallics" },
  { source: "xrd", target: "crystal-structures" },
  { source: "xrd", target: "intermetallics" },
  { source: "xrd", target: "re-p-o" },
  { source: "sem-eds", target: "crystal-structures" },
  { source: "laser-treatment", target: "re-p-o" },
  { source: "luminescence", target: "re-p-o" },
  { source: "mechanical-testing", target: "intermetallics" },

  // Cross-links: computation validated by experiment
  { source: "intermetallics", target: "crystal-structures" },
  { source: "ml", target: "intermetallics" },
];
