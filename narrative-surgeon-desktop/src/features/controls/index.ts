/**
 * Controls Feature Exports
 * Centralized exports for control components
 */

export { RerunDirtyButton } from './RerunDirtyButton';
export type { default as RerunDirtyButtonProps } from './RerunDirtyButton';

// Example usage:
// import { RerunDirtyButton } from '@/features/controls';
//
// <RerunDirtyButton 
//   modules={['events', 'plants']} 
//   onComplete={(results) => console.log('Processing complete:', results)}
// />