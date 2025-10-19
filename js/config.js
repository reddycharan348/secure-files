// Supabase Configuration
const SUPABASE_CONFIG = {
    url: 'https://cavqnewxifcmjabzhoor.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdnFuZXd4aWZjbWphYnpob29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2OTE3NjksImV4cCI6MjA3NjI2Nzc2OX0.mrlZqtwzfB_IqZMkzrOvtXECnXwlKSKLXCt5r74-D1g'
};

// Application Configuration
const APP_CONFIG = {
    // File upload settings
    maxFileSize: 50 * 1024 * 1024, // 50MB in bytes
    allowedFileTypes: [
        // Images
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        // Documents
        'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        // Text files
        'text/plain', 'text/csv', 'application/json', 'application/xml',
        // Archives
        'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'
    ],
    
    // Preview settings
    previewableTypes: {
        images: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
        pdfs: ['application/pdf']
    },
    
    // File retention
    retentionDays: 365,
    
    // Storage settings
    storageBucket: 'company-files',
    signedUrlExpiry: 60, // seconds
    
    // UI settings
    itemsPerPage: 20,
    uploadChunkSize: 1024 * 1024 // 1MB chunks for large files
};

// Initialize Supabase client
let supabase;

// Initialize the Supabase client when the page loads
document.addEventListener('DOMContentLoaded', () => {
    if (SUPABASE_CONFIG.url === 'YOUR_SUPABASE_URL' || SUPABASE_CONFIG.anonKey === 'YOUR_SUPABASE_ANON_KEY') {
        console.error('Please configure your Supabase credentials in js/config.js');
        showError('Application not configured. Please check the console for details.');
        return;
    }
    
    try {
        supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        console.log('Supabase client initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Supabase client:', error);
        showError('Failed to initialize application. Please try again later.');
    }
});

// Utility functions
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    // Try to find an appropriate container
    const authError = document.getElementById('auth-error');
    if (authError) {
        authError.textContent = message;
        authError.classList.remove('hidden');
        return;
    }
    
    // Fallback: prepend to body
    document.body.prepend(errorDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    
    document.body.prepend(successDiv);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

function showLoading(show = true) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.classList.toggle('hidden', !show);
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getFileIcon(mimeType) {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📋';
    if (mimeType.startsWith('text/')) return '📄';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return '🗜️';
    return '📁';
}

function isPreviewable(mimeType) {
    return APP_CONFIG.previewableTypes.images.includes(mimeType) || 
           APP_CONFIG.previewableTypes.pdfs.includes(mimeType);
}

function validateFile(file) {
    const errors = [];
    
    // Check file size
    if (file.size > APP_CONFIG.maxFileSize) {
        errors.push(`File size exceeds ${formatFileSize(APP_CONFIG.maxFileSize)} limit`);
    }
    
    // Check file type
    if (APP_CONFIG.allowedFileTypes.length > 0 && !APP_CONFIG.allowedFileTypes.includes(file.type)) {
        errors.push(`File type ${file.type} is not allowed`);
    }
    
    return errors;
}

// Export configuration for use in other modules
window.APP_CONFIG = APP_CONFIG;
window.SUPABASE_CONFIG = SUPABASE_CONFIG;