// Dashboard hooks

// Legacy export for backward compatibility (will be deprecated)
export { useIsMobile as useIsMobileLegacy } from "./use-mobile";
export { useDashboardCRUD } from "./useDashboardCRUD";
export { useDashboardForm } from "./useDashboardForm";
// UI hooks
// Device and responsive hooks (centralized, reactive)
export {
	useDevice,
	useDeviceType,
	useIsMobile,
	useResponsiveColumns,
} from "./useDevice";
export { useFormHandlers } from "./useFormHandlers";
export { createFormSubmitHandler, useSubmitHandler } from "./useSubmitHandler";
export { useVariationSelection } from "./useVariationSelection";
