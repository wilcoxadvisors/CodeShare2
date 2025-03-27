// Industry options - centralized here for consistency
export const INDUSTRY_OPTIONS = [
  { value: "retail", label: "Retail" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "healthcare", label: "Healthcare" },
  { value: "tech", label: "Technology" },
  { value: "finance", label: "Finance" },
  { value: "construction", label: "Construction" },
  { value: "hospitality", label: "Hospitality" },
  { value: "services", label: "Professional Services" },
  { value: "other", label: "Other" }
];

// Helper function to get industry label from value
export const getIndustryLabel = (industryValue: string | null | undefined): string => {
  console.log(`DEBUG getIndustryLabel: Received value: "${industryValue}"`);
  
  // If empty, null, or undefined, return formatted "Other" instead of "N/A"
  if (!industryValue) {
    console.log(`DEBUG getIndustryLabel: Null or undefined value, returning "Other"`);
    return "Other";
  }
  
  // Special case for "other" value
  if (industryValue.toLowerCase() === "other") {
    console.log(`DEBUG getIndustryLabel: Found "other" value, returning "Other"`);
    return "Other";
  }
  
  // Find the matching industry option
  const industry = INDUSTRY_OPTIONS.find(opt => opt.value === industryValue);
  const label = industry ? industry.label : industryValue;
  console.log(`DEBUG getIndustryLabel: Returning label: "${label}"`);
  return label;
};