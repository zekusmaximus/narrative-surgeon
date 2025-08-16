/**
 * Cost Monitoring Feature Exports
 * Centralized exports for cost monitoring and budget management components
 */

export { CostMonitorDashboard } from './CostMonitorDashboard';
export { BudgetWidget } from './BudgetWidget';
export { CostEstimator } from './CostEstimator';

// Example usage:
// import { BudgetWidget, CostEstimator } from '@/features/cost-monitoring';
//
// // Compact budget display in toolbar
// <BudgetWidget budget={budget} compact={true} />
//
// // Full dashboard for settings page
// <CostMonitorDashboard budget={budget} llmQueue={queue} />
//
// // Cost estimation before processing
// <CostEstimator 
//   sceneLength={1500} 
//   analysisTypes={['events', 'plants']} 
//   budget={budget}
//   onProceed={(cost) => startProcessing()}
// />