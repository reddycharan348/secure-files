// Dashboard Controller
class DashboardController {
    constructor() {
        this.currentUser = null;
        this.userProfile = null;
        this.selectedCompanyId = null;
    }

    // Initialize dashboard
    async initialize() {
        // Set up auth state listener
        authManager.onAuthStateChange(async (user) => {
            if (user) {
                await this.loadUserDashboard();
            } else {
                this.showAuthPanel();
            }
        });

        // Set up UI event listeners
        this.setupEventListeners();
    }

    // Set up event listeners
    setupEventListeners() {
        // Auth forms
        const loginForm = document.getElementById('login');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Company selector
        const companySelect = document.getElementById('company-select');
        if (companySelect) {
            companySelect.addEventListener('change', (e) => {
                this.selectedCompanyId = e.target.value;
                this.loadCompanyFiles();
                this.toggleFileUploadSection();
            });
        }

        // Company management
        const manageCompaniesBtn = document.getElementById('manage-companies-btn');
        if (manageCompaniesBtn) {
            manageCompaniesBtn.addEventListener('click', () => this.showCompanyModal());
        }

        // User management
        const manageUsersBtn = document.getElementById('manage-users-btn');
        if (manageUsersBtn) {
            manageUsersBtn.addEventListener('click', () => this.showUserModal());
        }

        // User form
        const userForm = document.getElementById('user-form');
        if (userForm) {
            userForm.addEventListener('submit', (e) => this.handleCreateUser(e));
        }

        // Modal close buttons
        const closePreviewBtn = document.getElementById('close-preview');
        const closeCompanyModalBtn = document.getElementById('close-company-modal');
        const closeUserModalBtn = document.getElementById('close-user-modal');
        
        if (closePreviewBtn) {
            closePreviewBtn.addEventListener('click', () => this.hidePreviewModal());
        }
        
        if (closeCompanyModalBtn) {
            closeCompanyModalBtn.addEventListener('click', () => this.hideCompanyModal());
        }
        
        if (closeUserModalBtn) {
            closeUserModalBtn.addEventListener('click', () => this.hideUserModal());
        }

        // Click outside modal to close
        const previewModal = document.getElementById('preview-modal');
        const companyModal = document.getElementById('company-modal');
        const userModal = document.getElementById('user-modal');
        
        if (previewModal) {
            previewModal.addEventListener('click', (e) => {
                if (e.target === previewModal) this.hidePreviewModal();
            });
        }
        
        if (companyModal) {
            companyModal.addEventListener('click', (e) => {
                if (e.target === companyModal) this.hideCompanyModal();
            });
        }
        
        if (userModal) {
            userModal.addEventListener('click', (e) => {
                if (e.target === userModal) this.hideUserModal();
            });
        }
    }

    // Switch between login and register forms
    switchAuthForm(formType) {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const authError = document.getElementById('auth-error');
        
        if (authError) {
            authError.classList.add('hidden');
        }
        
        if (formType === 'register') {
            loginForm?.classList.add('hidden');
            registerForm?.classList.remove('hidden');
        } else {
            registerForm?.classList.add('hidden');
            loginForm?.classList.remove('hidden');
        }
    }

    // Handle login form submission
    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        if (!email || !password) {
            this.showAuthError('Please fill in all fields');
            return;
        }
        
        const result = await authManager.signIn(email, password);
        
