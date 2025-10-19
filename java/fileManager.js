// File Manager
class FileManager {
    constructor() {
        this.uploadQueue = [];
        this.isUploading = false;
    }

    // Initialize file manager
    initialize() {
        this.setupFileUpload();
        this.setupDragAndDrop();
    }

    // Set up file upload functionality
    setupFileUpload() {
        const fileInput = document.getElementById('file-input');
        const uploadArea = document.getElementById('upload-area');
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelection(e.target.files);
            });
        }
        
        if (uploadArea) {
            uploadArea.addEventListener('click', () => {
                fileInput?.click();
            });
        }
    }

    // Set up drag and drop functionality
    setupDragAndDrop() {
        const uploadArea = document.getElementById('upload-area');
        
        if (!uploadArea) return;
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = Array.from(e.dataTransfer.files);
            this.handleFileSelection(files);
        });
    }

    // Handle file selection
    async handleFileSelection(files) {
        if (!files || files.length === 0) return;
        
        const selectedCompanyId = dashboardController.selectedCompanyId;
        if (!selectedCompanyId) {
            showError('Please select a company first');
            return;
        }
        
        // Validate files
        const validFiles = [];
        const errors = [];
        
        Array.from(files).forEach(file => {
            const fileErrors = validateFile(file);
            if (fileErrors.length > 0) {
                errors.push(`${file.name}: ${fileErrors.join(', ')}`);
            } else {
                validFiles.push(file);
            }
        });
        
        // Show validation errors
        if (errors.length > 0) {
            showError(`File validation errors:\n${errors.join('\n')}`);
        }
        
        // Upload valid files
        if (validFiles.length > 0) {
            await this.uploadFiles(selectedCompanyId, validFiles);
        }
    }

    // Upload files to storage
    async uploadFiles(companyId, files) {
        if (this.isUploading) {
            showError('Upload already in progress');
            return;
        }
        
        this.isUploading = true;
        const progressContainer = document.getElementById('upload-progress');
        
        try {
            // Show progress container
            if (progressContainer) {
                progressContainer.classList.remove('hidden');
                progressContainer.innerHTML = '';
            }
            
            const uploadPromises = Array.from(files).map(file => 
                this.uploadSingleFile(companyId, file, progressContainer)
            );
            
            const results = await Promise.allSettled(uploadPromises);
            
            // Process results
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;
            
            if (successful > 0) {
                showSuccess(`Successfully uploaded ${successful} file(s)`);
                // Refresh file list
                await dashboardController.loadCompanyFiles();
            }
            
            if (failed > 0) {
                showError(`Failed to upload ${failed} file(s)`);
            }
            
        } catch (error) {
            console.error('Upload error:', error);
            showError('Upload failed');
        } finally {
            this.isUploading = false;
            
            // Hide progress container after delay
            setTimeout(() => {
                if (progressContainer) {
                    progressContainer.classList.add('hidden');
                }
            }, 3000);
        }
    }

    // Upload single file
    async uploadSingleFile(companyId, file, progressContainer) {
        const timestamp = Date.now();
        const fileName = `${timestamp}-${file.name}`;
        const filePath = `company_${companyId}/${fileName}`;
        
        // Create progress item
        const progressItem = this.createProgressItem(file.name, progressContainer);
        
        try {
            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from(APP_CONFIG.storageBucket)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });
            
            if (uploadError) {
                throw uploadError;
            }
            
            // Update progress
            this.updateProgress(progressItem, 50, 'Saving metadata...');
            
            // Save file metadata to database
            const { error: dbError } = await supabase
                .from('files')
                .insert({
                    company_id: companyId,
                    filename: file.name,
                    path: filePath,
                    mime: file.type,
                    size: file.size,
                    uploaded_by: authManager.getCurrentUser()?.id
                });
            
            if (dbError) {
                // Clean up uploaded file if database insert fails
                await supabase.storage
                    .from(APP_CONFIG.storageBucket)
                    .remove([filePath]);
                throw dbError;
            }
            
            // Complete progress
            this.updateProgress(progressItem, 100, 'Complete');
            
            return { success: true, file: file.name };
            
        } catch (error) {
            console.error(`Error uploading ${file.name}:`, error);
            this.updateProgress(progressItem, 0, `Error: ${error.message}`, true);
            throw error;
        }
    }

    // Create progress item UI
    createProgressItem(fileName, container) {
        if (!container) return null;
        
        const progressItem = document.createElement('div');
        progressItem.className = 'progress-item';
        progressItem.innerHTML = `
            <span class="file-name">${fileName}</span>
            <div class="progress-bar">
                <div class="progress-fill" style="width: 0%"></div>
            </div>
            <span class="progress-text">Starting...</span>
        `;
        
        container.appendChild(progressItem);
        return progressItem;
    }

    // Update progress item
    updateProgress(progressItem, percentage, text, isError = false) {
        if (!progressItem) return;
        
        const progressFill = progressItem.querySelector('.progress-fill');
        const progressText = progressItem.querySelector('.progress-text');
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
            progressFill.style.backgroundColor = isError ? '#ef4444' : '#10b981';
        }
        
        if (progressText) {
            progressText.textContent = text;
            progressText.style.color = isError ? '#ef4444' : '#374151';
        }
    }

    // Get file list for company
    async getFileList(companyId) {
        try {
            const { data, error } = await supabase
                .from('files')
                .select('*')
                .eq('company_id', companyId)
                .order('uploaded_at', { ascending: false });
            
            if (error) {
                throw error;
            }
            
            return data || [];
            
        } catch (error) {
            console.error('Error getting file list:', error);
            return [];
        }
    }

    // Generate preview URL for file
    async generatePreviewUrl(filePath) {
        try {
            const { data, error } = await supabase.storage
                .from(APP_CONFIG.storageBucket)
                .createSignedUrl(filePath, APP_CONFIG.signedUrlExpiry);
            
            if (error) {
                throw error;
            }
            
            return data.signedUrl;
            
        } catch (error) {
            console.error('Error generating preview URL:', error);
            return null;
        }
    }

    // Generate download URL for file
    async generateDownloadUrl(filePath) {
        try {
            const { data, error } = await supabase.storage
                .from(APP_CONFIG.storageBucket)
                .createSignedUrl(filePath, APP_CONFIG.signedUrlExpiry);
            
            if (error) {
                throw error;
            }
            
            return data.signedUrl;
            
        } catch (error) {
            console.error('Error generating download URL:', error);
            return null;
        }
    }

    // Preview file
    async previewFile(fileId) {
        try {
            showLoading(true);
            
            // Get file info
            const { data: file, error } = await supabase
                .from('files')
                .select('*')
                .eq('id', fileId)
                .single();
            
            if (error) {
                throw error;
            }
            
            if (!isPreviewable(file.mime)) {
                showError('File type not supported for preview');
                return;
            }
            
            // Generate signed URL
            const previewUrl = await this.generatePreviewUrl(file.path);
            if (!previewUrl) {
                showError('Failed to generate preview URL');
                return;
            }
            
            // Create preview content
            let previewContent = '';
            
            if (file.mime === 'application/pdf') {
                previewContent = `
                    <iframe src="${previewUrl}" 
                            width="100%" 
                            height="600px" 
                            style="border: none;">
                    </iframe>
                `;
            } else if (file.mime.startsWith('image/')) {
                previewContent = `
                    <img src="${previewUrl}" 
                         alt="${file.filename}"
                         style="max-width: 100%; height: auto;">
                `;
            }
            
            // Show preview modal
            dashboardController.showPreviewModal(previewContent, file.filename);
            
        } catch (error) {
            console.error('Error previewing file:', error);
            showError('Failed to preview file');
        } finally {
            showLoading(false);
        }
    }

    // Download file
    async downloadFile(fileId) {
        try {
            showLoading(true);
            
            // Get file info
            const { data: file, error } = await supabase
                .from('files')
                .select('*')
                .eq('id', fileId)
                .single();
            
            if (error) {
                throw error;
            }
            
            // Generate signed URL
            const downloadUrl = await this.generateDownloadUrl(file.path);
            if (!downloadUrl) {
                showError('Failed to generate download URL');
                return;
            }
            
            // Trigger download
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = file.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
        } catch (error) {
            console.error('Error downloading file:', error);
            showError('Failed to download file');
        } finally {
            showLoading(false);
        }
    }

    // Delete file
    async deleteFile(fileId) {
        try {
            showLoading(true);
            
            // Get file info
            const { data: file, error: fetchError } = await supabase
                .from('files')
                .select('*')
                .eq('id', fileId)
                .single();
            
            if (fetchError) {
                throw fetchError;
            }
            
            // Delete from storage
            const { error: storageError } = await supabase.storage
                .from(APP_CONFIG.storageBucket)
                .remove([file.path]);
            
            if (storageError) {
                console.warn('Storage deletion error:', storageError);
                // Continue with database deletion even if storage fails
            }
            
            // Delete from database
            const { error: dbError } = await supabase
                .from('files')
                .delete()
                .eq('id', fileId);
            
            if (dbError) {
                throw dbError;
            }
            
            showSuccess('File deleted successfully');
            
            // Refresh file list
            await dashboardController.loadCompanyFiles();
            
        } catch (error) {
            console.error('Error deleting file:', error);
            showError('Failed to delete file');
        } finally {
            showLoading(false);
        }
    }

    // Get file info
    async getFileInfo(fileId) {
        try {
            const { data, error } = await supabase
                .from('files')
                .select('*')
                .eq('id', fileId)
                .single();
            
            if (error) {
                throw error;
            }
            
            return data;
            
        } catch (error) {
            console.error('Error getting file info:', error);
            return null;
        }
    }

    // Check if file exists
    async fileExists(filePath) {
        try {
            const { data, error } = await supabase.storage
                .from(APP_CONFIG.storageBucket)
                .list(filePath.split('/').slice(0, -1).join('/'));
            
            if (error) {
                return false;
            }
            
            const fileName = filePath.split('/').pop();
            return data.some(file => file.name === fileName);
            
        } catch (error) {
            console.error('Error checking file existence:', error);
            return false;
        }
    }
}

// Create global file manager instance
window.fileManager = new FileManager();