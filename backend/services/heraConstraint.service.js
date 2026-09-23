const path = require('path');

let heraGraph;
let isNativeEnabled = false;

try {
  // Attempt to load the compiled C++ binary
  heraGraph = require(path.join(__dirname, '../build/Release/hera_graph.node'));
  isNativeEnabled = true;
  console.log('✅ HERA Knowledge Graph loaded natively via C++ Addon');
  
  // Initialize some basic constraints for testing
  // setDrugMetadata(drugName, monthlyCost, min_eGFR)
  heraGraph.setDrugMetadata('sglt2i', 1200, 30);
  heraGraph.setDrugMetadata('empagliflozin', 1200, 30);
  heraGraph.setDrugMetadata('dapagliflozin', 1100, 25);
  heraGraph.setDrugMetadata('metformin', 150, 45);
  heraGraph.setDrugMetadata('glimepiride', 100, 0);
  heraGraph.setDrugMetadata('sacubitril/valsartan', 4500, 30);
  heraGraph.setDrugMetadata('entresto', 4500, 30);
  heraGraph.setDrugMetadata('spironolactone', 150, 30);
} catch (error) {
  console.warn('⚠️ Could not load native C++ HERA graph. Engine will throw an error on validation.', error.message);
}

/**
 * Validates a proposed drug regimen using the Native Graph
 * @param {string[]} regimen Array of drug names
 * @param {Object} patientContext Object containing { budget, egfr }
 * @returns {Array} Array of violations {drugA, drugB}
 */
function validateRegimen(regimen, patientContext = { budget: 0, egfr: 100 }) {
  if (!isNativeEnabled) {
    console.warn("⚠️ HERA Native C++ Engine is not available. Using native JavaScript fallback engine.");
    // JS Fallback
    const violations = [];
    let total_cost = 0;
    const jsMetadata = {
      'sglt2i': { cost: 1200, min_egfr: 30 },
      'empagliflozin': { cost: 1200, min_egfr: 30 },
      'dapagliflozin': { cost: 1100, min_egfr: 25 },
      'metformin': { cost: 150, min_egfr: 45 },
      'glimepiride': { cost: 100, min_egfr: 0 },
      'sacubitril/valsartan': { cost: 4500, min_egfr: 30 },
      'entresto': { cost: 4500, min_egfr: 30 },
      'spironolactone': { cost: 150, min_egfr: 30 }
    };
    
    const normalizedRegimen = regimen.map(d => d.toLowerCase());
    
    for (const drug of normalizedRegimen) {
      if (jsMetadata[drug]) {
        total_cost += jsMetadata[drug].cost;
        if (patientContext.egfr < jsMetadata[drug].min_egfr) {
          violations.push({ drugA: drug, drugB: `eGFR Constraint: Min ${jsMetadata[drug].min_egfr}, Patient has ${patientContext.egfr}` });
        }
      }
    }
    
    if (patientContext.budget > 0 && total_cost > patientContext.budget) {
      violations.push({ drugA: "BUDGET_EXCEEDED", drugB: `Total cost ${total_cost} exceeds budget ${patientContext.budget}` });
    }
    
    return violations;
  }

  const startTime = process.hrtime();
  
  // Normalize drug names to lowercase for checking
  const normalizedRegimen = regimen.map(d => d.toLowerCase());
  
  const violations = heraGraph.validateRegimen(normalizedRegimen, patientContext);
  
  const diff = process.hrtime(startTime);
  const executionTimeMs = (diff[0] * 1e9 + diff[1]) / 1e6;
  
  console.log(`[HERA GRAPH] Native C++ validation completed in ${executionTimeMs.toFixed(3)}ms`);
  
  return violations;
}

module.exports = {
  validateRegimen,
  isNativeEnabled
};
