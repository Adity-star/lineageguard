/**
 * Container exports
 * 
 * Use createContainer() factory function to get the appropriate container
 * based on the environment (production vs development with mocks)
 */

export { createContainer } from "./production-container.js";

// Export the development container with mocks for testing
export { DevelopmentContainer as ApplicationContainer } from "./container.js";