        if (!result.success) {
            this.showAuthError(result.error);
        }
    }

    // Handle register form submission
    async handleRegister(e) {
        e.preventDefault();
        
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const companyId = document.getElementById('register-company').value;
        
        if (!email || !password) {
            this.showAuthError('Please fill in all required fields');
            return;
        }
        
        const userData = {};
        if (companyId) {
            userData.company_id = companyId;
        }
        
        const result = await authManager.signUp(email, password, userData);
        
        if (!result.success) {
            this.showAuthError(result.error);
        }
    }

    // Handle logout
    async handleLogout() {
        await authManager.signOut();
    }

    // Show authentication error
    showAuthError(message) {
        const authError = document.getElementById('auth-error');
        if (authError) {
            authError.textContent = message;
            authError.classList.remove('hidden');
        }
    }

    // Show authentication panel
    showAuthPanel() {
        const authPanel = document.getElementById('auth-panel');
        const dashboard = document.getElementById('dashboard');
        
        if (authPanel) authPanel.classList.remove('hidden');
        if (dashboard) dashboard.classList.add('hidden');
        
        // Load companies for registration
        this.loadCompaniesForRegistration();
    }

    // Load user dashboard based on role
    async loadUserDashboard() {
        try {
            this.currentUser = authManager.getCurrentUser();
            this.userProfile = await authManager.getUserProfile();
            
            if (!this.userProfile) {
                console.error('Could not load user profile');
                return;
            }
            
            // Hide auth panel and show dashboard
            const authPanel = document.getElementById('auth-panel');
            const dashboard = document.getElementById('dashboard');
            
            if (authPanel) authPanel.classList.add('hidden');
            if (dashboard) dashboard.classList.remove('hidden');
            
            // Update user info in header
            this.updateUserInfo();
            
            // Load appropriate dashboard
            if (this.userProfile.role === 'admin') {
                await this.loadAdminDashboard();
            } else {
                await this.loadCompanyDashboard();
            }
            
        } catch (error) {
            console.error('Error loading user dashboard:', error);
            showError('Failed to load dashboard');
        }
    }

    // Update user info in header
    updateUserInfo() {
        const userEmail = document.getElementById('user-email');
        const userRole = document.getElementById('user-role');
        
        if (userEmail && this.userProfile) {
            userEmail.textContent = this.userProfile.email;
        }
        
        if (userRole && this.userProfile) {
            userRole.textContent = this.userProfile.role;
            userRole.className = `role-badge ${this.userProfile.role}`;
        }
    }

    // Load admin dashboard
    async loadAdminDashboard() {
        const adminDashboard = document.getElementById('admin-dashboard');
        const companyDashboard = document.getElementById('company-dashboard');
        
        if (adminDashboard) adminDashboard.classList.remove('hidden');
        if (companyDashboard) companyDashboard.classList.add('hidden');
        
        // Load companies for admin
        await this.loadCompaniesForAdmin();
    }

    // Load company dashboard
    async loadCompanyDashboard() {
        const adminDashboard = document.getElementById('admin-dashboard');
        const companyDashboard = document.getElementById('company-dashboard');
        
        if (adminDashboard) adminDashboard.classList.add('hidden');
        if (companyDashboard) companyDashboard.classList.remove('hidden');
        
        // Load company files
        if (this.userProfile.company_id) {
            this.selectedCompanyId = this.userProfile.company_id;
            await this.loadCompanyFiles();
        }
    }

    // Load companies for admin selector
    async loadCompaniesForAdmin() {
        try {
            const { data: companies, error } = await supabase
                .from('companies')
                .select('*')
                .order('name');
            
            if (error) {
                console.error('Error loading companies:', error);
                return;
            }
            
            const companySelect = document.getElementById('company-select');
            if (companySelect) {
                companySelect.innerHTML = '<option value="">Choose a company...</option>';
                
                companies.forEach(company => {
                    const option = document.createElement('option');
                    option.value = company.id;
                    option.textContent = company.name;
                    companySelect.appendChild(option);
                });
            }
            
        } catch (error) {
            console.error('Error loading companies for admin:', error);
        }
    }

    // Load companies for registration dropdown
    async loadCompaniesForRegistration() {
        try {
            const { data: companies, error } = await supabase
                .from('companies')
                .select('*')
                .order('name');
            
            if (error) {
                console.error('Error loading companies:', error);
                return;
            }
            
            const registerCompanySelect = document.getElementById('register-company');
            if (registerCompanySelect) {
                registerCompanySelect.innerHTML = '<option value="">Select Company</option>';
                
                companies.forEach(company => {
                    const option = document.createElement('option');
                    option.value = company.id;
                    option.textContent = company.name;
                    registerCompanySelect.appendChild(option);
                });
            }
            
        } catch (error) {
            console.error('Error loading companies for registration:', error);
        }
    }

    // Load files for selected company
    async loadCompanyFiles() {
        if (!this.selectedCompanyId) return;
        
        try {
            const { data: files, error } = await supabase
                .from('files')
                .select('*')
                .eq('company_id', this.selectedCompanyId)
                .order('uploaded_at', { ascending: false });
            
            if (error) {
                console.error('Error loading files:', error);
                return;
            }
            
            // Determine which file list to update
            const isAdmin = this.userProfile?.role === 'admin';
            const fileListId = isAdmin ? 'file-list' : 'company-file-list';
            
            this.displayFiles(files, fileListId);
            
        } catch (error) {
            console.error('Error loading company files:', error);
        }
    }

    // Display files in grid
    displayFiles(files, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (files.length === 0) {
            container.innerHTML = '<p class="text-gray-500">No files found</p>';
            return;
        }
        
        container.innerHTML = files.map(file => `
            <div class="file-item" data-file-id="${file.id}">
                <div class="file-icon">${getFileIcon(file.mime)}</div>
                <div class="file-name">${file.filename}</div>
                <div class="file-meta">
                    ${formatFileSize(file.size)} • ${formatDate(file.uploaded_at)}
                </div>
                <div class="file-actions">
                    ${isPreviewable(file.mime) ? 
                        `<button class="btn btn-secondary" onclick="dashboardController.previewFile('${file.id}')">Preview</button>` : 
                        ''
                    }
                    <button class="btn btn-primary" onclick="dashboardController.downloadFile('${file.id}')">Download</button>
                    ${this.userProfile?.role === 'admin' ? 
                        `<button class="btn btn-secondary" onclick="dashboardController.deleteFile('${file.id}')">Delete</button>` : 
                        ''
                    }
                </div>
            </div>
        `).join('');
    }

    // Toggle file upload section visibility
    toggleFileUploadSection() {
        const uploadSection = document.getElementById('file-upload-section');
        if (uploadSection) {
            if (this.selectedCompanyId && this.userProfile?.role === 'admin') {
                uploadSection.classList.remove('hidden');
            } else {
                uploadSection.classList.add('hidden');
            }
        }
    }

    // Preview file
    async previewFile(fileId) {
        if (window.fileManager) {
            await fileManager.previewFile(fileId);
        }
    }

    // Download file
    async downloadFile(fileId) {
        if (window.fileManager) {
            await fileManager.downloadFile(fileId);
        }
    }

    // Delete file
    async deleteFile(fileId) {
        if (!confirm('Are you sure you want to delete this file?')) return;
        
        if (window.fileManager) {
            await fileManager.deleteFile(fileId);
        }
    }

    // Show company management modal
    showCompanyModal() {
        const modal = document.getElementById('company-modal');
        if (modal) {
            modal.classList.remove('hidden');
            // Load companies for management
            window.companyManager?.loadCompaniesForManagement();
        }
    }

    // Hide company management modal
    hideCompanyModal() {
        const modal = document.getElementById('company-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    // Show file preview modal
    showPreviewModal(content, title) {
        const modal = document.getElementById('preview-modal');
        const titleElement = document.getElementById('preview-title');
        const contentElement = document.getElementById('preview-content');
        
        if (modal && titleElement && contentElement) {
            titleElement.textContent = title;
            contentElement.innerHTML = content;
            modal.classList.remove('hidden');
        }
    }

    // Hide file preview modal
    hidePreviewModal() {
        const modal = document.getElementById('preview-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    // Show user management modal
    showUserModal() {
        const modal = document.getElementById('user-modal');
        if (modal) {
            modal.classList.remove('hidden');
            // Load companies for user creation
            this.loadCompaniesForUserManagement();
            // Load existing users
            this.loadUsersForManagement();
        }
    }

    // Hide user management modal
    hideUserModal() {
        const modal = document.getElementById('user-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    // Load companies for user management dropdown
    async loadCompaniesForUserManagement() {
        try {
            const { data: companies, error } = await supabase
                .from('companies')
                .select('*')
                .order('name');
            
            if (error) {
                console.error('Error loading companies:', error);
                return;
            }
            
            const userCompanySelect = document.getElementById('user-company');
            if (userCompanySelect) {
                userCompanySelect.innerHTML = '<option value="">Select Company (required for company users)</option>';
                
                companies.forEach(company => {
                    const option = document.createElement('option');
                    option.value = company.id;
                    option.textContent = company.name;
                    userCompanySelect.appendChild(option);
                });
            }
            
        } catch (error) {
            console.error('Error loading companies for user management:', error);
        }
    }

    // Load users for management interface
    async loadUsersForManagement() {
        try {
            const { data: users, error } = await supabase
                .from('app_users')
                .select(`
                    *,
                    companies (
                        name
                    )
                `)
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('Error loading users:', error);
                return;
            }
            
            this.displayUsersForManagement(users);
            
        } catch (error) {
            console.error('Error loading users for management:', error);
        }
    }

    // Display users in management interface
    displayUsersForManagement(users) {
        const container = document.getElementById('users-list');
        if (!container) return;
        
        if (users.length === 0) {
            container.innerHTML = '<p class="text-gray-500">No users found</p>';
            return;
        }
        
        container.innerHTML = users.map(user => `
            <div class="user-item" data-user-id="${user.id}">
                <div class="user-info">
                    <h5>${user.email}</h5>
                    <p>Role: <span class="role-badge ${user.role}">${user.role}</span></p>
                    <p>Company: ${user.companies?.name || 'No company assigned'}</p>
                    <small>Created: ${formatDate(user.created_at)}</small>
                </div>
                <div class="user-actions">
                    <button class="btn btn-secondary" onclick="dashboardController.editUser('${user.id}')">
                        Edit
                    </button>
                    <button class="btn btn-secondary" onclick="dashboardController.confirmDeleteUser('${user.id}')">
                        Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Handle user creation form
    async handleCreateUser(e) {
        e.preventDefault();
        
        const email = document.getElementById('user-email').value.trim();
        const password = document.getElementById('user-password').value;
        const role = document.getElementById('user-role').value;
        const companyId = document.getElementById('user-company').value;
        
        if (!email || !password || !role) {
            showError('Please fill in all required fields');
            return;
        }
        
        if (role === 'company' && !companyId) {
            showError('Company selection is required for company users');
            return;
        }
        
        try {
            showLoading(true);
            
            // Create user using regular signup (since admin API requires service role key)
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        role: role,
                        company_id: companyId || null
                    }
                }
            });
            
            if (authError) {
                throw authError;
            }
            
            // Create user profile in app_users table
            const userData = {
                id: authData.user.id,
                email: email,
                role: role
            };
            
            if (role === 'company' && companyId) {
                userData.company_id = companyId;
            }
            
            const { error: profileError } = await supabase
                .from('app_users')
                .insert(userData);
            
            if (profileError) {
                console.error('Profile creation error:', profileError);
                // Continue anyway - the user might be created through the auth trigger
            }
            
            showSuccess('User created successfully! They may need to confirm their email.');
            
            // Clear form
            document.getElementById('user-form').reset();
            
            // Reload users list
            setTimeout(async () => {
                await this.loadUsersForManagement();
            }, 1000);
            
        } catch (error) {
            console.error('Error creating user:', error);
            showError(error.message || 'Failed to create user');
        } finally {
            showLoading(false);
        }
    }

    // Edit user (placeholder for future implementation)
    async editUser(userId) {
        showError('User editing functionality coming soon. For now, please delete and recreate the user if changes are needed.');
    }

    // Confirm delete user
    async confirmDeleteUser(userId) {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            return;
        }
        
        try {
            showLoading(true);
            
            // Delete from app_users table (this will also prevent login)
            const { error: profileError } = await supabase
                .from('app_users')
                .delete()
                .eq('id', userId);
            
            if (profileError) {
                throw profileError;
            }
            
            showSuccess('User access removed successfully');
            
            // Reload users list
            await this.loadUsersForManagement();
            
        } catch (error) {
            console.error('Error deleting user:', error);
            showError(error.message || 'Failed to delete user');
        } finally {
            showLoading(false);
        }
    }

    // Switch dashboard view
    switchView(viewType) {
        const adminDashboard = document.getElementById('admin-dashboard');
        const companyDashboard = document.getElementById('company-dashboard');
        
        if (viewType === 'admin') {
            adminDashboard?.classList.remove('hidden');
            companyDashboard?.classList.add('hidden');
        } else {
            adminDashboard?.classList.add('hidden');
            companyDashboard?.classList.remove('hidden');
        }
    }
}

// Create global dashboard controller instance
window.dashboardController = new DashboardController();