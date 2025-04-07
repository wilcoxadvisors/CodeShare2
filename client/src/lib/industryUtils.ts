// Industry options - centralized here for consistency
export const INDUSTRY_OPTIONS = [
  { value: "accounting", label: "Accounting & Bookkeeping" },
  { value: "agriculture", label: "Agriculture" },
  { value: "construction", label: "Construction" },
  { value: "consulting", label: "Consulting" },
  { value: "education", label: "Education" },
  { value: "finance", label: "Finance & Banking" },
  { value: "healthcare", label: "Healthcare" },
  { value: "hospitality", label: "Hospitality & Tourism" },
  { value: "legal", label: "Legal Services" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "nonprofit", label: "Non-profit" },
  { value: "real_estate", label: "Real Estate" },
  { value: "retail", label: "Retail" },
  { value: "services", label: "Professional Services" },
  { value: "tech", label: "Technology" },
  { value: "transportation", label: "Transportation & Logistics" },
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
  if (industryValue?.toLowerCase() === "other") {
    console.log(`DEBUG getIndustryLabel: Found "other" value, returning "Other"`);
    return "Other";
  }
  
  // Find the matching industry option
  const industry = INDUSTRY_OPTIONS.find(opt => opt.value === industryValue);
  const label = industry ? industry.label : industryValue;
  console.log(`DEBUG getIndustryLabel: Returning label: "${label}"`);
  return label;
};

/**
 * Ensures a valid industry value, handling various input types and formats
 * @param industryValue - The industry value to validate
 * @returns A valid industry value string
 */
export const ensureIndustryValue = (industryValue: string | number | undefined | null): string => {
  console.log(`DEBUG ensureIndustryValue: Received value type: ${typeof industryValue}, value: "${industryValue}"`);
  
  try {
    // Handle null/undefined case
    if (industryValue === null || industryValue === undefined) {
      console.log("DEBUG ensureIndustryValue: Null or undefined value detected, defaulting to 'other'");
      return "other";
    }
    
    // Handle numeric case by converting to string
    if (typeof industryValue === "number") {
      const stringValue = String(industryValue);
      console.log(`DEBUG ensureIndustryValue: Converted numeric value ${industryValue} to string "${stringValue}"`);
      
      // Check if the converted string is a valid industry
      const isValidIndustry = INDUSTRY_OPTIONS.some(opt => opt.value === stringValue);
      if (!isValidIndustry) {
        console.log(`DEBUG ensureIndustryValue: Converted numeric value is not valid, defaulting to 'other'`);
        return "other";
      }
      return stringValue;
    }
    
    // Handle empty string case
    if (industryValue === "") {
      console.log("DEBUG ensureIndustryValue: Empty string detected, defaulting to 'other'");
      return "other";
    }
    
    // Handle string with whitespace
    const trimmedValue = industryValue.trim();
    if (trimmedValue === "") {
      console.log("DEBUG ensureIndustryValue: Empty string after trimming, defaulting to 'other'");
      return "other";
    }
    
    // Check if trimmed value is valid
    const isValidIndustry = INDUSTRY_OPTIONS.some(opt => opt.value === trimmedValue);
    if (!isValidIndustry) {
      console.log(`DEBUG ensureIndustryValue: Value "${trimmedValue}" is not in valid options, defaulting to 'other'`);
      return "other";
    }
    
    console.log(`DEBUG ensureIndustryValue: Using valid industry value: "${trimmedValue}"`);
    return trimmedValue;
  } catch (err) {
    console.error("ERROR in ensureIndustryValue:", err);
    return "other";
  }
};