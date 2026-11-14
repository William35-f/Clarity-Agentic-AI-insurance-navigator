const GENERAL_ILP_SOURCE = {
  product: "General Prudential ILP",
  title: "Prudential Singapore — Investment-linked insurance plans",
  document_type: "Official product overview",
  source_label: "Prudential Singapore Investments",
  source_url:
    "https://www.prudential.com.sg/products/wealth-accumulation/investments/",
};

const POLICY_SOURCES = [
  {
    match: ["pruvantage wealth iii", "wealth iii"],
    product: "PRUVantage Wealth III (SGD)",
    title: "PRUVantage Wealth III (SGD)",
    document_type: "Official product page and brochure access",
    source_label: "Prudential Singapore — PRUVantage Wealth III",
    source_url:
      "https://www.prudential.com.sg/products/wealth-accumulation/investments/pruvantage-wealth-iii",
  },
  {
    match: ["pruvantage prosper", "prosper"],
    product: "PRUVantage Prosper",
    title: "PRUVantage Prosper",
    document_type: "Official product page and brochure access",
    source_label: "Prudential Singapore — PRUVantage Prosper",
    source_url:
      "https://www.prudential.com.sg/products/wealth-accumulation/investments/pruvantage-prosper",
  },
  {
    match: ["pruvantage assure", "assure series"],
    product: "PRUVantage Assure Series",
    title: "PRUVantage Assure Series",
    document_type: "Official product page and brochure access",
    source_label: "Prudential Singapore — PRUVantage Assure Series",
    source_url: "https://www.prudential.com.sg/pruvantageassure/",
  },
  {
    match: ["pruvantage wealth ii", "wealth ii", "wealth usd"],
    product: "PRUVantage Wealth II (USD)",
    title: "PRUVantage Wealth II (USD)",
    document_type: "Official product page and brochure access",
    source_label: "Prudential Singapore — PRUVantage Wealth II",
    source_url:
      "https://www.prudential.com.sg/pruvantage-wealth?pgtype=article",
  },
  {
    match: ["prulink investgrowth", "investgrowth"],
    product: "PRULink InvestGrowth",
    title: "PRULink InvestGrowth",
    document_type: "Official product page and brochure access",
    source_label: "Prudential Singapore — PRULink InvestGrowth",
    source_url:
      "https://www.prudential.com.sg/products/wealth-accumulation/investments/PRULink-InvestGrowth",
  },
  {
    match: ["pruactive linkguard", "linkguard"],
    product: "PRUActive LinkGuard",
    title: "PRUActive LinkGuard",
    document_type: "Official product page and brochure access",
    source_label: "Prudential Singapore — PRUActive LinkGuard",
    source_url:
      "https://www.prudential.com.sg/products/life-insurance/whole-life-insurance/pruactive-linkguard/",
  },
  {
    match: ["pruunited wealth", "united wealth"],
    product: "PRUUnited Wealth",
    title: "Prudential Singapore — Investment-linked insurance plans",
    document_type: "Official product overview; confirm exact terms in the policy documents",
    source_label: "Prudential Singapore Investments",
    source_url:
      "https://www.prudential.com.sg/products/wealth-accumulation/investments/",
  },
];

function getPolicyTopic(statement) {
  const text = String(statement || "").toLowerCase();

  if (/guarantee|return|dividend|income|cannot lose|value.*down/.test(text)) {
    return {
      section: "Important information — investment risk and non-guaranteed benefits",
      guidance:
        "Use the product's Important Information and brochure footnotes to explain which values, dividends or investment outcomes are not guaranteed.",
    };
  }

  if (/cover|hospital|medical|death|critical illness|disability|benefit/.test(text)) {
    return {
      section: "Benefits, limitations, exclusions and supplementary benefits",
      guidance:
        "Check the exact covered event, benefit limits, exclusions and any supplementary-benefit conditions before describing the customer's coverage.",
    };
  }

  if (/charge|premium|budget|afford|withdraw|surrender|terminate|commitment/.test(text)) {
    return {
      section: "Premiums, charges, withdrawals and early termination",
      guidance:
        "Use the product summary or policy documents to confirm premium commitment, applicable charges, withdrawal conditions and surrender implications.",
    };
  }

  return {
    section: "Product features and exact policy terms",
    guidance:
      "Use the official product page as a starting point and confirm exact terms, exclusions and suitability in the current product summary and policy documents.",
  };
}

export function getPolicyHelper({ productInterest, statement }) {
  const productText = String(productInterest || "").toLowerCase();
  const source =
    POLICY_SOURCES.find((item) =>
      item.match.some((keyword) => productText.includes(keyword))
    ) || GENERAL_ILP_SOURCE;
  const topic = getPolicyTopic(statement);

  return {
    available: true,
    ...source,
    ...topic,
    local_source: `PRUPath Product Knowledge Document — ${source.product} section`,
    disclaimer:
      "Reference support only. The current product summary and policy documents supplied by Prudential govern the exact terms.",
  };
}

