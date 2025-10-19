// Main Application Controller
class App {
    constructor() {
        this.initialized = false;
    }

    // Initialize the application
    async initialize() {
        if (this.initialized) return;
        
        try {
            console.log('Initializing BaluAssociates Portal...');
            
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }
            
            // Check if Supabase is available
            if (!window.supabase || !supabase) {
                throw new Error('Supabase client not available');
            }
            
            // Initialize managers
            await this.initializeManagers();
            
            // Set up global error handling
            this.setupErrorHandling();
            
            // Set up keyboard shortcuts
            this.setupKeyboardShortcuts();
            
            this.initialized = true;
            console.log('BaluAssociates Portal initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            showError('Failed to initialize application. Please refresh the page.');
        }
    }

    // Initialize all managers
    async initializeManagers() {
        try {
            // Initialize authentication manager
            if (window.authManager) {
                await authManager.initialize();
                console.log('✓ Auth Manager initialized');
            }
            
            // Initialize dashboard controller
            if (window.dashboardController) {
                await dashboardController.initialize();
                console.log('✓ Dashboard Controller initialized');
            }
            
            // Initialize file manager
            if (window.fileManager) {
                fileManager.initialize();
                console.log('✓ File Manager initialized');
            }
            
            // Initialize company manager
            if (window.companyManager) {
                companyManager.initialize();
                console.log('✓ Company Manager initialized');
            }
            
        } catch (error) {
            console.error('Error initializing managers:', error);
            throw error;
        }
    }

    // Set up global error handling
    setupErrorHandling() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            
            // Don't show error for auth-related rejections (they're handled)
            if (event.reason?.message?.includes('auth') || 
                event.reason?.message?.includes('session')) {
                return;
            }
            
            showError('An unexpected error occurred. Please try again.');
        });
        
        // Handle general errors
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            
            // Don't show error for script loading errors
            if (event.filename) {
                return;
            }
            
            showError('An unexpected error occurred. Please refresh the page.');
        });
    }

    // Set up keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Escape key to close modals
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
            
            // Ctrl/Cmd + K for quick actions (future enhancement)
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                // Could implement quick search/actions here
            }
        });
    }

    // Close all open modals
    closeAllModals() {
        const modals = document.querySelectorAll('.modal:not(.hidden)');
        modals.forEach(modal => {
            modal.classList.add('hidden');
        });
    }

    // Get application state
    getState() {
        return {
            initialized: this.initialized,
            user: authManager?.getCurrentUser(),
            userProfile: null // Will be populated by dashboard controller
        };
    }

    // Refresh application data
    async refresh() {
        try {
            showLoading(true);
            
            // Refresh user profile
            if (authManager?.isAuthenticated()) {
                await dashboardController?.loadUserDashboard();
            }
            
            showSuccess('Data refreshed successfully');
            
        } catch (error) {
            console.error('Error refreshing application:', error);
            showError('Failed to refresh data');
        } finally {
            showLoading(false);
        }
    }

    // Handle application updates/version changes
    checkForUpdates() {
        // This could be enhanced to check for application updates
        console.log('Checking for updates...');
    }
}

// Global utility functions for the application

// Enhanced file preview function
window.previewFile = async function(fileId) {
    if (window.fileManager) {
        await fileManager.previewFile(fileId);
    }
};

// Enhanced file download function
window.downloadFile = async function(fileId) {
    if (window.fileManager) {
        await fileManager.downloadFile(fileId);
    }
};

// Enhanced file delete function
window.deleteFile = async function(fileId) {
    if (window.fileManager) {
        await fileManager.deleteFile(fileId);
    }
};

// Company management functions
window.editCompany = function(companyId) {
    if (window.companyManager) {
        companyManager.editCompany(companyId);
    }
};

window.deleteCompany = function(companyId) {
    if (window.companyManager) {
        companyManager.confirmDeleteCompany(companyId);
    }
};

// Application state management
window.getAppState = function() {
    return window.app?.getState() || {};
};

window.refreshApp = async function() {
    if (window.app) {
        await app.refresh();
    }
};

// Debug functions (for development)
window.debugApp = {
    getUser: () => authManager?.getCurrentUser(),
    getProfile: () => dashboardController?.userProfile,
    getCompanies: () => companyManager?.companies,
    testConnection: async () => {
        try {
            const { data, error } = await supabase.from('companies').select('count');
            console.log('Connection test:', { data, error });
            return !error;
        } catch (e) {
            console.error('Connection test failed:', e);
            return false;
        }
    },
    clearStorage: () => {
        localStorage.clear();
        sessionStorage.clear();
        console.log('Storage cleared');
    }
};

// Create and initialize the main application
window.app = new App();

// Auto-initialize when script loads
(async () => {
    try {
        await app.initialize();
    } catch (error) {
        console.error('Failed to auto-initialize app:', error);
    }
})();

// Service Worker registration (for future PWA features)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Could register service worker here for offline functionality
        console.log('Service Worker support detected');
    });
}

// Performance monitoring
if (window.performance && window.performance.mark) {
    window.performance.mark('app-initialized');
}

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { App };
}